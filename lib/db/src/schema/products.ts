import { pgTable, text, timestamp, integer, numeric, boolean, jsonb, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { categoriesTable } from "./categories";
import { sellersTable } from "./sellers";

export const productStatusEnum = pgEnum("product_status", ["active", "inactive", "out_of_stock"]);

export const productsTable = pgTable("products", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  price: numeric("price", { precision: 12, scale: 2 }).notNull(),
  compareAtPrice: numeric("compare_at_price", { precision: 12, scale: 2 }),
  imageUrls: jsonb("image_urls").$type<string[]>().notNull().default([]),
  categoryId: text("category_id").notNull().references(() => categoriesTable.id),
  sellerId: text("seller_id").notNull().references(() => sellersTable.id),
  stock: integer("stock").notNull().default(0),
  reserved: integer("reserved").notNull().default(0),
  sku: text("sku").notNull(),
  status: productStatusEnum("status").notNull().default("active"),
  rating: numeric("rating", { precision: 3, scale: 2 }),
  reviewCount: integer("review_count").notNull().default(0),
  isFeatured: boolean("is_featured").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertProductSchema = createInsertSchema(productsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Product = typeof productsTable.$inferSelect;
