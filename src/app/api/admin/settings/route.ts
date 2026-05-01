import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { assertAdmin } from "@/lib/auth/assert-admin";

const ALLOWED_SETTINGS_KEYS = new Set([
  "site_name", "site_description", "site_logo", "site_favicon",
  "hero_title", "hero_subtitle", "hero_background", "hero_cta_text",
  "tawkto_enabled", "tawkto_property_id", "tawkto_widget_id",
  "custom_chat_enabled", "custom_chat_script",
  "discord_invite_url", "discord_webhook_url", "discord_bot_token",
  "discord_client_id", "discord_guild_id",
  "discord_channel_new_orders", "discord_channel_completed_orders",
  "discord_channel_worker_notifications", "discord_channel_admin_alerts",
  "discord_channel_reviews", "discord_category_tickets",
  "discord_role_customer", "discord_role_worker", "discord_role_admin",
  "stripe_enabled", "stripe_mode",
  "stripe_publishable_key", "stripe_secret_key", "stripe_webhook_secret",
  "paypal_enabled", "paypal_webhook_id",
  "paypal_client_id", "paypal_client_secret", "paypal_mode",
  "balance_enabled", "gold_enabled",
  "whop_enabled", "whop_product_id",
  "whop_api_key", "whop_webhook_secret", "whop_company_id",
  "nowpayments_enabled",
  "nowpayments_api_key", "nowpayments_ipn_secret",
  "resend_api_key", "resend_from_email", "resend_from_name",
  "smtp_host", "smtp_port", "smtp_user", "smtp_pass", "smtp_from_email", "smtp_from_name", "smtp_secure",
  "email_provider",
  "openai_api_key", "anthropic_api_key", "ai_provider", "ai_model",
  "cron_secret",
  "currency_rates",
  "affiliate_default_rate", "affiliate_enabled",
  "loyalty_enabled", "loyalty_points_per_dollar", "loyalty_usd_per_point",
  "fee_pct_stripe", "fee_fixed_stripe",
  "fee_pct_paypal", "fee_fixed_paypal",
  "fee_pct_whop", "fee_fixed_whop",
  "fee_pct_nowpayments", "fee_fixed_nowpayments",
  "fee_pct_balance", "fee_fixed_balance",
  "fee_pct_gold", "fee_fixed_gold",
  "worker_default_commission_rate",
  "min_order_amount", "max_order_amount",
  "order_id_brand", "order_id",
  "maintenance_mode", "maintenance_message",
  "integrations",
]);

export async function POST(req: NextRequest) {
  const ctx = await assertAdmin();
  if (!ctx.ok) return ctx.response;
  const { admin } = ctx;

  const body = await req.json() as { settings: Record<string, string> };
  const { settings } = body;

  if (!settings || typeof settings !== "object") {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const { order_id_brand: orderIdBrand, ...rest } = settings;

  // Reject any keys not in the allowlist
  const rejectedKeys = Object.keys(rest).filter((k) => !ALLOWED_SETTINGS_KEYS.has(k));
  if (rejectedKeys.length > 0) {
    return NextResponse.json({ error: `Invalid settings keys: ${rejectedKeys.join(", ")}` }, { status: 400 });
  }

  const upserts = Object.entries(rest).map(([key, value]) => ({ key, value: String(value) })) as { key: string; value: string }[];
  if (orderIdBrand !== undefined) {
    upserts.push({
      key: "order_id",
      value: { brand: String(orderIdBrand).trim() || "BST" } as never,
    });
  }

  const { error } = await admin
    .from("site_settings")
    .upsert(upserts as never[], { onConflict: "key" });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  revalidatePath("/", "layout");

  return NextResponse.json({ success: true });
}
