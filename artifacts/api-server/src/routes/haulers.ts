import { Router, type Request, type Response, type NextFunction } from "express";
import { db } from "@workspace/db";
import { haulerProfilesTable, profilesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { getAuth } from "@clerk/express";

const router = Router();

function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const auth = getAuth(req);
  if (!auth?.userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  (req as any).userId = auth.userId;
  next();
}

// GET /api/haulers/me
router.get("/haulers/me", requireAuth, async (req: any, res: Response): Promise<void> => {
  try {
    const [hauler] = await db.select().from(haulerProfilesTable).where(eq(haulerProfilesTable.userId, req.userId));
    if (!hauler) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    const [profile] = await db.select().from(profilesTable).where(eq(profilesTable.id, req.userId));
    res.json({
      ...hauler,
      profileName: profile?.fullName || null,
      profileEmail: profile?.email || null,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/haulers
router.get("/haulers", requireAuth, async (req: any, res: Response): Promise<void> => {
  try {
    const { status } = req.query as any;
    let haulers = status
      ? await db.select().from(haulerProfilesTable).where(eq(haulerProfilesTable.status, status as any))
      : await db.select().from(haulerProfilesTable);

    haulers = haulers.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const profiles = haulers.length > 0 ? await db.select().from(profilesTable) : [];
    const profileMap = new Map(profiles.map((p) => [p.id, p]));

    const result = haulers.map((h) => {
      const profile = profileMap.get(h.userId);
      return {
        ...h,
        profileName: profile?.fullName || null,
        profileEmail: profile?.email || null,
      };
    });

    res.json(result);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/haulers
router.post("/haulers", async (req: any, res: Response): Promise<void> => {
  try {
    const { userId, businessName, licenseNumber, vehicleType, vehiclePlate, serviceAreas, backgroundCheckConsent, trainingCompleted, documents } = req.body;
    if (!userId || !vehicleType || !vehiclePlate) {
      res.status(400).json({ error: "userId, vehicleType, and vehiclePlate are required" });
      return;
    }
    const [hauler] = await db.insert(haulerProfilesTable).values({
      userId,
      businessName: businessName || null,
      licenseNumber: licenseNumber || null,
      vehicleType,
      vehiclePlate,
      serviceAreas: serviceAreas || [],
      backgroundCheckConsent: backgroundCheckConsent || false,
      backgroundCheckDate: backgroundCheckConsent ? new Date().toISOString() : null,
      trainingCompleted: trainingCompleted || false,
      trainingCompletedDate: trainingCompleted ? new Date().toISOString() : null,
      documents: documents || [],
    }).returning();
    res.status(201).json(hauler);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /api/haulers/:id
router.patch("/haulers/:id", requireAuth, async (req: any, res: Response): Promise<void> => {
  try {
    const { status, businessName, vehicleType, vehiclePlate } = req.body;
    const updates: Record<string, any> = { updatedAt: new Date() };
    if (status !== undefined) updates.status = status;
    if (businessName !== undefined) updates.businessName = businessName;
    if (vehicleType !== undefined) updates.vehicleType = vehicleType;
    if (vehiclePlate !== undefined) updates.vehiclePlate = vehiclePlate;
    const [hauler] = await db.update(haulerProfilesTable).set(updates).where(eq(haulerProfilesTable.id, req.params.id)).returning();
    if (!hauler) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    const [profile] = await db.select().from(profilesTable).where(eq(profilesTable.id, hauler.userId));
    res.json({
      ...hauler,
      profileName: profile?.fullName || null,
      profileEmail: profile?.email || null,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
