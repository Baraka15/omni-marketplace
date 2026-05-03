import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  sellersTable,
  productsTable,
  ordersTable,
  orderItemsTable,
  rfqTable,
  categoriesTable,
} from "@workspace/db";
import { eq, and, desc, gte, lt, sql, count, sum } from "drizzle-orm";
import { requireAuth, getCurrentUserId } from "../lib/auth";

const router: IRouter = Router();

router.get("/seller/profile", requireAuth, async (req, res) => {
  const userId = getCurrentUserId(req)!;
  const [seller] = await db.select().from(sellersTable).where(eq(sellersTable.userId, userId));
  if (!seller) {
    res.status(404).json({ error: "Seller profile not found" });
    return;
  }
  res.json(normalizeSeller(seller));
});

router.post("/seller/profile", requireAuth, async (req, res) => {
  const userId = getCurrentUserId(req)!;
  const { storeName, description, logoUrl } = req.body;

  const [existing] = await db.select().from(sellersTable).where(eq(sellersTable.userId, userId));
  if (existing) {
    res.status(409).json({ error: "Seller profile already exists" });
    return;
  }

  const [seller] = await db
    .insert(sellersTable)
    .values({ userId, storeName, description, logoUrl: logoUrl ?? null })
    .returning();

  res.status(201).json(normalizeSeller(seller));
});

router.get("/seller/products", requireAuth, async (req, res) => {
  const userId = getCurrentUserId(req)!;
  const { page = "1", status } = req.query as Record<string, string>;
  const pageNum = parseInt(page, 10);
  const limitNum = 20;
  const offset = (pageNum - 1) * limitNum;

  const [seller] = await db.select().from(sellersTable).where(eq(sellersTable.userId, userId));
  if (!seller) {
    res.status(403).json({ error: "Seller profile required" });
    return;
  }

  const conditions = [eq(productsTable.sellerId, seller.id)];
  if (status) conditions.push(eq(productsTable.status, status as "active" | "inactive" | "out_of_stock"));

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
      .where(and(...conditions))
      .orderBy(desc(productsTable.createdAt))
      .limit(limitNum)
      .offset(offset),
    db.select({ total: count() }).from(productsTable).where(and(...conditions)),
  ]);

  res.json({
    items: items.map((p) => ({
      ...p,
      price: Number(p.price),
      compareAtPrice: p.compareAtPrice != null ? Number(p.compareAtPrice) : null,
      rating: p.rating != null ? Number(p.rating) : null,
      createdAt: p.createdAt instanceof Date ? p.createdAt.toISOString() : p.createdAt,
    })),
    total: Number(total),
    page: pageNum,
    limit: limitNum,
    totalPages: Math.ceil(Number(total) / limitNum),
  });
});

router.get("/seller/orders", requireAuth, async (req, res) => {
  const userId = getCurrentUserId(req)!;
  const { page = "1", status } = req.query as Record<string, string>;
  const pageNum = parseInt(page, 10);
  const limitNum = 20;
  const offset = (pageNum - 1) * limitNum;

  const [seller] = await db.select().from(sellersTable).where(eq(sellersTable.userId, userId));
  if (!seller) {
    res.status(403).json({ error: "Seller profile required" });
    return;
  }

  const sellerOrderIds = await db
    .selectDistinct({ orderId: orderItemsTable.orderId })
    .from(orderItemsTable)
    .where(eq(orderItemsTable.sellerId, seller.id));

  const orderIds = sellerOrderIds.map((r) => r.orderId);

  if (orderIds.length === 0) {
    res.json({ items: [], total: 0, page: pageNum, totalPages: 0 });
    return;
  }

  const conditions = [sql`${ordersTable.id} = ANY(${orderIds})`];
  if (status) conditions.push(eq(ordersTable.status, status as "pending" | "confirmed" | "processing" | "shipped" | "delivered" | "cancelled"));

  const [orderRows, [{ total }]] = await Promise.all([
    db.select().from(ordersTable).where(and(...conditions)).orderBy(desc(ordersTable.createdAt)).limit(limitNum).offset(offset),
    db.select({ total: count() }).from(ordersTable).where(and(...conditions)),
  ]);

  const items = orderRows.map((o) => ({
    id: o.id,
    buyerId: o.buyerId,
    status: o.status,
    paymentStatus: o.paymentStatus,
    paymentMethod: o.paymentMethod,
    items: [],
    subtotal: Number(o.subtotal),
    shippingCost: Number(o.shippingCost),
    total: Number(o.total),
    shippingAddress: o.shippingAddress,
    createdAt: o.createdAt.toISOString(),
    updatedAt: o.updatedAt.toISOString(),
  }));

  res.json({
    items,
    total: Number(total),
    page: pageNum,
    totalPages: Math.ceil(Number(total) / limitNum),
  });
});

router.get("/seller/dashboard/stats", requireAuth, async (req, res) => {
  const userId = getCurrentUserId(req)!;
  const [seller] = await db.select().from(sellersTable).where(eq(sellersTable.userId, userId));
  if (!seller) {
    res.status(403).json({ error: "Seller profile required" });
    return;
  }

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const yesterdayStart = new Date(todayStart);
  yesterdayStart.setDate(yesterdayStart.getDate() - 1);

  const sellerOrderIds = await db
    .selectDistinct({ orderId: orderItemsTable.orderId })
    .from(orderItemsTable)
    .where(eq(orderItemsTable.sellerId, seller.id));

  const orderIds = sellerOrderIds.map((r) => r.orderId);

  const [
    todayOrders,
    yesterdayOrders,
    activeOrders,
    totalProducts,
    lowStockProducts,
    inventoryValue,
    pendingRfqs,
  ] = await Promise.all([
    orderIds.length > 0
      ? db.select({ total: count(), revenue: sum(ordersTable.total) })
          .from(ordersTable)
          .where(and(
            sql`${ordersTable.id} = ANY(${orderIds})`,
            gte(ordersTable.createdAt, todayStart),
          ))
      : Promise.resolve([{ total: 0, revenue: null }]),
    orderIds.length > 0
      ? db.select({ total: count(), revenue: sum(ordersTable.total) })
          .from(ordersTable)
          .where(and(
            sql`${ordersTable.id} = ANY(${orderIds})`,
            gte(ordersTable.createdAt, yesterdayStart),
            lt(ordersTable.createdAt, todayStart),
          ))
      : Promise.resolve([{ total: 0, revenue: null }]),
    orderIds.length > 0
      ? db.select({ total: count() })
          .from(ordersTable)
          .where(and(
            sql`${ordersTable.id} = ANY(${orderIds})`,
            sql`${ordersTable.status} IN ('pending', 'confirmed', 'processing', 'shipped')`,
          ))
      : Promise.resolve([{ total: 0 }]),
    db.select({ total: count() }).from(productsTable).where(eq(productsTable.sellerId, seller.id)),
    db.select({ total: count() }).from(productsTable)
      .where(and(eq(productsTable.sellerId, seller.id), sql`${productsTable.stock} < 10`)),
    db.select({ value: sum(sql`${productsTable.price} * ${productsTable.stock}`) })
      .from(productsTable)
      .where(eq(productsTable.sellerId, seller.id)),
    db.select({ total: count() }).from(rfqTable)
      .where(and(
        sql`${rfqTable.productId} IN (SELECT id FROM products WHERE seller_id = ${seller.id})`,
        eq(rfqTable.status, "pending"),
      )),
  ]);

  const todayRevenue = Number(todayOrders[0]?.revenue ?? 0);
  const yesterdayRevenue = Number(yesterdayOrders[0]?.revenue ?? 0);
  const revenueChange = yesterdayRevenue > 0 ? ((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100 : 0;

  const todayOrderCount = Number(todayOrders[0]?.total ?? 0);
  const yesterdayOrderCount = Number(yesterdayOrders[0]?.total ?? 0);
  const ordersChange = yesterdayOrderCount > 0 ? ((todayOrderCount - yesterdayOrderCount) / yesterdayOrderCount) * 100 : 0;

  res.json({
    todayRevenue,
    todayOrders: todayOrderCount,
    activeOrders: Number(activeOrders[0]?.total ?? 0),
    totalProducts: Number(totalProducts[0]?.total ?? 0),
    lowStockProducts: Number(lowStockProducts[0]?.total ?? 0),
    totalInventoryValue: Number(inventoryValue[0]?.value ?? 0),
    pendingRfqs: Number(pendingRfqs[0]?.total ?? 0),
    revenueChange,
    ordersChange,
  });
});

router.get("/seller/dashboard/revenue-chart", requireAuth, async (req, res) => {
  const userId = getCurrentUserId(req)!;
  const [seller] = await db.select().from(sellersTable).where(eq(sellersTable.userId, userId));
  if (!seller) {
    res.status(403).json({ error: "Seller profile required" });
    return;
  }

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const sellerOrderIds = await db
    .selectDistinct({ orderId: orderItemsTable.orderId })
    .from(orderItemsTable)
    .where(eq(orderItemsTable.sellerId, seller.id));

  const orderIds = sellerOrderIds.map((r) => r.orderId);

  const days: { date: string; revenue: number; orders: number }[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split("T")[0];
    days.push({ date: dateStr, revenue: 0, orders: 0 });
  }

  if (orderIds.length > 0) {
    const chartData = await db
      .select({
        date: sql<string>`DATE(${ordersTable.createdAt})`,
        revenue: sum(ordersTable.total),
        orders: count(),
      })
      .from(ordersTable)
      .where(and(
        sql`${ordersTable.id} = ANY(${orderIds})`,
        gte(ordersTable.createdAt, thirtyDaysAgo),
      ))
      .groupBy(sql`DATE(${ordersTable.createdAt})`);

    for (const row of chartData) {
      const idx = days.findIndex((d) => d.date === row.date);
      if (idx !== -1) {
        days[idx].revenue = Number(row.revenue ?? 0);
        days[idx].orders = Number(row.orders ?? 0);
      }
    }
  }

  res.json(days);
});

function normalizeSeller(s: Record<string, unknown>) {
  return {
    ...s,
    rating: s.rating != null ? Number(s.rating) : null,
    createdAt: s.createdAt instanceof Date ? (s.createdAt as Date).toISOString() : s.createdAt,
  };
}

export default router;
