import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

function getClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(url, key);
}

/** GET /api/quest-required-items?game_id=xxx — Returns all quest required items for a game */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const gameId = searchParams.get("game_id");
  if (!gameId) return NextResponse.json({ error: "game_id required" }, { status: 400 });

  const supabase = getClient();

  const { data: quests } = await supabase
    .from("game_quests" as never)
    .select("id, name")
    .eq("game_id", gameId)
    .order("sort_order", { ascending: true });

  if (!quests?.length) {
    return NextResponse.json({ quests: [], itemsByQuest: {} });
  }

  const questIds = (quests as { id: string; name: string }[]).map((q) => q.id);
  const { data: items } = await supabase
    .from("game_quest_required_items" as never)
    .select("quest_id, item_name, quantity")
    .in("quest_id", questIds);

  const itemsByQuestId: Record<string, { itemName: string; quantity: number }[]> = {};

  for (const row of (items ?? []) as { quest_id: string; item_name: string; quantity: number }[]) {
    if (!itemsByQuestId[row.quest_id]) itemsByQuestId[row.quest_id] = [];
    itemsByQuestId[row.quest_id].push({ itemName: row.item_name, quantity: row.quantity });
  }

  const result = (quests as { id: string; name: string }[]).map((q) => ({
    questId: q.id,
    questName: q.name,
    items: itemsByQuestId[q.id] ?? [],
  }));

  return NextResponse.json({ quests: result });
}
