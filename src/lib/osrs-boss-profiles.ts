/**
 * OSRS Boss & Activity Profiles
 *
 * Defines gear optimisation weights for every boss and minigame in OSRS.
 * Weight scale: 0 = irrelevant, 10 = most important stat.
 *
 * melee_weights  → used when primary_style is "melee"
 * ranged_weights → used when primary_style is "ranged"
 * magic_weights  → used when primary_style is "magic"
 *
 * For multi-style content (Zulrah, CoX, ToB, ToA) phases[] is used.
 */

export type CombatStyle = "melee" | "ranged" | "magic";
export type BossCategory =
  | "gwd" | "slayer" | "raid" | "wilderness" | "minigame"
  | "dt2" | "dragon" | "dagannoth" | "barrows" | "other";

export interface StyleWeights {
  /** Melee attack bonuses */
  stab?:       number;
  slash?:      number;
  crush?:      number;
  /** Ranged attack bonus */
  ranged_atk?: number;
  /** Magic attack bonus */
  magic_atk?:  number;
  /** Strength bonuses */
  melee_str?:  number;
  ranged_str?: number;
  magic_dmg?:  number;
  /** Utility */
  prayer?:     number;
  /** Defence bonuses (for tanky/safe content) */
  def_melee?:  number;
  def_ranged?: number;
  def_magic?:  number;
}

export interface BossPhase {
  name:    string;
  style:   CombatStyle;
  weights: StyleWeights;
}

export interface BossProfile {
  id:             string;
  name:           string;
  category:       BossCategory;
  wiki_url?:      string;
  icon?:          string;
  primary_style:  CombatStyle | "multi";
  phases?:        BossPhase[];       // For multi-style content
  melee_weights:  StyleWeights;
  ranged_weights: StyleWeights;
  magic_weights:  StyleWeights;
  required_items?: string[];         // Item names that must be equipped
  notes?:         string;
  is_wilderness?: boolean;
}

// ─── Helper defaults ──────────────────────────────────────────────────────────

const STD_MELEE:  StyleWeights = { slash: 8, crush: 6, stab: 5, melee_str: 10, prayer: 3 };
const STD_SLASH:  StyleWeights = { slash: 10, melee_str: 10, prayer: 3 };
const STD_CRUSH:  StyleWeights = { crush: 10, melee_str: 10, prayer: 3 };
const STD_RANGED: StyleWeights = { ranged_atk: 8, ranged_str: 10, prayer: 3 };
const STD_MAGIC:  StyleWeights = { magic_atk: 8, magic_dmg: 10, prayer: 3 };

// ─── Boss Profiles ────────────────────────────────────────────────────────────

export const BOSS_PROFILES: BossProfile[] = [

  // ══════════════════════════════════════════════════════════════════════════
  // GOD WARS DUNGEON
  // ══════════════════════════════════════════════════════════════════════════

  {
    id: "bandos",
    name: "General Graardor (Bandos)",
    category: "gwd",
    wiki_url: "https://oldschool.runescape.wiki/w/General_Graardor",
    primary_style: "melee",
    melee_weights: { slash: 10, crush: 5, melee_str: 10, prayer: 5, def_ranged: 3 },
    ranged_weights: STD_RANGED,
    magic_weights:  STD_MAGIC,
    notes: "Maximise strength bonus. Bandos armour/Torva recommended. Protect from Melee.",
  },
  {
    id: "armadyl",
    name: "Kree'arra (Armadyl)",
    category: "gwd",
    wiki_url: "https://oldschool.runescape.wiki/w/Kree%27arra",
    primary_style: "ranged",
    melee_weights:  STD_MELEE,
    ranged_weights: { ranged_atk: 8, ranged_str: 10, prayer: 4, def_ranged: 5 },
    magic_weights:  STD_MAGIC,
    notes: "Use Armadyl crossbow or Twisted bow. Protect from Ranged.",
  },
  {
    id: "zammy",
    name: "K'ril Tsutsaroth (Zamorak)",
    category: "gwd",
    wiki_url: "https://oldschool.runescape.wiki/w/K%27ril_Tsutsaroth",
    primary_style: "melee",
    melee_weights: { slash: 10, melee_str: 10, prayer: 6, def_magic: 3 },
    ranged_weights: STD_RANGED,
    magic_weights:  STD_MAGIC,
    notes: "K'ril attacks with melee and magic. Protect from Melee.",
  },
  {
    id: "saradomin",
    name: "Commander Zilyana (Saradomin)",
    category: "gwd",
    wiki_url: "https://oldschool.runescape.wiki/w/Commander_Zilyana",
    primary_style: "melee",
    melee_weights: { slash: 10, melee_str: 10, prayer: 4 },
    ranged_weights: { ranged_atk: 9, ranged_str: 10, prayer: 3 },
    magic_weights:  STD_MAGIC,
    notes: "High hit speed. Can also be ranged from safe spot.",
  },
  {
    id: "nex",
    name: "Nex",
    category: "gwd",
    wiki_url: "https://oldschool.runescape.wiki/w/Nex",
    primary_style: "ranged",
    melee_weights:  STD_MELEE,
    ranged_weights: { ranged_atk: 8, ranged_str: 10, prayer: 5, def_magic: 3, def_ranged: 3 },
    magic_weights:  STD_MAGIC,
    notes: "Use Zaryte crossbow or Twisted bow. Protect from Ranged. Blood phase: move away.",
  },

  // ══════════════════════════════════════════════════════════════════════════
  // SLAYER BOSSES
  // ══════════════════════════════════════════════════════════════════════════

  {
    id: "cerberus",
    name: "Cerberus",
    category: "slayer",
    wiki_url: "https://oldschool.runescape.wiki/w/Cerberus",
    primary_style: "melee",
    melee_weights: { slash: 10, melee_str: 10, prayer: 8 },
    ranged_weights: { ranged_atk: 8, ranged_str: 10, prayer: 7 },
    magic_weights:  STD_MAGIC,
    notes: "Requires Slayer task. Protect from Melee. Soul summons require quick prayer switches.",
  },
  {
    id: "abyssal_sire",
    name: "Abyssal Sire",
    category: "slayer",
    wiki_url: "https://oldschool.runescape.wiki/w/Abyssal_Sire",
    primary_style: "ranged",
    melee_weights:  STD_MELEE,
    ranged_weights: { ranged_atk: 8, ranged_str: 10, prayer: 4 },
    magic_weights:  STD_MAGIC,
    notes: "Requires Slayer task. Ranged from behind pillar.",
  },
  {
    id: "smoke_devil",
    name: "Thermonuclear Smoke Devil",
    category: "slayer",
    wiki_url: "https://oldschool.runescape.wiki/w/Thermonuclear_Smoke_Devil",
    primary_style: "ranged",
    melee_weights:  STD_MELEE,
    ranged_weights: STD_RANGED,
    magic_weights:  STD_MAGIC,
    notes: "Requires Slayer task. Ranged or magic.",
  },
  {
    id: "kraken",
    name: "Kraken",
    category: "slayer",
    wiki_url: "https://oldschool.runescape.wiki/w/Kraken",
    primary_style: "magic",
    melee_weights:  STD_MELEE,
    ranged_weights: STD_RANGED,
    magic_weights: { magic_atk: 8, magic_dmg: 10, prayer: 2 },
    notes: "Requires Slayer task. Magic only — melee and ranged greatly reduced.",
  },
  {
    id: "grotesque_guardians",
    name: "Grotesque Guardians",
    category: "slayer",
    wiki_url: "https://oldschool.runescape.wiki/w/Grotesque_Guardians",
    primary_style: "multi",
    phases: [
      { name: "Dusk (melee phase)", style: "melee", weights: STD_SLASH },
      { name: "Dawn (ranged phase)", style: "ranged", weights: STD_RANGED },
    ],
    melee_weights:  STD_SLASH,
    ranged_weights: STD_RANGED,
    magic_weights:  STD_MAGIC,
    notes: "Requires Slayer task. Switch between melee and ranged for each guardian.",
  },
  {
    id: "alchemical_hydra",
    name: "Alchemical Hydra",
    category: "slayer",
    wiki_url: "https://oldschool.runescape.wiki/w/Alchemical_Hydra",
    primary_style: "ranged",
    melee_weights:  STD_MELEE,
    ranged_weights: { ranged_atk: 8, ranged_str: 10, prayer: 5 },
    magic_weights:  STD_MAGIC,
    notes: "Requires Slayer task. Ranged or magic. Switch off attack style when changing tiles.",
  },
  {
    id: "gargoyle_boss",
    name: "Dusk (Gargoyle Boss)",
    category: "slayer",
    wiki_url: "https://oldschool.runescape.wiki/w/Dusk",
    primary_style: "melee",
    melee_weights: STD_CRUSH,
    ranged_weights: STD_RANGED,
    magic_weights:  STD_MAGIC,
    notes: "Crush attack style. Rock hammer to finish.",
  },

  // ══════════════════════════════════════════════════════════════════════════
  // WILDERNESS BOSSES
  // ══════════════════════════════════════════════════════════════════════════

  {
    id: "callisto",
    name: "Callisto / Artio",
    category: "wilderness",
    wiki_url: "https://oldschool.runescape.wiki/w/Artio",
    primary_style: "melee",
    melee_weights: STD_CRUSH,
    ranged_weights: STD_RANGED,
    magic_weights:  STD_MAGIC,
    is_wilderness: true,
    notes: "Protect from Melee. Crush attack style.",
  },
  {
    id: "venenatis",
    name: "Venenatis / Spindel",
    category: "wilderness",
    wiki_url: "https://oldschool.runescape.wiki/w/Spindel",
    primary_style: "ranged",
    melee_weights:  STD_MELEE,
    ranged_weights: STD_RANGED,
    magic_weights:  STD_MAGIC,
    is_wilderness: true,
    notes: "Protect from Magic. Ranged recommended.",
  },
  {
    id: "vetion",
    name: "Vet'ion / Calvar'ion",
    category: "wilderness",
    wiki_url: "https://oldschool.runescape.wiki/w/Calvar%27ion",
    primary_style: "melee",
    melee_weights: STD_CRUSH,
    ranged_weights: STD_RANGED,
    magic_weights:  STD_MAGIC,
    is_wilderness: true,
    notes: "Crush attack style. Protect from Magic.",
  },
  {
    id: "scorpia",
    name: "Scorpia",
    category: "wilderness",
    wiki_url: "https://oldschool.runescape.wiki/w/Scorpia",
    primary_style: "ranged",
    melee_weights:  STD_MELEE,
    ranged_weights: STD_RANGED,
    magic_weights:  STD_MAGIC,
    is_wilderness: true,
    notes: "Ranged preferred. Protect from Melee.",
  },
  {
    id: "chaos_elemental",
    name: "Chaos Elemental",
    category: "wilderness",
    wiki_url: "https://oldschool.runescape.wiki/w/Chaos_Elemental",
    primary_style: "ranged",
    melee_weights:  STD_MELEE,
    ranged_weights: STD_RANGED,
    magic_weights:  STD_MAGIC,
    is_wilderness: true,
    notes: "Unequips your items. Ranged recommended.",
  },
  {
    id: "chaos_fanatic",
    name: "Chaos Fanatic",
    category: "wilderness",
    wiki_url: "https://oldschool.runescape.wiki/w/Chaos_Fanatic",
    primary_style: "ranged",
    melee_weights:  STD_MELEE,
    ranged_weights: STD_RANGED,
    magic_weights:  STD_MAGIC,
    is_wilderness: true,
  },
  {
    id: "crazy_archaeologist",
    name: "Crazy Archaeologist",
    category: "wilderness",
    wiki_url: "https://oldschool.runescape.wiki/w/Crazy_archaeologist",
    primary_style: "ranged",
    melee_weights:  STD_MELEE,
    ranged_weights: STD_RANGED,
    magic_weights:  STD_MAGIC,
    is_wilderness: true,
  },

  // ══════════════════════════════════════════════════════════════════════════
  // OTHER MAJOR BOSSES
  // ══════════════════════════════════════════════════════════════════════════

  {
    id: "zulrah",
    name: "Zulrah",
    category: "other",
    wiki_url: "https://oldschool.runescape.wiki/w/Zulrah",
    primary_style: "multi",
    phases: [
      { name: "Green phase (magic)", style: "magic",  weights: { magic_atk: 8, magic_dmg: 10, prayer: 4 } },
      { name: "Blue phase (ranged)", style: "ranged", weights: { ranged_atk: 8, ranged_str: 10, prayer: 4 } },
      { name: "Red phase (melee)",   style: "ranged", weights: { ranged_atk: 8, ranged_str: 10, prayer: 4 } },
    ],
    melee_weights:  STD_MELEE,
    ranged_weights: { ranged_atk: 8, ranged_str: 10, prayer: 5 },
    magic_weights:  { magic_atk: 8, magic_dmg: 10, prayer: 5 },
    notes: "Requires gear switches between magic and ranged. Trident + Blowpipe/DHCB is meta.",
  },
  {
    id: "vorkath",
    name: "Vorkath",
    category: "other",
    wiki_url: "https://oldschool.runescape.wiki/w/Vorkath",
    primary_style: "ranged",
    melee_weights:  STD_MELEE,
    ranged_weights: { ranged_atk: 8, ranged_str: 10, prayer: 5, def_magic: 3 },
    magic_weights:  STD_MAGIC,
    required_items: ["Dragonfire shield", "Anti-dragon shield", "Dragonfire ward"],
    notes: "Twisted bow or Dragon Hunter Crossbow best in slot. Anti-dragon shield required.",
  },
  {
    id: "nightmare",
    name: "The Nightmare / Phosani's Nightmare",
    category: "other",
    wiki_url: "https://oldschool.runescape.wiki/w/The_Nightmare",
    primary_style: "melee",
    melee_weights: { slash: 10, melee_str: 10, prayer: 6 },
    ranged_weights: STD_RANGED,
    magic_weights:  STD_MAGIC,
    notes: "Melee with Inquisitor's or Torva. Protect from Melee.",
  },
  {
    id: "corporeal_beast",
    name: "Corporeal Beast",
    category: "other",
    wiki_url: "https://oldschool.runescape.wiki/w/Corporeal_Beast",
    primary_style: "melee",
    melee_weights: { stab: 10, melee_str: 10, prayer: 3 },
    ranged_weights: STD_RANGED,
    magic_weights:  STD_MAGIC,
    notes: "Stab attack style. Spear or Hasta recommended. Magic/ranged halved.",
  },
  {
    id: "giant_mole",
    name: "Giant Mole",
    category: "other",
    wiki_url: "https://oldschool.runescape.wiki/w/Giant_Mole",
    primary_style: "melee",
    melee_weights: STD_SLASH,
    ranged_weights: STD_RANGED,
    magic_weights:  STD_MAGIC,
  },
  {
    id: "sarachnis",
    name: "Sarachnis",
    category: "other",
    wiki_url: "https://oldschool.runescape.wiki/w/Sarachnis",
    primary_style: "melee",
    melee_weights: STD_CRUSH,
    ranged_weights: STD_RANGED,
    magic_weights:  STD_MAGIC,
    notes: "Crush attack style. Protect from Melee.",
  },
  {
    id: "skotizo",
    name: "Skotizo",
    category: "other",
    wiki_url: "https://oldschool.runescape.wiki/w/Skotizo",
    primary_style: "melee",
    melee_weights: { slash: 10, melee_str: 10, prayer: 5 },
    ranged_weights: STD_RANGED,
    magic_weights:  STD_MAGIC,
    notes: "Arclight is BIS. Protect from Melee/Missiles.",
  },
  {
    id: "kalphite_queen",
    name: "Kalphite Queen",
    category: "other",
    wiki_url: "https://oldschool.runescape.wiki/w/Kalphite_Queen",
    primary_style: "multi",
    phases: [
      { name: "Phase 1 (ranged)", style: "ranged", weights: STD_RANGED },
      { name: "Phase 2 (melee)",  style: "melee",  weights: STD_SLASH },
    ],
    melee_weights:  STD_SLASH,
    ranged_weights: STD_RANGED,
    magic_weights:  STD_MAGIC,
    notes: "Phase 1: ranged immune to all. Phase 2: melee.",
  },
  {
    id: "thermy_duo",
    name: "Smoke Devils",
    category: "slayer",
    wiki_url: "https://oldschool.runescape.wiki/w/Smoke_devil",
    primary_style: "ranged",
    melee_weights:  STD_MELEE,
    ranged_weights: STD_RANGED,
    magic_weights:  STD_MAGIC,
  },
  {
    id: "obor",
    name: "Obor (Hill Giant Boss)",
    category: "other",
    wiki_url: "https://oldschool.runescape.wiki/w/Obor",
    primary_style: "melee",
    melee_weights: STD_CRUSH,
    ranged_weights: STD_RANGED,
    magic_weights:  STD_MAGIC,
  },
  {
    id: "bryophyta",
    name: "Bryophyta (Moss Giant Boss)",
    category: "other",
    wiki_url: "https://oldschool.runescape.wiki/w/Bryophyta",
    primary_style: "melee",
    melee_weights: STD_CRUSH,
    ranged_weights: STD_RANGED,
    magic_weights:  STD_MAGIC,
  },
  {
    id: "mimic",
    name: "The Mimic",
    category: "other",
    wiki_url: "https://oldschool.runescape.wiki/w/The_Mimic",
    primary_style: "melee",
    melee_weights: STD_CRUSH,
    ranged_weights: STD_RANGED,
    magic_weights:  STD_MAGIC,
  },
  {
    id: "hespori",
    name: "Hespori",
    category: "other",
    wiki_url: "https://oldschool.runescape.wiki/w/Hespori",
    primary_style: "magic",
    melee_weights:  STD_MELEE,
    ranged_weights: STD_RANGED,
    magic_weights:  STD_MAGIC,
  },

  // ══════════════════════════════════════════════════════════════════════════
  // DAGANNOTH KINGS
  // ══════════════════════════════════════════════════════════════════════════

  {
    id: "dagannoth_rex",
    name: "Dagannoth Rex",
    category: "dagannoth",
    wiki_url: "https://oldschool.runescape.wiki/w/Dagannoth_Rex",
    primary_style: "melee",
    melee_weights: STD_CRUSH,
    ranged_weights: STD_RANGED,
    magic_weights:  STD_MAGIC,
    notes: "Weak to melee. Immune to ranged/magic.",
  },
  {
    id: "dagannoth_prime",
    name: "Dagannoth Prime",
    category: "dagannoth",
    wiki_url: "https://oldschool.runescape.wiki/w/Dagannoth_Prime",
    primary_style: "magic",
    melee_weights:  STD_MELEE,
    ranged_weights: STD_RANGED,
    magic_weights:  STD_MAGIC,
    notes: "Weak to magic. Immune to melee/ranged.",
  },
  {
    id: "dagannoth_supreme",
    name: "Dagannoth Supreme",
    category: "dagannoth",
    wiki_url: "https://oldschool.runescape.wiki/w/Dagannoth_Supreme",
    primary_style: "ranged",
    melee_weights:  STD_MELEE,
    ranged_weights: STD_RANGED,
    magic_weights:  STD_MAGIC,
    notes: "Weak to ranged. Immune to melee/magic.",
  },

  // ══════════════════════════════════════════════════════════════════════════
  // BARROWS
  // ══════════════════════════════════════════════════════════════════════════

  {
    id: "barrows",
    name: "Barrows Brothers",
    category: "barrows",
    wiki_url: "https://oldschool.runescape.wiki/w/Barrows",
    primary_style: "magic",
    melee_weights:  STD_MELEE,
    ranged_weights: STD_RANGED,
    magic_weights: { magic_atk: 9, magic_dmg: 10, prayer: 3 },
    notes: "Ibans blast or trident. Each brother is weak to a different style.",
  },

  // ══════════════════════════════════════════════════════════════════════════
  // DRAGONS
  // ══════════════════════════════════════════════════════════════════════════

  {
    id: "king_black_dragon",
    name: "King Black Dragon",
    category: "dragon",
    wiki_url: "https://oldschool.runescape.wiki/w/King_Black_Dragon",
    primary_style: "ranged",
    melee_weights:  STD_MELEE,
    ranged_weights: { ranged_atk: 8, ranged_str: 10, prayer: 3 },
    magic_weights:  STD_MAGIC,
    required_items: ["Anti-dragon shield", "Dragonfire shield"],
    notes: "Anti-dragon shield required. Ranged from safe spot.",
  },
  {
    id: "blue_dragon",   name: "Blue Dragon",   category: "dragon", wiki_url: "https://oldschool.runescape.wiki/w/Blue_dragon",   primary_style: "ranged", melee_weights: STD_MELEE, ranged_weights: STD_RANGED, magic_weights: STD_MAGIC, required_items: ["Anti-dragon shield"] },
  {
    id: "red_dragon",    name: "Red Dragon",    category: "dragon", wiki_url: "https://oldschool.runescape.wiki/w/Red_dragon",    primary_style: "ranged", melee_weights: STD_MELEE, ranged_weights: STD_RANGED, magic_weights: STD_MAGIC, required_items: ["Anti-dragon shield"] },
  {
    id: "black_dragon",  name: "Black Dragon",  category: "dragon", wiki_url: "https://oldschool.runescape.wiki/w/Black_dragon",  primary_style: "ranged", melee_weights: STD_MELEE, ranged_weights: STD_RANGED, magic_weights: STD_MAGIC, required_items: ["Anti-dragon shield"] },
  {
    id: "brutal_black_dragon", name: "Brutal Black Dragon", category: "dragon", wiki_url: "https://oldschool.runescape.wiki/w/Brutal_black_dragon", primary_style: "ranged", melee_weights: STD_MELEE, ranged_weights: STD_RANGED, magic_weights: STD_MAGIC, required_items: ["Anti-dragon shield"] },
  {
    id: "lava_dragon",   name: "Lava Dragon",   category: "dragon", wiki_url: "https://oldschool.runescape.wiki/w/Lava_dragon",   primary_style: "ranged", melee_weights: STD_MELEE, ranged_weights: STD_RANGED, magic_weights: STD_MAGIC, is_wilderness: true, required_items: ["Anti-dragon shield"] },

  // ══════════════════════════════════════════════════════════════════════════
  // DESERT TREASURE 2 BOSSES
  // ══════════════════════════════════════════════════════════════════════════

  {
    id: "duke_sucellus",
    name: "Duke Sucellus",
    category: "dt2",
    wiki_url: "https://oldschool.runescape.wiki/w/Duke_Sucellus",
    primary_style: "melee",
    melee_weights: STD_SLASH,
    ranged_weights: STD_RANGED,
    magic_weights:  STD_MAGIC,
    notes: "Melee. Avoid sleeping gas. Nightmare zone style combat.",
  },
  {
    id: "the_leviathan",
    name: "The Leviathan",
    category: "dt2",
    wiki_url: "https://oldschool.runescape.wiki/w/The_Leviathan",
    primary_style: "ranged",
    melee_weights:  STD_MELEE,
    ranged_weights: { ranged_atk: 8, ranged_str: 10, prayer: 6 },
    magic_weights:  STD_MAGIC,
    notes: "Ranged. High defence. Dodge boulders.",
  },
  {
    id: "the_whisperer",
    name: "The Whisperer",
    category: "dt2",
    wiki_url: "https://oldschool.runescape.wiki/w/The_Whisperer",
    primary_style: "magic",
    melee_weights:  STD_MELEE,
    ranged_weights: STD_RANGED,
    magic_weights: { magic_atk: 8, magic_dmg: 10, prayer: 6 },
    notes: "Magic. Shadow realm mechanics.",
  },
  {
    id: "vardorvis",
    name: "Vardorvis",
    category: "dt2",
    wiki_url: "https://oldschool.runescape.wiki/w/Vardorvis",
    primary_style: "melee",
    melee_weights: { slash: 10, melee_str: 10, prayer: 4 },
    ranged_weights: STD_RANGED,
    magic_weights:  STD_MAGIC,
    notes: "Melee. Dodge axes. Avernic defender or defender for shield slot.",
  },

  // ══════════════════════════════════════════════════════════════════════════
  // RAIDS
  // ══════════════════════════════════════════════════════════════════════════

  {
    id: "cox",
    name: "Chambers of Xeric (CoX)",
    category: "raid",
    wiki_url: "https://oldschool.runescape.wiki/w/Chambers_of_Xeric",
    primary_style: "multi",
    phases: [
      { name: "Olm (melee hand)", style: "melee",  weights: STD_SLASH },
      { name: "Olm (mage hand)",  style: "magic",  weights: STD_MAGIC },
      { name: "Olm (head)",       style: "ranged", weights: STD_RANGED },
    ],
    melee_weights:  STD_SLASH,
    ranged_weights: STD_RANGED,
    magic_weights:  STD_MAGIC,
    notes: "Full gear switches required. Elder Maul for melee hand. Bring all 3 styles.",
  },
  {
    id: "tob",
    name: "Theatre of Blood (ToB)",
    category: "raid",
    wiki_url: "https://oldschool.runescape.wiki/w/Theatre_of_Blood",
    primary_style: "multi",
    phases: [
      { name: "Maiden (ranged)", style: "ranged", weights: STD_RANGED },
      { name: "Bloat (melee)",   style: "melee",  weights: STD_SLASH },
      { name: "Nylocas (multi)", style: "ranged", weights: STD_RANGED },
      { name: "Sotetseg (ranged)", style: "ranged", weights: STD_RANGED },
      { name: "Xarpus (ranged)", style: "ranged", weights: STD_RANGED },
      { name: "Verzik (multi)",  style: "ranged", weights: STD_RANGED },
    ],
    melee_weights:  STD_SLASH,
    ranged_weights: { ranged_atk: 8, ranged_str: 10, prayer: 5 },
    magic_weights:  STD_MAGIC,
    notes: "Ranged-focused with melee switches. Scythe BIS melee. Twisted bow BIS ranged.",
  },
  {
    id: "toa",
    name: "Tombs of Amascut (ToA)",
    category: "raid",
    wiki_url: "https://oldschool.runescape.wiki/w/Tombs_of_Amascut",
    primary_style: "multi",
    phases: [
      { name: "Akkha (multi)",   style: "melee",  weights: STD_SLASH },
      { name: "Ba-Ba (melee)",   style: "melee",  weights: STD_CRUSH },
      { name: "Kephri (magic)",  style: "magic",  weights: STD_MAGIC },
      { name: "Zebak (ranged)",  style: "ranged", weights: STD_RANGED },
      { name: "Warden P1-P3 (ranged)", style: "ranged", weights: STD_RANGED },
    ],
    melee_weights:  STD_CRUSH,
    ranged_weights: STD_RANGED,
    magic_weights:  STD_MAGIC,
    notes: "Requires gear switches for each room. Fang/Hasta for melee. DHCB/Twisted bow for ranged.",
  },

  // ══════════════════════════════════════════════════════════════════════════
  // MINIGAMES
  // ══════════════════════════════════════════════════════════════════════════

  {
    id: "fight_caves",
    name: "Fight Caves (TzTok-Jad)",
    category: "minigame",
    wiki_url: "https://oldschool.runescape.wiki/w/TzTok-Jad",
    primary_style: "ranged",
    melee_weights:  STD_MELEE,
    ranged_weights: { ranged_atk: 8, ranged_str: 10, prayer: 8 },
    magic_weights:  STD_MAGIC,
    notes: "Ranged BIS. Protect from Ranged/Magic switches. Accumulator cape recommended.",
  } as BossProfile,
  {
    id: "inferno",
    name: "The Inferno (TzKal-Zuk)",
    category: "minigame",
    wiki_url: "https://oldschool.runescape.wiki/w/TzKal-Zuk",
    primary_style: "ranged",
    melee_weights:  STD_MELEE,
    ranged_weights: { ranged_atk: 8, ranged_str: 10, prayer: 9, def_magic: 4, def_ranged: 3 },
    magic_weights:  STD_MAGIC,
    notes: "Twisted bow BIS. Max ranged + high prayer bonus. Hardest content in OSRS.",
  },
  {
    id: "nmz",
    name: "Nightmare Zone (NMZ)",
    category: "minigame",
    wiki_url: "https://oldschool.runescape.wiki/w/Nightmare_Zone",
    primary_style: "melee",
    melee_weights: { slash: 5, crush: 5, melee_str: 10, prayer: 7 },
    ranged_weights: STD_RANGED,
    magic_weights:  STD_MAGIC,
    notes: "Max melee strength bonus. Dharok's set extremely effective for XP/hr. Overloads + Absorption.",
  },
  {
    id: "pest_control",
    name: "Pest Control",
    category: "minigame",
    wiki_url: "https://oldschool.runescape.wiki/w/Pest_Control",
    primary_style: "melee",
    melee_weights: STD_SLASH,
    ranged_weights: STD_RANGED,
    magic_weights:  STD_MAGIC,
  },
  {
    id: "warriors_guild",
    name: "Warriors' Guild (Cyclopes)",
    category: "minigame",
    wiki_url: "https://oldschool.runescape.wiki/w/Warriors%27_Guild",
    primary_style: "melee",
    melee_weights: STD_SLASH,
    ranged_weights: STD_RANGED,
    magic_weights:  STD_MAGIC,
  },
  {
    id: "tithe_farm",
    name: "Tithe Farm",
    category: "minigame",
    wiki_url: "https://oldschool.runescape.wiki/w/Tithe_Farm",
    primary_style: "melee",
    melee_weights: { prayer: 10 },
    ranged_weights: STD_RANGED,
    magic_weights:  STD_MAGIC,
    notes: "Prayer bonus maximised for faster run. No combat.",
  },
  {
    id: "last_man_standing",
    name: "Last Man Standing (LMS)",
    category: "minigame",
    wiki_url: "https://oldschool.runescape.wiki/w/Last_Man_Standing",
    primary_style: "ranged",
    melee_weights:  STD_SLASH,
    ranged_weights: STD_RANGED,
    magic_weights:  STD_MAGIC,
    notes: "PvP minigame. Ranged + melee switches.",
  },

  // ══════════════════════════════════════════════════════════════════════════
  // MISCELLANEOUS / LOW-LEVEL
  // ══════════════════════════════════════════════════════════════════════════

  {
    id: "green_dragons",
    name: "Green Dragons",
    category: "dragon",
    wiki_url: "https://oldschool.runescape.wiki/w/Green_dragon",
    primary_style: "melee",
    melee_weights: STD_SLASH,
    ranged_weights: STD_RANGED,
    magic_weights:  STD_MAGIC,
    required_items: ["Anti-dragon shield"],
    is_wilderness: true,
  },
  {
    id: "demonic_gorillas",
    name: "Demonic Gorillas",
    category: "other",
    wiki_url: "https://oldschool.runescape.wiki/w/Demonic_gorilla",
    primary_style: "multi",
    phases: [
      { name: "Melee phase",  style: "melee",  weights: STD_SLASH },
      { name: "Ranged phase", style: "ranged", weights: STD_RANGED },
      { name: "Magic phase",  style: "magic",  weights: STD_MAGIC },
    ],
    melee_weights:  STD_SLASH,
    ranged_weights: STD_RANGED,
    magic_weights:  STD_MAGIC,
    notes: "Switches prayer and attack style. Must switch style to match.",
  },
  {
    id: "lizardman_shaman",
    name: "Lizardman Shamans",
    category: "other",
    wiki_url: "https://oldschool.runescape.wiki/w/Lizardman_shaman",
    primary_style: "ranged",
    melee_weights:  STD_MELEE,
    ranged_weights: STD_RANGED,
    magic_weights:  STD_MAGIC,
    notes: "Ranged from safespot. Jump over spawn.",
  },
  {
    id: "wyrm",
    name: "Wyrms",
    category: "slayer",
    wiki_url: "https://oldschool.runescape.wiki/w/Wyrm",
    primary_style: "melee",
    melee_weights: STD_SLASH,
    ranged_weights: STD_RANGED,
    magic_weights:  STD_MAGIC,
  },
  {
    id: "hydra",
    name: "Hydras",
    category: "slayer",
    wiki_url: "https://oldschool.runescape.wiki/w/Hydra",
    primary_style: "ranged",
    melee_weights:  STD_MELEE,
    ranged_weights: STD_RANGED,
    magic_weights:  STD_MAGIC,
  },
  {
    id: "drakes",
    name: "Drakes",
    category: "slayer",
    wiki_url: "https://oldschool.runescape.wiki/w/Drake",
    primary_style: "melee",
    melee_weights: STD_SLASH,
    ranged_weights: STD_RANGED,
    magic_weights:  STD_MAGIC,
  },
  {
    id: "basilisk_knight",
    name: "Basilisk Knights",
    category: "slayer",
    wiki_url: "https://oldschool.runescape.wiki/w/Basilisk_Knight",
    primary_style: "melee",
    melee_weights: { slash: 9, melee_str: 10, prayer: 3 },
    ranged_weights: STD_RANGED,
    magic_weights:  STD_MAGIC,
    required_items: ["Mirror shield", "V's shield"],
  },
  {
    id: "cave_kraken",
    name: "Cave Kraken",
    category: "slayer",
    wiki_url: "https://oldschool.runescape.wiki/w/Cave_kraken",
    primary_style: "magic",
    melee_weights:  STD_MELEE,
    ranged_weights: STD_RANGED,
    magic_weights: { magic_atk: 8, magic_dmg: 10 },
  },
  {
    id: "abyssal_demon",
    name: "Abyssal Demons",
    category: "slayer",
    wiki_url: "https://oldschool.runescape.wiki/w/Abyssal_demon",
    primary_style: "melee",
    melee_weights: STD_SLASH,
    ranged_weights: STD_RANGED,
    magic_weights:  STD_MAGIC,
  },
  {
    id: "dark_beast",
    name: "Dark Beasts",
    category: "slayer",
    wiki_url: "https://oldschool.runescape.wiki/w/Dark_beast",
    primary_style: "ranged",
    melee_weights:  STD_MELEE,
    ranged_weights: STD_RANGED,
    magic_weights:  STD_MAGIC,
  },
  {
    id: "wyvern",
    name: "Skeletal Wyverns",
    category: "slayer",
    wiki_url: "https://oldschool.runescape.wiki/w/Skeletal_Wyvern",
    primary_style: "ranged",
    melee_weights:  STD_MELEE,
    ranged_weights: { ranged_atk: 8, ranged_str: 10, def_magic: 5 },
    magic_weights:  STD_MAGIC,
    required_items: ["Elemental shield", "Mind shield", "Dragonfire shield"],
  },
];

// ─── Lookup helpers ───────────────────────────────────────────────────────────

export const BOSS_PROFILE_MAP = new Map<string, BossProfile>(
  BOSS_PROFILES.map((p) => [p.id, p])
);

export function getBossProfile(id: string): BossProfile | undefined {
  return BOSS_PROFILE_MAP.get(id);
}

export const BOSS_CATEGORIES: Record<BossCategory, string> = {
  gwd:        "God Wars Dungeon",
  slayer:     "Slayer Bosses",
  raid:       "Raids",
  wilderness: "Wilderness Bosses",
  minigame:   "Minigames",
  dt2:        "Desert Treasure II",
  dragon:     "Dragons",
  dagannoth:  "Dagannoth Kings",
  barrows:    "Barrows",
  other:      "Other Bosses",
};

export function getBossesByCategory(): Record<BossCategory, BossProfile[]> {
  const result = {} as Record<BossCategory, BossProfile[]>;
  for (const profile of BOSS_PROFILES) {
    if (!result[profile.category]) result[profile.category] = [];
    result[profile.category].push(profile);
  }
  return result;
}
