import { Router, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { profilesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { createClerkClient } from "@clerk/express";
import { requireAuth, type AuthedRequest } from "../middlewares/auth";

const router = Router();
const clerkClient = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY! });

// GET /api/profile/me — JIT-provision profile from Clerk, return with role
router.get("/profile/me", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { userId } = req as AuthedRequest;
  try {
    let [profile] = await db.select().from(profilesTable).where(eq(profilesTable.id, userId)).limit(1);

    if (!profile) {
      const clerkUser = await clerkClient.users.getUser(userId);
      const email = clerkUser.emailAddresses[0]?.emailAddress ?? null;
      const fullName = [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") || null;
      const [created] = await db.insert(profilesTable).values({
        id: userId,
        fullName,
        email,
        role: "user",
      }).returning();
      profile = created;
    }

    res.json(profile);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/profile/bootstrap-admin — one-shot: promotes current user to admin
// if no admin exists yet. Safe to leave deployed; rejects subsequent calls.
router.post("/profile/bootstrap-admin", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { userId } = req as AuthedRequest;
  try {
    const [existingAdmin] = await db
      .select({ id: profilesTable.id })
      .from(profilesTable)
      .where(eq(profilesTable.role, "admin"))
      .limit(1);

    if (existingAdmin) {
      res.status(403).json({ error: "Admin already exists. Bootstrap is disabled." });
      return;
    }

    const clerkUser = await clerkClient.users.getUser(userId);
    await clerkClient.users.updateUser(userId, {
      publicMetadata: { ...clerkUser.publicMetadata, role: "admin" },
    });

    // Ensure DB profile exists, then mark as admin (the JIT-provision in /profile/me
    // may not have run yet for this user)
    const [existingProfile] = await db
      .select({ id: profilesTable.id })
      .from(profilesTable)
      .where(eq(profilesTable.id, userId))
      .limit(1);

    if (existingProfile) {
      await db.update(profilesTable).set({ role: "admin" }).where(eq(profilesTable.id, userId));
    } else {
      const email = clerkUser.emailAddresses[0]?.emailAddress ?? null;
      const fullName = [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") || null;
      await db.insert(profilesTable).values({ id: userId, fullName, email, role: "admin" });
    }

    res.json({ success: true, message: "You are admin. Sign out and back in for the session to refresh." });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
