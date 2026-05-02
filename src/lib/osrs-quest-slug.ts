import { OSRS_QUEST_REQUIREMENTS } from "@/lib/osrs-quest-requirements";

const WIKI_IMG_BASE = "https://oldschool.runescape.wiki/images";

/** Display name for a quest slug (used for prerequisite chains + lookups). */
export function slugToQuestName(slug: string): string {
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

function normalizeTitle(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

/** Wiki inventory icon convention: article title → File:<Title>.png */
export function wikiTitleToInventoryIconUrl(title: string): string {
  const file = title.trim().replace(/\s+/g, "_").replace(/'/g, "%27");
  return `${WIKI_IMG_BASE}/${file}.png`;
}

export function wikiTitleToFallbackSlug(title: string): string {
  return title
    .trim()
    .toLowerCase()
    .replace(/'/g, "")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
}

/** Slugs aligned with OSRS_QUEST_REQUIREMENTS + prerequisites (wiki title → slug). */
export function buildRequirementSlugByTitleMap(): Map<string, string> {
  const m = new Map<string, string>();
  const add = (slug: string, displayName: string) => {
    m.set(normalizeTitle(displayName), slug);
  };
  for (const q of OSRS_QUEST_REQUIREMENTS) {
    add(q.questSlug, q.questName);
    for (const rs of q.requiredQuestSlugs) {
      add(rs, slugToQuestName(rs));
    }
  }
  return m;
}

export function resolveQuestSlug(title: string, requirementSlugByTitle: Map<string, string>): string {
  const hit = requirementSlugByTitle.get(normalizeTitle(title));
  if (hit) return hit;
  return wikiTitleToFallbackSlug(title);
}

export function buildQuestPointsBySlugMap(): Map<string, number> {
  const m = new Map<string, number>();
  for (const q of OSRS_QUEST_REQUIREMENTS) {
    const qp = q.questPoints ?? 0;
    m.set(q.questSlug, Math.max(m.get(q.questSlug) ?? 0, qp));
  }
  return m;
}
