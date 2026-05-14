import { pgTable, text, timestamp, boolean, json, pgEnum, doublePrecision } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const haulerStatusEnum = pgEnum("hauler_status", [
  "pending",
  "approved",
  "rejected",
  "suspended",
]);

export const haulerProfilesTable = pgTable("hauler_profiles", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull(),
  businessName: text("business_name"),
  licenseNumber: text("license_number"),
  vehicleType: text("vehicle_type"),
  vehiclePlate: text("vehicle_plate"),
  serviceAreas: json("service_areas").$type<string[]>().default([]),
  backgroundCheckConsent: boolean("background_check_consent").default(false),
  backgroundCheckDate: text("background_check_date"),
  trainingCompleted: boolean("training_completed").default(false),
  trainingCompletedDate: text("training_completed_date"),
  documents: json("documents").$type<{ type: string; uploaded: boolean }[]>().default([]),
  status: haulerStatusEnum("status").default("pending").notNull(),
  currentLat: doublePrecision("current_lat"),
  currentLng: doublePrecision("current_lng"),
  locationUpdatedAt: timestamp("location_updated_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertHaulerProfileSchema = createInsertSchema(haulerProfilesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertHaulerProfile = z.infer<typeof insertHaulerProfileSchema>;
export type HaulerProfile = typeof haulerProfilesTable.$inferSelect;
