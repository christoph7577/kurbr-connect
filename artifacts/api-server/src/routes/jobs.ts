import { Router, type Request, type Response } from "express";
import multer from "multer";
import Anthropic from "@anthropic-ai/sdk";
import { db } from "@workspace/db";
import { jobsTable, haulerProfilesTable, contactNotesTable } from "@workspace/db";
import { type Job } from "@workspace/db";
import { eq, and, inArray, sql } from "drizzle-orm";
import { requireAuth, requireAdmin, isAdminUser, type AuthedRequest } from "../middlewares/auth";
import { uploadPhoto, getPhotoBuffer, objectKeyToServingUrl, isAllowedMimeType } from "../lib/storage";
import { objectStorageClient } from "../lib/objectStorage";
import { sendBookingConfirmationEmail, sendStatusUpdateEmail } from "../lib/email";
import { sendStatusSms } from "../lib/sms";

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 5 },
});

// Use ANTHROPIC_API_KEY if provided; fall back to Replit AI integration env vars
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY ?? process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY,
  ...(process.env.ANTHROPIC_API_KEY
    ? {}
    : { baseURL: process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL }),
});

const CLAUDE_MODEL = "claude-sonnet-4-20250514";

async function generateJobNumber(): Promise<string> {
  const existing = await db.select({ jobNumber: jobsTable.jobNumber }).from(jobsTable);
  const nums = existing
    .map((j) => parseInt(j.jobNumber.replace("JOB-", ""), 10))
    .filter((n) => !isNaN(n));
  const max = nums.length > 0 ? Math.max(...nums) : 1000;
  return `JOB-${max + 1}`;
}

async function getHaulerProfileId(userId: string): Promise<string | null> {
  const [hauler] = await db
    .select({ id: haulerProfilesTable.id })
    .from(haulerProfilesTable)
    .where(eq(haulerProfilesTable.userId, userId))
    .limit(1);
  return hauler?.id ?? null;
}

// GET /api/jobs/stats — admin only
router.get("/jobs/stats", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const jobs = await db.select().from(jobsTable);
    const active = jobs.filter((j) => !["completed", "cancelled"].includes(j.status)).length;
    const unassigned = jobs.filter((j) => !j.haulerId && !["completed", "cancelled"].includes(j.status)).length;
    const completed = jobs.filter((j) => j.status === "completed").length;

    const totalRevenueCents = jobs
      .filter((j) => j.status === "completed")
      .reduce((sum, j) => sum + (j.priceCents ?? 0), 0);

    const todayStr = new Date().toISOString().split("T")[0];
    const todayJobs = jobs.filter((j) => j.createdAt.toISOString().startsWith(todayStr));
    const todayRevenueCents = todayJobs
      .filter((j) => j.status === "completed")
      .reduce((sum, j) => sum + (j.priceCents ?? 0), 0);
    const jobsToday = todayJobs.length;

    const haulers = await db
      .select({ id: haulerProfilesTable.id })
      .from(haulerProfilesTable)
      .where(eq(haulerProfilesTable.status, "approved"));
    const activeHaulers = haulers.length;

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentCompleted = jobs.filter(
      (j) => j.status === "completed" && j.createdAt >= thirtyDaysAgo
    );

    const dailyRevenueMap = new Map<string, number>();
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      dailyRevenueMap.set(d.toISOString().split("T")[0], 0);
    }
    for (const j of recentCompleted) {
      const date = j.createdAt.toISOString().split("T")[0];
      if (dailyRevenueMap.has(date)) {
        dailyRevenueMap.set(date, (dailyRevenueMap.get(date) ?? 0) + (j.priceCents ?? 0));
      }
    }
    const dailyRevenue = Array.from(dailyRevenueMap.entries()).map(([date, totalCents]) => ({ date, totalCents }));

    res.json({ total: jobs.length, active, unassigned, completed, todayRevenueCents, totalRevenueCents, activeHaulers, jobsToday, dailyRevenue });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/jobs/track/:token — public customer tracking
router.get("/jobs/track/:token", async (req: Request, res: Response): Promise<void> => {
  try {
    const token = String(req.params["token"]);
    const [job] = await db
      .select({
        jobNumber: jobsTable.jobNumber,
        trackingToken: jobsTable.trackingToken,
        status: jobsTable.status,
        serviceType: jobsTable.serviceType,
        address: jobsTable.address,
        scheduledDate: jobsTable.scheduledDate,
        scheduledTime: jobsTable.scheduledTime,
        priceCents: jobsTable.priceCents,
        haulerId: jobsTable.haulerId,
      })
      .from(jobsTable)
      .where(eq(jobsTable.trackingToken, token))
      .limit(1);
    if (!job) { res.status(404).json({ error: "Not found" }); return; }

    const activeStatuses = ["dispatched", "en_route", "arrived"];
    let haulerLat: number | null = null;
    let haulerLng: number | null = null;
    let haulerLocationUpdatedAt: string | null = null;

    if (job.haulerId && activeStatuses.includes(job.status)) {
      const [hauler] = await db
        .select({
          currentLat: haulerProfilesTable.currentLat,
          currentLng: haulerProfilesTable.currentLng,
          locationUpdatedAt: haulerProfilesTable.locationUpdatedAt,
        })
        .from(haulerProfilesTable)
        .where(eq(haulerProfilesTable.id, job.haulerId))
        .limit(1);
      if (hauler && hauler.currentLat != null && hauler.currentLng != null) {
        haulerLat = hauler.currentLat;
        haulerLng = hauler.currentLng;
        haulerLocationUpdatedAt = hauler.locationUpdatedAt?.toISOString() ?? null;
      }
    }

    const { haulerId: _h, ...jobPublic } = job;
    res.json({ ...jobPublic, haulerLat, haulerLng, haulerLocationUpdatedAt });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/jobs/photos — public multipart upload (multer, GCS)
router.post("/jobs/photos", upload.array("photos", 5), async (req: Request, res: Response): Promise<void> => {
  try {
    const files = req.files as Express.Multer.File[] | undefined;
    if (!files || files.length === 0) {
      res.status(400).json({ error: "At least one photo is required" });
      return;
    }
    const urls: string[] = [];
    for (const file of files) {
      if (!isAllowedMimeType(file.mimetype)) {
        res.status(400).json({ error: `Invalid file type: ${file.mimetype}. Only jpg, png, webp allowed.` });
        return;
      }
      const objectKey = await uploadPhoto(file.buffer, file.mimetype);
      urls.push(objectKeyToServingUrl(objectKey));
    }
    res.json({ urls });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/jobs/photos/:objectKey* — serve uploaded photos from GCS
router.get("/jobs/photos/*objectKey", async (req: Request, res: Response): Promise<void> => {
  try {
    const objectKey = (req.params as Record<string, string>)["objectKey"];
    if (!objectKey) { res.status(400).json({ error: "Missing object key" }); return; }
    const bucketId = process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID;
    if (!bucketId) { res.status(500).json({ error: "Storage not configured" }); return; }
    const bucket = objectStorageClient.bucket(bucketId);
    const file = bucket.file(objectKey);
    const [exists] = await file.exists();
    if (!exists) { res.status(404).json({ error: "Photo not found" }); return; }
    const [metadata] = await file.getMetadata();
    res.setHeader("Content-Type", (metadata.contentType as string) || "image/jpeg");
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    file.createReadStream().pipe(res);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/jobs/estimate — AI pricing via Claude (server enforces $18/cu yd formula)
router.post("/jobs/estimate", async (req: Request, res: Response): Promise<void> => {
  try {
    const { photoUrls, serviceType, description } = req.body as {
      photoUrls?: string[];
      serviceType?: string;
      description?: string;
    };
    if (!photoUrls || photoUrls.length === 0) {
      res.status(400).json({ error: "photoUrls is required" });
      return;
    }

    const imageBlocks: Anthropic.ImageBlockParam[] = [];
    for (const url of photoUrls.slice(0, 5)) {
      try {
        const objectKey = url.replace(/^\/api\/jobs\/photos\//, "");
        const { buffer, mimeType } = await getPhotoBuffer(objectKey);
        const validTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"] as const;
        const mt = validTypes.includes(mimeType as (typeof validTypes)[number])
          ? (mimeType as (typeof validTypes)[number])
          : "image/jpeg";
        imageBlocks.push({
          type: "image",
          source: { type: "base64", media_type: mt, data: buffer.toString("base64") },
        });
      } catch {
        // Skip unreadable images
      }
    }

    const prompt = `You are a junk removal pricing expert. Analyze these photos.

Service type: ${serviceType || "residential"}
${description ? `Customer description: ${description}` : ""}

Respond ONLY with valid JSON (no markdown) containing:
- estimated_volume: string ("1/8 truck", "1/4 truck", "1/3 truck", "1/2 truck", "3/4 truck", or "full truck")
- item_list: string[] (visible item categories)
- difficulty_score: integer 1-5 (1=easy light items, 5=very heavy/difficult)`;

    const response = await anthropic.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 8192,
      messages: [{ role: "user", content: [...imageBlocks, { type: "text", text: prompt }] }],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      res.status(500).json({ error: "No response from AI" });
      return;
    }

    let aiOutput: Record<string, unknown> = {
      estimated_volume: "1/2 truck",
      item_list: ["Mixed items"],
      difficulty_score: 3,
    };
    try {
      const jsonMatch = textBlock.text.match(/\{[\s\S]*\}/);
      aiOutput = JSON.parse(jsonMatch ? jsonMatch[0] : textBlock.text);
    } catch {
      // Use defaults if parsing fails
    }

    // Server-side pricing: $18/cu yd formula (Replit billing: $18/cu yd; truck = ~17 cu yd)
    const RATE_CENTS_PER_CUYD = 1800; // $18.00/cu yd in cents
    const VOLUME_CUYD: Record<string, number> = {
      "1/8 truck": 2, "1/4 truck": 4.25, "1/3 truck": 6,
      "half truck": 8.5, "1/2 truck": 8.5, "3/4 truck": 12.75,
      "full truck": 17,
    };
    const vol = String(aiOutput["estimated_volume"] || "1/2 truck").toLowerCase();
    let cuYards = 8.5;
    for (const [k, v] of Object.entries(VOLUME_CUYD)) {
      if (vol.includes(k)) { cuYards = v; break; }
    }
    const difficulty = Math.min(5, Math.max(1, Number(aiOutput["difficulty_score"]) || 3));
    const diffMultiplier = 1 + (difficulty - 1) * 0.1; // 1.0–1.4×
    const baseCents = Math.round(cuYards * RATE_CENTS_PER_CUYD * diffMultiplier);

    const estimate = {
      ...aiOutput,
      price_min: Math.max(8900, Math.round(baseCents * 0.85)),
      price_max: Math.round(baseCents * 1.20),
      price_estimated: baseCents,
    };

    res.json(estimate);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/jobs — admin sees all; hauler sees only their assigned jobs
router.get("/jobs", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { userId } = req as AuthedRequest;
  try {
    const admin = await isAdminUser(userId);
    let jobs: Job[];
    if (admin) {
      const { status, haulerId } = req.query;
      const conditions = [];
      if (typeof status === "string") conditions.push(eq(jobsTable.status, status as Job["status"]));
      if (typeof haulerId === "string") conditions.push(eq(jobsTable.haulerId, haulerId));
      const rows = conditions.length > 0
        ? await db.select().from(jobsTable).where(and(...conditions)).orderBy(jobsTable.createdAt)
        : await db.select().from(jobsTable).orderBy(jobsTable.createdAt);
      jobs = rows.reverse();
    } else {
      const haulerProfileId = await getHaulerProfileId(userId);
      if (!haulerProfileId) { res.status(403).json({ error: "Forbidden" }); return; }
      const rows = await db
        .select()
        .from(jobsTable)
        .where(eq(jobsTable.haulerId, haulerProfileId))
        .orderBy(jobsTable.createdAt);
      jobs = rows.reverse();
    }

    // Attach contactNoteCount to each job
    const jobIds = jobs.map((j) => j.id);
    const countMap = new Map<string, number>();
    if (jobIds.length > 0) {
      const counts = await db
        .select({
          jobId: contactNotesTable.jobId,
          count: sql<number>`cast(count(*) as int)`,
        })
        .from(contactNotesTable)
        .where(inArray(contactNotesTable.jobId, jobIds))
        .groupBy(contactNotesTable.jobId);
      for (const row of counts) countMap.set(row.jobId, row.count);
    }
    const jobsWithCounts = jobs.map((j) => ({ ...j, contactNoteCount: countMap.get(j.id) ?? 0 }));
    res.json(jobsWithCounts);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/jobs/:id/notes — admin or assigned hauler
router.get("/jobs/:id/notes", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { userId } = req as AuthedRequest;
  const jobId = String(req.params["id"]);
  try {
    const [job] = await db.select({ id: jobsTable.id, haulerId: jobsTable.haulerId }).from(jobsTable).where(eq(jobsTable.id, jobId)).limit(1);
    if (!job) { res.status(404).json({ error: "Not found" }); return; }
    const admin = await isAdminUser(userId);
    if (!admin) {
      const haulerProfileId = await getHaulerProfileId(userId);
      if (!haulerProfileId || job.haulerId !== haulerProfileId) {
        res.status(403).json({ error: "Forbidden" }); return;
      }
    }
    const notes = await db
      .select()
      .from(contactNotesTable)
      .where(eq(contactNotesTable.jobId, jobId))
      .orderBy(contactNotesTable.createdAt);
    res.json(notes);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/jobs/:id/notes — assigned hauler or admin
router.post("/jobs/:id/notes", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { userId } = req as AuthedRequest;
  const jobId = String(req.params["id"]);
  try {
    const [job] = await db.select({ id: jobsTable.id, haulerId: jobsTable.haulerId }).from(jobsTable).where(eq(jobsTable.id, jobId)).limit(1);
    if (!job) { res.status(404).json({ error: "Not found" }); return; }
    const admin = await isAdminUser(userId);
    if (!admin) {
      const haulerProfileId = await getHaulerProfileId(userId);
      if (!haulerProfileId || job.haulerId !== haulerProfileId) {
        res.status(403).json({ error: "Forbidden" }); return;
      }
    }
    const { contactType, note, haulerName } = req.body as Record<string, unknown>;
    if (typeof contactType !== "string" || !contactType) {
      res.status(400).json({ error: "contactType is required" }); return;
    }
    const [created] = await db
      .insert(contactNotesTable)
      .values({
        jobId,
        contactType,
        note: typeof note === "string" && note.trim() ? note.trim() : null,
        haulerName: typeof haulerName === "string" && haulerName.trim() ? haulerName.trim() : null,
      })
      .returning();
    res.status(201).json(created);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/jobs — public customer booking
router.post("/jobs", async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      serviceType, address, scheduledDate, scheduledTime, description,
      customerName, customerEmail, customerPhone, priceCents, photos, aiEstimate, smsOptIn,
    } = req.body as Record<string, unknown>;
    if (typeof serviceType !== "string" || !serviceType || typeof address !== "string" || !address) {
      res.status(400).json({ error: "serviceType and address are required" });
      return;
    }
    const jobNumber = await generateJobNumber();
    const [job] = await db.insert(jobsTable).values({
      jobNumber,
      serviceType,
      address,
      scheduledDate: typeof scheduledDate === "string" ? scheduledDate : null,
      scheduledTime: typeof scheduledTime === "string" ? scheduledTime : null,
      description: typeof description === "string" ? description : null,
      customerName: typeof customerName === "string" ? customerName : null,
      customerEmail: typeof customerEmail === "string" ? customerEmail : null,
      customerPhone: typeof customerPhone === "string" ? customerPhone : null,
      priceCents: typeof priceCents === "number" ? priceCents : null,
      photos: Array.isArray(photos) ? (photos as string[]) : null,
      aiEstimate: aiEstimate && typeof aiEstimate === "object" ? aiEstimate as Record<string, unknown> : null,
      smsOptIn: smsOptIn === true,
      status: "pending",
    }).returning();
    res.status(201).json(job);

    // Send booking confirmation email (fire-and-forget, don't block response)
    if (job.customerEmail) {
      sendBookingConfirmationEmail({
        to: job.customerEmail,
        customerName: job.customerName,
        jobNumber: job.jobNumber,
        trackingToken: job.trackingToken,
        address: job.address,
        serviceType: job.serviceType,
        scheduledDate: job.scheduledDate,
        scheduledTime: job.scheduledTime,
        priceCents: job.priceCents,
      }).catch((err) => req.log.error({ err }, "Failed to send booking confirmation email"));
    }
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/jobs/:id
router.get("/jobs/:id", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { userId } = req as AuthedRequest;
  const jobId = String(req.params["id"]);
  try {
    const [job] = await db.select().from(jobsTable).where(eq(jobsTable.id, jobId)).limit(1);
    if (!job) { res.status(404).json({ error: "Not found" }); return; }
    const admin = await isAdminUser(userId);
    if (admin) { res.json(job); return; }
    const haulerProfileId = await getHaulerProfileId(userId);
    if (!haulerProfileId || job.haulerId !== haulerProfileId) {
      res.status(403).json({ error: "Forbidden" }); return;
    }
    res.json(job);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /api/jobs/:id
router.patch("/jobs/:id", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { userId } = req as AuthedRequest;
  const jobId = String(req.params["id"]);
  try {
    const [existing] = await db.select().from(jobsTable).where(eq(jobsTable.id, jobId)).limit(1);
    if (!existing) { res.status(404).json({ error: "Not found" }); return; }

    const admin = await isAdminUser(userId);
    const { status, haulerId, scheduledDate, scheduledTime, description, priceCents, photos, aiEstimate } = req.body as Record<string, unknown>;

    const updateFields: Record<string, unknown> = { updatedAt: new Date() };

    if (admin) {
      if (status !== undefined) updateFields["status"] = status as Job["status"];
      if (haulerId !== undefined) updateFields["haulerId"] = haulerId as string | null;
      if (scheduledDate !== undefined) updateFields["scheduledDate"] = scheduledDate as string | null;
      if (scheduledTime !== undefined) updateFields["scheduledTime"] = scheduledTime as string | null;
      if (description !== undefined) updateFields["description"] = description as string | null;
      if (priceCents !== undefined) updateFields["priceCents"] = priceCents as number | null;
      if (photos !== undefined) updateFields["photos"] = photos as string[] | null;
      if (aiEstimate !== undefined) updateFields["aiEstimate"] = aiEstimate as Record<string, unknown> | null;
    } else {
      const haulerProfileId = await getHaulerProfileId(userId);
      if (!haulerProfileId || existing.haulerId !== haulerProfileId) {
        res.status(403).json({ error: "Forbidden" }); return;
      }
      if (status === undefined || typeof status !== "string") {
        res.status(400).json({ error: "Haulers may only update job status" }); return;
      }
      updateFields["status"] = status as Job["status"];
    }

    const [job] = await db
      .update(jobsTable)
      .set(updateFields as Parameters<ReturnType<typeof db.update>["set"]>[0])
      .where(eq(jobsTable.id, jobId))
      .returning();

    // Clear hauler's stored location when job is completed
    if (updateFields["status"] === "completed" && job.haulerId) {
      await db
        .update(haulerProfilesTable)
        .set({ currentLat: null, currentLng: null, locationUpdatedAt: null })
        .where(eq(haulerProfilesTable.id, job.haulerId));
    }

    res.json(job);

    // Send status update notifications for key transitions (fire-and-forget)
    const newStatus = updateFields["status"] as string | undefined;
    const prevStatus = existing.status;
    if (newStatus && newStatus !== prevStatus) {
      if (job.customerEmail) {
        sendStatusUpdateEmail({
          to: job.customerEmail,
          customerName: job.customerName,
          jobNumber: job.jobNumber,
          trackingToken: job.trackingToken,
          status: newStatus,
        }).catch((err) => req.log.error({ err }, "Failed to send status update email"));
      }
      // SMS: only for dispatched/en_route transitions when customer opted in
      if (
        job.customerPhone &&
        job.smsOptIn &&
        (newStatus === "dispatched" || newStatus === "en_route")
      ) {
        sendStatusSms({
          to: job.customerPhone,
          jobNumber: job.jobNumber,
          trackingToken: job.trackingToken,
          status: newStatus,
        }).catch((err) => req.log.error({ err }, "Failed to send status SMS"));
      }
    }
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
