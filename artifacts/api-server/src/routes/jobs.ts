import { Router, type Request, type Response } from "express";
import multer from "multer";
import Anthropic from "@anthropic-ai/sdk";
import { db } from "@workspace/db";
import { jobsTable, haulerProfilesTable } from "@workspace/db";
import { type Job } from "@workspace/db";
import { eq, and, gte, lte } from "drizzle-orm";
import { requireAuth, requireAdmin, isAdminUser, type AuthedRequest } from "../middlewares/auth";
import { uploadPhoto, getPhotoBuffer, objectKeyToServingUrl, isAllowedMimeType } from "../lib/storage";
import { objectStorageClient } from "../lib/objectStorage";

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 5 },
});

const anthropic = new Anthropic({
  apiKey: process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL,
});

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

    // Revenue = sum of all completed jobs
    const totalRevenueCents = jobs
      .filter((j) => j.status === "completed")
      .reduce((sum, j) => sum + (j.priceCents ?? 0), 0);

    // Revenue from jobs created today
    const todayStr = new Date().toISOString().split("T")[0];
    const todayRevenueCents = jobs
      .filter((j) => j.status === "completed" && j.createdAt.toISOString().startsWith(todayStr))
      .reduce((sum, j) => sum + (j.priceCents ?? 0), 0);

    // Active haulers count
    const haulers = await db
      .select({ id: haulerProfilesTable.id })
      .from(haulerProfilesTable)
      .where(eq(haulerProfilesTable.status, "approved"));
    const activeHaulers = haulers.length;

    // Daily revenue for last 30 days (from completed jobs)
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

    res.json({ total: jobs.length, active, unassigned, completed, todayRevenueCents, totalRevenueCents, activeHaulers, dailyRevenue });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/jobs/track/:token — public (customer tracking by high-entropy token)
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
      })
      .from(jobsTable)
      .where(eq(jobsTable.trackingToken, token))
      .limit(1);
    if (!job) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.json(job);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/jobs/photos — public (multipart, called during booking flow)
router.post("/jobs/photos", upload.array("photos", 5), async (req: Request, res: Response): Promise<void> => {
  try {
    const files = req.files as Express.Multer.File[] | undefined;
    if (!files || files.length === 0) {
      res.status(400).json({ error: "At least one photo is required" });
      return;
    }
    if (files.length > 5) {
      res.status(400).json({ error: "Maximum 5 photos allowed" });
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

// GET /api/jobs/photos/* — serve uploaded job photos
router.get("/jobs/photos/*objectKey", async (req: Request, res: Response): Promise<void> => {
  try {
    const objectKey = (req.params as Record<string, string>)["objectKey"];
    if (!objectKey) {
      res.status(400).json({ error: "Missing object key" });
      return;
    }
    const bucketId = process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID;
    if (!bucketId) {
      res.status(500).json({ error: "Storage not configured" });
      return;
    }
    const bucket = objectStorageClient.bucket(bucketId);
    const file = bucket.file(objectKey);
    const [exists] = await file.exists();
    if (!exists) {
      res.status(404).json({ error: "Photo not found" });
      return;
    }
    const [metadata] = await file.getMetadata();
    res.setHeader("Content-Type", (metadata.contentType as string) || "image/jpeg");
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    file.createReadStream().pipe(res);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/jobs/estimate — public (AI pricing estimate)
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
          source: {
            type: "base64",
            media_type: mt,
            data: buffer.toString("base64"),
          },
        });
      } catch {
        // Skip unreadable images
      }
    }

    const prompt = `You are a junk removal pricing expert. Analyze these photos of items to be hauled away.

Service type: ${serviceType || "residential"}
${description ? `Customer description: ${description}` : ""}

Based on what you see, provide a JSON estimate with these exact fields:
- estimated_volume: string (e.g. "1/4 truck", "1/2 truck", "full truck")
- item_list: array of strings (list each visible item category)
- difficulty_score: integer 1-5 (1=easy, 5=very difficult/heavy)
- price_min: integer cents (minimum price)
- price_max: integer cents (maximum price)
- price_estimated: integer cents (best estimate, using $18/cubic yard as baseline, truck capacity ~450 cubic feet)

Respond ONLY with valid JSON, no other text.`;

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 8192,
      messages: [
        {
          role: "user",
          content: [
            ...imageBlocks,
            { type: "text", text: prompt },
          ],
        },
      ],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      res.status(500).json({ error: "No response from AI" });
      return;
    }

    let estimate: Record<string, unknown>;
    try {
      const jsonMatch = textBlock.text.match(/\{[\s\S]*\}/);
      estimate = JSON.parse(jsonMatch ? jsonMatch[0] : textBlock.text);
    } catch {
      // Fallback estimate if parsing fails
      estimate = {
        estimated_volume: "1/2 truck",
        item_list: ["Mixed items"],
        difficulty_score: 3,
        price_min: 14900,
        price_max: 24900,
        price_estimated: 18000,
      };
    }

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
    if (admin) {
      const { status, haulerId } = req.query;
      const conditions = [];
      if (typeof status === "string") conditions.push(eq(jobsTable.status, status as Job["status"]));
      if (typeof haulerId === "string") conditions.push(eq(jobsTable.haulerId, haulerId));
      const jobs = conditions.length > 0
        ? await db.select().from(jobsTable).where(and(...conditions)).orderBy(jobsTable.createdAt)
        : await db.select().from(jobsTable).orderBy(jobsTable.createdAt);
      res.json(jobs.reverse());
      return;
    }

    // Non-admin: scope to own assigned jobs only
    const haulerProfileId = await getHaulerProfileId(userId);
    if (!haulerProfileId) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    const jobs = await db
      .select()
      .from(jobsTable)
      .where(eq(jobsTable.haulerId, haulerProfileId))
      .orderBy(jobsTable.createdAt);
    res.json(jobs.reverse());
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/jobs — public (customer booking, no auth required)
router.post("/jobs", async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      serviceType, address, scheduledDate, scheduledTime, description,
      customerName, customerEmail, customerPhone, priceCents, photos, aiEstimate,
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
      status: "pending",
    }).returning();
    res.status(201).json(job);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/jobs/:id — admin sees any; hauler sees only their assigned job
router.get("/jobs/:id", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { userId } = req as AuthedRequest;
  const jobId = String(req.params["id"]);
  try {
    const [job] = await db.select().from(jobsTable).where(eq(jobsTable.id, jobId)).limit(1);
    if (!job) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    const admin = await isAdminUser(userId);
    if (admin) {
      res.json(job);
      return;
    }
    const haulerProfileId = await getHaulerProfileId(userId);
    if (!haulerProfileId || job.haulerId !== haulerProfileId) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    res.json(job);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /api/jobs/:id — admin can update any field; hauler can only update status on their own jobs
router.patch("/jobs/:id", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { userId } = req as AuthedRequest;
  const jobId = String(req.params["id"]);
  try {
    const [existing] = await db.select().from(jobsTable).where(eq(jobsTable.id, jobId)).limit(1);
    if (!existing) {
      res.status(404).json({ error: "Not found" });
      return;
    }

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
      // Non-admin: must own the job and can only update status
      const haulerProfileId = await getHaulerProfileId(userId);
      if (!haulerProfileId || existing.haulerId !== haulerProfileId) {
        res.status(403).json({ error: "Forbidden" });
        return;
      }
      if (status === undefined || typeof status !== "string") {
        res.status(400).json({ error: "Haulers may only update job status" });
        return;
      }
      updateFields["status"] = status as Job["status"];
    }

    const [job] = await db
      .update(jobsTable)
      .set(updateFields as Parameters<ReturnType<typeof db.update>["set"]>[0])
      .where(eq(jobsTable.id, jobId))
      .returning();
    res.json(job);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
