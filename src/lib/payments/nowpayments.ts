import crypto from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";

async function getNOWPaymentsCredentials(): Promise<{ apiKey: string; ipnSecret: string }> {
  const envKey = process.env.NOWPAYMENTS_API_KEY;
  const envSecret = process.env.NOWPAYMENTS_IPN_SECRET;

  if (envKey) {
    return { apiKey: envKey, ipnSecret: envSecret ?? "" };
  }

  const admin = createAdminClient();
  const { data } = await admin
    .from("site_settings")
    .select("key, value")
    .in("key", ["nowpayments_api_key", "nowpayments_ipn_secret"]) as unknown as {
      data: { key: string; value: string }[] | null;
    };

  const map = Object.fromEntries((data ?? []).map((r) => [r.key, r.value]));

  if (!map.nowpayments_api_key) {
    throw new Error("NOWPayments API key not configured. Set it in Admin → Settings → Payments.");
  }

  return {
    apiKey: map.nowpayments_api_key,
    ipnSecret: map.nowpayments_ipn_secret ?? "",
  };
}

export interface CreateNOWPaymentsInvoiceParams {
  orderId: string;
  total: number;
  description: string;
  successUrl: string;
  cancelUrl: string;
  callbackUrl: string;
}

export interface NOWPaymentsInvoiceResult {
  invoiceId: string;
  invoiceUrl: string;
}

export async function createNOWPaymentsInvoice(
  params: CreateNOWPaymentsInvoiceParams
): Promise<NOWPaymentsInvoiceResult> {
  const { apiKey } = await getNOWPaymentsCredentials();

  const res = await fetch("https://api.nowpayments.io/v1/invoice", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      price_amount: params.total,
      price_currency: "usd",
      order_id: params.orderId,
      order_description: params.description.slice(0, 200),
      success_url: params.successUrl,
      cancel_url: params.cancelUrl,
      ipn_callback_url: params.callbackUrl,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`NOWPayments invoice creation failed (${res.status}): ${err}`);
  }

  const data = await res.json() as { id: string; invoice_url: string };

  return {
    invoiceId: String(data.id),
    invoiceUrl: data.invoice_url,
  };
}

/** Verify the HMAC-SHA512 signature sent in the x-nowpayments-sig header */
export async function verifyNOWPaymentsWebhook(
  rawBody: string,
  signature: string
): Promise<boolean> {
  const { ipnSecret } = await getNOWPaymentsCredentials();

  if (!ipnSecret) {
    // Without an IPN secret we cannot verify authenticity — reject to prevent fraud
    console.error("[nowpayments-webhook] No IPN secret configured — rejecting webhook. Set nowpayments_ipn_secret in Admin → Settings → Payments.");
    return false;
  }

  try {
    // NOWPayments signs a JSON object with alphabetically sorted keys
    const parsed = JSON.parse(rawBody) as Record<string, unknown>;
    const sorted = Object.keys(parsed)
      .sort()
      .reduce<Record<string, unknown>>((acc, k) => { acc[k] = parsed[k]; return acc; }, {});

    const hmac = crypto.createHmac("sha512", ipnSecret);
    hmac.update(JSON.stringify(sorted));
    const expected = hmac.digest("hex");

    return crypto.timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(signature, "hex"));
  } catch {
    return false;
  }
}
