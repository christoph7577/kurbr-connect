import { Router, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { profilesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { createClerkClient } from "@clerk/express";
import { requireAuth, requireAdmin, type AuthedRequest } from "../middlewares/auth";

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

// GET /api/profile/admins — admin-only, list all current admins
router.get("/profile/admins", requireAdmin, async (_req: Request, res: Response): Promise<void> => {
  try {
    // Source of truth is Clerk publicMetadata.role (what auth checks read);
    // fetch a page of users and filter. Limit kept high enough for small teams.
    const { data: users } = await clerkClient.users.getUserList({ limit: 200 });
    const admins = users
      .filter((u) => u.publicMetadata?.["role"] === "admin")
      .map((u) => ({
        id: u.id,
        email: u.emailAddresses[0]?.emailAddress ?? null,
        fullName: [u.firstName, u.lastName].filter(Boolean).join(" ") || null,
        createdAt: u.createdAt,
      }));
    res.json(admins);
  } catch (err) {
    (_req as Request).log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/profile/admins — admin-only, promote a registered user (by email) to admin
router.post("/profile/admins", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body as { email?: unknown };
    if (typeof email !== "string" || !email.includes("@")) {
      res.status(400).json({ error: "Valid email required" });
      return;
    }
    const normalized = email.trim().toLowerCase();
    const { data: matches } = await clerkClient.users.getUserList({ emailAddress: [normalized] });
    if (matches.length === 0) {
      res.status(404).json({ error: "No registered user with that email. Ask them to sign up first." });
      return;
    }
    const target = matches[0];
    if (target.publicMetadata?.["role"] === "admin") {
      res.status(409).json({ error: "That user is already an admin." });
      return;
    }
    await clerkClient.users.updateUser(target.id, {
      publicMetadata: { ...target.publicMetadata, role: "admin" },
    });
    // Mirror to DB profile if it exists
    const [existing] = await db.select({ id: profilesTable.id }).from(profilesTable).where(eq(profilesTable.id, target.id)).limit(1);
    if (existing) {
      await db.update(profilesTable).set({ role: "admin" }).where(eq(profilesTable.id, target.id));
    } else {
      await db.insert(profilesTable).values({
        id: target.id,
        fullName: [target.firstName, target.lastName].filter(Boolean).join(" ") || null,
        email: target.emailAddresses[0]?.emailAddress ?? normalized,
        role: "admin",
      });
    }
    res.json({
      success: true,
      user: {
        id: target.id,
        email: target.emailAddresses[0]?.emailAddress ?? normalized,
        fullName: [target.firstName, target.lastName].filter(Boolean).join(" ") || null,
      },
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /api/profile/admins/:userId — admin-only, demote an admin to regular user.
// Guards: cannot demote yourself, cannot demote the last admin.
router.delete("/profile/admins/:userId", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const { userId: actingUserId } = req as AuthedRequest;
  const rawTargetId = (req.params as Record<string, string | string[]>)["userId"];
  const targetId = Array.isArray(rawTargetId) ? rawTargetId[0] : rawTargetId;
  try {
    if (!targetId) {
      res.status(400).json({ error: "Missing userId" });
      return;
    }
    if (targetId === actingUserId) {
      res.status(400).json({ error: "You cannot demote yourself. Ask another admin to do it." });
      return;
    }
    const target = await clerkClient.users.getUser(targetId);
    if (target.publicMetadata?.["role"] !== "admin") {
      res.status(409).json({ error: "That user is not an admin." });
      return;
    }
    // Safety: ensure at least one other admin remains
    const { data: users } = await clerkClient.users.getUserList({ limit: 200 });
    const otherAdmins = users.filter(
      (u) => u.id !== targetId && u.publicMetadata?.["role"] === "admin",
    );
    if (otherAdmins.length === 0) {
      res.status(400).json({ error: "Cannot remove the last admin." });
      return;
    }
    const { role: _role, ...restMetadata } = (target.publicMetadata ?? {}) as Record<string, unknown>;
    await clerkClient.users.updateUser(targetId, { publicMetadata: restMetadata });
    await db.update(profilesTable).set({ role: "user" }).where(eq(profilesTable.id, targetId));
    res.json({ success: true });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
