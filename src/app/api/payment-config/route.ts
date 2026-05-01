import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET() {
  const admin = createAdminClient();
  const { data } = await admin
    .from("site_settings")
    .select("key, value")
    .in("key", ["stripe_enabled", "paypal_enabled", "balance_enabled", "gold_enabled", "whop_enabled", "nowpayments_enabled"]) as unknown as {
      data: { key: string; value: string }[] | null;
    };

  const map = Object.fromEntries((data ?? []).map((r) => [r.key, String(r.value)]));
  return NextResponse.json(map);
}
