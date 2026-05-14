import { Router, type Request, type Response, type NextFunction } from "express";
import { db } from "@workspace/db";
import { profilesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { getAuth } from "@clerk/express";
import { createClerkClient } from "@clerk/express";

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

// GET /api/profile/me — JIT-provision profile from Clerk, return with role
router.get("/profile/me", requireAuth, async (req: any, res: Response): Promise<void> => {
  try {
    let [profile] = await db.select().from(profilesTable).where(eq(profilesTable.id, req.userId));

    if (!profile) {
      try {
        const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
        const clerkUser = await clerk.users.getUser(req.userId);
        const email = clerkUser.emailAddresses[0]?.emailAddress || null;
        const fullName = [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") || null;
        const [created] = await db.insert(profilesTable).values({
          id: req.userId,
          fullName,
          email,
          role: "user",
        }).returning();
        profile = created;
      } catch {
        res.status(404).json({ error: "Profile not found" });
        return;
      }
    }

    res.json(profile);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
