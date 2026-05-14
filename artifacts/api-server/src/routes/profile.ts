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

export default router;
