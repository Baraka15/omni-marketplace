import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { productsTable, sellersTable, ordersTable } from "@workspace/db";
import { count } from "drizzle-orm";

const router: IRouter = Router();

router.get("/marketplace/stats", async (_req, res) => {
  const [
    [products],
    [sellers],
    [orders],
  ] = await Promise.all([
    db.select({ total: count() }).from(productsTable),
    db.select({ total: count() }).from(sellersTable),
    db.select({ total: count() }).from(ordersTable),
  ]);

  res.json({
    totalProducts: Number(products.total),
    totalSellers: Number(sellers.total),
    totalOrders: Number(orders.total),
    categoriesCount: 8,
  });
});

export default router;
