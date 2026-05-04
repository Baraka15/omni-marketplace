import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { cartsTable, cartItemsTable, productsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth, getCurrentUserId } from "../lib/auth";

const router: IRouter = Router();

async function getOrCreateCart(userId: string) {
  let [cart] = await db.select().from(cartsTable).where(eq(cartsTable.userId, userId));
  if (!cart) {
    [cart] = await db.insert(cartsTable).values({ userId }).returning();
  }
  return cart;
}

async function buildCartResponse(cartId: string, userId: string) {
  const items = await db
    .select({
      id: cartItemsTable.id,
      productId: cartItemsTable.productId,
      quantity: cartItemsTable.quantity,
      productName: productsTable.name,
      productImageUrl: productsTable.imageUrls,
      price: productsTable.price,
      stock: productsTable.stock,
      reserved: productsTable.reserved,
    })
    .from(cartItemsTable)
    .innerJoin(productsTable, eq(cartItemsTable.productId, productsTable.id))
    .where(eq(cartItemsTable.cartId, cartId));

  const cartItems = items.map((item) => ({
    id: item.id,
    productId: item.productId,
    productName: item.productName,
    productImageUrl: Array.isArray(item.productImageUrl) && item.productImageUrl.length > 0
      ? (item.productImageUrl as string[])[0]
      : "",
    price: Number(item.price),
    quantity: item.quantity,
    availableStock: Math.max(0, item.stock - item.reserved),
  }));

  const subtotal = cartItems.reduce((sum, i) => sum + i.price * i.quantity, 0);

  return {
    id: cartId,
    userId,
    items: cartItems,
    subtotal,
    itemCount: cartItems.reduce((sum, i) => sum + i.quantity, 0),
  };
}

router.get("/cart", requireAuth, async (req, res) => {
  const userId = getCurrentUserId(req)!;
  const cart = await getOrCreateCart(userId);
  const response = await buildCartResponse(cart.id, userId);
  res.json(response);
});

router.post("/cart/items", requireAuth, async (req, res) => {
  const userId = getCurrentUserId(req)!;
  const { productId, quantity } = req.body as { productId: string; quantity: number };

  const [product] = await db
    .select()
    .from(productsTable)
    .where(eq(productsTable.id, productId));

  if (!product) {
    res.status(404).json({ error: "Product not found" });
    return;
  }

  const available = Math.max(0, product.stock - product.reserved);
  if (quantity > available) {
    res.status(409).json({ error: `Only ${available} units available` });
    return;
  }

  const cart = await getOrCreateCart(userId);

  const [existing] = await db
    .select()
    .from(cartItemsTable)
    .where(and(eq(cartItemsTable.cartId, cart.id), eq(cartItemsTable.productId, productId)));

  if (existing) {
    const newQty = existing.quantity + quantity;
    if (newQty > available) {
      res.status(409).json({ error: `Only ${available} units available` });
      return;
    }
    await db
      .update(cartItemsTable)
      .set({ quantity: newQty, updatedAt: new Date() })
      .where(eq(cartItemsTable.id, existing.id));
  } else {
    await db.insert(cartItemsTable).values({ cartId: cart.id, productId, quantity });
  }

  const response = await buildCartResponse(cart.id, userId);
  res.status(201).json(response);
});

router.put("/cart/items/:cartItemId", requireAuth, async (req, res) => {
  const userId = getCurrentUserId(req)!;
  const cartItemId = req.params.cartItemId as string;
  const { quantity } = req.body as { quantity: number };

  const cart = await getOrCreateCart(userId);

  const [item] = await db
    .select()
    .from(cartItemsTable)
    .where(and(eq(cartItemsTable.id, cartItemId), eq(cartItemsTable.cartId, cart.id)));

  if (!item) {
    res.status(404).json({ error: "Cart item not found" });
    return;
  }

  const [product] = await db
    .select()
    .from(productsTable)
    .where(eq(productsTable.id, item.productId));

  if (product) {
    const available = Math.max(0, product.stock - product.reserved);
    if (quantity > available) {
      res.status(409).json({ error: `Only ${available} units available` });
      return;
    }
  }

  if (quantity <= 0) {
    await db.delete(cartItemsTable).where(eq(cartItemsTable.id, cartItemId));
  } else {
    await db
      .update(cartItemsTable)
      .set({ quantity, updatedAt: new Date() })
      .where(eq(cartItemsTable.id, cartItemId));
  }

  const response = await buildCartResponse(cart.id, userId);
  res.json(response);
});

router.delete("/cart/items/:cartItemId", requireAuth, async (req, res) => {
  const userId = getCurrentUserId(req)!;
  const cartItemId = req.params.cartItemId as string;

  const cart = await getOrCreateCart(userId);
  await db
    .delete(cartItemsTable)
    .where(and(eq(cartItemsTable.id, cartItemId), eq(cartItemsTable.cartId, cart.id)));

  const response = await buildCartResponse(cart.id, userId);
  res.json(response);
});

export default router;
