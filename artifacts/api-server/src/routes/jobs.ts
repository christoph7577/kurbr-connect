import { Router, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { jobsTable, haulerProfilesTable } from "@workspace/db";
import { type Job } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth, requireAdmin, isAdminUser, type AuthedRequest } from "../middlewares/auth";

const router = Router();

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
    const todayRevenueCents = jobs.reduce((sum, j) => sum + (j.priceCents ?? 0), 0);
    res.json({ total: jobs.length, active, unassigned, completed, todayRevenueCents });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/jobs/track/:token — public (customer tracking by high-entropy token)
// Returns only public-safe fields: no PII (customerEmail/Phone/Name excluded)
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
    const { serviceType, address, scheduledDate, scheduledTime, description, customerName, customerEmail, customerPhone, priceCents } = req.body as Record<string, unknown>;
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
    const { status, haulerId, scheduledDate, scheduledTime, description, priceCents } = req.body as Record<string, unknown>;

    const updateFields: Record<string, unknown> = { updatedAt: new Date() };

    if (admin) {
      if (status !== undefined) updateFields["status"] = status as Job["status"];
      if (haulerId !== undefined) updateFields["haulerId"] = haulerId as string | null;
      if (scheduledDate !== undefined) updateFields["scheduledDate"] = scheduledDate as string | null;
      if (scheduledTime !== undefined) updateFields["scheduledTime"] = scheduledTime as string | null;
      if (description !== undefined) updateFields["description"] = description as string | null;
      if (priceCents !== undefined) updateFields["priceCents"] = priceCents as number | null;
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
