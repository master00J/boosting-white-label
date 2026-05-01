import { Whop } from "@whop/sdk";
import { createAdminClient } from "@/lib/supabase/admin";

async function getWhopCredentials(): Promise<{ apiKey: string; companyId: string; productId: string; webhookSecret: string }> {
  // Env vars take priority
  const envKey = process.env.WHOP_API_KEY;
  const envCompany = process.env.WHOP_COMPANY_ID;
  const envProduct = process.env.WHOP_PRODUCT_ID;
  const envWebhook = process.env.WHOP_WEBHOOK_SECRET;

  if (envKey && envCompany && envProduct) {
    return {
      apiKey: envKey,
      companyId: envCompany,
      productId: envProduct,
      webhookSecret: envWebhook ?? "",
    };
  }

  // Fall back to DB settings
  const admin = createAdminClient();
  const { data: rows } = await admin
    .from("site_settings")
    .select("key, value")
    .in("key", ["whop_api_key", "whop_company_id", "whop_product_id", "whop_webhook_secret"]) as unknown as {
      data: { key: string; value: string }[] | null;
    };

  const map = Object.fromEntries((rows ?? []).map((r) => [r.key, r.value]));

  const apiKey = map.whop_api_key;
  const companyId = map.whop_company_id;
  const productId = map.whop_product_id;

  if (!apiKey || !companyId || !productId) {
    throw new Error("Whop credentials are not configured. Set them in Admin → Settings → Payments.");
  }

  return {
    apiKey,
    companyId,
    productId,
    webhookSecret: map.whop_webhook_secret ?? "",
  };
}

export function getWhopClient(apiKey: string): Whop {
  return new Whop({ apiKey });
}

export interface CreateWhopCheckoutParams {
  orderId: string;
  orderIds: string[]; // all order IDs in the cart
  total: number;
  currency: string;
  description: string;
  successUrl: string;
  cancelUrl: string;
}

export interface WhopCheckoutResult {
  purchaseUrl: string;
  planId: string;
  checkoutConfigId: string;
}

export async function createWhopCheckout(
  params: CreateWhopCheckoutParams
): Promise<WhopCheckoutResult> {
  const creds = await getWhopCredentials();
  const whop = getWhopClient(creds.apiKey);

  // Create a one-time hidden plan for this specific order total
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const checkout = await (whop as any).checkoutConfigurations.create({
    plan: {
      company_id: creds.companyId,
      product_id: creds.productId,
      plan_type: "one_time",
      visibility: "hidden",
      currency: params.currency.toLowerCase(),
      initial_price: params.total,
      title: params.description,
    },
    // Store all order IDs so the webhook can activate all of them
    metadata: {
      order_id: params.orderId,
      order_ids: params.orderIds.join(","),
    },
    redirect_url: params.successUrl,
    source_url: params.cancelUrl,
  }) as { purchase_url: string; id: string; plan: { id: string } };

  return {
    purchaseUrl: checkout.purchase_url,
    planId: checkout.plan.id,
    checkoutConfigId: checkout.id,
  };
}

export async function getWhopWebhookSecret(): Promise<string> {
  const creds = await getWhopCredentials();
  return creds.webhookSecret;
}

export async function verifyWhopWebhook(
  body: string,
  headers: Record<string, string>
): Promise<{ type: string; data: Record<string, unknown> } | null> {
  try {
    const creds = await getWhopCredentials();

    if (!creds.webhookSecret) {
      console.error("[whop-webhook] WHOP_WEBHOOK_SECRET is not configured — rejecting all webhook requests");
      return null;
    }

    const whop = getWhopClient(creds.apiKey);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const event = (whop as any).webhooks.unwrap(body, { headers, secret: creds.webhookSecret }) as { type: string; data: Record<string, unknown> };
    return event;
  } catch (err) {
    console.error("[whop-webhook] verification failed:", err);
    return null;
  }
}
