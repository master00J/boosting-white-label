/**
 * OSRS Gear Optimizer
 *
 * Given a player's available items (bank + equipped), their stats,
 * and a boss/activity profile, returns the best possible gear setup.
 */

import type { BossProfile, CombatStyle, StyleWeights } from "./osrs-boss-profiles";

// ─── Types ────────────────────────────────────────────────────────────────────

export type EquipmentSlot =
  | "head" | "cape" | "neck" | "ammo"
  | "weapon" | "shield"
  | "body" | "legs" | "hands" | "feet" | "ring";

export const ALL_SLOTS: EquipmentSlot[] = [
  "head", "cape", "neck", "ammo",
  "weapon", "shield",
  "body", "legs", "hands", "feet", "ring",
];

/** An item with full stats — as stored in the osrs_items table */
export interface GearItem {
  id:           string;
  name:         string;
  slot:         string;   // "head" | "cape" | ... | "weapon"
  is_2h:        boolean;
  is_members:   boolean;
  a_stab:       number;
  a_slash:      number;
  a_crush:      number;
  a_magic:      number;
  a_ranged:     number;
  d_stab:       number;
  d_slash:      number;
  d_crush:      number;
  d_magic:      number;
  d_ranged:     number;
  melee_str:    number;
  ranged_str:   number;
  magic_dmg:    number;
  prayer:       number;
  req_attack:   number;
  req_strength: number;
  req_defence:  number;
  req_ranged:   number;
  req_magic:    number;
  req_prayer:   number;
  set_name:     string | null;
  icon_url:     string | null;
}

export interface PlayerStats {
  attack?:    number;
  strength?:  number;
  defence?:   number;
  ranged?:    number;
  magic?:     number;
  prayer?:    number;
  hitpoints?: number;
}

export interface OptimizeRequest {
  /** Items available to the player (from bank + currently equipped) */
  availableItems: GearItem[];
  /** Player's skill levels */
  stats: PlayerStats;
  /** Boss profile to optimise for */
  bossProfile: BossProfile;
  /** Override: force a specific combat style (if null, uses profile's primary_style) */
  forceStyle?: CombatStyle;
  /** Whether the player is an ironman (affects item availability assumptions) */
  isIronman?: boolean;
}

export interface SlotRecommendation {
  slot:      EquipmentSlot;
  item:      GearItem | null;   // null = nothing suitable found
  score:     number;
  reason:    string;
  alternatives: { item: GearItem; score: number }[];
}

export interface GearSetup {
  style:       CombatStyle;
  slots:       Record<EquipmentSlot, SlotRecommendation>;
  totalScore:  number;
  setBonus:    SetBonus[];
  warnings:    string[];
  notes:       string[];
}

export interface OptimizeResult {
  primary:    GearSetup;
  secondary?: GearSetup;   // For multi-style (e.g. Zulrah magic + ranged)
  bossId:     string;
  bossName:   string;
}

export interface SetBonus {
  name:    string;
  items:   string[];
  bonus:   string;
}

// ─── Scoring ──────────────────────────────────────────────────────────────────

function scoreItem(item: GearItem, weights: StyleWeights): number {
  let score = 0;

  if (weights.stab)       score += item.a_stab       * weights.stab;
  if (weights.slash)      score += item.a_slash       * weights.slash;
  if (weights.crush)      score += item.a_crush       * weights.crush;
  if (weights.ranged_atk) score += item.a_ranged      * weights.ranged_atk;
  if (weights.magic_atk)  score += item.a_magic       * weights.magic_atk;
  if (weights.melee_str)  score += item.melee_str     * weights.melee_str;
  if (weights.ranged_str) score += item.ranged_str    * weights.ranged_str;
  if (weights.magic_dmg)  score += item.magic_dmg     * weights.magic_dmg;
  if (weights.prayer)     score += item.prayer        * weights.prayer;
  if (weights.def_melee)  score += (item.d_slash + item.d_crush + item.d_stab) / 3 * weights.def_melee;
  if (weights.def_ranged) score += item.d_ranged      * weights.def_ranged;
  if (weights.def_magic)  score += item.d_magic       * weights.def_magic;

  return score;
}

// ─── Level requirement check ──────────────────────────────────────────────────

function meetsRequirements(item: GearItem, stats: PlayerStats): boolean {
  const atk  = stats.attack    ?? 1;
  const str  = stats.strength  ?? 1;
  const def  = stats.defence   ?? 1;
  const rng  = stats.ranged    ?? 1;
  const mag  = stats.magic     ?? 1;
  const pray = stats.prayer    ?? 1;

  return (
    atk  >= item.req_attack   &&
    str  >= item.req_strength &&
    def  >= item.req_defence  &&
    rng  >= item.req_ranged   &&
    mag  >= item.req_magic    &&
    pray >= item.req_prayer
  );
}

// ─── Set bonus detection ──────────────────────────────────────────────────────

const SET_BONUSES: Record<string, { bonus: string; minPieces: number }> = {
  void:           { bonus: "+10% ranged/magic damage & accuracy",      minPieces: 4 },
  dharoks:        { bonus: "More max hit as HP decreases (deadly)",    minPieces: 4 },
  veracs:         { bonus: "Attacks ignore prayer/defence (4-piece)",  minPieces: 4 },
  karils:         { bonus: "+3 prayer, ranged strength bonus",         minPieces: 4 },
  guthans:        { bonus: "Attacks heal HP",                          minPieces: 4 },
  torags:         { bonus: "Run energy drain on hit",                  minPieces: 4 },
  ahrims:         { bonus: "+5% magic damage (4-piece)",               minPieces: 4 },
  inquisitor:     { bonus: "+2.5% crush accuracy & damage (3-piece)",  minPieces: 3 },
  justiciar:      { bonus: "Reduces all damage taken",                 minPieces: 3 },
  crystal_armour: { bonus: "+15% ranged accuracy, +15% strength",      minPieces: 3 },
  obsidian:       { bonus: "+10% melee accuracy & damage (3-piece)",   minPieces: 3 },
  graceful:       { bonus: "+30% run energy restore (full set)",       minPieces: 6 },
};

function detectSetBonuses(items: (GearItem | null)[]): SetBonus[] {
  const setCounts = new Map<string, string[]>();

  for (const item of items) {
    if (!item?.set_name) continue;
    const existing = setCounts.get(item.set_name) ?? [];
    existing.push(item.name);
    setCounts.set(item.set_name, existing);
  }

  const result: SetBonus[] = [];
  for (const [setName, itemNames] of setCounts.entries()) {
    const bonusInfo = SET_BONUSES[setName];
    if (bonusInfo && itemNames.length >= bonusInfo.minPieces) {
      result.push({
        name:  setName,
        items: itemNames,
        bonus: bonusInfo.bonus,
      });
    }
  }
  return result;
}

// ─── Required item warnings ───────────────────────────────────────────────────

function checkRequiredItems(
  profile: BossProfile,
  availableItems: GearItem[],
): string[] {
  const warnings: string[] = [];
  if (!profile.required_items) return warnings;

  const availableNames = new Set(availableItems.map((i) => i.name.toLowerCase()));

  for (const required of profile.required_items) {
    const found = [...availableNames].some((n) => n.includes(required.toLowerCase()));
    if (!found) {
      warnings.push(`⚠️ ${required} is required/recommended for ${profile.name} but not in your bank.`);
    }
  }
  return warnings;
}

// ─── Core optimiser ───────────────────────────────────────────────────────────

function optimiseForStyle(
  style: CombatStyle,
  weights: StyleWeights,
  availableItems: GearItem[],
  stats: PlayerStats,
): Record<EquipmentSlot, SlotRecommendation> {
  const result = {} as Record<EquipmentSlot, SlotRecommendation>;

  // Group eligible items by slot
  const bySlot = new Map<string, GearItem[]>();
  for (const item of availableItems) {
    if (!meetsRequirements(item, stats)) continue;
    const list = bySlot.get(item.slot) ?? [];
    list.push(item);
    bySlot.set(item.slot, list);
  }

  // Score & rank every item in every slot
  const scoredBySlot = new Map<string, { item: GearItem; score: number }[]>();
  for (const [slot, items] of bySlot.entries()) {
    const scored = items
      .map((item) => ({ item, score: scoreItem(item, weights) }))
      .sort((a, b) => b.score - a.score);
    scoredBySlot.set(slot, scored);
  }

  // Determine weapon slot: compare 2H vs weapon+shield
  const weapons   = (scoredBySlot.get("weapon") ?? []).filter((x) => !x.item.is_2h);
  const twoHanded = (scoredBySlot.get("weapon") ?? []).filter((x) => x.item.is_2h);
  const shields   = scoredBySlot.get("shield") ?? [];

  const best1H     = weapons[0]?.score   ?? -Infinity;
  const best2H     = twoHanded[0]?.score ?? -Infinity;
  const bestShield = shields[0]?.score   ?? 0;

  // 2H is better if its score beats weapon + shield combined
  const use2H = best2H > (best1H + bestShield);

  // Build slot recommendations
  for (const slot of ALL_SLOTS) {
    if (slot === "weapon") {
      const candidate = use2H ? twoHanded[0] : weapons[0] ?? twoHanded[0];
      const alts = (use2H ? twoHanded : weapons).slice(1, 4);

      result[slot] = {
        slot,
        item:  candidate?.item ?? null,
        score: candidate?.score ?? 0,
        reason: candidate
          ? candidate.item.is_2h
            ? `Best 2H weapon for ${style} (score ${candidate.score.toFixed(0)})`
            : `Best 1H weapon for ${style} (score ${candidate.score.toFixed(0)})`
          : "No suitable weapon found",
        alternatives: alts.map(({ item, score }) => ({ item, score })),
      };
      continue;
    }

    if (slot === "shield") {
      if (use2H) {
        result[slot] = {
          slot,
          item:         null,
          score:        0,
          reason:       "Shield slot occupied by 2H weapon",
          alternatives: [],
        };
        continue;
      }
      const candidate = shields[0];
      result[slot] = {
        slot,
        item:  candidate?.item ?? null,
        score: candidate?.score ?? 0,
        reason: candidate
          ? `Best shield for ${style} (score ${candidate.score.toFixed(0)})`
          : "No suitable shield found",
        alternatives: shields.slice(1, 4).map(({ item, score }) => ({ item, score })),
      };
      continue;
    }

    const scored = scoredBySlot.get(slot) ?? [];
    const best   = scored[0];

    result[slot] = {
      slot,
      item:  best?.item ?? null,
      score: best?.score ?? 0,
      reason: best
        ? `Best ${slot} for ${style} (score ${best.score.toFixed(0)})`
        : `No suitable ${slot} found`,
      alternatives: scored.slice(1, 4).map(({ item, score }) => ({ item, score })),
    };
  }

  return result;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function optimizeGear(req: OptimizeRequest): OptimizeResult {
  const { availableItems, stats, bossProfile, forceStyle } = req;

  const warnings = checkRequiredItems(bossProfile, availableItems);
  const notes: string[] = [];
  if (bossProfile.notes) notes.push(bossProfile.notes);

  const resolveWeights = (style: CombatStyle): StyleWeights => {
    if (style === "melee")  return bossProfile.melee_weights;
    if (style === "ranged") return bossProfile.ranged_weights;
    return bossProfile.magic_weights;
  };

  const buildSetup = (style: CombatStyle): GearSetup => {
    const weights = resolveWeights(style);
    const slots   = optimiseForStyle(style, weights, availableItems, stats);
    const equippedItems = Object.values(slots).map((r) => r.item);
    const totalScore    = Object.values(slots).reduce((s, r) => s + r.score, 0);
    const setBonus      = detectSetBonuses(equippedItems);

    return { style, slots, totalScore, setBonus, warnings, notes };
  };

  // Multi-style (Zulrah, raids, etc.)
  if (bossProfile.primary_style === "multi" && !forceStyle) {
    const phases = bossProfile.phases ?? [];

    // Determine the two most common styles used
    const styleCounts = new Map<CombatStyle, number>();
    for (const phase of phases) {
      styleCounts.set(phase.style, (styleCounts.get(phase.style) ?? 0) + 1);
    }
    const sorted = [...styleCounts.entries()].sort((a, b) => b[1] - a[1]);
    const primaryStyle   = sorted[0]?.[0] ?? "melee";
    const secondaryStyle = sorted[1]?.[0];

    return {
      primary:   buildSetup(primaryStyle),
      secondary: secondaryStyle ? buildSetup(secondaryStyle) : undefined,
      bossId:    bossProfile.id,
      bossName:  bossProfile.name,
    };
  }

  const style = forceStyle ?? (bossProfile.primary_style as CombatStyle);
  return {
    primary:  buildSetup(style),
    bossId:   bossProfile.id,
    bossName: bossProfile.name,
  };
}

// ─── Utility: parse bank export ───────────────────────────────────────────────

export interface BankItem {
  itemId: string;
  name:   string;
  qty:    number;
}

/**
 * Parses a RuneLite bank memory export (tab-separated: id \t name \t qty)
 */
export function parseBankExport(raw: string): BankItem[] {
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .flatMap((line) => {
      const parts = line.split("\t");
      if (parts.length < 3) return [];
      const [itemId, name, qtyStr] = parts;
      const qty = parseInt(qtyStr ?? "1", 10);
      if (!name || isNaN(qty)) return [];
      return [{ itemId: itemId.trim(), name: name.trim(), qty }];
    });
}

/**
 * Matches bank items to full GearItem records from the database.
 * Matches by OSRS item ID first, then by name (case-insensitive).
 */
export function matchBankToGear(
  bankItems: BankItem[],
  gearDb: GearItem[],
): GearItem[] {
  const byId   = new Map(gearDb.map((g) => [g.id, g]));
  const byName = new Map(gearDb.map((g) => [g.name.toLowerCase(), g]));

  const matched = new Set<string>();
  const result: GearItem[] = [];

  for (const bank of bankItems) {
    const item =
      byId.get(bank.itemId) ??
      byName.get(bank.name.toLowerCase());

    if (item && !matched.has(item.id)) {
      matched.add(item.id);
      result.push(item);
    }
  }

  return result;
}
