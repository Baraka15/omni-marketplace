import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  productsTable,
  categoriesTable,
  sellersTable,
} from "@workspace/db";
import {
  eq,
  ilike,
  and,
  gte,
  lte,
  desc,
  asc,
  sql,
  count,
} from "drizzle-orm";
import { requireAuth, getCurrentUserId } from "../lib/auth";

const router: IRouter = Router();

router.get("/products/featured", async (_req, res) => {
  const products = await db
    .select({
      id: productsTable.id,
      name: productsTable.name,
      description: productsTable.description,
      price: productsTable.price,
      compareAtPrice: productsTable.compareAtPrice,
      imageUrls: productsTable.imageUrls,
      categoryId: productsTable.categoryId,
      categoryName: categoriesTable.name,
      sellerId: productsTable.sellerId,
      sellerName: sellersTable.storeName,
      stock: productsTable.stock,
      sku: productsTable.sku,
      status: productsTable.status,
      rating: productsTable.rating,
      reviewCount: productsTable.reviewCount,
      isFeatured: productsTable.isFeatured,
      createdAt: productsTable.createdAt,
    })
    .from(productsTable)
    .innerJoin(categoriesTable, eq(productsTable.categoryId, categoriesTable.id))
    .innerJoin(sellersTable, eq(productsTable.sellerId, sellersTable.id))
    .where(and(eq(productsTable.isFeatured, true), eq(productsTable.status, "active")))
    .limit(12);

  res.json(products.map(normalizeProduct));
});

router.get("/products", async (req, res) => {
  const {
    search,
    categoryId,
    minPrice,
    maxPrice,
    page = "1",
    limit = "24",
    sortBy = "newest",
  } = req.query as Record<string, string>;

  const pageNum = parseInt(page, 10);
  const limitNum = Math.min(parseInt(limit, 10), 100);
  const offset = (pageNum - 1) * limitNum;

  const conditions = [eq(productsTable.status, "active")];
  if (search) conditions.push(ilike(productsTable.name, `%${search}%`));
  if (categoryId) conditions.push(eq(productsTable.categoryId, categoryId));
  if (minPrice) conditions.push(gte(productsTable.price, minPrice));
  if (maxPrice) conditions.push(lte(productsTable.price, maxPrice));

  const whereClause = and(...conditions);

  const orderClause = {
    price_asc: asc(productsTable.price),
    price_desc: desc(productsTable.price),
    newest: desc(productsTable.createdAt),
    popular: desc(productsTable.reviewCount),
  }[sortBy] ?? desc(productsTable.createdAt);

  const [items, [{ total }]] = await Promise.all([
    db
      .select({
        id: productsTable.id,
        name: productsTable.name,
        description: productsTable.description,
        price: productsTable.price,
        compareAtPrice: productsTable.compareAtPrice,
        imageUrls: productsTable.imageUrls,
        categoryId: productsTable.categoryId,
        categoryName: categoriesTable.name,
        sellerId: productsTable.sellerId,
        sellerName: sellersTable.storeName,
        stock: productsTable.stock,
        sku: productsTable.sku,
        status: productsTable.status,
        rating: productsTable.rating,
        reviewCount: productsTable.reviewCount,
        isFeatured: productsTable.isFeatured,
        createdAt: productsTable.createdAt,
      })
      .from(productsTable)
      .innerJoin(categoriesTable, eq(productsTable.categoryId, categoriesTable.id))
      .innerJoin(sellersTable, eq(productsTable.sellerId, sellersTable.id))
      .where(whereClause)
      .orderBy(orderClause)
      .limit(limitNum)
      .offset(offset),
    db.select({ total: count() }).from(productsTable).where(whereClause),
  ]);

  res.json({
    items: items.map(normalizeProduct),
    total: Number(total),
    page: pageNum,
    limit: limitNum,
    totalPages: Math.ceil(Number(total) / limitNum),
  });
});

router.get("/products/:productId", async (req, res) => {
  const productId = req.params.productId as string;
  const [product] = await db
    .select({
      id: productsTable.id,
      name: productsTable.name,
      description: productsTable.description,
      price: productsTable.price,
      compareAtPrice: productsTable.compareAtPrice,
      imageUrls: productsTable.imageUrls,
      categoryId: productsTable.categoryId,
      categoryName: categoriesTable.name,
      sellerId: productsTable.sellerId,
      sellerName: sellersTable.storeName,
      stock: productsTable.stock,
      sku: productsTable.sku,
      status: productsTable.status,
      rating: productsTable.rating,
      reviewCount: productsTable.reviewCount,
      isFeatured: productsTable.isFeatured,
      createdAt: productsTable.createdAt,
    })
    .from(productsTable)
    .innerJoin(categoriesTable, eq(productsTable.categoryId, categoriesTable.id))
    .innerJoin(sellersTable, eq(productsTable.sellerId, sellersTable.id))
    .where(eq(productsTable.id, productId));

  if (!product) {
    res.status(404).json({ error: "Product not found" });
    return;
  }
  res.json(normalizeProduct(product));
});

router.get("/products/:productId/inventory", async (req, res) => {
  const productId = req.params.productId as string;
  const [product] = await db
    .select({ stock: productsTable.stock, reserved: productsTable.reserved })
    .from(productsTable)
    .where(eq(productsTable.id, productId));

  if (!product) {
    res.status(404).json({ error: "Product not found" });
    return;
  }

  res.json({
    productId,
    stock: product.stock,
    reserved: product.reserved,
    available: Math.max(0, product.stock - product.reserved),
  });
});

router.post("/products", requireAuth, async (req, res) => {
  const userId = getCurrentUserId(req)!;
  const [seller] = await db
    .select()
    .from(sellersTable)
    .where(eq(sellersTable.userId, userId));

  if (!seller) {
    res.status(403).json({ error: "Seller profile required" });
    return;
  }

  const { name, description, price, compareAtPrice, imageUrls, categoryId, stock, sku } = req.body;

  const [product] = await db
    .insert(productsTable)
    .values({
      name,
      description,
      price: String(price),
      compareAtPrice: compareAtPrice ? String(compareAtPrice) : null,
      imageUrls: imageUrls || [],
      categoryId,
      sellerId: seller.id,
      stock: Number(stock),
      sku,
      status: "active",
    })
    .returning();

  const [created] = await db
    .select({
      id: productsTable.id,
      name: productsTable.name,
      description: productsTable.description,
      price: productsTable.price,
      compareAtPrice: productsTable.compareAtPrice,
      imageUrls: productsTable.imageUrls,
      categoryId: productsTable.categoryId,
      categoryName: categoriesTable.name,
      sellerId: productsTable.sellerId,
      sellerName: sellersTable.storeName,
      stock: productsTable.stock,
      sku: productsTable.sku,
      status: productsTable.status,
      rating: productsTable.rating,
      reviewCount: productsTable.reviewCount,
      isFeatured: productsTable.isFeatured,
      createdAt: productsTable.createdAt,
    })
    .from(productsTable)
    .innerJoin(categoriesTable, eq(productsTable.categoryId, categoriesTable.id))
    .innerJoin(sellersTable, eq(productsTable.sellerId, sellersTable.id))
    .where(eq(productsTable.id, product.id));

  res.status(201).json(normalizeProduct(created));
});

router.put("/products/:productId", requireAuth, async (req, res) => {
  const userId = getCurrentUserId(req)!;
  const productId = req.params.productId as string;

  const [seller] = await db
    .select()
    .from(sellersTable)
    .where(eq(sellersTable.userId, userId));

  if (!seller) {
    res.status(403).json({ error: "Seller profile required" });
    return;
  }

  const [existing] = await db
    .select()
    .from(productsTable)
    .where(and(eq(productsTable.id, productId), eq(productsTable.sellerId, seller.id)));

  if (!existing) {
    res.status(404).json({ error: "Product not found" });
    return;
  }

  const { name, description, price, compareAtPrice, imageUrls, categoryId, stock, status } = req.body;

  await db
    .update(productsTable)
    .set({
      ...(name !== undefined && { name }),
      ...(description !== undefined && { description }),
      ...(price !== undefined && { price: String(price) }),
      ...(compareAtPrice !== undefined && { compareAtPrice: compareAtPrice ? String(compareAtPrice) : null }),
      ...(imageUrls !== undefined && { imageUrls }),
      ...(categoryId !== undefined && { categoryId }),
      ...(stock !== undefined && { stock: Number(stock) }),
      ...(status !== undefined && { status }),
      updatedAt: new Date(),
    })
    .where(eq(productsTable.id, productId));

  const [updated] = await db
    .select({
      id: productsTable.id,
      name: productsTable.name,
      description: productsTable.description,
      price: productsTable.price,
      compareAtPrice: productsTable.compareAtPrice,
      imageUrls: productsTable.imageUrls,
      categoryId: productsTable.categoryId,
      categoryName: categoriesTable.name,
      sellerId: productsTable.sellerId,
      sellerName: sellersTable.storeName,
      stock: productsTable.stock,
      sku: productsTable.sku,
      status: productsTable.status,
      rating: productsTable.rating,
      reviewCount: productsTable.reviewCount,
      isFeatured: productsTable.isFeatured,
      createdAt: productsTable.createdAt,
    })
    .from(productsTable)
    .innerJoin(categoriesTable, eq(productsTable.categoryId, categoriesTable.id))
    .innerJoin(sellersTable, eq(productsTable.sellerId, sellersTable.id))
    .where(eq(productsTable.id, productId));

  res.json(normalizeProduct(updated));
});

router.delete("/products/:productId", requireAuth, async (req, res) => {
  const userId = getCurrentUserId(req)!;
  const productId = req.params.productId as string;

  const [seller] = await db
    .select()
    .from(sellersTable)
    .where(eq(sellersTable.userId, userId));

  if (!seller) {
    res.status(403).json({ error: "Seller profile required" });
    return;
  }

  await db
    .update(productsTable)
    .set({ status: "inactive", updatedAt: new Date() })
    .where(and(eq(productsTable.id, productId), eq(productsTable.sellerId, seller.id)));

  res.status(204).send();
});

function normalizeProduct(p: Record<string, unknown>) {
  return {
    ...p,
    price: Number(p.price),
    compareAtPrice: p.compareAtPrice != null ? Number(p.compareAtPrice) : null,
    rating: p.rating != null ? Number(p.rating) : null,
    createdAt: p.createdAt instanceof Date ? p.createdAt.toISOString() : p.createdAt,
  };
}

export default router;
