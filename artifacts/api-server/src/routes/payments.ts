import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { ordersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth } from "../lib/auth";
import { logger } from "../lib/logger";

const router: IRouter = Router();

function getStripe() {
  const Stripe = require("stripe");
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY not configured");
  return new Stripe(key, { apiVersion: "2023-10-16" });
}

router.post("/payments/stripe/create-intent", requireAuth, async (req, res) => {
  const { orderId, amount, currency = "usd" } = req.body;

  if (!process.env.STRIPE_SECRET_KEY) {
    res.status(503).json({ error: "Stripe not configured. Please add STRIPE_SECRET_KEY." });
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

router.post("/payments/flutterwave/initiate", requireAuth, async (req, res) => {
  const { orderId, amount, currency = "NGN", email, phone, name } = req.body;

  if (!process.env.FLUTTERWAVE_SECRET_KEY) {
    res.status(503).json({ error: "Flutterwave not configured. Please add FLUTTERWAVE_SECRET_KEY." });
    return;
  }

  try {
    const txRef = `BRAX-${orderId}-${Date.now()}`;
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
        redirect_url: `${process.env.APP_URL || ""}/orders/${orderId}`,
        customer: { email, phone_number: phone, name },
        customizations: {
          title: "BRAX Marketplace",
          description: `Payment for Order ${orderId}`,
        },
      }),
    });

    const data = await response.json() as { status: string; data?: { link?: string } };

    if (data.status !== "success") {
      res.status(500).json({ error: "Flutterwave initialization failed" });
      return;
    }

    await db
      .update(ordersTable)
      .set({ flutterwaveRef: txRef })
      .where(eq(ordersTable.id, orderId));

    res.json({ paymentLink: data.data?.link, transactionRef: txRef });
  } catch (err) {
    logger.error({ err }, "Flutterwave error");
    res.status(500).json({ error: "Payment initialization failed" });
  }
});

router.post("/payments/webhook/stripe", async (req, res) => {
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

export default router;
