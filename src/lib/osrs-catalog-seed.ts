import { createAdminClient } from "@/lib/supabase/admin";
import { OSRS_SKILLS } from "@/lib/osrs-skills";
import { OSRS_QUEST_REQUIREMENTS } from "@/lib/osrs-quest-requirements";
import { BOSS_PROFILES, type BossProfile } from "@/lib/osrs-boss-profiles";
import { OSRS_WIKI_QUESTS } from "@/lib/osrs-wiki-quests.generated";
import {
  buildQuestPointsBySlugMap,
  buildRequirementSlugByTitleMap,
  resolveQuestSlug,
  wikiTitleToInventoryIconUrl,
} from "@/lib/osrs-quest-slug";

export type AdminCatalogClient = ReturnType<typeof createAdminClient>;

export const OSRS_CATALOG_SLUGS = new Set(["oldschool-runescape", "osrs"]);

/** Catalog tables are not fully represented in generated Supabase typings */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- loose client for catalog tables
function ac(admin: AdminCatalogClient): any {
  return admin;
}

const SYNTHETIC_CATALOG_QUESTS = [
  {
    slug: "fire_cape",
    name: "TzHaar Fight Cave (Fire Cape)",
    icon_url: "https://oldschool.runescape.wiki/images/Fire_cape.png",
    is_members: false,
    quest_points: 0,
  },
  {
    slug: "infernal_cape",
    name: "Inferno (Infernal Cape)",
    icon_url: "https://oldschool.runescape.wiki/images/Infernal_cape.png",
    is_members: true,
    quest_points: 0,
  },
] as const;

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

async function seedGlobalBossProfilesIfEmpty(admin: AdminCatalogClient): Promise<number> {
  const { count, error: countErr } = await ac(admin)
    .from("osrs_boss_profiles")
    .select("*", { count: "exact", head: true });
  if (countErr) throw new Error(countErr.message);
  if ((count ?? 0) > 0) return 0;

  const rows = BOSS_PROFILES.map(bossProfileToRow);
  const chunk = 40;
  let inserted = 0;
  for (let i = 0; i < rows.length; i += chunk) {
    const part = rows.slice(i, i + chunk);
    const { error } = await ac(admin).from("osrs_boss_profiles").insert(part as never[]);
    if (error) throw new Error(error.message);
    inserted += part.length;
  }
  return inserted;
}

function wikiArticleTitleFromUrl(wikiUrl: string | null): string | null {
  if (!wikiUrl) return null;
  try {
    const u = new URL(wikiUrl);
    const idx = u.pathname.indexOf("/w/");
    if (idx === -1) return null;
    const raw = u.pathname.slice(idx + 3);
    return decodeURIComponent(raw.replace(/_/g, " "));
  } catch {
    return null;
  }
}

async function fetchWikiOriginalImagesByTitles(titles: string[]): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  const chunk = 35;
  const base = "https://oldschool.runescape.wiki/api.php";
  for (let i = 0; i < titles.length; i += chunk) {
    const batch = [...new Set(titles.slice(i, i + chunk))];
    const titleParam = batch.map((t) => encodeURIComponent(t.replace(/ /g, "_"))).join("|");
    const url = `${base}?action=query&format=json&prop=pageimages&piprop=original&titles=${titleParam}`;
    const res = await fetch(url, { headers: { "User-Agent": "CodecraftCatalogSeed/1.1" } });
    if (!res.ok) continue;
    const data = (await res.json()) as {
      query?: { pages?: Record<string, { title?: string; original?: { source?: string } }> };
    };
    const pages = data.query?.pages ?? {};
    for (const p of Object.values(pages)) {
      const src = p.original?.source;
      if (p.title && src) {
        const clean = src.split("?")[0] ?? src;
        out.set(p.title, clean);
      }
    }
    await new Promise((r) => setTimeout(r, 120));
  }
  return out;
}

/** Fills missing boss/minigame icons via OSRS Wiki pageimages (global table). */
async function syncBossProfileWikiIcons(admin: AdminCatalogClient): Promise<number> {
  const { data: rows, error } = await ac(admin)
    .from("osrs_boss_profiles")
    .select("id, wiki_url, icon_url");
  if (error || !rows?.length) return 0;

  const need = (rows as unknown as { id: string; wiki_url: string | null; icon_url: string | null }[]).filter(
    (r) => r.wiki_url && !r.icon_url
  );
  if (!need.length) return 0;

  const titleByBossId = new Map<string, string>();
  const titles: string[] = [];
  for (const r of need) {
    const t = wikiArticleTitleFromUrl(r.wiki_url);
    if (!t) continue;
    titleByBossId.set(r.id, t);
    titles.push(t);
  }
  const urlByTitle = await fetchWikiOriginalImagesByTitles(titles);
  let updated = 0;
  for (const r of need) {
    const t = titleByBossId.get(r.id);
    if (!t) continue;
    const iconUrl = urlByTitle.get(t);
    if (!iconUrl) continue;
    const { error: upErr } = await ac(admin)
      .from("osrs_boss_profiles")
      .update({ icon_url: iconUrl } as never)
      .eq("id", r.id);
    if (!upErr) updated++;
  }
  return updated;
}

function buildOsrsQuestRowsForGame(gameId: string) {
  const reqSlugByTitle = buildRequirementSlugByTitleMap();
  const qpBySlug = buildQuestPointsBySlugMap();
  const bySlug = new Map<
    string,
    {
      game_id: string;
      name: string;
      slug: string;
      difficulty: string;
      length: string;
      quest_points: number;
      series: string | null;
      is_members: boolean;
      sort_order: number;
      icon_url: string | null;
    }
  >();

  let sort = 0;
  for (const q of OSRS_WIKI_QUESTS) {
    const slug = resolveQuestSlug(q.name, reqSlugByTitle);
    const quest_points = qpBySlug.get(slug) ?? 0;
    bySlug.set(slug, {
      game_id: gameId,
      name: q.name,
      slug,
      quest_points,
      series: null,
      is_members: q.is_members,
      difficulty: "See wiki",
      length: "Various",
      sort_order: sort++,
      icon_url: wikiTitleToInventoryIconUrl(q.name),
    });
  }

  for (const syn of SYNTHETIC_CATALOG_QUESTS) {
    if (!bySlug.has(syn.slug)) {
      bySlug.set(syn.slug, {
        game_id: gameId,
        name: syn.name,
        slug: syn.slug,
        quest_points: syn.quest_points,
        series: null,
        is_members: syn.is_members,
        difficulty: "See wiki",
        length: "Various",
        sort_order: sort++,
        icon_url: syn.icon_url,
      });
    }
  }

  for (const q of OSRS_QUEST_REQUIREMENTS) {
    const existing = bySlug.get(q.questSlug);
    const qp = q.questPoints ?? 0;
    if (existing) {
      if (qp > existing.quest_points) {
        bySlug.set(q.questSlug, { ...existing, quest_points: qp });
      }
      continue;
    }
    bySlug.set(q.questSlug, {
      game_id: gameId,
      name: q.questName,
      slug: q.questSlug,
      quest_points: qp,
      series: null,
      is_members: true,
      difficulty: "See wiki",
      length: "Various",
      sort_order: sort++,
      icon_url: wikiTitleToInventoryIconUrl(q.questName),
    });
  }

  return [...bySlug.values()].sort((a, b) => a.sort_order - b.sort_order);
}

async function upsertStandardTrainingMethods(admin: AdminCatalogClient, gameId: string): Promise<number> {
  const { data: skills, error } = await ac(admin)
    .from("game_skills")
    .select("id, slug")
    .eq("game_id", gameId);
  if (error || !skills?.length) return 0;

  const rows = (skills as unknown as { id: string; slug: string }[]).map((sk) => ({
    game_id: gameId,
    skill_id: sk.id,
    name: "Standard",
    slug: "standard",
    description: null as string | null,
    multiplier: 1,
    sort_order: 0,
  }));

  const { error: upErr } = await ac(admin).from("game_service_methods").upsert(rows as never[], {
    onConflict: "game_id,skill_id,slug",
  });
  if (upErr) throw new Error(upErr.message);
  return rows.length;
}

async function copyOsrsSkillingPrices(admin: AdminCatalogClient, targetGameId: string): Promise<number> {
  const { count: existing } = await ac(admin)
    .from("osrs_skilling_prices")
    .select("*", { count: "exact", head: true })
    .eq("game_id", targetGameId);
  if ((existing ?? 0) > 0) return 0;

  const { data: allRows, error: fetchErr } = await ac(admin).from("osrs_skilling_prices").select("*");
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
    const { error } = await ac(admin).from("osrs_skilling_prices").insert(part as never[]);
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
  bossIconsSynced: number;
  methodsInserted: number;
};

/**
 * Idempotent: global boss profiles + wiki icons; per-game skills, standard methods, full quest catalog (+ icons), GP/XP rows for OSRS slugs.
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
    bossIconsSynced: 0,
    methodsInserted: 0,
  };

  result.bossProfilesInserted = await seedGlobalBossProfilesIfEmpty(admin);
  result.bossIconsSynced = await syncBossProfileWikiIcons(admin);

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

  const { error: skErr } = await ac(admin)
    .from("game_skills")
    .upsert(skillRows as never[], { onConflict: "game_id,slug" });
  if (skErr) throw new Error(skErr.message);
  result.skillsInserted = skillRows.length;

  result.methodsInserted = await upsertStandardTrainingMethods(admin, gameId);

  const questRows = buildOsrsQuestRowsForGame(gameId);
  const { error: qErr } = await ac(admin)
    .from("game_quests")
    .upsert(questRows as never[], { onConflict: "game_id,slug" });
  if (qErr) throw new Error(qErr.message);
  result.questsInserted = questRows.length;

  result.skillingRowsCopied = await copyOsrsSkillingPrices(admin, gameId);

  return result;
}
