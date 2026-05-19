import { pgTable, text, timestamp, pgEnum, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const leadStatusEnum = pgEnum("hauler_lead_status", [
  "new",
  "interested",
  "not_interested",
  "callback",
  "onboarded",
  "do_not_call",
]);

export const callOutcomeEnum = pgEnum("hauler_call_outcome", [
  "no_answer",
  "voicemail",
  "interested",
  "not_interested",
  "callback_requested",
  "wrong_number",
  "do_not_call",
]);

export const haulerLeadsTable = pgTable(
  "hauler_leads",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    name: text("name"),
    phone: text("phone").notNull(),
    phoneNormalized: text("phone_normalized").notNull(),
    email: text("email"),
    location: text("location"),
    source: text("source"),
    notes: text("notes"),
    onboardingToken: text("onboarding_token").notNull().unique().$defaultFn(() => crypto.randomUUID()),
    status: leadStatusEnum("status").default("new").notNull(),
    haulerProfileId: text("hauler_profile_id"),
    createdByUserId: text("created_by_user_id").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => ({
    phoneIdx: uniqueIndex("hauler_leads_phone_normalized_idx").on(t.phoneNormalized),
  }),
);

export const haulerCallLogsTable = pgTable("hauler_call_logs", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  leadId: text("lead_id")
    .notNull()
    .references(() => haulerLeadsTable.id, { onDelete: "cascade" }),
  calledByUserId: text("called_by_user_id").notNull(),
  outcome: callOutcomeEnum("outcome").notNull(),
  notes: text("notes"),
  nextFollowUpAt: timestamp("next_follow_up_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertHaulerLeadSchema = createInsertSchema(haulerLeadsTable, {
  phone: z.string().min(7),
  email: z.string().email().nullable().optional(),
}).omit({ id: true, phoneNormalized: true, onboardingToken: true, createdAt: true, updatedAt: true, createdByUserId: true });

export const insertCallLogSchema = createInsertSchema(haulerCallLogsTable).omit({
  id: true,
  createdAt: true,
  calledByUserId: true,
});

export type HaulerLead = typeof haulerLeadsTable.$inferSelect;
export type HaulerCallLog = typeof haulerCallLogsTable.$inferSelect;
