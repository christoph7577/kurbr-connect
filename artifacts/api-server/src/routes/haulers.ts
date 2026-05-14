import { Router, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { haulerProfilesTable, profilesTable } from "@workspace/db";
import { type HaulerProfile } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth, requireAdmin, type AuthedRequest } from "../middlewares/auth";

const router = Router();

// GET /api/haulers/me — authenticated hauler, own profile only
router.get("/haulers/me", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { userId } = req as AuthedRequest;
  try {
    const [hauler] = await db
      .select()
      .from(haulerProfilesTable)
      .where(eq(haulerProfilesTable.userId, userId))
      .limit(1);
    if (!hauler) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    const [profile] = await db
      .select()
      .from(profilesTable)
      .where(eq(profilesTable.id, userId))
      .limit(1);
    res.json({
      ...hauler,
      profileName: profile?.fullName ?? null,
      profileEmail: profile?.email ?? null,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/haulers — admin only
router.get("/haulers", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const { status } = req.query;
    const haulers = typeof status === "string"
      ? await db.select().from(haulerProfilesTable).where(eq(haulerProfilesTable.status, status as HaulerProfile["status"]))
      : await db.select().from(haulerProfilesTable);

    haulers.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const profiles = haulers.length > 0 ? await db.select().from(profilesTable) : [];
    const profileMap = new Map(profiles.map((p) => [p.id, p]));

    const result = haulers.map((h) => {
      const profile = profileMap.get(h.userId);
      return {
        ...h,
        profileName: profile?.fullName ?? null,
        profileEmail: profile?.email ?? null,
      };
    });

    res.json(result);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/haulers — authenticated (onboarding application; userId derived from session)
router.post("/haulers", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { userId } = req as AuthedRequest;
  try {
    const { businessName, licenseNumber, vehicleType, vehiclePlate, serviceAreas, backgroundCheckConsent, trainingCompleted, documents } = req.body as Record<string, unknown>;
    if (typeof vehicleType !== "string" || !vehicleType || typeof vehiclePlate !== "string" || !vehiclePlate) {
      res.status(400).json({ error: "vehicleType and vehiclePlate are required" });
      return;
    }
    const [hauler] = await db.insert(haulerProfilesTable).values({
      userId,
      businessName: typeof businessName === "string" ? businessName : null,
      licenseNumber: typeof licenseNumber === "string" ? licenseNumber : null,
      vehicleType,
      vehiclePlate,
      serviceAreas: Array.isArray(serviceAreas) ? serviceAreas as string[] : [],
      backgroundCheckConsent: backgroundCheckConsent === true,
      backgroundCheckDate: backgroundCheckConsent === true ? new Date().toISOString() : null,
      trainingCompleted: trainingCompleted === true,
      trainingCompletedDate: trainingCompleted === true ? new Date().toISOString() : null,
      documents: Array.isArray(documents) ? documents as { type: string; uploaded: boolean }[] : [],
    }).returning();
    res.status(201).json(hauler);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /api/haulers/:id/location — authenticated hauler, own profile only
router.patch("/haulers/:id/location", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { userId } = req as AuthedRequest;
  const haulerId = String(req.params["id"]);
  try {
    const [hauler] = await db
      .select({ id: haulerProfilesTable.id, userId: haulerProfilesTable.userId, status: haulerProfilesTable.status })
      .from(haulerProfilesTable)
      .where(eq(haulerProfilesTable.id, haulerId))
      .limit(1);
    if (!hauler) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    if (hauler.userId !== userId) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    if (hauler.status !== "approved") {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    const { lat, lng } = req.body as Record<string, unknown>;
    if (typeof lat !== "number" || typeof lng !== "number") {
      res.status(400).json({ error: "lat and lng must be numbers" });
      return;
    }
    const [updated] = await db
      .update(haulerProfilesTable)
      .set({ currentLat: lat, currentLng: lng, locationUpdatedAt: new Date(), updatedAt: new Date() })
      .where(eq(haulerProfilesTable.id, haulerId))
      .returning();
    res.json({ id: updated.id, currentLat: updated.currentLat, currentLng: updated.currentLng, locationUpdatedAt: updated.locationUpdatedAt });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /api/haulers/:id — admin only (approvals, status changes)
router.patch("/haulers/:id", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const haulerId = String(req.params["id"]);
  try {
    const { status, businessName, vehicleType, vehiclePlate } = req.body as Record<string, unknown>;
    const updateFields: Record<string, unknown> = { updatedAt: new Date() };
    if (status !== undefined) updateFields["status"] = status as HaulerProfile["status"];
    if (businessName !== undefined) updateFields["businessName"] = businessName as string | null;
    if (vehicleType !== undefined) updateFields["vehicleType"] = vehicleType as string | null;
    if (vehiclePlate !== undefined) updateFields["vehiclePlate"] = vehiclePlate as string | null;

    const [hauler] = await db
      .update(haulerProfilesTable)
      .set(updateFields as Parameters<ReturnType<typeof db.update>["set"]>[0])
      .where(eq(haulerProfilesTable.id, haulerId))
      .returning();
    if (!hauler) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    const [profile] = await db
      .select()
      .from(profilesTable)
      .where(eq(profilesTable.id, hauler.userId))
      .limit(1);
    res.json({
      ...hauler,
      profileName: profile?.fullName ?? null,
      profileEmail: profile?.email ?? null,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
