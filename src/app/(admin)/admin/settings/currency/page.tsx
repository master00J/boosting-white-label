import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import CurrencySettingsClient from "./currency-settings-client";
import type { CurrencyRates } from "@/types/currency";

export const metadata: Metadata = { title: "Currency & Gold Settings" };
export const dynamic = "force-dynamic";

const DEFAULT_RATES: CurrencyRates = { usd_eur_rate: 0.92, games: {} };

function parseCurrencyRates(value: unknown): CurrencyRates {
  if (!value) return DEFAULT_RATES;

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value) as unknown;
      return parseCurrencyRates(parsed);
    } catch {
      return DEFAULT_RATES;
    }
  }

  if (typeof value === "object" && value !== null) {
    const candidate = value as Partial<CurrencyRates>;
    return {
      usd_eur_rate: typeof candidate.usd_eur_rate === "number" ? candidate.usd_eur_rate : DEFAULT_RATES.usd_eur_rate,
      games: candidate.games && typeof candidate.games === "object" ? candidate.games : {},
    };
  }

  return DEFAULT_RATES;
}

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
  const rates = parseCurrencyRates(ratesRow?.value);

  return <CurrencySettingsClient initialRates={rates} games={games ?? []} />;
}
