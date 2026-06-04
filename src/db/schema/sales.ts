import { pgTable, serial, text, numeric, integer, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const salesTable = pgTable("sales", {
  id: serial("id").primaryKey(),
  date: date("date").notNull(),
  region: text("region").notNull(),
  category: text("category").notNull(),
  product: text("product").notNull(),
  revenue: numeric("revenue", { precision: 12, scale: 2 }).notNull(),
  units: integer("units").notNull(),
}); 

export const insertSaleSchema = createInsertSchema(salesTable).omit({ id: true });
export type InsertSale = z.infer<typeof insertSaleSchema>;
export type Sale = typeof salesTable.$inferSelect;
