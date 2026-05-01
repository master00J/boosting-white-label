import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import LoyaltyClient from "./loyalty-client";

export const metadata: Metadata = { title: "Loyalty program" };
export const dynamic = "force-dynamic";

type TierRow = { id: string; name: string; min_points: number; discount_percentage: number; color: string; icon: string; created_at: string };
type SettingRow = { key: string; value: string };

export default async function LoyaltyPage() {
  const admin = createAdminClient();

  const { data: tiers } = await admin
    .from("loyalty_tiers")
    .select("id, name, min_points, discount_percentage, color, icon, created_at")
    .order("min_points", { ascending: true }) as unknown as { data: TierRow[] | null };

  const { data: settings } = await admin
    .from("site_settings")
    .select("key, value")
    .in("key", ["loyalty_points_per_euro", "loyalty_enabled"]) as unknown as { data: SettingRow[] | null };

  const settingsMap = Object.fromEntries((settings ?? []).map((s) => [s.key, s.value]));

  return <LoyaltyClient tiers={tiers ?? []} settings={settingsMap} />;
}
