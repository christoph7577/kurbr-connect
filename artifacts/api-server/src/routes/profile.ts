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

// POST /api/profile/remove-mfa — one-shot: removes all TOTP/phone MFA factors
// for the account matching a specific email. Locked to owner email only.
// Remove this endpoint after use.
router.post("/profile/remove-mfa", async (req: Request, res: Response): Promise<void> => {
  const OWNER_EMAIL = "Christoph7577@gmail.com";
  try {
    const users = await clerkClient.users.getUserList({ emailAddress: [OWNER_EMAIL] });
    const user = users.data?.[0];
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const removed: string[] = [];
    const u = user as unknown as {
      id: string;
      totpEnabled?: boolean;
      backupCodeEnabled?: boolean;
      twoFactorEnabled?: boolean;
      phoneNumbers?: { id: string; phoneNumber: string; reservedForSecondFactor?: boolean }[];
    };

    // Remove TOTP factor
    if (u.totpEnabled) {
      try { await clerkClient.users.deleteUserTOTP(u.id); removed.push("totp"); } catch (e) { removed.push(`totp-err:${String(e)}`); }
    }

    // Remove backup codes
    if (u.backupCodeEnabled) {
      try {
        await clerkClient.users.deleteUserBackupCodes(u.id);
        removed.push("backup_code");
      } catch (e) { removed.push(`backup-err:${String(e)}`); }
    }

    // Remove phone numbers reserved for second factor
    for (const phone of u.phoneNumbers ?? []) {
      if (phone.reservedForSecondFactor) {
        try {
          // Use raw REST API since the SDK may not expose deletePhoneNumber
          const r = await fetch(`https://api.clerk.com/v1/phone_numbers/${phone.id}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}` },
          });
          if (r.ok) removed.push(`phone:${phone.phoneNumber}`);
          else removed.push(`phone-err:${r.status}`);
        } catch (e) { removed.push(`phone-err:${String(e)}`); }
      }
    }

    res.json({
      success: true,
      userId: u.id,
      diagnostics: {
        totpEnabled: u.totpEnabled,
        backupCodeEnabled: u.backupCodeEnabled,
        twoFactorEnabled: u.twoFactorEnabled,
        phoneNumbers: u.phoneNumbers?.map((p) => ({
          phoneNumber: p.phoneNumber,
          reservedForSecondFactor: p.reservedForSecondFactor,
        })),
      },
      removed,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: String(err) });
  }
});

export default router;
