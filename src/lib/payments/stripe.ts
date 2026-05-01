import Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";

// Cache the instance per key to avoid re-instantiating on every request
let stripeInstance: Stripe | null = null;
let stripeInstanceKey: string | null = null;

async function getStripeKey(): Promise<string> {
  // Env var takes priority
  if (process.env.STRIPE_SECRET_KEY) return process.env.STRIPE_SECRET_KEY;

  // Fall back to DB setting
  const admin = createAdminClient();
  const { data } = await admin
    .from("site_settings")
    .select("value")
    .eq("key", "stripe_secret_key")
    .single() as unknown as { data: { value: string } | null };

  if (data?.value) return data.value;
  throw new Error("Stripe secret key is not configured. Set it in Admin → Settings → Payments.");
}

export async function getStripe(): Promise<Stripe> {
  const key = await getStripeKey();
  if (!stripeInstance || stripeInstanceKey !== key) {
    stripeInstance = new Stripe(key, { apiVersion: "2025-02-24.acacia" });
    stripeInstanceKey = key;
  }
  return stripeInstance;
}

async function getWebhookSecret(): Promise<string> {
  if (process.env.STRIPE_WEBHOOK_SECRET) return process.env.STRIPE_WEBHOOK_SECRET;

  const admin = createAdminClient();
  const { data } = await admin
    .from("site_settings")
    .select("value")
    .eq("key", "stripe_webhook_secret")
    .single() as unknown as { data: { value: string } | null };

  if (data?.value) return data.value;
  throw new Error("Stripe webhook secret is not configured.");
}

export interface CreateStripeSessionParams {
  orderId: string;
  orderNumber: string;
  amount: number; // in cents
  currency: string;
  customerEmail: string;
  serviceDescription: string;
  successUrl: string;
  cancelUrl: string;
  metadata?: Record<string, string>;
}

export async function createStripeCheckoutSession(
  params: CreateStripeSessionParams
): Promise<{ sessionId: string; url: string }> {
  const stripe = await getStripe();

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    mode: "payment",
    customer_email: params.customerEmail,
    line_items: [
      {
        price_data: {
          currency: params.currency.toLowerCase(),
          product_data: {
            name: params.serviceDescription,
            metadata: { order_id: params.orderId },
          },
          unit_amount: Math.round(params.amount),
        },
        quantity: 1,
      },
    ],
    metadata: {
      order_id: params.orderId,
      order_number: params.orderNumber,
      ...params.metadata,
    },
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
    expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
  });

  if (!session.url) throw new Error("Stripe session URL is null");
  return { sessionId: session.id, url: session.url };
}

export async function createStripeRefund(
  paymentIntentId: string,
  amountCents?: number
): Promise<Stripe.Refund> {
  const stripe = await getStripe();
  return stripe.refunds.create({
    payment_intent: paymentIntentId,
    ...(amountCents ? { amount: Math.round(amountCents) } : {}),
  });
}

export async function verifyStripeWebhook(
  payload: string | Buffer,
  signature: string
): Promise<Stripe.Event> {
  const secret = await getWebhookSecret();
  const stripe = await getStripe();
  return stripe.webhooks.constructEvent(payload, signature, secret);
}
