import { NextResponse } from "next/server";
import { assertAdmin } from "@/lib/auth/assert-admin";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

// Use service role key to bypass RLS — game_quests is not in the generated types yet
function getRawAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createSupabaseClient(url, key);
}

// GET /api/admin/game-quests?game_id=xxx&members=true|false|all
export async function GET(req: Request) {
  const ctx = await assertAdmin();
  if (!ctx.ok) return ctx.response;

  const rawClient = getRawAdminClient();
  const { searchParams } = new URL(req.url);
  const gameId = searchParams.get("game_id");
  const members = searchParams.get("members");

  if (!gameId) return NextResponse.json({ error: "game_id required" }, { status: 400 });

  let query = rawClient
    .from("game_quests")
    .select("id, name, slug, difficulty, length, quest_points, series, is_members, sort_order, icon_url")
    .eq("game_id", gameId)
    .order("sort_order", { ascending: true });

  if (members === "true") query = query.eq("is_members", true);
  if (members === "false") query = query.eq("is_members", false);

  const { data, error } = await query;
  if (error) {
    console.error("[game-quests] query error:", error.message, error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data ?? []);
}
