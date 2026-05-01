import { getXpDiff } from "./osrs-xp-table";
import type {
  FormConfig,
  PriceMatrix,
  PriceBreakdown,
  XpBasedPriceMatrix,
  SkillConfig,
  PerItemPriceMatrix,
  PerUnitPriceMatrix,
  StatBasedPriceMatrix,
  PerItemStatBasedPriceMatrix,
  BossTieredPriceMatrix,
  GoldTieredPriceMatrix,
  RouteSegment,
  SegmentBreakdown,
  LoadoutModifier,
  QuestPackageItem,
  StatConfig,
  QuestModifierField,
} from "@/types/service-config";

export type Selections = Record<string, string | number | boolean | string[] | RouteSegment[] | undefined>;

function applyModifiers(
  base: number,
  formConfig: FormConfig,
  selections: Selections
): { afterMultipliers: number; afterAddons: number } {
  let multiplier = 1;
  let addons = 0;

  for (const field of formConfig.fields) {
    if (field.type === "select" || field.type === "radio") {
      const selVal = selections[field.id];
      // Match on value, or on label-as-key (handles options where value was empty/auto)
      const chosen = field.options?.find((o) => {
        const key = o.value || o.label;
        return key === selVal;
      });
      if (chosen?.multiplier && chosen.multiplier !== 1) multiplier *= chosen.multiplier;
      if (chosen?.price_add) addons += chosen.price_add;
    }
    if (field.type === "multi_select") {
      // selections[field.id] is a string[] of selected option keys
      const rawVal = selections[field.id];
      const selectedKeys: string[] = Array.isArray(rawVal) ? (rawVal as string[]) : [];
      for (const key of selectedKeys) {
        const opt = field.options?.find((o) => (o.value || o.label) === key);
        if (opt?.multiplier && opt.multiplier !== 1) multiplier *= opt.multiplier;
        if (opt?.price_add) addons += opt.price_add;
      }
    }
    if (field.type === "checkbox" && selections[field.id] === true) {
      if (field.multiplier) multiplier *= field.multiplier;
      if (field.price_add) addons += field.price_add;
    }
  }

  const afterMultipliers = base * multiplier;
  const afterAddons = afterMultipliers + addons;
  return { afterMultipliers, afterAddons };
}

/**
 * Calculates the tiered XP cost for a single skill between startLevel and endLevel.
 * Each tier covers [from_level, to_level) with its own price_per_xp.
 * If a tier has a method_id, the method's price_per_xp (if set) overrides the tier price,
 * or its multiplier is applied on top.
 * segmentModifierSelections: customer-chosen modifier values for this segment (e.g. Fish type: Shark)
 */
function calcTieredXpCost(
  skillConfig: SkillConfig,
  startLevel: number,
  endLevel: number,
  methods?: import("@/types/service-config").MethodOption[],
  segmentModifierSelections?: Record<string, string>
): number {
  // Compute modifier multiplier from customer selections once (applies to all tiers in segment)
  const tierModFields = skillConfig.tier_modifier_fields ?? [];
  const modMultiplier = tierModFields.reduce((acc, field) => {
    const selVal = segmentModifierSelections?.[field.id];
    if (!selVal) return acc;
    const opt = field.options.find((o) => (o.value || o.label) === selVal);
    return acc * (opt?.multiplier ?? 1);
  }, 1);

  let total = 0;
  for (const tier of skillConfig.tiers) {
    const effectiveFrom = Math.max(tier.from_level, startLevel);
    const effectiveTo = Math.min(tier.to_level, endLevel);
    if (effectiveTo <= effectiveFrom) continue;
    const tierXp = getXpDiff(effectiveFrom, effectiveTo);

    // Resolve method override for this tier
    const method = methods?.find((m) => m.id === tier.method_id);
    let tierCost: number;
    if (method?.price_per_xp != null) {
      tierCost = tierXp * method.price_per_xp;
    } else if (method) {
      tierCost = tierXp * tier.price_per_xp * method.multiplier;
    } else {
      tierCost = tierXp * tier.price_per_xp;
    }

    total += tierCost * modMultiplier;
  }
  return total;
}

/**
 * Calculate cost for a list of route segments, each with its own method.
 * Returns per-segment breakdown and totals.
 */
export function calcRouteSegments(
  matrix: XpBasedPriceMatrix,
  skillId: string,
  segments: RouteSegment[]
): { segmentBreakdowns: SegmentBreakdown[]; totalBase: number; totalXp: number } {
  const skillConfig = matrix.skills?.find((s) => s.id === skillId);
  const methods = skillConfig?.methods ?? [];

  let totalBase = 0;
  let totalXp = 0;
  const segmentBreakdowns: SegmentBreakdown[] = [];

  for (const seg of segments) {
    const from = Math.max(1, seg.from_level);
    const to = Math.min(99, seg.to_level);
    if (to <= from || !skillConfig) {
      segmentBreakdowns.push({
        segment: seg,
        methodName: "—",
        multiplier: 1,
        xpDiff: 0,
        baseCost: 0,
        finalCost: 0,
      });
      continue;
    }

    const xpDiff = getXpDiff(from, to);
    const method = methods.find((m) => m.id === seg.method_id);

    let baseCost: number;
    let finalCost: number;
    let multiplier: number;

    if (method?.price_per_xp != null) {
      // Method has its own flat $/XP — overrides skill tier pricing entirely
      // Still apply customer modifier selections on top
      const tierModFields = skillConfig.tier_modifier_fields ?? [];
      const modMultiplier = tierModFields.reduce((acc, field) => {
        const selVal = seg.modifier_selections?.[field.id];
        if (!selVal) return acc;
        const opt = field.options.find((o) => (o.value || o.label) === selVal);
        return acc * (opt?.multiplier ?? 1);
      }, 1);
      baseCost = xpDiff * method.price_per_xp;
      finalCost = baseCost * modMultiplier;
      multiplier = modMultiplier;
    } else {
      // Fall back to skill tier pricing × segment method multiplier × customer modifier selections
      baseCost = calcTieredXpCost(skillConfig, from, to, methods, seg.modifier_selections);
      multiplier = method?.multiplier ?? 1;
      finalCost = baseCost * multiplier;
    }

    totalBase += baseCost;
    totalXp += xpDiff;

    segmentBreakdowns.push({
      segment: seg,
      methodName: method?.name ?? "Default",
      multiplier,
      xpDiff,
      baseCost,
      finalCost,
    });
  }

  return { segmentBreakdowns, totalBase, totalXp };
}

function calcXpBased(
  matrix: XpBasedPriceMatrix,
  formConfig: FormConfig,
  selections: Selections
): PriceBreakdown {
  const skillId = selections["skill"] as string | undefined;

  // ── Route planner mode ──
  const routeSegments = selections["route_segments"] as RouteSegment[] | undefined;
  if (routeSegments && routeSegments.length > 0 && skillId) {
    const { segmentBreakdowns, totalBase, totalXp } = calcRouteSegments(matrix, skillId, routeSegments);

    // Apply per-segment form_field_selections on top of each segment's cost
    let totalFinal = 0;
    for (const bd of segmentBreakdowns) {
      const ffs = bd.segment.form_field_selections ?? {};
      let segCost = bd.finalCost;
      // Apply multipliers from form fields
      for (const field of formConfig.fields) {
        if (field.type === "radio" || field.type === "select") {
          const selVal = ffs[field.id] as string | undefined;
          if (!selVal) continue;
          const opt = field.options?.find((o) => (o.value || o.label) === selVal);
          if (opt?.multiplier && opt.multiplier !== 1) segCost *= opt.multiplier;
          if (opt?.price_add) segCost += opt.price_add;
        }
        if (field.type === "multi_select") {
          const selVals = (ffs[field.id] as string[] | undefined) ?? [];
          for (const val of selVals) {
            const opt = field.options?.find((o) => (o.value || o.label) === val);
            if (opt?.multiplier && opt.multiplier !== 1) segCost *= opt.multiplier;
            if (opt?.price_add) segCost += opt.price_add;
          }
        }
      }
      totalFinal += segCost;
    }

    const final = Math.max(totalFinal, matrix.minimum_price ?? 0);
    return {
      base: totalBase,
      afterMultipliers: totalFinal,
      afterAddons: totalFinal,
      final,
      xpDiff: totalXp,
      segments: segmentBreakdowns,
    };
  }

  // ── Simple mode (single level range + optional per-method multiplier) ──
  const startLevel = Math.max(1, Number(selections["start_level"] ?? 1));
  const endLevel = Math.min(99, Number(selections["end_level"] ?? 1));

  const skillConfig = matrix.skills?.find((s) => s.id === skillId);

  let xpDiff = 0;
  let base = 0;

  if (skillConfig && endLevel > startLevel) {
    xpDiff = getXpDiff(startLevel, endLevel);
    base = calcTieredXpCost(skillConfig, startLevel, endLevel, skillConfig.methods);
  }

  // Apply method pricing from simple_method selection
  const simpleMethodId = selections["simple_method"] as string | undefined;
  let baseAfterMethod = base;
  if (simpleMethodId && skillConfig?.methods && skillConfig && xpDiff > 0) {
    const m = skillConfig.methods.find((m) => m.id === simpleMethodId);
    if (m) {
      if (m.price_per_xp != null) {
        // Own $/XP — override skill tier pricing entirely
        baseAfterMethod = xpDiff * m.price_per_xp;
      } else {
        baseAfterMethod = base * m.multiplier;
      }
    }
  }

  // Apply tier modifier field selections from simple mode (stored as tier_mod_<fieldId>)
  if (skillConfig?.tier_modifier_fields?.length) {
    const tierModMultiplier = skillConfig.tier_modifier_fields.reduce((acc, field) => {
      const selVal = selections[`tier_mod_${field.id}`] as string | undefined;
      if (!selVal) return acc;
      const opt = field.options.find((o) => (o.value || o.label) === selVal);
      return acc * (opt?.multiplier ?? 1);
    }, 1);
    baseAfterMethod = baseAfterMethod * tierModMultiplier;
  }

  const { afterMultipliers, afterAddons } = applyModifiers(baseAfterMethod, formConfig, selections);
  const final = Math.max(afterAddons, matrix.minimum_price ?? 0);

  return { base: baseAfterMethod, afterMultipliers, afterAddons, final, xpDiff };
}

function calcPerItem(
  matrix: PerItemPriceMatrix,
  formConfig: FormConfig,
  selections: Selections
): PriceBreakdown {
  const itemId = selections["item"] as string | undefined;
  const item = matrix.items.find((i) => i.id === itemId);
  const quantity = Math.max(1, Number(selections["quantity"] ?? 1));
  const base = (item?.price ?? 0) * quantity;

  const { afterMultipliers, afterAddons } = applyModifiers(base, formConfig, selections);
  const final = Math.max(afterAddons, matrix.minimum_price ?? 0);

  return { base, afterMultipliers, afterAddons, final, unitCount: quantity };
}

function calcPerUnit(
  matrix: PerUnitPriceMatrix,
  formConfig: FormConfig,
  selections: Selections
): PriceBreakdown {
  const quantity = Number(selections["quantity"] ?? matrix.minimum_units ?? 1);
  const base = quantity * matrix.price_per_unit;

  const { afterMultipliers, afterAddons } = applyModifiers(base, formConfig, selections);
  const final = Math.max(afterAddons, matrix.minimum_price ?? 0);

  return { base, afterMultipliers, afterAddons, final, unitCount: quantity };
}

/**
 * Resolves the multiplier for a single stat value against its threshold bands.
 * Finds the first threshold where statValue <= threshold.max.
 * Falls back to 1 if no threshold matches (stat above all defined bands).
 */
function resolveStatMultiplier(statValue: number, thresholds: { max: number; multiplier: number }[]): number {
  const sorted = [...thresholds].sort((a, b) => a.max - b.max);
  for (const t of sorted) {
    if (statValue <= t.max) return t.multiplier;
  }
  return 1;
}

/**
 * Resolves which loadout modifiers are active given the customer's equipped items.
 * `loadoutItems` is a flat list of all item IDs the customer has equipped
 * (derived from all equipment slots across all styles, plus special_weapons).
 * Returns the combined multiplier and the list of active modifiers for display.
 */
/** Normalize an item string to a slug for fuzzy matching (e.g. "Twisted bow" → "twisted_bow") */
function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "_").replace(/_+/g, "_").replace(/^_|_$/g, "");
}

function calcLoadoutModifiers(
  modifiers: LoadoutModifier[],
  loadoutItems: string[]
): { multiplier: number; active: { id: string; label: string; multiplier: number }[] } {
  let multiplier = 1;
  const active: { id: string; label: string; multiplier: number }[] = [];

  if (!loadoutItems.length) return { multiplier, active };

  // Pre-compute slugified versions of loadout items for efficient matching
  const loadoutSlugs = loadoutItems.map(slugify);

  for (const mod of modifiers) {
    const matches = mod.item_ids.some(
      (id) => loadoutItems.includes(id) || loadoutSlugs.includes(slugify(id))
    );
    if (matches) {
      multiplier *= mod.multiplier;
      active.push({ id: mod.id, label: mod.label, multiplier: mod.multiplier });
    }
  }

  return { multiplier, active };
}

function calcStatBased(
  matrix: StatBasedPriceMatrix,
  formConfig: FormConfig,
  selections: Selections
): PriceBreakdown {
  let base = matrix.base_price;

  // Multiply base by each stat's resolved multiplier
  for (const stat of matrix.stats) {
    const rawVal = selections[`stat_${stat.id}`];
    const statValue = rawVal !== undefined && rawVal !== "" ? Number(rawVal) : stat.max;
    const m = resolveStatMultiplier(statValue, stat.thresholds);
    base = base * m;
  }

  // Apply loadout modifiers when present
  const loadoutItems = (selections["loadout_items"] as string[] | undefined) ?? [];
  const loadoutResult = calcLoadoutModifiers(matrix.loadout_modifiers ?? [], loadoutItems);
  base = base * loadoutResult.multiplier;

  const { afterMultipliers, afterAddons } = applyModifiers(base, formConfig, selections);
  const final = Math.max(afterAddons, matrix.minimum_price ?? 0);

  return {
    base: matrix.base_price,
    afterMultipliers,
    afterAddons,
    final,
    loadout_modifiers_active: loadoutResult.active.length ? loadoutResult.active : undefined,
  };
}

function calcPerItemStatBased(
  matrix: PerItemStatBasedPriceMatrix,
  formConfig: FormConfig,
  selections: Selections
): PriceBreakdown {
  const packageId = selections["package_id"] as string | undefined;
  const itemId = selections["item"] as string | undefined;

  let base: number;
  let activeStats: StatConfig[];
  let activeModifiers: QuestModifierField[];

  if (packageId && matrix.packages?.length) {
    const pkg = matrix.packages.find((p: QuestPackageItem) => p.id === packageId);
    base = pkg?.base_price ?? 0;
    activeStats = (pkg?.stats && pkg.stats.length > 0) ? pkg.stats : matrix.stats;
    activeModifiers = pkg?.modifiers ?? matrix.modifiers ?? [];
  } else {
    const item = matrix.items.find((i) => i.id === itemId);
    base = item?.price ?? 0;
    activeStats = (item?.stats && item.stats.length > 0) ? item.stats : matrix.stats;
    activeModifiers = (item?.modifiers && item.modifiers.length > 0) ? item.modifiers : (matrix.modifiers ?? []);
  }

  const initialBase = base;
  for (const stat of activeStats) {
    const rawVal = selections[`stat_${stat.id}`];
    const statValue = rawVal !== undefined && rawVal !== "" ? Number(rawVal) : stat.max;
    const m = resolveStatMultiplier(statValue, stat.thresholds);
    base = base * m;
  }

  // Apply per-quest/per-package modifier fields
  let modMultiplier = 1;
  let modAddons = 0;
  for (let mi = 0; mi < activeModifiers.length; mi++) {
    const field = activeModifiers[mi];
    // Always use position index as key to guarantee uniqueness even with duplicate/empty IDs
    const selKey = `quest_mod_pos${mi}`;
    if (field.type === "select" || field.type === "radio") {
      const selVal = selections[selKey];
      const chosen = field.options?.find((o) => (o.value || o.label) === selVal);
      if (chosen?.multiplier && chosen.multiplier !== 1) modMultiplier *= chosen.multiplier;
      if (chosen?.price_add) modAddons += chosen.price_add;
    }
    if (field.type === "multi_select") {
      const selVals = selections[selKey];
      const selected = Array.isArray(selVals) ? selVals as string[] : [];
      for (const val of selected) {
        const opt = field.options?.find((o) => (o.value || o.label) === val);
        if (opt?.multiplier && opt.multiplier !== 1) modMultiplier *= opt.multiplier;
        if (opt?.price_add) modAddons += opt.price_add;
      }
    }
    if (field.type === "checkbox" && selections[selKey] === true) {
      if (field.multiplier) modMultiplier *= field.multiplier;
      if (field.price_add) modAddons += field.price_add;
    }
  }
  base = base * modMultiplier + modAddons;

  // Apply global form modifiers on top
  const { afterMultipliers, afterAddons } = applyModifiers(base, formConfig, selections);
  const final = Math.max(afterAddons, matrix.minimum_price ?? 0);

  return { base: initialBase, afterMultipliers, afterAddons, final };
}

function calcBossTiered(
  matrix: BossTieredPriceMatrix,
  formConfig: FormConfig,
  selections: Selections
): PriceBreakdown {
  const bossId = selections["boss"] as string | undefined;
  const boss = matrix.bosses.find((b) => b.id === bossId);
  const kills = Math.max(1, Number(selections["kills"] ?? matrix.minimum_kills ?? 1));

  // Resolve price_per_kill from the matching kill tier
  const activeKillTiers = boss?.kill_tiers ?? [];
  const matchingTier = activeKillTiers.find(
    (t) => kills >= t.min_kills && kills <= t.max_kills
  ) ?? activeKillTiers[activeKillTiers.length - 1];
  const pricePerKill = matchingTier?.price_per_kill ?? 0;

  let base = kills * pricePerKill;

  // Apply stat multipliers (combat level, range, etc.)
  const activeStats = (boss?.stats && boss.stats.length > 0) ? boss.stats : (matrix.stats ?? []);
  for (const stat of activeStats) {
    const rawVal = selections[`stat_${stat.id}`];
    const statValue = rawVal !== undefined && rawVal !== "" ? Number(rawVal) : stat.max;
    const m = resolveStatMultiplier(statValue, stat.thresholds);
    base = base * m;
  }

  // Apply modifier fields (loot split, account type, etc.)
  const activeModifiers = (boss?.modifiers && boss.modifiers.length > 0)
    ? boss.modifiers
    : (matrix.modifiers ?? []);
  let modMultiplier = 1;
  let modAddons = 0;
  for (const field of activeModifiers) {
    if (field.type === "select" || field.type === "radio") {
      const selVal = selections[`boss_mod_${field.id}`];
      const chosen = field.options?.find((o) => (o.value || o.label) === selVal);
      if (chosen?.multiplier && chosen.multiplier !== 1) modMultiplier *= chosen.multiplier;
      if (chosen?.price_add) modAddons += chosen.price_add;
    }
    if (field.type === "multi_select") {
      const selVals = selections[`boss_mod_${field.id}`];
      const selected = Array.isArray(selVals) ? selVals as string[] : [];
      for (const val of selected) {
        const opt = field.options?.find((o) => (o.value || o.label) === val);
        if (opt?.multiplier && opt.multiplier !== 1) modMultiplier *= opt.multiplier;
        if (opt?.price_add) modAddons += opt.price_add;
      }
    }
    if (field.type === "checkbox" && selections[`boss_mod_${field.id}`] === true) {
      if (field.multiplier) modMultiplier *= field.multiplier;
      if (field.price_add) modAddons += field.price_add;
    }
  }
  base = base * modMultiplier + modAddons;

  // Apply loadout modifiers (per-boss override global)
  const activeLoadoutMods = (boss?.loadout_modifiers && boss.loadout_modifiers.length > 0)
    ? boss.loadout_modifiers
    : (matrix.loadout_modifiers ?? []);
  const loadoutItems = (selections["loadout_items"] as string[] | undefined) ?? [];
  const loadoutResult = calcLoadoutModifiers(activeLoadoutMods, loadoutItems);
  base = base * loadoutResult.multiplier;

  // Apply global form modifiers on top
  const { afterMultipliers, afterAddons } = applyModifiers(base, formConfig, selections);
  const final = Math.max(afterAddons, matrix.minimum_price ?? 0);

  return {
    base: kills * pricePerKill,
    afterMultipliers,
    afterAddons,
    final,
    unitCount: kills,
    loadout_modifiers_active: loadoutResult.active.length ? loadoutResult.active : undefined,
  };
}

function calcGoldTiered(
  matrix: GoldTieredPriceMatrix,
  formConfig: FormConfig,
  selections: Selections
): PriceBreakdown {
  const amount = Number(selections["gold_amount"] ?? matrix.minimum_units ?? 1);

  // Find the best (highest min_amount) tier that applies
  const sortedTiers = [...matrix.tiers].sort((a, b) => b.min_amount - a.min_amount);
  const activeTier = sortedTiers.find((t) => amount >= t.min_amount) ?? matrix.tiers[0];
  const pricePerUnit = activeTier?.price_per_unit ?? 0;
  const base = amount * pricePerUnit;

  // Apply per-matrix modifiers (e.g. delivery method, rush)
  const mods = matrix.modifiers ?? [];
  let modMultiplier = 1;
  let modAddons = 0;
  for (const field of mods) {
    if (field.type === "select" || field.type === "radio") {
      const selVal = selections[`gold_mod_${field.id}`];
      const chosen = field.options?.find((o) => (o.value || o.label) === selVal);
      if (chosen?.multiplier && chosen.multiplier !== 1) modMultiplier *= chosen.multiplier;
      if (chosen?.price_add) modAddons += chosen.price_add;
    }
    if (field.type === "multi_select") {
      const selVals = selections[`gold_mod_${field.id}`];
      const selected = Array.isArray(selVals) ? (selVals as string[]) : [];
      for (const val of selected) {
        const opt = field.options?.find((o) => (o.value || o.label) === val);
        if (opt?.multiplier && opt.multiplier !== 1) modMultiplier *= opt.multiplier;
        if (opt?.price_add) modAddons += opt.price_add;
      }
    }
    if (field.type === "checkbox" && selections[`gold_mod_${field.id}`] === true) {
      if (field.multiplier) modMultiplier *= field.multiplier;
      if (field.price_add) modAddons += field.price_add;
    }
  }
  const afterMods = base * modMultiplier + modAddons;

  // Apply global form modifiers on top
  const { afterMultipliers, afterAddons } = applyModifiers(afterMods, formConfig, selections);
  const final = Math.max(afterAddons, matrix.minimum_price ?? 0);

  return { base, afterMultipliers, afterAddons, final, unitCount: amount };
}

export function calculatePrice(
  priceMatrix: PriceMatrix,
  formConfig: FormConfig,
  selections: Selections
): PriceBreakdown {
  switch (priceMatrix.type) {
    case "xp_based":
      return calcXpBased(priceMatrix, formConfig, selections);
    case "per_item":
      return calcPerItem(priceMatrix, formConfig, selections);
    case "per_unit":
      return calcPerUnit(priceMatrix, formConfig, selections);
    case "stat_based":
      return calcStatBased(priceMatrix, formConfig, selections);
    case "per_item_stat_based":
      return calcPerItemStatBased(priceMatrix, formConfig, selections);
    case "boss_tiered":
      return calcBossTiered(priceMatrix, formConfig, selections);
    case "gold_tiered":
      return calcGoldTiered(priceMatrix, formConfig, selections);
  }
}
