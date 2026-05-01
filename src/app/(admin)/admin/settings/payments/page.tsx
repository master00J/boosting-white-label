import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import PaymentSettingsClient from "./payment-settings-client";

export const metadata: Metadata = { title: "Payment Settings" };
export const dynamic = "force-dynamic";

type SettingRow = { key: string; value: string };

const KEYS = [
  "stripe_enabled",
  "paypal_enabled",
  "balance_enabled",
  "gold_enabled",
  "whop_enabled",
  "stripe_mode",
  "stripe_publishable_key",
  "stripe_secret_key",
  "stripe_webhook_secret",
  "paypal_mode",
  "paypal_client_id",
  "paypal_client_secret",
  "paypal_webhook_id",
  "whop_api_key",
  "whop_company_id",
  "whop_product_id",
  "whop_webhook_secret",
  "min_order_amount",
  "max_order_amount",
  "fee_pct_stripe",
  "fee_fixed_stripe",
  "fee_pct_paypal",
  "fee_fixed_paypal",
  "fee_pct_balance",
  "fee_fixed_balance",
  "fee_pct_gold",
  "fee_fixed_gold",
  "fee_pct_whop",
  "fee_fixed_whop",
  "nowpayments_enabled",
  "nowpayments_api_key",
  "nowpayments_ipn_secret",
  "fee_pct_nowpayments",
  "fee_fixed_nowpayments",
];

export default async function PaymentSettingsPage() {
  const admin = createAdminClient();
  const { data: settings } = await admin
    .from("site_settings")
    .select("key, value")
    .in("key", KEYS) as unknown as { data: SettingRow[] | null };

  const map = Object.fromEntries((settings ?? []).map((s) => [s.key, String(s.value)]));

  // Fall back to env vars for display if not in DB yet
  if (!map.stripe_publishable_key && process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) {
    map.stripe_publishable_key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  }

  return <PaymentSettingsClient initialSettings={map} />;
}
