import { pgTable, text, timestamp, integer, pgEnum, jsonb, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const jobStatusEnum = pgEnum("job_status", [
  "pending",
  "confirmed",
  "dispatched",
  "en_route",
  "arrived",
  "completed",
  "cancelled",
]);

export const jobsTable = pgTable("jobs", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  jobNumber: text("job_number").notNull().unique(),
  trackingToken: text("tracking_token").notNull().unique().$defaultFn(() => crypto.randomUUID()),
  serviceType: text("service_type").notNull(),
  address: text("address").notNull(),
  scheduledDate: text("scheduled_date"),
  scheduledTime: text("scheduled_time"),
  description: text("description"),
  customerName: text("customer_name"),
  customerEmail: text("customer_email"),
  customerPhone: text("customer_phone"),
  customerId: text("customer_id"),
  haulerId: text("hauler_id").references(() => haulerProfilesTable.id),
  priceCents: integer("price_cents"),
  photos: text("photos").array(),
  aiEstimate: jsonb("ai_estimate"),
  smsOptIn: boolean("sms_opt_in").default(false).notNull(),
  status: jobStatusEnum("status").default("pending").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Forward reference needed
import { haulerProfilesTable } from "./haulerProfiles";

export const insertJobSchema = createInsertSchema(jobsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertJob = z.infer<typeof insertJobSchema>;
export type Job = typeof jobsTable.$inferSelect;
