import { Router, type Request, type Response } from "express";
import multer from "multer";
import rateLimit from "express-rate-limit";
import { db } from "@workspace/db";
import { haulerProfilesTable, profilesTable } from "@workspace/db";
import { type HaulerProfile } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth, requireAdmin, isAdminUser, type AuthedRequest } from "../middlewares/auth";
import { uploadHaulerDocument, getDocumentBuffer, isAllowedDocumentMimeType } from "../lib/storage";

const router = Router();

const docUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 1 }, // 10MB
});

const docUploadLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 20,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Too many uploads — please try again later" },
});

// Only object keys we issue from uploadHaulerDocument are servable
const HAULER_DOC_KEY_RE = /^hauler-docs\/[0-9a-f-]{36}\.(jpg|png|webp|pdf)$/;

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

// POST /api/haulers/admin — admin only — manually create a hauler (and optional
// placeholder profile row). Used by admin dashboard to onboard haulers without
// requiring them to sign up through the customer-facing flow.
router.post("/haulers/admin", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      businessName,
      contactName,
      contactEmail,
      contactPhone,
      licenseNumber,
      vehicleType,
      vehiclePlate,
      serviceAreas,
      status,
    } = req.body as Record<string, unknown>;

    if (typeof vehicleType !== "string" || !vehicleType.trim()) {
      res.status(400).json({ error: "vehicleType is required" }); return;
    }
    if (typeof vehiclePlate !== "string" || !vehiclePlate.trim()) {
      res.status(400).json({ error: "vehiclePlate is required" }); return;
    }
    if (typeof businessName !== "string" || !businessName.trim()) {
      res.status(400).json({ error: "businessName is required" }); return;
    }

    // Synthetic userId for haulers added manually (no Clerk account yet).
    // When they later sign up with the same email, profile bootstrap can be linked.
    const userId = `manual_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

    // Create a placeholder profile row so /haulers GET join displays contact info
    if (typeof contactEmail === "string" && contactEmail.trim()) {
      await db.insert(profilesTable).values({
        id: userId,
        fullName: typeof contactName === "string" ? contactName : null,
        email: contactEmail,
        phone: typeof contactPhone === "string" ? contactPhone : null,
        role: "hauler",
      }).onConflictDoNothing();
    }

    const validStatus = ["pending", "approved", "rejected", "suspended"];
    const haulerStatus = typeof status === "string" && validStatus.includes(status)
      ? (status as HaulerProfile["status"])
      : "approved";

    const [hauler] = await db.insert(haulerProfilesTable).values({
      userId,
      businessName,
      licenseNumber: typeof licenseNumber === "string" ? licenseNumber : null,
      vehicleType,
      vehiclePlate,
      serviceAreas: Array.isArray(serviceAreas) ? serviceAreas as string[] : [],
      status: haulerStatus,
      backgroundCheckConsent: false,
      trainingCompleted: false,
      documents: [],
    }).returning();

    const [profile] = await db
      .select()
      .from(profilesTable)
      .where(eq(profilesTable.id, userId))
      .limit(1);

    res.status(201).json({
      ...hauler,
      profileName: profile?.fullName ?? null,
      profileEmail: profile?.email ?? null,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /api/haulers/:id — admin only
router.delete("/haulers/:id", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const haulerId = String(req.params["id"]);
  try {
    const [existing] = await db
      .select({ id: haulerProfilesTable.id })
      .from(haulerProfilesTable)
      .where(eq(haulerProfilesTable.id, haulerId))
      .limit(1);
    if (!existing) { res.status(404).json({ error: "Not found" }); return; }
    await db.delete(haulerProfilesTable).where(eq(haulerProfilesTable.id, haulerId));
    res.json({ ok: true });
  } catch (err) {
    req.log.error(err);
    // Most likely cause: existing jobs reference this hauler (FK constraint)
    res.status(409).json({ error: "Cannot delete hauler — they are referenced by existing jobs. Reassign or delete those jobs first." });
  }
});

// POST /api/haulers/documents — authenticated upload of a single hauler onboarding doc
router.post(
  "/haulers/documents",
  requireAuth,
  docUploadLimiter,
  docUpload.single("file"),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const file = req.file;
      if (!file) {
        res.status(400).json({ error: "No file provided" });
        return;
      }
      if (!isAllowedDocumentMimeType(file.mimetype)) {
        res.status(400).json({ error: "Unsupported file type. Use PDF, JPG, PNG, or WEBP." });
        return;
      }
      const objectKey = await uploadHaulerDocument(file.buffer, file.mimetype);
      res.status(201).json({
        url: `/api/haulers/documents/${objectKey}`,
        filename: file.originalname,
        mimeType: file.mimetype,
        sizeBytes: file.size,
      });
    } catch (err) {
      req.log.error(err);
      res.status(500).json({ error: "Upload failed" });
    }
  },
);

// GET /api/haulers/documents/hauler-docs/<uuid>.<ext> — auth: admin OR owning hauler
router.get(
  "/haulers/documents/*objectKey",
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    const { userId } = req as AuthedRequest;
    try {
      const raw = req.params["objectKey"];
      const objectKey = Array.isArray(raw) ? raw.join("/") : String(raw ?? "");
      if (!HAULER_DOC_KEY_RE.test(objectKey)) {
        res.status(400).json({ error: "Invalid object key" });
        return;
      }
      const admin = await isAdminUser(userId);
      if (!admin) {
        // Caller must own a hauler profile whose documents reference this URL
        const [hauler] = await db
          .select({ documents: haulerProfilesTable.documents })
          .from(haulerProfilesTable)
          .where(eq(haulerProfilesTable.userId, userId))
          .limit(1);
        const refUrl = `/api/haulers/documents/${objectKey}`;
        const owned = (hauler?.documents ?? []).some(
          (d) => typeof (d as { url?: unknown }).url === "string" && (d as { url: string }).url === refUrl,
        );
        if (!owned) {
          res.status(403).json({ error: "Forbidden" });
          return;
        }
      }
      const { buffer, mimeType } = await getDocumentBuffer(objectKey);
      res.setHeader("Content-Type", mimeType);
      res.setHeader("Cache-Control", "private, max-age=300");
      res.send(buffer);
    } catch (err) {
      req.log.error(err);
      res.status(404).json({ error: "Not found" });
    }
  },
);

export default router;
