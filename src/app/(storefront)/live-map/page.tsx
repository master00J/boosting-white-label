import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import LiveMapClient from "./live-map-client";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Live Booster Map",
  description: "See where our boosters are actively working in real time.",
};

type Row = { vpn_country_code: string };

export default async function LiveMapPage() {
  const admin = createAdminClient();

  const { data } = await (admin as unknown as { from: (t: string) => ReturnType<ReturnType<typeof createAdminClient>["from"]> })
    .from("orders")
    .select("vpn_country_code")
    .in("status", ["in_progress", "paused", "claimed"])
    .not("vpn_country_code", "is", null) as { data: Row[] | null };

  const counts: Record<string, number> = {};
  for (const row of data ?? []) {
    if (row.vpn_country_code) {
      counts[row.vpn_country_code] = (counts[row.vpn_country_code] ?? 0) + 1;
    }
  }

  const locations = Object.entries(counts).map(([country_code, count]) => ({ country_code, count }));
  const total = locations.reduce((s, l) => s + l.count, 0);

  return <LiveMapClient locations={locations} total={total} />;
}
