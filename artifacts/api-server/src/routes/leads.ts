import { Router, type Request, type Response } from "express";
import { db } from "@workspace/db";
import {
  haulerLeadsTable,
  haulerCallLogsTable,
  haulerProfilesTable,
  type HaulerLead,
  type HaulerCallLog,
} from "@workspace/db";
import { eq, desc, sql } from "drizzle-orm";
import { requireAuth, requireAdmin, type AuthedRequest } from "../middlewares/auth";

const router = Router();

// Canonicalize US phone numbers so that "(801) 555-1234", "8015551234",
// "+1 801 555 1234" and "1-801-555-1234" all collide on the unique index.
// Strips non-digits, then drops a leading "1" for 11-digit numbers (NANP).
function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D+/g, "");
  if (digits.length === 11 && digits.startsWith("1")) return digits.slice(1);
  return digits;
}

const VALID_OUTCOMES = new Set([
  "no_answer",
  "voicemail",
  "interested",
  "not_interested",
  "callback_requested",
  "wrong_number",
  "do_not_call",
]);

const VALID_STATUSES = new Set([
  "new",
  "interested",
  "not_interested",
  "callback",
  "onboarded",
  "do_not_call",
]);

type LeadWithLogs = HaulerLead & { calls: HaulerCallLog[]; lastCalledAt: Date | null };

async function attachCallLogs(leads: HaulerLead[]): Promise<LeadWithLogs[]> {
  if (leads.length === 0) return [];
  const ids = leads.map((l) => l.id);
  const calls = await db
    .select()
    .from(haulerCallLogsTable)
    .where(sql`${haulerCallLogsTable.leadId} IN (${sql.join(ids.map((id) => sql`${id}`), sql`, `)})`)
    .orderBy(desc(haulerCallLogsTable.createdAt));
  const byLead = new Map<string, HaulerCallLog[]>();
  for (const c of calls) {
    const arr = byLead.get(c.leadId) ?? [];
    arr.push(c);
    byLead.set(c.leadId, arr);
  }
  return leads.map((l) => {
    const calls = byLead.get(l.id) ?? [];
    return { ...l, calls, lastCalledAt: calls[0]?.createdAt ?? null };
  });
}

// GET /api/leads — list all hauler leads (admin only)
router.get("/leads", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const leads = await db.select().from(haulerLeadsTable).orderBy(desc(haulerLeadsTable.createdAt));
    const enriched = await attachCallLogs(leads);
    res.json(enriched);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/leads — create a new lead (admin only), dedupes by normalized phone
router.post("/leads", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const { userId } = req as AuthedRequest;
  try {
    const body = req.body as Record<string, unknown>;
    const phone = typeof body["phone"] === "string" ? body["phone"].trim() : "";
    if (!phone || phone.replace(/\D+/g, "").length < 7) {
      res.status(400).json({ error: "A valid phone number is required" });
      return;
    }
    const phoneNormalized = normalizePhone(phone);

    const [existing] = await db
      .select()
      .from(haulerLeadsTable)
      .where(eq(haulerLeadsTable.phoneNormalized, phoneNormalized))
      .limit(1);

    if (existing) {
      res.status(409).json({
        error: "A lead with this phone number already exists.",
        existingLead: existing,
      });
      return;
    }

    const [lead] = await db
      .insert(haulerLeadsTable)
      .values({
        phone,
        phoneNormalized,
        name: typeof body["name"] === "string" && body["name"] ? (body["name"] as string) : null,
        email: typeof body["email"] === "string" && body["email"] ? (body["email"] as string) : null,
        location: typeof body["location"] === "string" && body["location"] ? (body["location"] as string) : null,
        source: typeof body["source"] === "string" && body["source"] ? (body["source"] as string) : null,
        notes: typeof body["notes"] === "string" && body["notes"] ? (body["notes"] as string) : null,
        createdByUserId: userId,
      })
      .returning();
    res.status(201).json({ ...lead, calls: [], lastCalledAt: null });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /api/leads/:id — update lead fields (admin only)
router.patch("/leads/:id", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const id = String(req.params["id"] ?? "");
  if (!id) {
    res.status(400).json({ error: "Missing id" });
    return;
  }
  try {
    const body = req.body as Record<string, unknown>;
    const update: Partial<typeof haulerLeadsTable.$inferInsert> = { updatedAt: new Date() };
    if (typeof body["name"] === "string") update.name = body["name"] || null;
    if (typeof body["email"] === "string") update.email = body["email"] || null;
    if (typeof body["location"] === "string") update.location = body["location"] || null;
    if (typeof body["source"] === "string") update.source = body["source"] || null;
    if (typeof body["notes"] === "string") update.notes = body["notes"];
    if (typeof body["status"] === "string" && VALID_STATUSES.has(body["status"] as string)) {
      update.status = body["status"] as typeof update.status;
    }
    if (typeof body["phone"] === "string" && body["phone"]) {
      const phone = (body["phone"] as string).trim();
      const normalized = normalizePhone(phone);
      if (normalized.length < 7) {
        res.status(400).json({ error: "Invalid phone number" });
        return;
      }
      // Reject if another lead already owns the normalized phone
      const [clash] = await db
        .select({ id: haulerLeadsTable.id })
        .from(haulerLeadsTable)
        .where(eq(haulerLeadsTable.phoneNormalized, normalized))
        .limit(1);
      if (clash && clash.id !== id) {
        res.status(409).json({ error: "Another lead already uses that phone number." });
        return;
      }
      update.phone = phone;
      update.phoneNormalized = normalized;
    }
    const [lead] = await db
      .update(haulerLeadsTable)
      .set(update)
      .where(eq(haulerLeadsTable.id, id))
      .returning();
    if (!lead) {
      res.status(404).json({ error: "Lead not found" });
      return;
    }
    res.json(lead);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /api/leads/:id (admin only)
router.delete("/leads/:id", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const id = String(req.params["id"] ?? "");
  if (!id) {
    res.status(400).json({ error: "Missing id" });
    return;
  }
  try {
    const [deleted] = await db.delete(haulerLeadsTable).where(eq(haulerLeadsTable.id, id)).returning({ id: haulerLeadsTable.id });
    if (!deleted) {
      res.status(404).json({ error: "Lead not found" });
      return;
    }
    res.json({ success: true });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/leads/:id/calls — log a call attempt and auto-update lead status
router.post("/leads/:id/calls", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const { userId } = req as AuthedRequest;
  const leadId = String(req.params["id"] ?? "");
  if (!leadId) {
    res.status(400).json({ error: "Missing id" });
    return;
  }
  try {
    const body = req.body as Record<string, unknown>;
    const outcome = typeof body["outcome"] === "string" ? body["outcome"] : "";
    if (!VALID_OUTCOMES.has(outcome)) {
      res.status(400).json({ error: "Invalid outcome" });
      return;
    }
    const [lead] = await db.select().from(haulerLeadsTable).where(eq(haulerLeadsTable.id, leadId)).limit(1);
    if (!lead) {
      res.status(404).json({ error: "Lead not found" });
      return;
    }
    const nextFollowUpRaw = body["nextFollowUpAt"];
    const nextFollowUpAt = typeof nextFollowUpRaw === "string" && nextFollowUpRaw
      ? new Date(nextFollowUpRaw)
      : null;

    const [call] = await db
      .insert(haulerCallLogsTable)
      .values({
        leadId,
        calledByUserId: userId,
        outcome: outcome as HaulerCallLog["outcome"],
        notes: typeof body["notes"] === "string" && body["notes"] ? (body["notes"] as string) : null,
        nextFollowUpAt,
      })
      .returning();

    // Auto-bump the lead's status from outcome (admins can still override later)
    const outcomeToStatus: Record<string, typeof haulerLeadsTable.$inferInsert.status> = {
      interested: "interested",
      not_interested: "not_interested",
      callback_requested: "callback",
      do_not_call: "do_not_call",
    };
    const newStatus = outcomeToStatus[outcome];
    if (newStatus && lead.status !== "onboarded") {
      await db
        .update(haulerLeadsTable)
        .set({ status: newStatus, updatedAt: new Date() })
        .where(eq(haulerLeadsTable.id, leadId));
    }

    res.status(201).json(call);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/leads/by-token/:token — public lookup so the hauler-onboarding flow can pre-fill
// from a lead invite link (returns ONLY the safe public fields, never notes or call logs).
router.get("/leads/by-token/:token", async (req: Request, res: Response): Promise<void> => {
  const token = String(req.params["token"] ?? "");
  if (!token) {
    res.status(400).json({ error: "Missing token" });
    return;
  }
  try {
    // Return ONLY the minimum fields needed to prefill the onboarding form.
    // Do not expose id, status, notes, source, or call logs.
    const [lead] = await db
      .select({
        name: haulerLeadsTable.name,
        email: haulerLeadsTable.email,
        phone: haulerLeadsTable.phone,
        location: haulerLeadsTable.location,
      })
      .from(haulerLeadsTable)
      .where(eq(haulerLeadsTable.onboardingToken, token))
      .limit(1);
    if (!lead) {
      res.status(404).json({ error: "Invalid invitation" });
      return;
    }
    res.json(lead);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/leads/by-token/:token/onboarded — authenticated: lead self-marks as onboarded
// after submitting the hauler onboarding form. Requires (a) a valid Clerk session and
// (b) an actual hauler profile for the caller, so a token alone cannot flip the status.
router.post(
  "/leads/by-token/:token/onboarded",
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    const { userId } = req as AuthedRequest;
    const token = String(req.params["token"] ?? "");
    if (!token) {
      res.status(400).json({ error: "Missing token" });
      return;
    }
    try {
      // Caller must have actually created a hauler profile in this Repl.
      const [profile] = await db
        .select({ id: haulerProfilesTable.id })
        .from(haulerProfilesTable)
        .where(eq(haulerProfilesTable.userId, userId))
        .limit(1);
      if (!profile) {
        res.status(403).json({ error: "No hauler profile found for caller" });
        return;
      }
      const [lead] = await db
        .update(haulerLeadsTable)
        .set({ status: "onboarded", updatedAt: new Date() })
        .where(eq(haulerLeadsTable.onboardingToken, token))
        .returning({ id: haulerLeadsTable.id });
      if (!lead) {
        res.status(404).json({ error: "Invalid invitation" });
        return;
      }
      res.json({ success: true });
    } catch (err) {
      req.log.error(err);
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

export default router;
