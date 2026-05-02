import { createAdminClient } from "@/lib/supabase/admin";
import { OSRS_SKILLS } from "@/lib/osrs-skills";
import { OSRS_QUEST_REQUIREMENTS } from "@/lib/osrs-quest-requirements";
import { BOSS_PROFILES, type BossProfile } from "@/lib/osrs-boss-profiles";

export type AdminCatalogClient = ReturnType<typeof createAdminClient>;

export const OSRS_CATALOG_SLUGS = new Set(["oldschool-runescape", "osrs"]);

function slugToQuestName(slug: string): string {
  const map: Record<string, string> = {
    dragon_slayer_1: "Dragon Slayer I",
    dragon_slayer_2: "Dragon Slayer II",
    song_of_the_elves: "Song of the Elves",
    fire_cape: "TzHaar Fight Cave (Fire Cape)",
    infernal_cape: "Inferno (Infernal Cape)",
  };
  if (map[slug]) return map[slug];
  return slug
    .split("_")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/** Quest rows derived from OSRS_QUEST_REQUIREMENTS (+ prerequisite slugs). */
function buildStarterQuestRows(): Array<{
  name: string;
  slug: string;
  difficulty: string;
  length: string;
  quest_points: number;
  series: string | null;
  is_members: boolean;
  sort_order: number;
}> {
  const seen = new Set<string>();
  const out: Array<{
    name: string;
    slug: string;
    difficulty: string;
    length: string;
    quest_points: number;
    series: string | null;
    is_members: boolean;
    sort_order: number;
  }> = [];

  const push = (
    slug: string,
    name: string,
    qp: number,
    series: string | null,
    members: boolean
  ) => {
    if (seen.has(slug)) return;
    seen.add(slug);
    out.push({
      slug,
      name,
      quest_points: qp,
      series,
      is_members: members,
      difficulty: "See wiki",
      length: "Various",
      sort_order: out.length,
    });
  };

  for (const q of OSRS_QUEST_REQUIREMENTS) {
    push(q.questSlug, q.questName, q.questPoints ?? 0, null, true);
    for (const rs of q.requiredQuestSlugs) {
      push(rs, slugToQuestName(rs), 0, null, true);
    }
  }

  return out;
}

function bossProfileToRow(b: BossProfile) {
  return {
    id: b.id,
    name: b.name,
    category: b.category,
    wiki_url: b.wiki_url ?? null,
    primary_style: b.primary_style,
    phases: b.phases ?? null,
    melee_weights: b.melee_weights,
    ranged_weights: b.ranged_weights,
    magic_weights: b.magic_weights,
    required_items: b.required_items ?? null,
    notes: b.notes ?? null,
    is_wilderness: b.is_wilderness ?? false,
    icon_url: b.icon ?? null,
  };
}

async function seedGlobalBossProfilesIfEmpty(admin: AdminClient): Promise<number> {
  const { count, error: countErr } = await admin
    .from("osrs_boss_profiles")
    .select("*", { count: "exact", head: true });
  if (countErr) throw new Error(countErr.message);
  if ((count ?? 0) > 0) return 0;

  const rows = BOSS_PROFILES.map(bossProfileToRow);
  const chunk = 40;
  let inserted = 0;
  for (let i = 0; i < rows.length; i += chunk) {
    const part = rows.slice(i, i + chunk);
    const { error } = await admin.from("osrs_boss_profiles").insert(part as never[]);
    if (error) throw new Error(error.message);
    inserted += part.length;
  }
  return inserted;
}

async function copyOsrsSkillingPrices(admin: AdminCatalogClient, targetGameId: string): Promise<number> {
  const { count: existing } = await admin
    .from("osrs_skilling_prices")
    .select("*", { count: "exact", head: true })
    .eq("game_id", targetGameId);
  if ((existing ?? 0) > 0) return 0;

  const { data: allRows, error: fetchErr } = await admin.from("osrs_skilling_prices").select("*");
  if (fetchErr) throw new Error(fetchErr.message);
  if (!allRows?.length) return 0;

  const totals = new Map<string, number>();
  for (const r of allRows as { game_id: string }[]) {
    totals.set(r.game_id, (totals.get(r.game_id) ?? 0) + 1);
  }
  let templateId: string | null = null;
  let best = 0;
  for (const [gid, n] of totals) {
    if (n > best) {
      best = n;
      templateId = gid;
    }
  }
  if (!templateId || templateId === targetGameId) return 0;

  const toInsert = (allRows as Record<string, unknown>[])
    .filter((r) => r.game_id === templateId)
    .map(({ id: _id, ...rest }) => ({ ...rest, game_id: targetGameId }));

  const chunk = 80;
  let n = 0;
  for (let i = 0; i < toInsert.length; i += chunk) {
    const part = toInsert.slice(i, i + chunk);
    const { error } = await admin.from("osrs_skilling_prices").insert(part as never[]);
    if (error) throw new Error(error.message);
    n += part.length;
  }
  return n;
}

export type OsrsCatalogSeedResult = {
  skillsInserted: number;
  questsInserted: number;
  bossProfilesInserted: number;
  skillingRowsCopied: number;
};

/**
 * Idempotent: fills global boss profiles once; per-game skills/quests/skilling prices for OSRS slugs.
 */
export async function seedOsrsCatalogForGame(
  admin: AdminCatalogClient,
  gameId: string,
  gameSlug: string
): Promise<OsrsCatalogSeedResult> {
  const result: OsrsCatalogSeedResult = {
    skillsInserted: 0,
    questsInserted: 0,
    bossProfilesInserted: 0,
    skillingRowsCopied: 0,
  };

  result.bossProfilesInserted = await seedGlobalBossProfilesIfEmpty(admin);

  if (!OSRS_CATALOG_SLUGS.has(gameSlug)) {
    return result;
  }

  const skillRows = OSRS_SKILLS.map((s, i) => ({
    game_id: gameId,
    name: s.label,
    slug: s.id,
    icon: s.icon,
    sort_order: i,
  }));

  const { error: skErr } = await admin
    .from("game_skills")
    .upsert(skillRows as never[], { onConflict: "game_id,slug" });
  if (skErr) throw new Error(skErr.message);
  result.skillsInserted = skillRows.length;

  const questRows = buildStarterQuestRows().map((q) => ({ ...q, game_id: gameId }));
  const { error: qErr } = await admin
    .from("game_quests")
    .upsert(questRows as never[], { onConflict: "game_id,slug" });
  if (qErr) throw new Error(qErr.message);
  result.questsInserted = questRows.length;

  result.skillingRowsCopied = await copyOsrsSkillingPrices(admin, gameId);

  return result;
}
