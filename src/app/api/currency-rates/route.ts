import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { CurrencyRates } from "@/types/currency";

export const dynamic = "force-dynamic";

export async function GET() {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("site_settings")
    .select("value")
    .eq("key", "currency_rates")
    .single() as unknown as { data: { value: CurrencyRates } | null; error: unknown };

  if (error) {
    console.error("[currency-rates API] DB error:", error);
  }

  // The value may be stored as a string (text column) or object (jsonb)
  let parsed: CurrencyRates;
  if (!data?.value) {
    parsed = { usd_eur_rate: 0.92, games: {} };
  } else if (typeof data.value === "string") {
    try { parsed = JSON.parse(data.value as string) as CurrencyRates; }
    catch { parsed = { usd_eur_rate: 0.92, games: {} }; }
  } else {
    parsed = data.value;
  }

  console.log("[currency-rates API] returning:", JSON.stringify(parsed));
  return NextResponse.json(parsed);
}
