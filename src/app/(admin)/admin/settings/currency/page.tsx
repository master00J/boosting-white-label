import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import CurrencySettingsClient from "./currency-settings-client";
import type { CurrencyRates } from "@/types/currency";

export const metadata: Metadata = { title: "Currency & Gold Settings" };
export const dynamic = "force-dynamic";

export default async function CurrencySettingsPage() {
  const admin = createAdminClient();

  const { data: rows } = await admin
    .from("site_settings")
    .select("key, value")
    .in("key", ["currency_rates"]) as unknown as { data: { key: string; value: unknown }[] | null };

  const { data: games } = await admin
    .from("games")
    .select("id, name")
    .order("name") as unknown as { data: { id: string; name: string }[] | null };

  const ratesRow = (rows ?? []).find((r) => r.key === "currency_rates");
  const rates = (ratesRow?.value ?? { usd_eur_rate: 0.92, games: {} }) as CurrencyRates;

  return <CurrencySettingsClient initialRates={rates} games={games ?? []} />;
}
