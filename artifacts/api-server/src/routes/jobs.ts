import { Router, type Request, type Response, type NextFunction } from "express";
import { db } from "@workspace/db";
import { jobsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { getAuth } from "@clerk/express";

const router = Router();

function requireAuth(req: Request & { userId?: string }, res: Response, next: NextFunction): void {
  const auth = getAuth(req);
  if (!auth?.userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  (req as any).userId = auth.userId;
  next();
}

let jobCounter = 1000;

async function generateJobNumber(): Promise<string> {
  const existing = await db.select({ jobNumber: jobsTable.jobNumber }).from(jobsTable);
  const nums = existing
    .map((j) => parseInt(j.jobNumber.replace("JOB-", ""), 10))
    .filter((n) => !isNaN(n));
  const max = nums.length > 0 ? Math.max(...nums) : jobCounter;
  jobCounter = max + 1;
  return `JOB-${jobCounter}`;
}

// GET /api/jobs/stats
router.get("/jobs/stats", requireAuth, async (req: any, res: Response): Promise<void> => {
  try {
    const jobs = await db.select().from(jobsTable);
    const active = jobs.filter((j) => !["completed", "cancelled"].includes(j.status)).length;
    const unassigned = jobs.filter((j) => !j.haulerId && !["completed", "cancelled"].includes(j.status)).length;
    const completed = jobs.filter((j) => j.status === "completed").length;
    const todayRevenueCents = jobs.reduce((sum, j) => sum + (j.priceCents || 0), 0);
    res.json({ total: jobs.length, active, unassigned, completed, todayRevenueCents });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/jobs/by-number/:jobNumber
router.get("/jobs/by-number/:jobNumber", async (req: any, res: Response): Promise<void> => {
  try {
    const job = await db.select().from(jobsTable).where(eq(jobsTable.jobNumber, req.params.jobNumber.toUpperCase())).limit(1);
    if (!job[0]) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.json(job[0]);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/jobs
router.get("/jobs", requireAuth, async (req: any, res: Response): Promise<void> => {
  try {
    const { status, haulerId } = req.query as any;
    const conditions = [];
    if (status) conditions.push(eq(jobsTable.status, status as any));
    if (haulerId) conditions.push(eq(jobsTable.haulerId, haulerId));
    const jobs = conditions.length > 0
      ? await db.select().from(jobsTable).where(and(...conditions)).orderBy(jobsTable.createdAt)
      : await db.select().from(jobsTable).orderBy(jobsTable.createdAt);
    res.json(jobs.reverse());
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/jobs
router.post("/jobs", async (req: any, res: Response): Promise<void> => {
  try {
    const { serviceType, address, scheduledDate, scheduledTime, description, customerName, customerEmail, customerPhone, priceCents } = req.body;
    if (!serviceType || !address) {
      res.status(400).json({ error: "serviceType and address are required" });
      return;
    }
    const jobNumber = await generateJobNumber();
    const [job] = await db.insert(jobsTable).values({
      jobNumber,
      serviceType,
      address,
      scheduledDate: scheduledDate || null,
      scheduledTime: scheduledTime || null,
      description: description || null,
      customerName: customerName || null,
      customerEmail: customerEmail || null,
      customerPhone: customerPhone || null,
      priceCents: priceCents || null,
      status: "pending",
    }).returning();
    res.status(201).json(job);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/jobs/:id
router.get("/jobs/:id", requireAuth, async (req: any, res: Response): Promise<void> => {
  try {
    const [job] = await db.select().from(jobsTable).where(eq(jobsTable.id, req.params.id));
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

// PATCH /api/jobs/:id
router.patch("/jobs/:id", requireAuth, async (req: any, res: Response): Promise<void> => {
  try {
    const { status, haulerId, scheduledDate, scheduledTime, description, priceCents } = req.body;
    const updates: Record<string, any> = { updatedAt: new Date() };
    if (status !== undefined) updates.status = status;
    if (haulerId !== undefined) updates.haulerId = haulerId;
    if (scheduledDate !== undefined) updates.scheduledDate = scheduledDate;
    if (scheduledTime !== undefined) updates.scheduledTime = scheduledTime;
    if (description !== undefined) updates.description = description;
    if (priceCents !== undefined) updates.priceCents = priceCents;
    const [job] = await db.update(jobsTable).set(updates).where(eq(jobsTable.id, req.params.id)).returning();
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

export default router;
