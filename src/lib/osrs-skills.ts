/**
 * OSRS skill definitions with Wiki icon URLs
 * Stats use hiscores keys (attack, strength, etc.) - map to stat_X for pricing
 */
const WIKI_BASE = "https://oldschool.runescape.wiki/images";

export const OSRS_SKILLS = [
  { id: "attack", label: "Attack", icon: `${WIKI_BASE}/Attack_icon.png` },
  { id: "hitpoints", label: "Hitpoints", icon: `${WIKI_BASE}/Hitpoints_icon.png` },
  { id: "ranged", label: "Ranged", icon: `${WIKI_BASE}/Ranged_icon.png` },
  { id: "strength", label: "Strength", icon: `${WIKI_BASE}/Strength_icon.png` },
  { id: "prayer", label: "Prayer", icon: `${WIKI_BASE}/Prayer_icon.png` },
  { id: "magic", label: "Magic", icon: `${WIKI_BASE}/Magic_icon.png` },
  { id: "defence", label: "Defence", icon: `${WIKI_BASE}/Defence_icon.png` },
  { id: "agility", label: "Agility", icon: `${WIKI_BASE}/Agility_icon.png` },
  { id: "herblore", label: "Herblore", icon: `${WIKI_BASE}/Herblore_icon.png` },
  { id: "thieving", label: "Thieving", icon: `${WIKI_BASE}/Thieving_icon.png` },
  { id: "crafting", label: "Crafting", icon: `${WIKI_BASE}/Crafting_icon.png` },
  { id: "fletching", label: "Fletching", icon: `${WIKI_BASE}/Fletching_icon.png` },
  { id: "slayer", label: "Slayer", icon: `${WIKI_BASE}/Slayer_icon.png` },
  { id: "mining", label: "Mining", icon: `${WIKI_BASE}/Mining_icon.png` },
  { id: "smithing", label: "Smithing", icon: `${WIKI_BASE}/Smithing_icon.png` },
  { id: "fishing", label: "Fishing", icon: `${WIKI_BASE}/Fishing_icon.png` },
  { id: "cooking", label: "Cooking", icon: `${WIKI_BASE}/Cooking_icon.png` },
  { id: "firemaking", label: "Firemaking", icon: `${WIKI_BASE}/Firemaking_icon.png` },
  { id: "woodcutting", label: "Woodcutting", icon: `${WIKI_BASE}/Woodcutting_icon.png` },
  { id: "runecrafting", label: "Runecraft", icon: `${WIKI_BASE}/Runecraft_icon.png` },
  { id: "farming", label: "Farming", icon: `${WIKI_BASE}/Farming_icon.png` },
  { id: "hunter", label: "Hunter", icon: `${WIKI_BASE}/Hunter_icon.png` },
  { id: "construction", label: "Construction", icon: `${WIKI_BASE}/Construction_icon.png` },
  { id: "sailing", label: "Sailing", icon: `${WIKI_BASE}/Sailing_icon.png` },
] as const;

export type OsrsSkillId = (typeof OSRS_SKILLS)[number]["id"];

/** Convert loadout stats (attack, stat_attack, Attack, ...) to pricing engine format (stat_attack, stat_ranged, ...) */
export function toPricingStats(stats: Record<string, unknown>): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(stats)) {
    const rawKey = k.startsWith("stat_") ? k.slice(5) : k;
    const statKey = rawKey.toLowerCase().replace(/\s+/g, "_");
    const num = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN;
    if (Number.isFinite(num) && num >= 1 && num <= 99) {
      out[`stat_${statKey}`] = num;
    }
  }
  return out;
}
