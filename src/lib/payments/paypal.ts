import { createAdminClient } from "@/lib/supabase/admin";

export interface CreatePayPalOrderParams {
  orderId: string;
  orderNumber: string;
  amount: number;
  currency: string;
  serviceDescription: string;
  returnUrl: string;
  cancelUrl: string;
}

export interface PayPalOrderResult {
  paypalOrderId: string;
  approvalUrl: string;
}

async function getPayPalCredentials(): Promise<{ clientId: string; clientSecret: string }> {
  // Env vars take priority
  const envId = process.env.PAYPAL_CLIENT_ID;
  const envSecret = process.env.PAYPAL_CLIENT_SECRET;
  if (envId && envSecret) return { clientId: envId, clientSecret: envSecret };

  // Fall back to DB settings
  const admin = createAdminClient();
  const { data: rows } = await admin
    .from("site_settings")
    .select("key, value")
    .in("key", ["paypal_client_id", "paypal_client_secret"]) as unknown as { data: { key: string; value: string }[] | null };

  const map = Object.fromEntries((rows ?? []).map((r) => [r.key, r.value]));
  const clientId = map.paypal_client_id;
  const clientSecret = map.paypal_client_secret;

  if (!clientId || !clientSecret) {
    throw new Error("PayPal credentials are not configured. Set them in Admin → Settings → Payments.");
  }

  return { clientId, clientSecret };
}

async function getPayPalBase(): Promise<string> {
  // Check DB setting for mode
  const envMode = process.env.PAYPAL_MODE;
  if (envMode === "live") return "https://api-m.paypal.com";
  if (envMode === "sandbox") return "https://api-m.sandbox.paypal.com";

  const admin = createAdminClient();
  const { data } = await admin
    .from("site_settings")
    .select("value")
    .eq("key", "paypal_mode")
    .single() as unknown as { data: { value: string } | null };

  return data?.value === "live"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";
}

async function getPayPalAccessToken(): Promise<string> {
  const { clientId, clientSecret } = await getPayPalCredentials();
  const base = await getPayPalBase();

  const res = await fetch(`${base}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
    },
    body: "grant_type=client_credentials",
  });

  if (!res.ok) throw new Error(`PayPal auth failed: ${res.status}`);
  const data = await res.json() as { access_token: string };
  return data.access_token;
}

export async function createPayPalOrder(
  params: CreatePayPalOrderParams
): Promise<PayPalOrderResult> {
  const token = await getPayPalAccessToken();
  const base = await getPayPalBase();

  const res = await fetch(`${base}/v2/checkout/orders`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [
        {
          reference_id: params.orderId,
          description: params.serviceDescription,
          custom_id: params.orderNumber,
          amount: {
            currency_code: params.currency.toUpperCase(),
            value: params.amount.toFixed(2),
          },
        },
      ],
      application_context: {
        return_url: params.returnUrl,
        cancel_url: params.cancelUrl,
        brand_name: "BoostPlatform",
        user_action: "PAY_NOW",
      },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`PayPal order creation failed: ${err}`);
  }

  const data = await res.json() as {
    id: string;
    links: { rel: string; href: string }[];
  };

  const approvalLink = data.links.find((l) => l.rel === "approve");
  if (!approvalLink) throw new Error("PayPal approval URL not found");

  return { paypalOrderId: data.id, approvalUrl: approvalLink.href };
}

export async function capturePayPalOrder(paypalOrderId: string): Promise<{
  status: string;
  captureId: string;
  amount: number;
}> {
  const token = await getPayPalAccessToken();
  const base = await getPayPalBase();

  const res = await fetch(`${base}/v2/checkout/orders/${paypalOrderId}/capture`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`PayPal capture failed: ${err}`);
  }

  const data = await res.json() as {
    status: string;
    purchase_units: {
      payments: {
        captures: { id: string; amount: { value: string } }[];
      };
    }[];
  };

  const capture = data.purchase_units[0]?.payments?.captures?.[0];
  if (!capture) throw new Error("PayPal capture data missing");

  return {
    status: data.status,
    captureId: capture.id,
    amount: parseFloat(capture.amount.value),
  };
}

async function getPayPalWebhookId(): Promise<string | null> {
  if (process.env.PAYPAL_WEBHOOK_ID) return process.env.PAYPAL_WEBHOOK_ID;

  const admin = createAdminClient();
  const { data } = await admin
    .from("site_settings")
    .select("value")
    .eq("key", "paypal_webhook_id")
    .single() as unknown as { data: { value: string } | null };

  return data?.value ?? null;
}

export async function verifyPayPalWebhook(
  headers: Record<string, string>,
  body: string
): Promise<boolean> {
  const webhookId = await getPayPalWebhookId();

  if (!webhookId) {
    console.error("[paypal-webhook] PAYPAL_WEBHOOK_ID not configured — rejecting all webhook requests. Set it in Admin → Settings → Payments.");
    return false;
  }

  const transmissionId = headers["paypal-transmission-id"];
  const transmissionTime = headers["paypal-transmission-time"];
  const certUrl = headers["paypal-cert-url"];
  const authAlgo = headers["paypal-auth-algo"];
  const transmissionSig = headers["paypal-transmission-sig"];

  if (!transmissionId || !transmissionTime || !certUrl || !authAlgo || !transmissionSig) {
    console.error("[paypal-webhook] Missing required PayPal signature headers");
    return false;
  }

  try {
    const token = await getPayPalAccessToken();
    const base = await getPayPalBase();

    const res = await fetch(`${base}/v1/notifications/verify-webhook-signature`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        auth_algo: authAlgo,
        cert_url: certUrl,
        transmission_id: transmissionId,
        transmission_sig: transmissionSig,
        transmission_time: transmissionTime,
        webhook_id: webhookId,
        webhook_event: JSON.parse(body) as Record<string, unknown>,
      }),
    });

    if (!res.ok) {
      console.error("[paypal-webhook] PayPal verify-webhook-signature API error:", res.status);
      return false;
    }

    const result = await res.json() as { verification_status: string };
    const verified = result.verification_status === "SUCCESS";
    if (!verified) {
      console.error("[paypal-webhook] PayPal signature verification failed:", result.verification_status);
    }
    return verified;
  } catch (err) {
    console.error("[paypal-webhook] Signature verification error:", err);
    return false;
  }
}
