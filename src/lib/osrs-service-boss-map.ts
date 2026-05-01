import { BOSS_PROFILE_MAP } from "./osrs-boss-profiles";

/**
 * Maps OSRS service slugs to gear optimizer boss profile IDs.
 *
 * For boss_tiered services the boss ID in the price matrix already
 * matches the optimizer profile ID — no mapping needed there.
 *
 * This file covers flat/per-unit/per-item services where the service
 * slug (set in the admin) is the only identifier.
 *
 * Keys: service slug patterns (checked with .includes(), case-insensitive)
 * Values: optimizer boss profile ID from osrs-boss-profiles.ts
 */
export const SERVICE_SLUG_TO_BOSS: Record<string, string> = {
  // Minigames
  "fire-cape":             "fight_caves",
  "firecape":              "fight_caves",
  "fight-cave":            "fight_caves",
  "fightcave":             "fight_caves",
  "inferno":               "inferno",
  "infernal-cape":         "inferno",
  "nmz":                   "nmz",
  "nightmare-zone":        "nmz",
  "pest-control":          "pest_control",
  "lms":                   "last_man_standing",
  "last-man-standing":     "last_man_standing",

  // GWD
  "bandos":                "bandos",
  "graardor":              "bandos",
  "armadyl":               "armadyl",
  "kreearra":              "armadyl",
  "kree-arra":             "armadyl",
  "zamorak":               "zammy",
  "kril":                  "zammy",
  "k-ril":                 "zammy",
  "saradomin":             "saradomin",
  "zilyana":               "saradomin",
  "nex":                   "nex",

  // Slayer bosses
  "cerberus":              "cerberus",
  "abyssal-sire":          "abyssal_sire",
  "sire":                  "abyssal_sire",
  "smoke-devil":           "smoke_devil",
  "thermy":                "smoke_devil",
  "thermonuclear":         "smoke_devil",
  "kraken":                "kraken",
  "grotesque":             "grotesque_guardians",
  "gargoyle":              "grotesque_guardians",
  "alchemical-hydra":      "alchemical_hydra",
  "hydra":                 "alchemical_hydra",
  "basilisk-knight":       "basilisk_knight",

  // Wilderness
  "callisto":              "callisto",
  "artio":                 "callisto",
  "venenatis":             "venenatis",
  "spindel":               "venenatis",
  "vetion":                "vetion",
  "vet-ion":               "vetion",
  "calvarion":             "vetion",
  "scorpia":               "scorpia",
  "chaos-elemental":       "chaos_elemental",
  "chaos-fanatic":         "chaos_fanatic",
  "crazy-archaeologist":   "crazy_archaeologist",

  // Other major bosses
  "zulrah":                "zulrah",
  "vorkath":               "vorkath",
  "nightmare":             "nightmare",
  "phosanis":              "nightmare",
  "corp":                  "corporeal_beast",
  "corporeal":             "corporeal_beast",
  "mole":                  "giant_mole",
  "sarachnis":             "sarachnis",
  "skotizo":               "skotizo",
  "kalphite-queen":        "kalphite_queen",
  "kq":                    "kalphite_queen",

  // Dagannoth kings
  "rex":                   "dagannoth_rex",
  "dagannoth-rex":         "dagannoth_rex",
  "prime":                 "dagannoth_prime",
  "dagannoth-prime":       "dagannoth_prime",
  "supreme":               "dagannoth_supreme",
  "dagannoth-supreme":     "dagannoth_supreme",

  // Barrows
  "barrows":               "barrows",

  // DT2
  "duke":                  "duke_sucellus",
  "leviathan":             "the_leviathan",
  "whisperer":             "the_whisperer",
  "vardorvis":             "vardorvis",

  // Raids
  "cox":                   "cox",
  "chambers":              "cox",
  "tob":                   "tob",
  "theatre":               "tob",
  "toa":                   "toa",
  "tombs":                 "toa",

  // Dragons
  "kbd":                   "king_black_dragon",
  "king-black-dragon":     "king_black_dragon",
  "green-dragon":          "green_dragons",
  "blue-dragon":           "blue_dragon",
  "red-dragon":            "red_dragon",
  "black-dragon":          "black_dragon",

  // Other
  "demonic-gorilla":       "demonic_gorillas",
  "gorilla":               "demonic_gorillas",
  "lizardman":             "lizardman_shaman",
  "shaman":                "lizardman_shaman",
};

/**
 * Resolves a boss profile ID from a service slug.
 * Tries exact match first, then substring match.
 */
export function resolveBossProfileId(serviceSlug: string): string | null {
  const lower = serviceSlug.toLowerCase();

  // Exact match
  if (SERVICE_SLUG_TO_BOSS[lower]) return SERVICE_SLUG_TO_BOSS[lower];

  // Substring match (handles slugs like "osrs-fire-cape-service")
  for (const [key, value] of Object.entries(SERVICE_SLUG_TO_BOSS)) {
    if (lower.includes(key)) return value;
  }

  return null;
}

/**
 * Resolves a boss profile ID from either:
 * 1. A boss_tiered price matrix boss ID (direct match to optimizer profile)
 * 2. A service slug (via SERVICE_SLUG_TO_BOSS mapping)
 */
export function resolveBossProfile(
  serviceSlug: string,
  selectedBossId?: string | null,
): string | null {
  // For boss_tiered services, the selected boss ID maps directly
  if (selectedBossId && BOSS_PROFILE_MAP.has(selectedBossId)) {
    return selectedBossId;
  }

  // Fallback: service slug mapping
  return resolveBossProfileId(serviceSlug);
}
