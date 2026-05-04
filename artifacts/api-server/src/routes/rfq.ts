import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { rfqTable, productsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth, getCurrentUserId } from "../lib/auth";

const router: IRouter = Router();

async function buildRfqResponse(rfq: Record<string, unknown>, productName: string) {
  return {
    id: rfq.id,
    buyerId: rfq.buyerId,
    buyerCompany: rfq.buyerCompany,
    productId: rfq.productId,
    productName,
    quantity: rfq.quantity,
    description: rfq.description,
    targetPrice: rfq.targetPrice != null ? Number(rfq.targetPrice) : null,
    status: rfq.status,
    quotedPrice: rfq.quotedPrice != null ? Number(rfq.quotedPrice) : null,
    quotedNote: rfq.quotedNote ?? null,
    validUntil: rfq.validUntil instanceof Date ? (rfq.validUntil as Date).toISOString() : (rfq.validUntil ?? null),
    createdAt: rfq.createdAt instanceof Date ? (rfq.createdAt as Date).toISOString() : rfq.createdAt,
    updatedAt: rfq.updatedAt instanceof Date ? (rfq.updatedAt as Date).toISOString() : rfq.updatedAt,
  };
}

router.get("/rfq", requireAuth, async (req, res) => {
  const userId = getCurrentUserId(req)!;
  const { status } = req.query as Record<string, string>;

  const conditions = [eq(rfqTable.buyerId, userId)];
  if (status) conditions.push(eq(rfqTable.status, status as "pending" | "quoted" | "accepted" | "rejected" | "expired"));

  const rfqs = await db
    .select({
      rfq: rfqTable,
      productName: productsTable.name,
    })
    .from(rfqTable)
    .innerJoin(productsTable, eq(rfqTable.productId, productsTable.id))
    .where(and(...conditions));

  const response = await Promise.all(
    rfqs.map(({ rfq, productName }) => buildRfqResponse(rfq as Record<string, unknown>, productName)),
  );

  res.json(response);
});

router.post("/rfq", requireAuth, async (req, res) => {
  const userId = getCurrentUserId(req)!;
  const { productId, quantity, description, targetPrice, buyerCompany, deliveryDate } = req.body;

  const [product] = await db.select().from(productsTable).where(eq(productsTable.id, productId));
  if (!product) {
    res.status(404).json({ error: "Product not found" });
    return;
  }

  const [rfq] = await db
    .insert(rfqTable)
    .values({
      buyerId: userId,
      buyerCompany,
      productId,
      quantity,
      description,
      targetPrice: targetPrice ? String(targetPrice) : null,
      status: "pending",
      deliveryDate: deliveryDate ? new Date(deliveryDate) : null,
    })
    .returning();

  res.status(201).json(await buildRfqResponse(rfq as Record<string, unknown>, product.name));
});

router.get("/rfq/:rfqId", requireAuth, async (req, res) => {
  const rfqId = req.params.rfqId as string;

  const [result] = await db
    .select({ rfq: rfqTable, productName: productsTable.name })
    .from(rfqTable)
    .innerJoin(productsTable, eq(rfqTable.productId, productsTable.id))
    .where(eq(rfqTable.id, rfqId));

  if (!result) {
    res.status(404).json({ error: "RFQ not found" });
    return;
  }

  res.json(await buildRfqResponse(result.rfq as Record<string, unknown>, result.productName));
});

router.put("/rfq/:rfqId", requireAuth, async (req, res) => {
  const userId = getCurrentUserId(req)!;
  const rfqId = req.params.rfqId as string;
  const { quantity, description, targetPrice } = req.body;

  const [rfq] = await db.select().from(rfqTable).where(and(eq(rfqTable.id, rfqId), eq(rfqTable.buyerId, userId)));
  if (!rfq) {
    res.status(404).json({ error: "RFQ not found" });
    return;
  }

  await db
    .update(rfqTable)
    .set({
      ...(quantity !== undefined && { quantity }),
      ...(description !== undefined && { description }),
      ...(targetPrice !== undefined && { targetPrice: targetPrice ? String(targetPrice) : null }),
      updatedAt: new Date(),
    })
    .where(eq(rfqTable.id, rfqId));

  const [updated] = await db
    .select({ rfq: rfqTable, productName: productsTable.name })
    .from(rfqTable)
    .innerJoin(productsTable, eq(rfqTable.productId, productsTable.id))
    .where(eq(rfqTable.id, rfqId));

  res.json(await buildRfqResponse(updated.rfq as Record<string, unknown>, updated.productName));
});

router.post("/rfq/:rfqId/quote", requireAuth, async (req, res) => {
  const rfqId = req.params.rfqId as string;
  const { quotedPrice, quotedNote, validUntil } = req.body;

  await db
    .update(rfqTable)
    .set({
      status: "quoted",
      quotedPrice: String(quotedPrice),
      quotedNote: quotedNote ?? null,
      validUntil: new Date(validUntil),
      updatedAt: new Date(),
    })
    .where(eq(rfqTable.id, rfqId));

  const [updated] = await db
    .select({ rfq: rfqTable, productName: productsTable.name })
    .from(rfqTable)
    .innerJoin(productsTable, eq(rfqTable.productId, productsTable.id))
    .where(eq(rfqTable.id, rfqId));

  res.json(await buildRfqResponse(updated.rfq as Record<string, unknown>, updated.productName));
});

router.post("/rfq/:rfqId/accept", requireAuth, async (req, res) => {
  const userId = getCurrentUserId(req)!;
  const rfqId = req.params.rfqId as string;

  await db
    .update(rfqTable)
    .set({ status: "accepted", updatedAt: new Date() })
    .where(and(eq(rfqTable.id, rfqId), eq(rfqTable.buyerId, userId)));

  const [updated] = await db
    .select({ rfq: rfqTable, productName: productsTable.name })
    .from(rfqTable)
    .innerJoin(productsTable, eq(rfqTable.productId, productsTable.id))
    .where(eq(rfqTable.id, rfqId));

  res.json(await buildRfqResponse(updated.rfq as Record<string, unknown>, updated.productName));
});

export default router;
