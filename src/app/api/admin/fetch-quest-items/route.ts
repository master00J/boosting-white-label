import { NextResponse } from "next/server";
import { assertAdmin } from "@/lib/auth/assert-admin";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import {
  questNameToWikiTitle,
  extractItemsParam,
  parseQuestItemsWikitext,
} from "@/lib/osrs-quest-items";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const WIKI_API = "https://oldschool.runescape.wiki/api.php";

async function fetchWikiWikitext(pageTitle: string): Promise<string | null> {
  const url = `${WIKI_API}?action=parse&page=${encodeURIComponent(pageTitle)}&prop=wikitext&format=json`;
  const res = await fetch(url, {
    headers: {
      "User-Agent": "BoostPlatform/1.0 (Quest Items Fetcher; support@example.com)",
    },
  });
  if (!res.ok) return null;
  const json = await res.json();
  return json.parse?.wikitext?.["*"] ?? null;
}

function getRawAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createSupabaseClient(url, key);
}

/** POST /api/admin/fetch-quest-items — Fetch quest items from OSRS Wiki and populate DB */
export async function POST() {
  const ctx = await assertAdmin();
  if (!ctx.ok) return ctx.response;

  const raw = getRawAdminClient();
  const osrsGameId = process.env.OSRS_GAME_ID ?? "a8c56ade-08b9-4765-a596-9d9a3d5b1ab7";

  const { data: quests, error: questErr } = await raw
    .from("game_quests")
    .select("id, name")
    .eq("game_id", osrsGameId)
    .order("sort_order", { ascending: true });

  if (questErr || !quests?.length) {
    return NextResponse.json(
      { error: questErr?.message ?? "No quests found. Ensure game_quests has OSRS quests." },
      { status: 400 }
    );
  }

  const stats = { fetched: 0, items: 0, errors: 0, skipped: 0 };

  for (const quest of quests as { id: string; name: string }[]) {
    const wikiTitle = questNameToWikiTitle(quest.name);
    const wikitext = await fetchWikiWikitext(wikiTitle);
    if (!wikitext) {
      stats.skipped++;
      continue;
    }
    stats.fetched++;

    const itemsParam = extractItemsParam(wikitext);
    if (!itemsParam) continue;

    const items = parseQuestItemsWikitext(itemsParam);
    if (items.length === 0) continue;

    for (const item of items) {
      const { error: insErr } = await raw.from("game_quest_required_items").upsert(
        {
          quest_id: quest.id,
          item_name: item.itemName,
          quantity: item.quantity,
        },
        {
          onConflict: "quest_id,item_name",
          ignoreDuplicates: false,
        }
      );
      if (insErr) stats.errors++;
      else stats.items++;
    }

    await new Promise((r) => setTimeout(r, 300));
  }

  return NextResponse.json({
    ok: true,
    quests: quests.length,
    ...stats,
  });
}
