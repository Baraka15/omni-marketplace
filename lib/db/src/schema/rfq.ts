import { pgTable, text, timestamp, integer, numeric, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { productsTable } from "./products";

export const rfqStatusEnum = pgEnum("rfq_status", ["pending", "quoted", "accepted", "rejected", "expired"]);

export const rfqTable = pgTable("rfq", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  buyerId: text("buyer_id").notNull(),
  buyerCompany: text("buyer_company").notNull(),
  productId: text("product_id").notNull().references(() => productsTable.id),
  quantity: integer("quantity").notNull(),
  description: text("description").notNull().default(""),
  targetPrice: numeric("target_price", { precision: 12, scale: 2 }),
  status: rfqStatusEnum("status").notNull().default("pending"),
  quotedPrice: numeric("quoted_price", { precision: 12, scale: 2 }),
  quotedNote: text("quoted_note"),
  validUntil: timestamp("valid_until"),
  deliveryDate: timestamp("delivery_date"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertRfqSchema = createInsertSchema(rfqTable).omit({ id: true, createdAt: true, updatedAt: true });
export type Rfq = typeof rfqTable.$inferSelect;
export type InsertRfq = z.infer<typeof insertRfqSchema>;
