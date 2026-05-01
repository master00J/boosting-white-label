import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
// Revalidate every 60 seconds
export const revalidate = 60;

type Row = { vpn_country_code: string };

// GET /api/active-locations — returns active orders grouped by country
// Public endpoint: only exposes country codes + count, no personal data
export async function GET() {
  try {
    const admin = createAdminClient();

    const { data, error } = await (admin as unknown as { from: (t: string) => ReturnType<ReturnType<typeof createAdminClient>["from"]> })
      .from("orders")
      .select("vpn_country_code")
      .in("status", ["in_progress", "paused", "claimed"])
      .not("vpn_country_code", "is", null) as { data: Row[] | null; error: { message: string } | null };

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Count per country
    const counts: Record<string, number> = {};
    for (const row of data ?? []) {
      if (row.vpn_country_code) {
        counts[row.vpn_country_code] = (counts[row.vpn_country_code] ?? 0) + 1;
      }
    }

    const locations = Object.entries(counts).map(([country_code, count]) => ({
      country_code,
      count,
    }));

    return NextResponse.json({ locations, total: locations.reduce((s, l) => s + l.count, 0) });
  } catch (e) {
    console.error("[active-locations]", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
