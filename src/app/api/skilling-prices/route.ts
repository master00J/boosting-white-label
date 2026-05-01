import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

function getClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(url, key);
}

/** GET /api/skilling-prices?game_id=xxx&skill_slug=yyy — Returns osrs_skilling_prices for a skill */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const gameId = searchParams.get("game_id");
  const skillSlug = searchParams.get("skill_slug");

  if (!gameId) return NextResponse.json({ error: "game_id required" }, { status: 400 });
  if (!skillSlug) return NextResponse.json({ error: "skill_slug required" }, { status: 400 });

  const supabase = getClient();

  const { data, error } = await supabase
    .from("osrs_skilling_prices")
    .select("method_id, method_name, level_min, level_max, gp_per_xp, sort_order")
    .eq("game_id", gameId)
    .eq("skill_slug", skillSlug)
    .order("sort_order", { ascending: true })
    .order("level_min", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ methods: data ?? [] });
}
