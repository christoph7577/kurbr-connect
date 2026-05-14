import { type Request, type Response, type NextFunction } from "express";
import { getAuth, createClerkClient } from "@clerk/express";

export interface AuthedRequest extends Request {
  userId: string;
}

const clerkClient = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY! });

export async function isAdminUser(userId: string): Promise<boolean> {
  try {
    const user = await clerkClient.users.getUser(userId);
    return user.publicMetadata?.role === "admin";
  } catch {
    return false;
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const auth = getAuth(req);
  if (!auth?.userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  (req as AuthedRequest).userId = auth.userId;
  next();
}

export async function requireAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
  const auth = getAuth(req);
  if (!auth?.userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const admin = await isAdminUser(auth.userId);
  if (!admin) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  (req as AuthedRequest).userId = auth.userId;
  next();
}
