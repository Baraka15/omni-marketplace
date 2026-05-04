import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { affiliatesTable, affiliateLinksTable, productsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../lib/auth";
import { logger } from "../lib/logger";

const router: IRouter = Router();

function generateCode(name: string): string {
  const base = name.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 8);
  const rand = Math.random().toString(36).slice(2, 6);
  return `${base}${rand}`;
}

function generateSlug(affiliateCode: string, productId: string): string {
  return `${affiliateCode}-${productId.slice(0, 8)}`;
}

router.post("/affiliate/register", requireAuth, async (req, res) => {
  const userId = (req as unknown as { auth: { userId: string } }).auth.userId;
  const { name, email } = req.body;

  if (!name || !email) {
    res.status(400).json({ error: "name and email are required" });
    return;
  }

  try {
    const existing = await db.query.affiliatesTable.findFirst({
      where: eq(affiliatesTable.userId, userId),
    });

    if (existing) {
      res.status(409).json({ error: "Already registered as affiliate" });
      return;
    }

    let code = generateCode(name);
    let attempts = 0;
    while (attempts < 5) {
      const dupe = await db.query.affiliatesTable.findFirst({ where: eq(affiliatesTable.code, code) });
      if (!dupe) break;
      code = generateCode(name);
      attempts++;
    }

    const [affiliate] = await db.insert(affiliatesTable).values({
      userId,
      name,
      email,
      code,
    }).returning();

    res.status(201).json({
      ...affiliate,
      commissionRate: Number(affiliate.commissionRate),
      totalEarnings: Number(affiliate.totalEarnings),
    });
  } catch (err) {
    logger.error({ err }, "affiliate register error");
    res.status(500).json({ error: "Registration failed" });
  }
});

router.get("/affiliate/profile", requireAuth, async (req, res) => {
  const userId = (req as unknown as { auth: { userId: string } }).auth.userId;

  try {
    const affiliate = await db.query.affiliatesTable.findFirst({
      where: eq(affiliatesTable.userId, userId),
    });

    if (!affiliate) {
      res.status(404).json({ error: "Not registered as affiliate" });
      return;
    }

    res.json({
      ...affiliate,
      commissionRate: Number(affiliate.commissionRate),
      totalEarnings: Number(affiliate.totalEarnings),
    });
  } catch (err) {
    logger.error({ err }, "get affiliate profile error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/affiliate/dashboard", requireAuth, async (req, res) => {
  const userId = (req as unknown as { auth: { userId: string } }).auth.userId;

  try {
    const affiliate = await db.query.affiliatesTable.findFirst({
      where: eq(affiliatesTable.userId, userId),
    });

    if (!affiliate) {
      res.status(404).json({ error: "Not registered as affiliate" });
      return;
    }

    const links = await db
      .select({
        id: affiliateLinksTable.id,
        affiliateId: affiliateLinksTable.affiliateId,
        productId: affiliateLinksTable.productId,
        productName: productsTable.name,
        productImageUrl: productsTable.imageUrls,
        productPrice: productsTable.price,
        slug: affiliateLinksTable.slug,
        clicks: affiliateLinksTable.clicks,
        conversions: affiliateLinksTable.conversions,
        earnings: affiliateLinksTable.earnings,
        createdAt: affiliateLinksTable.createdAt,
      })
      .from(affiliateLinksTable)
      .innerJoin(productsTable, eq(affiliateLinksTable.productId, productsTable.id))
      .where(eq(affiliateLinksTable.affiliateId, affiliate.id));

    const totalClicks = links.reduce((s, l) => s + l.clicks, 0);
    const totalConversions = links.reduce((s, l) => s + l.conversions, 0);
    const totalEarnings = links.reduce((s, l) => s + Number(l.earnings), 0);
    const conversionRate = totalClicks > 0 ? (totalConversions / totalClicks) * 100 : 0;

    const formattedLinks = links.map((l) => ({
      ...l,
      productImageUrl: (l.productImageUrl as string[])?.[0] ?? null,
      productPrice: Number(l.productPrice),
      earnings: Number(l.earnings),
    }));

    res.json({
      profile: {
        ...affiliate,
        commissionRate: Number(affiliate.commissionRate),
        totalEarnings: Number(affiliate.totalEarnings),
      },
      totalEarnings,
      totalClicks,
      totalConversions,
      conversionRate: Math.round(conversionRate * 10) / 10,
      pendingPayout: totalEarnings,
      recentLinks: formattedLinks.slice(0, 10),
    });
  } catch (err) {
    logger.error({ err }, "affiliate dashboard error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/affiliate/links", requireAuth, async (req, res) => {
  const userId = (req as unknown as { auth: { userId: string } }).auth.userId;

  try {
    const affiliate = await db.query.affiliatesTable.findFirst({
      where: eq(affiliatesTable.userId, userId),
    });

    if (!affiliate) {
      res.status(404).json({ error: "Not registered as affiliate" });
      return;
    }

    const links = await db
      .select({
        id: affiliateLinksTable.id,
        affiliateId: affiliateLinksTable.affiliateId,
        productId: affiliateLinksTable.productId,
        productName: productsTable.name,
        productImageUrl: productsTable.imageUrls,
        productPrice: productsTable.price,
        slug: affiliateLinksTable.slug,
        clicks: affiliateLinksTable.clicks,
        conversions: affiliateLinksTable.conversions,
        earnings: affiliateLinksTable.earnings,
        createdAt: affiliateLinksTable.createdAt,
      })
      .from(affiliateLinksTable)
      .innerJoin(productsTable, eq(affiliateLinksTable.productId, productsTable.id))
      .where(eq(affiliateLinksTable.affiliateId, affiliate.id));

    res.json(links.map((l) => ({
      ...l,
      productImageUrl: (l.productImageUrl as string[])?.[0] ?? null,
      productPrice: Number(l.productPrice),
      earnings: Number(l.earnings),
    })));
  } catch (err) {
    logger.error({ err }, "list affiliate links error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/affiliate/links", requireAuth, async (req, res) => {
  const userId = (req as unknown as { auth: { userId: string } }).auth.userId;
  const { productId } = req.body;

  if (!productId) {
    res.status(400).json({ error: "productId is required" });
    return;
  }

  try {
    const affiliate = await db.query.affiliatesTable.findFirst({
      where: eq(affiliatesTable.userId, userId),
    });

    if (!affiliate) {
      res.status(404).json({ error: "Not registered as affiliate" });
      return;
    }

    const product = await db.query.productsTable.findFirst({
      where: eq(productsTable.id, productId),
    });

    if (!product) {
      res.status(404).json({ error: "Product not found" });
      return;
    }

    const existing = await db.query.affiliateLinksTable.findFirst({
      where: and(
        eq(affiliateLinksTable.affiliateId, affiliate.id),
        eq(affiliateLinksTable.productId, productId),
      ),
    });

    if (existing) {
      res.status(409).json({ error: "Affiliate link already exists for this product", existing: { ...existing, earnings: Number(existing.earnings) } });
      return;
    }

    const slug = generateSlug(affiliate.code, productId);
    const [link] = await db.insert(affiliateLinksTable).values({
      affiliateId: affiliate.id,
      productId,
      slug,
    }).returning();

    res.status(201).json({
      ...link,
      productName: product.name,
      productImageUrl: (product.imageUrls as string[])?.[0] ?? null,
      productPrice: Number(product.price),
      earnings: Number(link.earnings),
    });
  } catch (err) {
    logger.error({ err }, "create affiliate link error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/affiliate/track/:slug", async (req, res) => {
  const slug = req.params.slug as string;

  try {
    const link = await db.query.affiliateLinksTable.findFirst({
      where: eq(affiliateLinksTable.slug, slug),
    });

    if (!link) {
      res.redirect("/products");
      return;
    }

    await db
      .update(affiliateLinksTable)
      .set({ clicks: link.clicks + 1 })
      .where(eq(affiliateLinksTable.id, link.id));

    await db
      .update(affiliatesTable)
      .set({ totalClicks: db.$count(affiliateLinksTable, eq(affiliateLinksTable.affiliateId, link.affiliateId)) })
      .where(eq(affiliatesTable.id, link.affiliateId));

    const baseUrl = process.env.APP_URL || "";
    res.redirect(`${baseUrl}/products/${link.productId}?aff=${slug}`);
  } catch (err) {
    logger.error({ err }, "affiliate track error");
    res.redirect("/products");
  }
});

export default router;
