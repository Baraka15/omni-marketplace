import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  ordersTable,
  orderItemsTable,
  cartItemsTable,
  cartsTable,
  productsTable,
  sellersTable,
} from "@workspace/db";
import { eq, and, desc, sql, count } from "drizzle-orm";
import { requireAuth, getCurrentUserId } from "../lib/auth";
import { emitSellerDashboardUpdate } from "../lib/socket";

const router: IRouter = Router();

async function buildOrderResponse(orderId: string) {
  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, orderId));
  if (!order) return null;

  const items = await db
    .select({
      id: orderItemsTable.id,
      productId: orderItemsTable.productId,
      productName: productsTable.name,
      productImageUrl: productsTable.imageUrls,
      quantity: orderItemsTable.quantity,
      unitPrice: orderItemsTable.unitPrice,
      totalPrice: orderItemsTable.totalPrice,
    })
    .from(orderItemsTable)
    .innerJoin(productsTable, eq(orderItemsTable.productId, productsTable.id))
    .where(eq(orderItemsTable.orderId, orderId));

  return {
    id: order.id,
    buyerId: order.buyerId,
    status: order.status,
    paymentStatus: order.paymentStatus,
    paymentMethod: order.paymentMethod,
    items: items.map((i) => ({
      ...i,
      productImageUrl: Array.isArray(i.productImageUrl) && i.productImageUrl.length > 0
        ? (i.productImageUrl as string[])[0]
        : "",
      unitPrice: Number(i.unitPrice),
      totalPrice: Number(i.totalPrice),
    })),
    subtotal: Number(order.subtotal),
    shippingCost: Number(order.shippingCost),
    total: Number(order.total),
    shippingAddress: order.shippingAddress,
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
  };
}

router.get("/orders", requireAuth, async (req, res) => {
  const userId = getCurrentUserId(req)!;
  const { status, page = "1" } = req.query as Record<string, string>;
  const pageNum = parseInt(page, 10);
  const limitNum = 20;
  const offset = (pageNum - 1) * limitNum;

  const conditions = [eq(ordersTable.buyerId, userId)];
  if (status) conditions.push(eq(ordersTable.status, status as "pending" | "confirmed" | "processing" | "shipped" | "delivered" | "cancelled"));

  const [orderRows, [{ total }]] = await Promise.all([
    db.select().from(ordersTable).where(and(...conditions)).orderBy(desc(ordersTable.createdAt)).limit(limitNum).offset(offset),
    db.select({ total: count() }).from(ordersTable).where(and(...conditions)),
  ]);

  const items = await Promise.all(orderRows.map((o) => buildOrderResponse(o.id)));

  res.json({
    items: items.filter(Boolean),
    total: Number(total),
    page: pageNum,
    totalPages: Math.ceil(Number(total) / limitNum),
  });
});

router.get("/orders/recent", requireAuth, async (req, res) => {
  const userId = getCurrentUserId(req)!;
  const orderRows = await db
    .select()
    .from(ordersTable)
    .where(eq(ordersTable.buyerId, userId))
    .orderBy(desc(ordersTable.createdAt))
    .limit(5);

  const items = await Promise.all(orderRows.map((o) => buildOrderResponse(o.id)));
  res.json(items.filter(Boolean));
});

router.get("/orders/:orderId", requireAuth, async (req, res) => {
  const orderId = req.params.orderId as string;
  const order = await buildOrderResponse(orderId);
  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }
  res.json(order);
});

router.post("/orders", requireAuth, async (req, res) => {
  const userId = getCurrentUserId(req)!;
  const { shippingAddress, paymentMethod, cartId } = req.body;

  const cartItems = await db
    .select({
      id: cartItemsTable.id,
      productId: cartItemsTable.productId,
      quantity: cartItemsTable.quantity,
      price: productsTable.price,
      stock: productsTable.stock,
      reserved: productsTable.reserved,
      sellerId: productsTable.sellerId,
    })
    .from(cartItemsTable)
    .innerJoin(productsTable, eq(cartItemsTable.productId, productsTable.id))
    .where(eq(cartItemsTable.cartId, cartId));

  if (cartItems.length === 0) {
    res.status(400).json({ error: "Cart is empty" });
    return;
  }

  for (const item of cartItems) {
    const available = item.stock - item.reserved;
    if (item.quantity > available) {
      res.status(409).json({ error: `Insufficient stock for product ${item.productId}` });
      return;
    }
  }

  const subtotal = cartItems.reduce((sum, i) => sum + Number(i.price) * i.quantity, 0);
  const shippingCost = 10;
  const total = subtotal + shippingCost;

  const [order] = await db
    .insert(ordersTable)
    .values({
      buyerId: userId,
      status: "pending",
      paymentStatus: "pending",
      paymentMethod,
      subtotal: String(subtotal),
      shippingCost: String(shippingCost),
      total: String(total),
      shippingAddress,
    })
    .returning();

  await db.insert(orderItemsTable).values(
    cartItems.map((item) => ({
      orderId: order.id,
      productId: item.productId,
      sellerId: item.sellerId,
      quantity: item.quantity,
      unitPrice: String(Number(item.price)),
      totalPrice: String(Number(item.price) * item.quantity),
    })),
  );

  await Promise.all(
    cartItems.map((item) =>
      db
        .update(productsTable)
        .set({ reserved: sql`${productsTable.reserved} + ${item.quantity}` })
        .where(eq(productsTable.id, item.productId)),
    ),
  );

  await db.delete(cartItemsTable).where(eq(cartItemsTable.cartId, cartId));

  const sellerIds = [...new Set(cartItems.map((i) => i.sellerId))];
  for (const sellerId of sellerIds) {
    emitSellerDashboardUpdate(sellerId, { event: "new_order", orderId: order.id });
  }

  const response = await buildOrderResponse(order.id);
  res.status(201).json(response);
});

router.put("/orders/:orderId/status", requireAuth, async (req, res) => {
  const orderId = req.params.orderId as string;
  const { status } = req.body;

  await db
    .update(ordersTable)
    .set({ status, updatedAt: new Date() })
    .where(eq(ordersTable.id, orderId));

  const response = await buildOrderResponse(orderId);
  res.json(response);
});

export default router;
