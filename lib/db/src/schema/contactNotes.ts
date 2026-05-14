import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { jobsTable } from "./jobs";

export const contactNotesTable = pgTable("contact_notes", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  jobId: text("job_id").notNull().references(() => jobsTable.id, { onDelete: "cascade" }),
  haulerName: text("hauler_name"),
  contactType: text("contact_type").notNull(),
  note: text("note"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type ContactNote = typeof contactNotesTable.$inferSelect;
