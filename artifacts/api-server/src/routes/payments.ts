import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { ordersTable, affiliateLinksTable, affiliatesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth } from "../lib/auth";
import { logger } from "../lib/logger";

const router: IRouter = Router();

function getStripe() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Stripe = require("stripe");
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY not configured");
  return new Stripe(key, { apiVersion: "2023-10-16" });
}

async function getPayPalAccessToken(): Promise<string> {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error("PayPal credentials not configured");

  const base = process.env.PAYPAL_BASE_URL || "https://api-m.sandbox.paypal.com";
  const creds = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const resp = await fetch(`${base}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${creds}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  const data = await resp.json() as { access_token: string };
  return data.access_token;
}

// ── Stripe ────────────────────────────────────────────────────────────────────
router.post("/payments/stripe/create-intent", requireAuth, async (req, res) => {
  const { orderId, amount, currency = "usd" } = req.body;

  if (!process.env.STRIPE_SECRET_KEY) {
    res.status(503).json({ error: "Stripe not configured. Please add STRIPE_SECRET_KEY to secrets." });
    return;
  }

  try {
    const stripe = getStripe();
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100),
      currency,
      metadata: { orderId },
    });

    await db
      .update(ordersTable)
      .set({ stripePaymentIntentId: paymentIntent.id })
      .where(eq(ordersTable.id, orderId));

    res.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    });
  } catch (err) {
    logger.error({ err }, "Stripe error");
    res.status(500).json({ error: "Payment initialization failed" });
  }
});

router.post("/payments/stripe/webhook", async (req, res) => {
  const sig = req.headers["stripe-signature"] as string;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret || !process.env.STRIPE_SECRET_KEY) {
    res.status(200).json({ received: true });
    return;
  }

  try {
    const stripe = getStripe();
    const event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);

    if (event.type === "payment_intent.succeeded") {
      const pi = event.data.object as { id: string };
      await db
        .update(ordersTable)
        .set({ paymentStatus: "paid", status: "confirmed", updatedAt: new Date() })
        .where(eq(ordersTable.stripePaymentIntentId, pi.id));
    }

    res.json({ received: true });
  } catch (err) {
    logger.error({ err }, "Stripe webhook error");
    res.status(400).json({ error: "Webhook error" });
  }
});

// ── Flutterwave ───────────────────────────────────────────────────────────────
router.post("/payments/flutterwave/initiate", requireAuth, async (req, res) => {
  const { orderId, amount, currency = "UGX", email, phone, name } = req.body;

  if (!process.env.FLUTTERWAVE_SECRET_KEY) {
    res.status(503).json({ error: "Flutterwave not configured. Please add FLUTTERWAVE_SECRET_KEY to secrets." });
    return;
  }

  try {
    const txRef = `OMNI-${orderId}-${Date.now()}`;
    const appUrl = process.env.APP_URL || `https://${process.env.REPLIT_DEV_DOMAIN || ""}`;

    const response = await fetch("https://api.flutterwave.com/v3/payments", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.FLUTTERWAVE_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        tx_ref: txRef,
        amount,
        currency,
        redirect_url: `${appUrl}/orders/${orderId}?payment=flutterwave`,
        customer: { email, phone_number: phone, name },
        customizations: {
          title: "OMNI Marketplace",
          description: `Payment for Order #${orderId.slice(0, 8).toUpperCase()}`,
          logo: `${appUrl}/favicon.ico`,
        },
        payment_options: "card,mobilemoneyuganda,mobilemoneyrwanda,mobilemoneyzambia,mobilemoneytanzania,mobilemoneyghana,mobilemoneykenya,barter,account",
      }),
    });

    const data = await response.json() as { status: string; data?: { link?: string } };

    if (data.status !== "success") {
      res.status(500).json({ error: "Flutterwave initialization failed" });
      return;
    }

    await db
      .update(ordersTable)
      .set({ flutterwaveRef: txRef, paymentMethod: "flutterwave" })
      .where(eq(ordersTable.id, orderId));

    res.json({ paymentLink: data.data?.link, transactionRef: txRef });
  } catch (err) {
    logger.error({ err }, "Flutterwave error");
    res.status(500).json({ error: "Payment initialization failed" });
  }
});

router.post("/payments/flutterwave/verify", requireAuth, async (req, res) => {
  const { transactionId, orderId } = req.body;

  if (!process.env.FLUTTERWAVE_SECRET_KEY) {
    res.status(503).json({ error: "Flutterwave not configured." });
    return;
  }

  try {
    const response = await fetch(`https://api.flutterwave.com/v3/transactions/${transactionId}/verify`, {
      headers: { Authorization: `Bearer ${process.env.FLUTTERWAVE_SECRET_KEY}` },
    });

    const data = await response.json() as {
      status: string;
      data?: { status: string; amount: number; currency: string; tx_ref: string };
    };

    if (data.status === "success" && data.data?.status === "successful") {
      await db
        .update(ordersTable)
        .set({ paymentStatus: "paid", status: "confirmed", updatedAt: new Date() })
        .where(eq(ordersTable.id, orderId));

      await creditAffiliateIfApplicable(orderId, data.data.amount);

      res.json({ success: true, status: "paid", amount: data.data.amount });
    } else {
      res.json({ success: false, status: data.data?.status ?? "unknown" });
    }
  } catch (err) {
    logger.error({ err }, "Flutterwave verify error");
    res.status(500).json({ error: "Verification failed" });
  }
});

router.post("/payments/webhook/flutterwave", async (req, res) => {
  const secret = process.env.FLUTTERWAVE_WEBHOOK_SECRET;
  if (secret && req.headers["verif-hash"] !== secret) {
    res.status(401).json({ error: "Invalid signature" });
    return;
  }

  try {
    const { event, data } = req.body as {
      event: string;
      data?: { tx_ref?: string; status?: string; amount?: number };
    };

    if (event === "charge.completed" && data?.status === "successful" && data.tx_ref) {
      const order = await db.query.ordersTable.findFirst({
        where: eq(ordersTable.flutterwaveRef, data.tx_ref),
      });

      if (order) {
        await db
          .update(ordersTable)
          .set({ paymentStatus: "paid", status: "confirmed", updatedAt: new Date() })
          .where(eq(ordersTable.id, order.id));

        await creditAffiliateIfApplicable(order.id, data.amount ?? 0);
      }
    }

    res.json({ received: true });
  } catch (err) {
    logger.error({ err }, "Flutterwave webhook error");
    res.status(500).json({ error: "Webhook processing failed" });
  }
});

// ── PayPal ────────────────────────────────────────────────────────────────────
router.post("/payments/paypal/create-order", requireAuth, async (req, res) => {
  const { orderId, amount, currency = "USD" } = req.body;

  if (!process.env.PAYPAL_CLIENT_ID || !process.env.PAYPAL_CLIENT_SECRET) {
    res.status(503).json({ error: "PayPal not configured. Please add PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET to secrets." });
    return;
  }

  try {
    const accessToken = await getPayPalAccessToken();
    const base = process.env.PAYPAL_BASE_URL || "https://api-m.sandbox.paypal.com";
    const appUrl = process.env.APP_URL || `https://${process.env.REPLIT_DEV_DOMAIN || ""}`;

    const response = await fetch(`${base}/v2/checkout/orders`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        intent: "CAPTURE",
        purchase_units: [{
          reference_id: orderId,
          amount: { currency_code: currency, value: amount.toFixed(2) },
          description: `OMNI Marketplace Order #${orderId.slice(0, 8).toUpperCase()}`,
        }],
        application_context: {
          brand_name: "OMNI Marketplace",
          landing_page: "NO_PREFERENCE",
          user_action: "PAY_NOW",
          return_url: `${appUrl}/orders/${orderId}?payment=paypal`,
          cancel_url: `${appUrl}/checkout`,
        },
      }),
    });

    const data = await response.json() as {
      id: string;
      links: Array<{ rel: string; href: string }>;
    };

    const approvalUrl = data.links?.find((l) => l.rel === "approve")?.href;

    await db
      .update(ordersTable)
      .set({ paypalOrderId: data.id, paymentMethod: "paypal" })
      .where(eq(ordersTable.id, orderId));

    res.json({ paypalOrderId: data.id, approvalUrl });
  } catch (err) {
    logger.error({ err }, "PayPal create order error");
    res.status(500).json({ error: "PayPal order creation failed" });
  }
});

router.post("/payments/paypal/capture", requireAuth, async (req, res) => {
  const { paypalOrderId, orderId } = req.body;

  if (!process.env.PAYPAL_CLIENT_ID || !process.env.PAYPAL_CLIENT_SECRET) {
    res.status(503).json({ error: "PayPal not configured." });
    return;
  }

  try {
    const accessToken = await getPayPalAccessToken();
    const base = process.env.PAYPAL_BASE_URL || "https://api-m.sandbox.paypal.com";

    const response = await fetch(`${base}/v2/checkout/orders/${paypalOrderId}/capture`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    const data = await response.json() as { status: string; purchase_units?: Array<{ payments?: { captures?: Array<{ amount?: { value?: string } }> } }> };

    if (data.status === "COMPLETED") {
      const capturedAmount = Number(data.purchase_units?.[0]?.payments?.captures?.[0]?.amount?.value ?? 0);
      await db
        .update(ordersTable)
        .set({ paymentStatus: "paid", status: "confirmed", updatedAt: new Date() })
        .where(eq(ordersTable.id, orderId));

      await creditAffiliateIfApplicable(orderId, capturedAmount);

      res.json({ success: true, status: "paid" });
    } else {
      res.json({ success: false, status: data.status });
    }
  } catch (err) {
    logger.error({ err }, "PayPal capture error");
    res.status(500).json({ error: "PayPal capture failed" });
  }
});

// ── Helpers ───────────────────────────────────────────────────────────────────
async function creditAffiliateIfApplicable(orderId: string, saleAmount: number): Promise<void> {
  try {
    const order = await db.query.ordersTable.findFirst({ where: eq(ordersTable.id, orderId) });
    if (!order?.affiliateLinkId) return;

    const link = await db.query.affiliateLinksTable.findFirst({
      where: eq(affiliateLinksTable.id, order.affiliateLinkId),
    });
    if (!link) return;

    const affiliate = await db.query.affiliatesTable.findFirst({
      where: eq(affiliatesTable.id, link.affiliateId),
    });
    if (!affiliate) return;

    const commission = saleAmount * (Number(affiliate.commissionRate) / 100);

    await db.update(affiliateLinksTable).set({
      conversions: link.conversions + 1,
      earnings: String(Number(link.earnings) + commission),
    }).where(eq(affiliateLinksTable.id, link.id));

    await db.update(affiliatesTable).set({
      totalConversions: affiliate.totalConversions + 1,
      totalEarnings: String(Number(affiliate.totalEarnings) + commission),
      updatedAt: new Date(),
    }).where(eq(affiliatesTable.id, affiliate.id));
  } catch (err) {
    logger.error({ err }, "affiliate credit error");
  }
}

export default router;
