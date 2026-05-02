"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Zap, Plus, Check, ChevronDown, ChevronUp, Settings2, X, Coins, TrendingDown, Info, Layers, ShoppingCart, LayoutList, Search } from "lucide-react";
import { useCartStore } from "@/stores/cart-store";
import { cn } from "@/lib/utils/cn";
import { formatUSD } from "@/lib/format";
import { calculatePrice } from "@/lib/pricing-engine";
import StatCalculator, { type StatSelections } from "@/components/storefront/StatCalculator";
import { SearchableItemSelect } from "@/components/ui/searchable-item-select";
import { useAuth } from "@/components/providers/auth-provider";
import { createClient } from "@/lib/supabase/client";
import { toPricingStats, OSRS_SKILLS } from "@/lib/osrs-skills";
import { normaliseEquipmentByStyle } from "@/lib/osrs-equipment";
import { ClearableNumberInput, type LoadoutSummary } from "@/components/storefront/InlineLoadoutCreator";
import GearLoadoutPanel from "@/components/storefront/GearLoadoutPanel";
import RoutePlanner from "@/components/storefront/RoutePlanner";
import { formatMultiplier, formatMultiplierDelta, resolveStatMultiplier } from "@/lib/utils/service-config-helpers";
import type {
  FormConfig,
  PriceMatrix,
  PerUnitPriceMatrix,
  PerItemPriceMatrix,
  XpBasedPriceMatrix,
  StatBasedPriceMatrix,
  PerItemStatBasedPriceMatrix,
  BossTieredPriceMatrix,
  GoldTieredPriceMatrix,
  RouteSegment,
} from "@/types/service-config";

// ─── Local helpers ────────────────────────────────────────────────────────────

function resolveSkillIcon(id: string, stored: string | null | undefined): string | null {
  const wiki = OSRS_SKILLS.find((s) => s.id === id)?.icon;
  if (wiki) return wiki;
  if (stored?.startsWith("http")) return stored;
  return null;
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface ServiceConfiguratorProps {
  service: {
    id: string;
    name: string;
    slug: string;
    base_price: number;
    price_per_unit: number | null;
    min_quantity: number | null;
    max_quantity: number | null;
    estimated_hours?: number | null;
    image_url?: string | null;
    form_config: unknown;
    price_matrix: unknown;
  };
  game: {
    id: string;
    name: string;
    slug: string;
    logo_url: string | null;
  };
  categorySlug?: string;
}

type Selections = Record<string, string | number | boolean | undefined | string[] | RouteSegment[]>;

// ─── Main ServiceConfigurator ─────────────────────────────────────────────────

export default function ServiceConfigurator({ service, game, categorySlug }: ServiceConfiguratorProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editItemId = searchParams.get("edit") ?? null;
  const { addItem, updateItem, getItem } = useCartStore();
  const { user } = useAuth();
  const supabase = createClient();
  const configuratorRef = useRef<HTMLDivElement>(null);
  const [showValidation, setShowValidation] = useState(false);
  const [showPriceBreakdown, setShowPriceBreakdown] = useState(false);
  const [multiMode, setMultiMode] = useState(false);
  const [listView, setListView] = useState(false);
  const [listSearch, setListSearch] = useState("");
  const [selectedQuestIds, setSelectedQuestIds] = useState<Set<string>>(new Set());
  const [multiAdded, setMultiAdded] = useState(0);
  // Per-quest upcharge selections in multi-mode: { [questId]: { pos0: value, pos1: value, ... } }
  const [perQuestMods, setPerQuestMods] = useState<Record<string, Record<string, unknown>>>({});
  const [expandedQuestIds, setExpandedQuestIds] = useState<Set<string>>(new Set());

  // ── Per-item multi-mode ──
  const [perItemMultiMode, setPerItemMultiMode] = useState(false);
  const [selectedPerItemIds, setSelectedPerItemIds] = useState<Set<string>>(new Set());
  const [perItemQuantities, setPerItemQuantities] = useState<Record<string, number>>({});
  const [perItemSearch, setPerItemSearch] = useState("");

  const formConfig = useMemo<FormConfig | null>(() => {
    try { return service.form_config as FormConfig ?? null; } catch { return null; }
  }, [service.form_config]);

  const priceMatrix = useMemo<PriceMatrix | null>(() => {
    try { return service.price_matrix as PriceMatrix ?? null; } catch { return null; }
  }, [service.price_matrix]);

  const xpMatrix = priceMatrix?.type === "xp_based" ? (priceMatrix as XpBasedPriceMatrix) : null;
  const statMatrix = priceMatrix?.type === "stat_based" ? (priceMatrix as StatBasedPriceMatrix) : null;
  const perItemStatMatrix = priceMatrix?.type === "per_item_stat_based" ? (priceMatrix as PerItemStatBasedPriceMatrix) : null;
  const bossTieredMatrix = priceMatrix?.type === "boss_tiered" ? (priceMatrix as BossTieredPriceMatrix) : null;
  const goldMatrix = priceMatrix?.type === "gold_tiered" ? (priceMatrix as GoldTieredPriceMatrix) : null;
  const skills = useMemo(() => xpMatrix?.skills ?? [], [xpMatrix]);
  const isXpBased = priceMatrix?.type === "xp_based";

  // Is this a combat-based pricing type that uses gear/loadout data?
  const isCombatBased = priceMatrix?.type === "stat_based"
    || priceMatrix?.type === "boss_tiered";

  const [selections, setSelections] = useState<Selections>(() => {
    const base: Selections = {
      start_level: 1,
      end_level: 99,
      skill: xpMatrix?.skills?.[0]?.id ?? undefined,
      quantity: (priceMatrix as PerUnitPriceMatrix | null)?.minimum_units ?? 1,
      route_segments: [] as RouteSegment[],
    };
    // Pre-fill stat_based selections with each stat's max (best case = cheapest)
    if (priceMatrix?.type === "stat_based") {
      for (const stat of (priceMatrix as StatBasedPriceMatrix).stats) {
        base[`stat_${stat.id}`] = stat.max;
      }
    }
    // Pre-fill per_item_stat_based stat selections with max
    if (priceMatrix?.type === "per_item_stat_based") {
      for (const stat of (priceMatrix as PerItemStatBasedPriceMatrix).stats) {
        base[`stat_${stat.id}`] = stat.max;
      }
    }
    // Pre-fill gold_tiered: default amount = minimum_units
    if (priceMatrix?.type === "gold_tiered") {
      base["gold_amount"] = (priceMatrix as GoldTieredPriceMatrix).minimum_units ?? 1;
    }
    // Pre-fill boss_tiered: default kills + first boss stats (or global)
    if (priceMatrix?.type === "boss_tiered") {
      const bm = priceMatrix as BossTieredPriceMatrix;
      base["kills"] = bm.minimum_kills ?? 1;
      // Select first boss by default
      const firstBoss = bm.bosses?.[0];
      if (firstBoss) {
        base["boss"] = firstBoss.id;
        const initStats = (firstBoss.stats && firstBoss.stats.length > 0)
          ? firstBoss.stats
          : (bm.stats ?? []);
        for (const stat of initStats) {
          base[`stat_${stat.id}`] = stat.max;
        }
      } else {
        for (const stat of bm.stats ?? []) {
          base[`stat_${stat.id}`] = stat.max;
        }
      }
    }
    return base;
  });

  const [added, setAdded] = useState(false);
  const [addedSkills, setAddedSkills] = useState<Set<string>>(new Set());
  const [bossSearch, setBossSearch] = useState("");

  useEffect(() => {
    setBossSearch("");
  }, [service.id]);

  // ── Loadout state ──
  const [loadouts, setLoadouts] = useState<LoadoutSummary[]>([]);
  const [selectedLoadoutId, setSelectedLoadoutId] = useState<string | null>(null);
  const [overrideGearItems, setOverrideGearItems] = useState<string[] | null>(null);
  const [gearSectionCollapsed, setGearSectionCollapsed] = useState(false);

  // Fetch loadouts when user logs in
  useEffect(() => {
    if (!user?.id) {
      setLoadouts([]);
      setSelectedLoadoutId(null);
      return;
    }
    (async () => {
      try {
        const [profileRes, loadoutsRes] = await Promise.all([
          supabase.from("profiles").select("active_loadout_id").eq("id", user.id).single(),
          supabase
            .from("account_loadouts")
            .select("id, name, stats, equipment, special_weapons")
            .eq("profile_id", user.id)
            .order("sort_order", { ascending: true }),
        ]);
        const activeId = (profileRes.data as { active_loadout_id: string | null } | null)?.active_loadout_id ?? null;
        const all = (loadoutsRes.data ?? []) as LoadoutSummary[];
        setLoadouts(all);
        if (activeId && all.find((l) => l.id === activeId)) {
          setSelectedLoadoutId(activeId);
        }
      } catch {
        // ignore
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Compute effective gear items from selected loadout
  const localLoadoutItems = useMemo(() => {
    if (!selectedLoadoutId) return [];
    const loadout = loadouts.find((l) => l.id === selectedLoadoutId);
    if (!loadout) return [];
    const items: string[] = [];
    const equipment = normaliseEquipmentByStyle(loadout.equipment ?? null);
    for (const slotMap of Object.values(equipment)) {
      for (const rawId of Object.values(slotMap)) {
        const itemId = String(rawId);
        if (rawId && !items.includes(itemId)) items.push(itemId);
      }
    }
    for (const itemId of loadout.special_weapons ?? []) {
      if (itemId && !items.includes(itemId)) items.push(itemId);
    }
    return items;
  }, [loadouts, selectedLoadoutId]);

  const effectiveGearItems = overrideGearItems ?? localLoadoutItems;

  // Pre-fill from cart when editing
  useEffect(() => {
    if (!editItemId) return;
    const item = getItem(editItemId);
    if (!item?.configuration || Object.keys(item.configuration).length === 0) return;
    setSelections((prev) => ({ ...prev, ...(item.configuration as Selections) }));
  }, [editItemId, getItem]);

  // Auto-apply stats from selected loadout to selections
  useEffect(() => {
    if (!selectedLoadoutId) return;
    const loadout = loadouts.find((l) => l.id === selectedLoadoutId);
    const pricingStats = loadout?.stats ? toPricingStats(loadout.stats) : {};
    setSelections((prev) => {
      const next: Selections = {};
      for (const [key, value] of Object.entries(prev)) {
        if (!key.startsWith("stat_")) next[key] = value;
      }
      return { ...next, ...pricingStats };
    });
    // Reset gear overrides when changing accounts
    setOverrideGearItems(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedLoadoutId, loadouts]);

  const set = (id: string, val: string | number | boolean | string[] | RouteSegment[]) =>
    setSelections((prev) => ({ ...prev, [id]: val }));

  const selectSkill = (skillId: string) => {
    setSelections((prev) => ({
      ...prev,
      skill: skillId,
      start_level: 1,
      end_level: 99,
      route_segments: [] as RouteSegment[],
    }));
  };

  // Seed route segments from tiers when none exist yet (for xp_based)
  useEffect(() => {
    if (!isXpBased) return;
    const segs = selections["route_segments"] as RouteSegment[];
    if (segs && segs.length > 0) return;
    const skillId = selections["skill"] as string | undefined;
    if (!skillId) return;
    const skillConfig = xpMatrix?.skills?.find((s) => s.id === skillId);
    if (!skillConfig) return;
    const start = (selections["start_level"] as number) ?? 1;
    const end = (selections["end_level"] as number) ?? 99;
    let seedSegments: RouteSegment[] = [];
    if (skillConfig.tiers.length > 1) {
      seedSegments = skillConfig.tiers
        .filter((t) => t.from_level < end && t.to_level > start)
        .map((t, idx) => ({
          id: String(Date.now() + idx),
          from_level: Math.max(t.from_level, start),
          to_level: Math.min(t.to_level, end),
          method_id: t.method_id ?? null,
        }));
    }
    if (seedSegments.length === 0) {
      seedSegments = [{ id: String(Date.now()), from_level: start, to_level: end, method_id: null }];
    }
    set("route_segments", seedSegments);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isXpBased, selections["skill"]]);

  const breakdown = useMemo(() => {
    if (!formConfig || !priceMatrix) return null;
    try {
      const sels = isCombatBased
        ? { ...selections, loadout_items: effectiveGearItems }
        : selections;
      return calculatePrice(priceMatrix, formConfig, sels);
    } catch { return null; }
  }, [formConfig, priceMatrix, selections, isCombatBased, effectiveGearItems]);

  const totalPrice = breakdown?.final ?? service.base_price;
  const isBossTiered = priceMatrix?.type === "boss_tiered" && !!bossTieredMatrix;

  const filteredBossTieredBosses = useMemo(() => {
    if (!bossTieredMatrix) return [];
    const q = bossSearch.trim().toLowerCase();
    if (!q) return bossTieredMatrix.bosses;
    return bossTieredMatrix.bosses.filter(
      (b) =>
        b.label.toLowerCase().includes(q)
        || (b.description?.toLowerCase().includes(q) ?? false)
        || b.id.toLowerCase().includes(q)
    );
  }, [bossTieredMatrix, bossSearch]);

  const questPrices = useMemo(() => {
    if (!perItemStatMatrix || !formConfig || !priceMatrix) return {} as Record<string, number>;
    const prices: Record<string, number> = {};
    for (const item of perItemStatMatrix.items) {
      try {
        const result = calculatePrice(priceMatrix, formConfig, { ...selections, item: item.id, package_id: undefined });
        prices[item.id] = result?.final ?? item.price;
      } catch { prices[item.id] = item.price; }
    }
    for (const pkg of perItemStatMatrix.packages ?? []) {
      try {
        const result = calculatePrice(priceMatrix, formConfig, { ...selections, package_id: pkg.id, item: undefined });
        prices[pkg.id] = result?.final ?? pkg.base_price;
      } catch { prices[pkg.id] = pkg.base_price; }
    }
    return prices;
  }, [perItemStatMatrix, formConfig, priceMatrix, selections]);

  /** Per-quest prices in multi-mode, keyed by original array index (String), including per-quest upcharges */
  const multiModeQuestPrices = useMemo(() => {
    if (!perItemStatMatrix || !formConfig || !priceMatrix) return {} as Record<string, number>;
    const prices: Record<string, number> = {};
    for (let i = 0; i < perItemStatMatrix.items.length; i++) {
      const item = perItemStatMatrix.items[i];
      const questModSels = perQuestMods[String(i)] ?? {};
      const questModEntries: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(questModSels)) {
        questModEntries[`quest_mod_${k}`] = v; // pos0 → quest_mod_pos0
      }
      try {
        const result = calculatePrice(priceMatrix, formConfig, {
          ...selections, item: item.id, package_id: undefined, ...questModEntries,
        });
        prices[String(i)] = result?.final ?? item.price;
      } catch { prices[String(i)] = item.price; }
    }
    return prices;
  }, [perItemStatMatrix, formConfig, priceMatrix, selections, perQuestMods]);

  /** Running total for quest multi-mode (includes per-quest upcharges), 0 when not in multi-mode */
  const multiModeQuestTotal = useMemo<number>(() => {
    if (!multiMode || !perItemStatMatrix) return 0;
    return Array.from(selectedQuestIds).reduce((sum, id) => {
      if (id.startsWith("pkg:")) {
        const pkg = perItemStatMatrix.packages?.find((p) => p.id === id.slice(4));
        return sum + (pkg ? (questPrices[pkg.id] ?? pkg.base_price) : 0);
      }
      const idx = perItemStatMatrix.items.findIndex((q) => q.id === id);
      return sum + (idx >= 0
        ? (multiModeQuestPrices[String(idx)] ?? questPrices[id] ?? 0)
        : (questPrices[id] ?? 0));
    }, 0);
  }, [multiMode, perItemStatMatrix, selectedQuestIds, questPrices, multiModeQuestPrices]);

  /** Price shown at the top: multi-mode total when in quest multi-mode, otherwise normal breakdown */
  const displayPrice = (multiMode && priceMatrix?.type === "per_item_stat_based")
    ? multiModeQuestTotal
    : totalPrice;

  const bossPricingInsights = useMemo(() => {
    if (priceMatrix?.type !== "boss_tiered") return null;

    const bossMatrix = priceMatrix as BossTieredPriceMatrix;
    const selectedBossId = selections["boss"] as string | undefined;
    const selectedBoss = bossMatrix.bosses.find((boss) => boss.id === selectedBossId);
    const activeStats = (selectedBoss?.stats && selectedBoss.stats.length > 0)
      ? selectedBoss.stats
      : (bossMatrix.stats ?? []);
    const activeModifiers = (selectedBoss?.modifiers && selectedBoss.modifiers.length > 0)
      ? selectedBoss.modifiers
      : (bossMatrix.modifiers ?? []);
    const activeLoadoutMods = (selectedBoss?.loadout_modifiers && selectedBoss.loadout_modifiers.length > 0)
      ? selectedBoss.loadout_modifiers
      : (bossMatrix.loadout_modifiers ?? []);

    const unitLabel = bossMatrix.unit_label ?? "kills";
    const unitLabelSingular = unitLabel.replace(/s$/, "");
    const kills = Math.max(1, Number(selections["kills"] ?? bossMatrix.minimum_kills ?? 1));
    const killTiers = selectedBoss?.kill_tiers ?? [];
    const activeTier = killTiers.find((tier) => kills >= tier.min_kills && kills <= tier.max_kills)
      ?? killTiers[killTiers.length - 1];

    const statSummaries = activeStats.map((stat) => {
      const raw = selections[`stat_${stat.id}`];
      const value = raw !== undefined && raw !== "" ? Number(raw) : stat.max;
      const multiplier = resolveStatMultiplier(value, stat.thresholds);
      return {
        id: stat.id,
        label: stat.label,
        value,
        multiplier,
      };
    });
    const statMultiplier = statSummaries.reduce((acc, stat) => acc * stat.multiplier, 1);

    const modifierEffects: Array<{ id: string; label: string; multiplier?: number; priceAdd?: number }> = [];
    for (const field of activeModifiers) {
      const selKey = `boss_mod_${field.id}`;
      if (field.type === "select" || field.type === "radio") {
        const selected = selections[selKey];
        const chosen = field.options?.find((opt) => (opt.value || opt.label) === selected);
        if (chosen) {
          modifierEffects.push({
            id: `${field.id}:${chosen.value || chosen.label}`,
            label: `${field.label}: ${chosen.label}`,
            multiplier: chosen.multiplier,
            priceAdd: chosen.price_add,
          });
        }
      }
      if (field.type === "multi_select") {
        const selected = Array.isArray(selections[selKey]) ? selections[selKey] as string[] : [];
        for (const value of selected) {
          const chosen = field.options?.find((opt) => (opt.value || opt.label) === value);
          if (!chosen) continue;
          modifierEffects.push({
            id: `${field.id}:${chosen.value || chosen.label}`,
            label: `${field.label}: ${chosen.label}`,
            multiplier: chosen.multiplier,
            priceAdd: chosen.price_add,
          });
        }
      }
      if (field.type === "checkbox" && selections[selKey] === true) {
        modifierEffects.push({
          id: field.id,
          label: field.label,
          multiplier: field.multiplier,
          priceAdd: field.price_add,
        });
      }
    }

    const modifierMultiplier = modifierEffects.reduce((acc, effect) => acc * (effect.multiplier ?? 1), 1);
    const modifierAddons = modifierEffects.reduce((acc, effect) => acc + (effect.priceAdd ?? 0), 0);
    const activeGearEffects = breakdown?.loadout_modifiers_active ?? [];
    const gearMultiplier = activeGearEffects.reduce((acc, effect) => acc * effect.multiplier, 1);

    return {
      selectedBoss,
      unitLabel,
      unitLabelSingular,
      kills,
      activeTier,
      statSummaries,
      statMultiplier,
      modifierEffects,
      modifierMultiplier,
      modifierAddons,
      activeLoadoutMods,
      activeGearEffects,
      gearMultiplier,
      hasSelectedLoadout: !!selectedLoadoutId,
      hasEffectiveGear: effectiveGearItems.length > 0,
      baseCost: breakdown?.base ?? 0,
      finalCost: breakdown?.final ?? totalPrice,
    };
  }, [priceMatrix, selections, breakdown, selectedLoadoutId, effectiveGearItems, totalPrice]);

  const isValid = useMemo(() => {
    if (!formConfig) return true;
    if (priceMatrix?.type === "xp_based") {
      const hasSkill = skills.length === 0 || !!selections["skill"];
      if (!hasSkill) return false;
      const segs = (selections["route_segments"] as RouteSegment[]) ?? [];
      return segs.length > 0 && segs.some((s) => s.to_level > s.from_level);
    }
    if (priceMatrix?.type === "stat_based") {
      return (priceMatrix as StatBasedPriceMatrix).stats.every(
        (s) => selections[`stat_${s.id}`] !== undefined
      );
    }
    if (priceMatrix?.type === "per_item_stat_based") {
      const hasItem = !!selections["item"] && selections["item"] !== "";
      const hasPackage = !!selections["package_id"] && selections["package_id"] !== "";
      const hasStats = (priceMatrix as PerItemStatBasedPriceMatrix).stats.every(
        (s) => selections[`stat_${s.id}`] !== undefined
      );
      return (hasItem || hasPackage) && hasStats;
    }
    if (priceMatrix?.type === "boss_tiered") {
      const bm = priceMatrix as BossTieredPriceMatrix;
      const hasBoss = bm.bosses.length === 0 || (!!selections["boss"] && selections["boss"] !== "");
      const kills = Number(selections["kills"] ?? 0);
      return hasBoss && kills >= (bm.minimum_kills ?? 1);
    }
    if (priceMatrix?.type === "gold_tiered") {
      const gm = priceMatrix as GoldTieredPriceMatrix;
      const amount = Number(selections["gold_amount"] ?? 0);
      return amount >= (gm.minimum_units ?? 1) && gm.tiers.length > 0;
    }
    if (priceMatrix?.type === "per_item") {
      if (perItemMultiMode) return selectedPerItemIds.size > 0;
      return !!selections["item"] && selections["item"] !== "";
    }
    return formConfig.fields
      .filter((f) => f.required)
      .every((f) => {
        const val = selections[f.id];
        if (f.type === "multi_select") return Array.isArray(val) && (val as unknown as string[]).length > 0;
        return val !== undefined && val !== "" && val !== false;
      });
  }, [formConfig, priceMatrix, selections, skills, perItemMultiMode, selectedPerItemIds]);

  const firstInvalidFieldId = useMemo(() => {
    if (!formConfig) return null;
    if (priceMatrix?.type === "xp_based") {
      const hasSkill = skills.length === 0 || !!selections["skill"];
      if (!hasSkill) return "skill";
      const segs = (selections["route_segments"] as RouteSegment[]) ?? [];
      if (segs.length === 0 || !segs.some((s) => s.to_level > s.from_level)) return "route_segments";
    }
    if (priceMatrix?.type === "stat_based") {
      const statMatrix = priceMatrix as StatBasedPriceMatrix;
      const missing = statMatrix.stats.find((s) => selections[`stat_${s.id}`] === undefined);
      if (missing) return `stat_${missing.id}`;
    }
    if (priceMatrix?.type === "per_item_stat_based") {
      const hasItem = !!selections["item"] && selections["item"] !== "";
      const hasPackage = !!selections["package_id"] && selections["package_id"] !== "";
      if (!hasItem && !hasPackage) return "item";
      const perItem = priceMatrix as PerItemStatBasedPriceMatrix;
      const missing = perItem.stats.find((s) => selections[`stat_${s.id}`] === undefined);
      if (missing) return `stat_${missing.id}`;
    }
    if (priceMatrix?.type === "boss_tiered") {
      const bm = priceMatrix as BossTieredPriceMatrix;
      if (bm.bosses.length > 0 && (!selections["boss"] || selections["boss"] === "")) return "boss";
      const kills = Number(selections["kills"] ?? 0);
      if (kills < (bm.minimum_kills ?? 1)) return "kills";
    }
    const required = formConfig.fields.filter((f) => f.required);
    for (const f of required) {
      const val = selections[f.id];
      if (f.type === "multi_select" && (!Array.isArray(val) || (val as unknown as string[]).length === 0)) return f.id;
      if (val === undefined || val === "" || val === false) return f.id;
    }
    return null;
  }, [formConfig, priceMatrix, selections, skills]);

  const buildConfiguration = (): Record<string, unknown> => {
    const type = priceMatrix?.type;

    if (type === "boss_tiered") {
      const cfg: Record<string, unknown> = {
        boss: selections["boss"],
        kills: selections["kills"],
      };
      for (const [k, v] of Object.entries(selections)) {
        if (k.startsWith("stat_") || k.startsWith("boss_mod_")) cfg[k] = v;
      }
      // Build human-readable labels for active upcharges (for cart/checkout display)
      if (bossTieredMatrix) {
        cfg.unit_label = bossTieredMatrix.unit_label ?? "kills";
        const selectedBossId = selections["boss"] as string | undefined;
        const selectedBoss = bossTieredMatrix.bosses.find((b) => b.id === selectedBossId);
        if (selectedBoss) cfg.boss_label = selectedBoss.label;
        const mods = (selectedBoss?.modifiers?.length ? selectedBoss.modifiers : bossTieredMatrix.modifiers) ?? [];
        const modLabels: Record<string, string> = {};
        for (const field of mods) {
          const selKey = `boss_mod_${field.id}`;
          const val = selections[selKey];
          if (field.type === "checkbox" && val === true) {
            modLabels[field.id] = field.label;
          } else if ((field.type === "select" || field.type === "radio") && typeof val === "string" && val) {
            const opt = field.options?.find((o) => (o.value || o.label) === val);
            if (opt) modLabels[field.id] = `${field.label}: ${opt.label}`;
          } else if (field.type === "multi_select" && Array.isArray(val) && (val as string[]).length > 0) {
            const chosen = (val as string[])
              .map((v2) => field.options?.find((o) => (o.value || o.label) === v2)?.label)
              .filter(Boolean)
              .join(", ");
            if (chosen) modLabels[field.id] = `${field.label}: ${chosen}`;
          }
        }
        if (Object.keys(modLabels).length > 0) cfg._mod_labels = modLabels;
      }
      return cfg;
    }

    if (type === "xp_based") {
      const cfg: Record<string, unknown> = {
        skill: selections["skill"],
        route_segments: selections["route_segments"],
      };
      // Add form field selections (modifiers)
      for (const field of (formConfig?.fields ?? [])) {
        if (selections[field.id] !== undefined) cfg[field.id] = selections[field.id];
      }
      return cfg;
    }

    if (type === "per_item_stat_based") {
      const cfg: Record<string, unknown> = {};
      const packageId = selections["package_id"] as string | undefined;
      if (packageId && perItemStatMatrix?.packages?.length) {
        const pkg = perItemStatMatrix.packages.find((p) => p.id === packageId);
        if (pkg) {
          cfg.package_id = packageId;
          cfg.quests = pkg.quest_ids;
        }
      } else {
        cfg.item = selections["item"];
      }
      for (const [k, v] of Object.entries(selections)) {
        if (k.startsWith("stat_") || k.startsWith("quest_mod_") || k.startsWith("mod_")) cfg[k] = v;
      }
      // Store active modifier labels for cart/checkout display
      const selectedItemObj = perItemStatMatrix?.items.find((i) => i.id === (selections["item"] as string));
      const selectedPackageObj = perItemStatMatrix?.packages?.find((p) => p.id === (selections["package_id"] as string));
      const questMods = selectedPackageObj?.modifiers ?? selectedItemObj?.modifiers ?? perItemStatMatrix?.modifiers ?? [];
      const activeModLabels: Record<string, string> = {};
      questMods.forEach((mod, mi) => {
        const val = selections[`quest_mod_pos${mi}`];
        if (val === true || (typeof val === "string" && val) || (Array.isArray(val) && val.length > 0)) {
          activeModLabels[`pos${mi}`] = mod.label;
        }
      });
      if (Object.keys(activeModLabels).length > 0) cfg._mod_labels = activeModLabels;
      return cfg;
    }

    if (type === "stat_based") {
      const cfg: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(selections)) {
        if (k.startsWith("stat_")) cfg[k] = v;
      }
      for (const field of (formConfig?.fields ?? [])) {
        if (selections[field.id] !== undefined) cfg[field.id] = selections[field.id];
      }
      return cfg;
    }

    if (type === "gold_tiered") {
      const cfg: Record<string, unknown> = { gold_amount: selections["gold_amount"] };
      for (const [k, v] of Object.entries(selections)) {
        if (k.startsWith("gold_mod_")) cfg[k] = v;
      }
      return cfg;
    }

    // per_item, per_unit, default: keep all form field selections
    const cfg: Record<string, unknown> = {};
    for (const field of (formConfig?.fields ?? [])) {
      if (selections[field.id] !== undefined) cfg[field.id] = selections[field.id];
    }
    if (selections["quantity"] !== undefined) cfg["quantity"] = selections["quantity"];
    if (selections["item"] !== undefined) cfg["item"] = selections["item"];
    return cfg;
  };

  const buildCartItem = (): import("@/stores/cart-store").CartItem => {
    const skillLabel = skills.find((s) => s.id === selections["skill"])?.label;
    const segs = (selections["route_segments"] as RouteSegment[]) ?? [];
    const routeLabel = segs.length > 0
      ? ` (${segs.length} segments)`
      : "";
    const packageId = selections["package_id"] as string | undefined;
    const packageLabel = packageId && perItemStatMatrix?.packages?.length
      ? perItemStatMatrix.packages.find((p) => p.id === packageId)?.label
      : null;

    let bossLineSuffix = "";
    if (priceMatrix?.type === "boss_tiered" && bossTieredMatrix) {
      const bid = selections["boss"] as string | undefined;
      const b = bid ? bossTieredMatrix.bosses.find((x) => x.id === bid) : undefined;
      if (b) {
        const k = Math.max(1, Number(selections["kills"] ?? bossTieredMatrix.minimum_kills ?? 1));
        const ul = bossTieredMatrix.unit_label ?? "kills";
        bossLineSuffix = ` — ${b.label} · ${k} ${ul}`;
      }
    }

    let lineImageUrl: string | null = null;
    const pm = priceMatrix;
    if (pm?.type === "per_item_stat_based" && perItemStatMatrix) {
      if (packageId) {
        const pkg = perItemStatMatrix.packages?.find((p) => p.id === packageId);
        if (pkg?.quest_ids?.length) {
          for (const qid of pkg.quest_ids) {
            const q = perItemStatMatrix.items.find((x) => x.id === qid);
            if (q?.icon_url) {
              lineImageUrl = q.icon_url;
              break;
            }
          }
        }
      } else {
        const selItem = selections["item"] as string | undefined;
        if (selItem) {
          lineImageUrl = perItemStatMatrix.items.find((i) => i.id === selItem)?.icon_url ?? null;
        }
      }
    } else if (pm?.type === "per_item") {
      const selItem = selections["item"] as string | undefined;
      if (selItem) {
        lineImageUrl = (pm as PerItemPriceMatrix).items.find((i) => i.id === selItem)?.icon_url ?? null;
      }
    } else if (pm?.type === "boss_tiered") {
      const bossId = selections["boss"] as string | undefined;
      if (bossId) {
        lineImageUrl = (pm as BossTieredPriceMatrix).bosses.find((b) => b.id === bossId)?.image_url ?? null;
      }
    }

    const item: import("@/stores/cart-store").CartItem = {
      id: editItemId ?? `${service.id}-${packageId ?? selections["item"] ?? selections["skill"] ?? "default"}-${Date.now()}`,
      serviceId: service.id,
      gameId: game.id,
      gameName: game.name,
      gameSlug: game.slug,
      ...(categorySlug && { categorySlug }),
      serviceName:
        service.name +
        bossLineSuffix +
        (packageLabel ? ` — ${packageLabel}` : skillLabel && skills.length > 1 ? ` — ${skillLabel}` : "") +
        routeLabel,
      serviceSlug: service.slug,
      gameLogoUrl: game.logo_url,
      lineImageUrl,
      configuration: buildConfiguration(),
      basePrice: totalPrice,
      finalPrice: totalPrice,
      quantity: 1,
    };
    return item;
  };

  const handleAddToCart = () => {
    if (!isValid) {
      setShowValidation(true);
      const targetId = firstInvalidFieldId ? `field-${firstInvalidFieldId}` : null;
      if (targetId) {
        setTimeout(() => {
          document.getElementById(targetId)?.scrollIntoView({ behavior: "smooth", block: "center" });
        }, 100);
      } else {
        configuratorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }
      return;
    }
    const item = buildCartItem();
    if (editItemId) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars -- omit id when updating cart item
      const { id: _omitId, ...rest } = item;
      updateItem(editItemId, rest);
      router.push("/cart");
      return;
    }
    addItem(item);
    if (selections["skill"]) {
      setAddedSkills((prev) => new Set([...prev, selections["skill"] as string]));
    }
    // Reset quest selection so the customer can immediately pick another
    if (priceMatrix?.type === "per_item_stat_based") {
      setSelections((prev) => ({ ...prev, item: "" }));
    }
    // Bossing: each cart line is one boss × kills — clear boss so the customer can add another line
    if (priceMatrix?.type === "boss_tiered" && bossTieredMatrix) {
      setSelections((prev) => {
        const next: Selections = {
          ...prev,
          boss: "",
          kills: bossTieredMatrix.minimum_kills ?? 1,
        };
        for (const k of Object.keys(next)) {
          if (k.startsWith("boss_mod_")) delete next[k];
        }
        return next;
      });
    }
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  const handleBuyNow = () => {
    if (!isValid) {
      setShowValidation(true);
      const targetId = firstInvalidFieldId ? `field-${firstInvalidFieldId}` : null;
      if (targetId) {
        setTimeout(() => {
          document.getElementById(targetId)?.scrollIntoView({ behavior: "smooth", block: "center" });
        }, 100);
      } else {
        configuratorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }
      return;
    }
    const item = buildCartItem();
    if (editItemId) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars -- omit id when updating cart item
      const { id: _omitId, ...rest } = item;
      updateItem(editItemId, rest);
    } else {
      addItem(item);
    }
    router.push("/checkout");
  };

  const handleAddMultipleToCart = () => {
    if (!perItemStatMatrix || selectedQuestIds.size === 0) return;
    let i = 0;
    // Shared stat entries (apply to all quests)
    const sharedStats: Record<string, unknown> = Object.fromEntries(
      Object.entries(selections).filter(([k]) => k.startsWith("stat_") || k.startsWith("mod_"))
    );

    /** Build quest_mod_pos* entries + _mod_labels from a modifiers array + per-quest selections */
    const buildModConfig = (mods: import("@/types/service-config").QuestModifierField[], questModSels: Record<string, unknown>) => {
      const cfg: Record<string, unknown> = {};
      const labels: Record<string, string> = {};
      mods.forEach((mod, mi) => {
        const val = questModSels[`pos${mi}`];
        if (val !== undefined) cfg[`quest_mod_pos${mi}`] = val;
        if (val === true || (typeof val === "string" && val) || (Array.isArray(val) && (val as unknown[]).length > 0)) {
          labels[`pos${mi}`] = mod.label;
        }
      });
      if (Object.keys(labels).length > 0) cfg._mod_labels = labels;
      return cfg;
    };

    for (const id of selectedQuestIds) {
      // Package entry (prefixed with "pkg:")
      if (id.startsWith("pkg:")) {
        const pkgId = id.slice(4);
        const pkg = perItemStatMatrix.packages?.find((p) => p.id === pkgId);
        if (!pkg) continue;
        const pkgMods = pkg.modifiers ?? perItemStatMatrix.modifiers ?? [];
        const pkgModSels = perQuestMods[`pkg_${pkgId}`] ?? {};
        const pkgModCfg = buildModConfig(pkgMods, pkgModSels);
        const pkgPrice = questPrices[pkgId] ?? pkg.base_price;
        let pkgLineIcon: string | null = null;
        if (pkg.quest_ids?.length) {
          for (const qid of pkg.quest_ids) {
            const q = perItemStatMatrix.items.find((x) => x.id === qid);
            if (q?.icon_url) {
              pkgLineIcon = q.icon_url;
              break;
            }
          }
        }
        addItem({
          id: `${service.id}-pkg-${pkgId}-${Date.now()}-${i++}`,
          serviceId: service.id,
          gameId: game.id,
          gameName: game.name,
          gameSlug: game.slug,
          ...(categorySlug && { categorySlug }),
          serviceName: `${service.name} — ${pkg.label}`,
          serviceSlug: service.slug,
          gameLogoUrl: game.logo_url,
          lineImageUrl: pkgLineIcon,
          configuration: { package_id: pkgId, ...sharedStats, ...pkgModCfg },
          basePrice: pkgPrice,
          finalPrice: pkgPrice,
          quantity: 1,
        });
        continue;
      }
      // Individual quest — use per-quest upcharges (keyed by original array index)
      const questItemIdx = perItemStatMatrix.items.findIndex((q) => q.id === id);
      const questItem = questItemIdx >= 0 ? perItemStatMatrix.items[questItemIdx] : null;
      if (!questItem) continue;
      const questMods = questItem.modifiers ?? perItemStatMatrix.modifiers ?? [];
      const questStateKey = questItemIdx >= 0 ? String(questItemIdx) : id;
      const questModSels = perQuestMods[questStateKey] ?? {};
      const questModCfg = buildModConfig(questMods, questModSels);
      // Use multiModeQuestPrices which already includes per-quest upcharges
      const questPrice = (questItemIdx >= 0 ? multiModeQuestPrices[String(questItemIdx)] : undefined)
        ?? questPrices[id]
        ?? questItem.price;
      addItem({
        id: `${service.id}-${id}-${Date.now()}-${i++}`,
        serviceId: service.id,
        gameId: game.id,
        gameName: game.name,
        gameSlug: game.slug,
        ...(categorySlug && { categorySlug }),
        serviceName: `${service.name} — ${questItem.label}`,
        serviceSlug: service.slug,
        gameLogoUrl: game.logo_url,
        lineImageUrl: questItem.icon_url ?? null,
        configuration: { item: id, ...sharedStats, ...questModCfg },
        basePrice: questPrice,
        finalPrice: questPrice,
        quantity: 1,
      });
    }
    const count = selectedQuestIds.size;
    setMultiAdded(count);
    setSelectedQuestIds(new Set());
    setPerQuestMods({});
    setExpandedQuestIds(new Set());
    setTimeout(() => setMultiAdded(0), 3000);
  };

  const handleAddMultiplePerItemToCart = () => {
    if (!priceMatrix || priceMatrix.type !== "per_item" || selectedPerItemIds.size === 0) return;
    const matrix = priceMatrix as PerItemPriceMatrix;
    let i = 0;
    for (const id of selectedPerItemIds) {
      const itm = matrix.items.find((x) => x.id === id);
      if (!itm) continue;
      const qty = Math.max(1, perItemQuantities[id] ?? 1);
      const price = itm.price * qty;
      addItem({
        id: `${service.id}-${id}-${Date.now()}-${i++}`,
        serviceId: service.id,
        gameId: game.id,
        gameName: game.name,
        gameSlug: game.slug,
        ...(categorySlug && { categorySlug }),
        serviceName: `${service.name} — ${itm.label}`,
        serviceSlug: service.slug,
        gameLogoUrl: game.logo_url,
        lineImageUrl: itm.icon_url ?? null,
        configuration: { item: id, ...(qty > 1 ? { quantity: qty } : {}) },
        basePrice: price,
        finalPrice: price,
        quantity: 1,
      });
    }
    const count = selectedPerItemIds.size;
    setSelectedPerItemIds(new Set());
    setPerItemQuantities({});
    setMultiAdded(count);
    setTimeout(() => setMultiAdded(0), 3000);
  };

  const currentSkill = skills.find((s) => s.id === selections["skill"]);
  const routeSegments = (selections["route_segments"] as RouteSegment[]) ?? [];
  const gearSection = isCombatBased ? (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => setGearSectionCollapsed((prev) => !prev)}
        className="flex w-full items-center justify-between gap-3 rounded-xl border border-[var(--border-default)] bg-[var(--bg-elevated)] px-3.5 py-3 text-left transition-colors hover:border-primary/30 hover:bg-[var(--bg-card)]"
      >
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <Settings2 className="h-3.5 w-3.5 text-[var(--text-muted)]" />
            <span className="text-sm font-medium text-[var(--text-primary)]">Saved Account / Gear</span>
          </div>
          <p className="mt-1 text-xs text-[var(--text-secondary)]">
            {selectedLoadoutId
              ? "Use a saved account to apply automatic gear-based pricing."
              : "Select, create, or edit a saved account for automatic gear-based pricing."}
          </p>
        </div>
        <div className="shrink-0 text-[var(--text-muted)]">
          {gearSectionCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
        </div>
      </button>

      {!gearSectionCollapsed && (
        <>
          <GearLoadoutPanel
            loadouts={loadouts}
            selectedLoadoutId={selectedLoadoutId}
            overrideGearItems={overrideGearItems}
            userId={user?.id ?? null}
            onSelectLoadout={(id) => setSelectedLoadoutId(id)}
            onResetOverride={() => setOverrideGearItems(null)}
            onRemoveItem={(itemId) =>
              setOverrideGearItems((overrideGearItems ?? localLoadoutItems).filter((i) => i !== itemId))
            }
            onLoadoutCreated={(updatedLoadout) => {
              setLoadouts((prev) => {
                const exists = prev.some((l) => l.id === updatedLoadout.id);
                return exists
                  ? prev.map((l) => l.id === updatedLoadout.id ? updatedLoadout : l)
                  : [...prev, updatedLoadout];
              });
            }}
          />

          {bossPricingInsights?.activeLoadoutMods.length ? (
            <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-elevated)] p-3.5 space-y-3">
              <div className="flex items-start gap-2">
                <TrendingDown className="h-4 w-4 text-green-400 mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[var(--text-primary)]">Gear-based pricing</p>
                  <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                    This boss can automatically reduce or increase the price based on the gear in your saved account.
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-[11px] font-medium text-[var(--text-muted)] uppercase tracking-[0.18em]">
                  Available checks
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {bossPricingInsights.activeLoadoutMods.map((modifier) => (
                    <span
                      key={modifier.id}
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[11px] font-medium",
                        modifier.multiplier < 1
                          ? "border-green-500/25 bg-green-500/10 text-green-300"
                          : "border-orange-500/25 bg-orange-500/10 text-orange-300"
                      )}
                    >
                      <Settings2 className="h-3 w-3" />
                      {modifier.label} {formatMultiplierDelta(modifier.multiplier)}
                    </span>
                  ))}
                </div>
              </div>

              {!bossPricingInsights.hasSelectedLoadout ? (
                <div className="rounded-lg border border-dashed border-[var(--border-default)] px-3 py-2 text-xs text-[var(--text-secondary)]">
                  Select a saved account to auto-check these gear rules against your equipment.
                </div>
              ) : !bossPricingInsights.hasEffectiveGear ? (
                <div className="rounded-lg border border-orange-500/20 bg-orange-500/10 px-3 py-2 text-xs text-orange-200">
                  Your selected account does not have any gear configured yet, so no gear-based pricing can be applied.
                </div>
              ) : bossPricingInsights.activeGearEffects.length > 0 ? (
                <div className="space-y-2">
                  <div className="rounded-lg border border-green-500/20 bg-green-500/10 px-3 py-2">
                    <p className="text-xs font-semibold text-green-300">
                      Active now: {formatMultiplierDelta(bossPricingInsights.gearMultiplier)} ({formatMultiplier(bossPricingInsights.gearMultiplier)})
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {bossPricingInsights.activeGearEffects.map((modifier) => (
                      <span
                        key={modifier.id}
                        className={cn(
                          "inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[11px] font-medium",
                          modifier.multiplier < 1
                            ? "border-green-500/25 bg-green-500/10 text-green-300"
                            : "border-orange-500/25 bg-orange-500/10 text-orange-300"
                        )}
                      >
                        <Check className="h-3 w-3" />
                        {modifier.label} {formatMultiplierDelta(modifier.multiplier)}
                      </span>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="rounded-lg border border-[var(--border-default)] px-3 py-2 text-xs text-[var(--text-secondary)]">
                  Your current saved account does not match any configured gear rule for this boss yet.
                </div>
              )}
            </div>
          ) : null}
        </>
      )}
    </div>
  ) : null;
  const bossSummaryCard = bossPricingInsights ? (
    <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-elevated)] p-4 space-y-4">
      <div className="flex items-start gap-2">
        <Coins className="h-4 w-4 text-primary mt-0.5 shrink-0" />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[var(--text-primary)]">How this price is calculated</p>
          <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
            The total updates from the active kill tier, your account stats, selected boss options, and any matched gear rules.
          </p>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] p-3 space-y-1.5">
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[var(--text-muted)]">Kill tier</p>
          {bossPricingInsights.activeTier ? (
            <>
              <p className="text-sm font-semibold text-[var(--text-primary)]">
                {bossPricingInsights.kills} × {formatUSD(bossPricingInsights.activeTier.price_per_kill)}
              </p>
              <p className="text-xs text-[var(--text-secondary)]">
                {bossPricingInsights.activeTier.min_kills}–{bossPricingInsights.activeTier.max_kills === 999999 ? "∞" : bossPricingInsights.activeTier.max_kills} {bossPricingInsights.unitLabel}
              </p>
              <p className="text-xs text-primary">
                Base: {formatUSD(bossPricingInsights.baseCost)}
              </p>
            </>
          ) : (
            <p className="text-xs text-[var(--text-secondary)]">Select a boss to see the active price tier.</p>
          )}
        </div>

        <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] p-3 space-y-1.5">
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[var(--text-muted)]">Account stats</p>
          {bossPricingInsights.statSummaries.length > 0 ? (
            <>
              <p className={cn(
                "text-sm font-semibold",
                bossPricingInsights.statMultiplier < 1 ? "text-green-400" :
                bossPricingInsights.statMultiplier > 1 ? "text-orange-300" :
                "text-[var(--text-primary)]"
              )}>
                {formatMultiplier(bossPricingInsights.statMultiplier)} ({formatMultiplierDelta(bossPricingInsights.statMultiplier)})
              </p>
              <div className="space-y-1">
                {bossPricingInsights.statSummaries.map((stat) => (
                  <div key={stat.id} className="flex items-center justify-between gap-2 text-xs">
                    <span className="text-[var(--text-secondary)] truncate">{stat.label}</span>
                    <span className="text-[var(--text-primary)] whitespace-nowrap">
                      {stat.value} • {formatMultiplier(stat.multiplier)}
                    </span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="text-xs text-[var(--text-secondary)]">No stat-based pricing is configured for this boss.</p>
          )}
        </div>

        <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] p-3 space-y-1.5">
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[var(--text-muted)]">Boss options</p>
          {bossPricingInsights.modifierEffects.length > 0 ? (
            <>
              <p className={cn(
                "text-sm font-semibold",
                bossPricingInsights.modifierMultiplier < 1 ? "text-green-400" :
                bossPricingInsights.modifierMultiplier > 1 || bossPricingInsights.modifierAddons > 0 ? "text-orange-300" :
                "text-[var(--text-primary)]"
              )}>
                {formatMultiplier(bossPricingInsights.modifierMultiplier)}
                {bossPricingInsights.modifierAddons > 0 ? ` + ${formatUSD(bossPricingInsights.modifierAddons)}` : ` (${formatMultiplierDelta(bossPricingInsights.modifierMultiplier)})`}
              </p>
              <div className="space-y-1">
                {bossPricingInsights.modifierEffects.map((effect) => (
                  <div key={effect.id} className="text-xs text-[var(--text-secondary)]">
                    {effect.label}
                    {effect.multiplier && effect.multiplier !== 1 ? ` • ${formatMultiplier(effect.multiplier)}` : ""}
                    {effect.priceAdd ? ` • +${formatUSD(effect.priceAdd)}` : ""}
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="text-xs text-[var(--text-secondary)]">No extra boss options are selected right now.</p>
          )}
        </div>

        <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] p-3 space-y-1.5">
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[var(--text-muted)]">Gear pricing</p>
          {bossPricingInsights.activeLoadoutMods.length > 0 ? (
            <>
              <p className={cn(
                "text-sm font-semibold",
                bossPricingInsights.activeGearEffects.length > 0
                  ? bossPricingInsights.gearMultiplier < 1 ? "text-green-400" : "text-orange-300"
                  : "text-[var(--text-primary)]"
              )}>
                {bossPricingInsights.activeGearEffects.length > 0
                  ? `${formatMultiplier(bossPricingInsights.gearMultiplier)} (${formatMultiplierDelta(bossPricingInsights.gearMultiplier)})`
                  : bossPricingInsights.hasSelectedLoadout
                    ? "No active gear rule"
                    : "Waiting for saved account"}
              </p>
              <p className="text-xs text-[var(--text-secondary)]">
                {bossPricingInsights.activeGearEffects.length > 0
                  ? `${bossPricingInsights.activeGearEffects.length} matched ${bossPricingInsights.activeGearEffects.length === 1 ? "rule" : "rules"}`
                  : bossPricingInsights.hasSelectedLoadout
                    ? "Your current account does not match any configured gear rule."
                    : "Select a saved account to check your gear automatically."}
              </p>
            </>
          ) : (
            <p className="text-xs text-[var(--text-secondary)]">No gear-specific price rules are configured for this boss.</p>
          )}
        </div>
      </div>

      <div className="flex items-start gap-2 rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] px-3 py-2.5">
        <Info className="h-4 w-4 text-[var(--text-muted)] mt-0.5 shrink-0" />
        <div className="text-xs text-[var(--text-secondary)] leading-relaxed">
          Final total: <span className="font-semibold text-[var(--text-primary)]">{formatUSD(bossPricingInsights.finalCost)}</span>.
          Gear checks use the items on your saved account and update the final total automatically.
        </div>
      </div>
    </div>
  ) : null;
  const checkoutCard = (
    <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] overflow-hidden">
      {/* Price header */}
      <div className="px-5 py-5 bg-gradient-to-b from-primary/[0.07] to-transparent border-b border-[var(--border-subtle)]">
        <p className="text-[10px] uppercase tracking-widest text-[var(--text-muted)] font-medium mb-2">Total price</p>
        <div className="flex items-baseline gap-2.5 flex-wrap">
          <span
            className="font-heading text-4xl font-bold text-primary"
            style={{ textShadow: "0 0 32px rgba(232,114,12,0.3)" }}
          >
            {formatUSD(displayPrice)}
          </span>
          {breakdown?.xpDiff !== undefined && breakdown.xpDiff > 0 && (
            <span className="text-sm text-[var(--text-muted)]">
              {(breakdown.xpDiff / 1_000_000).toFixed(2)}M XP
            </span>
          )}
          {breakdown?.unitCount !== undefined && priceMatrix?.type === "per_unit" && (
            <span className="text-sm text-[var(--text-muted)]">
              {breakdown.unitCount} {(priceMatrix as PerUnitPriceMatrix).unit_label}
            </span>
          )}
          {breakdown?.unitCount !== undefined && priceMatrix?.type === "boss_tiered" && (
            <span className="text-sm text-[var(--text-muted)]">
              {breakdown.unitCount} kills
            </span>
          )}
        </div>
        {bossPricingInsights?.activeLoadoutMods.length ? (
          <p className="mt-2.5 text-xs text-[var(--text-secondary)]">
            Gear-based pricing active.
            {bossPricingInsights.activeGearEffects.length > 0 ? (
              <span className="ml-1 text-green-400 font-medium">
                {formatMultiplierDelta(bossPricingInsights.gearMultiplier)} from matched gear.
              </span>
            ) : (
              <span className="ml-1 text-[var(--text-muted)]">
                Select a saved account to see gear discounts.
              </span>
            )}
          </p>
        ) : null}
      </div>

      {/* Actions */}
      <div className="px-5 py-4 space-y-2.5">
        {isBossTiered && !editItemId && (
          <p className="text-[11px] text-[var(--text-muted)] leading-relaxed rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)]/40 px-3 py-2">
            Add multiple bosses: each add creates a separate cart line. After adding, pick your next boss below.
          </p>
        )}
        <button
          onClick={handleBuyNow}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-primary text-white font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:-translate-y-0.5 active:translate-y-0"
        >
          <Zap className="h-4 w-4" />
          {editItemId ? "Update & checkout" : "Order now"}
        </button>
        <button
          onClick={handleAddToCart}
          className={cn(
            "w-full flex items-center justify-center gap-2 py-3 rounded-xl border font-medium text-sm transition-all hover:-translate-y-0.5 active:translate-y-0",
            added
              ? "border-green-400/40 bg-green-400/10 text-green-400"
              : "border-[var(--border-default)] hover:border-primary/40 hover:bg-primary/5 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          )}
        >
          {added ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {added
            ? "Added to cart!"
            : editItemId
            ? "Update in cart"
            : isBossTiered
            ? "Add boss line to cart"
            : skills.length > 1
            ? `Add ${currentSkill?.label ?? "skill"} to cart`
            : "Add to cart"}
        </button>
      </div>

      {/* Trust footer */}
      <div className="px-5 pb-4 flex items-center justify-center gap-4 text-[10px] text-[var(--text-muted)]">
        <span className="flex items-center gap-1">🔒 SSL secured</span>
        <span className="opacity-30">·</span>
        <span className="flex items-center gap-1">⚡ Instant start</span>
        <span className="opacity-30">·</span>
        <span className="flex items-center gap-1">↩ Full refund</span>
      </div>
    </div>
  );

  return (
    <div ref={configuratorRef} className="rounded-2xl bg-[var(--bg-card)] border border-[var(--border-default)] overflow-hidden shadow-xl shadow-black/20">
      {editItemId && (
        <div className="px-5 py-3 bg-primary/10 border-b border-primary/25 text-sm text-primary font-medium flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
          Editing cart item — save to update
        </div>
      )}
      {!isBossTiered && (
        <div className="px-5 pt-5 pb-4 bg-gradient-to-b from-primary/[0.06] to-transparent border-b border-[var(--border-subtle)]">
          <p className="text-[10px] uppercase tracking-widest text-[var(--text-muted)] font-medium mb-2">Total price</p>
          <div className="flex items-baseline gap-2.5">
            <span
              className="font-heading text-4xl font-bold text-primary"
              style={{ textShadow: "0 0 32px rgba(232,114,12,0.3)" }}
            >
              {formatUSD(displayPrice)}
            </span>
            {breakdown?.xpDiff !== undefined && breakdown.xpDiff > 0 && (
              <span className="text-sm text-[var(--text-muted)]">
                {(breakdown.xpDiff / 1_000_000).toFixed(2)}M XP
              </span>
            )}
            {breakdown?.unitCount !== undefined && priceMatrix?.type === "per_unit" && (
              <span className="text-sm text-[var(--text-muted)]">
                {breakdown.unitCount} {(priceMatrix as PerUnitPriceMatrix).unit_label}
              </span>
            )}
          </div>
          {breakdown && (breakdown as { base?: number; afterMultipliers?: number; afterAddons?: number }).base != null && (
            <button
              type="button"
              onClick={() => setShowPriceBreakdown((b) => !b)}
              className="mt-2.5 text-xs text-[var(--text-muted)] hover:text-primary transition-colors flex items-center gap-1 group"
            >
              {showPriceBreakdown ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              <span className="group-hover:underline">{showPriceBreakdown ? "Hide" : "Show"} breakdown</span>
            </button>
          )}
          {showPriceBreakdown && breakdown && (() => {
            const b = breakdown as { base?: number; afterMultipliers?: number; afterAddons?: number; final?: number };
            if (b.base == null) return null;
            const baseVal = b.base;
            const afterMult = b.afterMultipliers ?? baseVal;
            const afterAddons = b.afterAddons ?? afterMult;
            const modifierDelta = afterMult - baseVal;
            const addonsDelta = afterAddons - afterMult;
            return (
              <div className="mt-3 pt-3 border-t border-[var(--border-subtle)] space-y-1.5 text-xs text-[var(--text-secondary)]">
                <div className="flex justify-between">
                  <span className="text-[var(--text-muted)]">Base</span>
                  <span>{formatUSD(baseVal)}</span>
                </div>
                {modifierDelta !== 0 && (
                  <div className="flex justify-between">
                    <span className="text-[var(--text-muted)]">Upcharges</span>
                    <span className={modifierDelta > 0 ? "text-primary" : "text-green-400"}>{modifierDelta > 0 ? "+" : ""}{formatUSD(modifierDelta)}</span>
                  </div>
                )}
                {addonsDelta > 0 && (
                  <div className="flex justify-between">
                    <span className="text-[var(--text-muted)]">Add-ons</span>
                    <span>+{formatUSD(addonsDelta)}</span>
                  </div>
                )}
                <div className="flex justify-between font-semibold text-[var(--text-primary)] pt-1 border-t border-[var(--border-subtle)]">
                  <span>Total</span>
                  <span className="text-primary">{formatUSD(b.final ?? totalPrice)}</span>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* Form */}
      <div className="p-5 space-y-5">
        {showValidation && !isValid && (
          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-sm text-amber-200 flex items-start gap-2">
            <span className="text-amber-400 mt-0.5">⚠</span>
            Please complete all required fields.
            {firstInvalidFieldId && " Scroll to see what&apos;s missing."}
          </div>
        )}

        {!isBossTiered && !perItemStatMatrix && gearSection && (
          <div className="pb-4 border-b border-[var(--border-default)]">
            {gearSection}
          </div>
        )}

        {/* ── XP-based ── */}
        {priceMatrix?.type === "xp_based" && (
          <>
            {/* Skill picker */}
            {skills.length > 1 && (
              <div id="field-skill" className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Skill</label>
                  {addedSkills.size > 0 && (
                    <span className="text-xs text-green-400">
                      {addedSkills.size} skill{addedSkills.size > 1 ? "s" : ""} in cart
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  {skills.map((s) => {
                    const isSelected = selections["skill"] === s.id;
                    const isInCart = addedSkills.has(s.id);
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => selectSkill(s.id)}
                        className={cn(
                          "relative flex items-center gap-1.5 px-2.5 py-2 rounded-lg border text-xs font-medium transition-all",
                          isSelected
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-[var(--border-default)] hover:border-primary/40 text-[var(--text-secondary)]"
                        )}
                      >
                        {(() => { const ic = resolveSkillIcon(s.id, s.icon); return ic ? ( // eslint-disable-next-line @next/next/no-img-element
                          <img src={ic} alt={s.label} width={16} height={16} className="object-contain flex-shrink-0" />) : null; })()}
                        <span className="truncate">{s.label}</span>
                        {isInCart && (
                          <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-green-400 flex items-center justify-center">
                            <Check className="h-2 w-2 text-white" />
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
                <p className="text-xs text-[var(--text-muted)]">
                  Configure each skill separately and add them to your cart individually.
                </p>
              </div>
            )}

            {/* Single skill badge */}
            {skills.length === 1 && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/5 border border-primary/20">
                {(() => { const ic = currentSkill ? resolveSkillIcon(currentSkill.id, currentSkill.icon) : null; return ic ? ( // eslint-disable-next-line @next/next/no-img-element
                  <img src={ic} alt={currentSkill?.label} width={20} height={20} className="object-contain flex-shrink-0" />) : null; })()}
                <span className="text-sm font-medium text-primary">{currentSkill?.label}</span>
              </div>
            )}

            {/* Route planner — always shown for xp_based */}
            <div id="field-route_segments">
              {selections["skill"] ? (
                <RoutePlanner
                  skillId={selections["skill"] as string}
                  matrix={xpMatrix!}
                  segments={routeSegments}
                  formFields={(formConfig?.fields ?? []).filter(
                    (f) => f.type !== "skill_range" && f.id !== "training_method" &&
                      !currentSkill?.tier_modifier_fields?.some((tmf) => tmf.id === f.id)
                  )}
                  onChange={(segs) => set("route_segments", segs)}
                />
              ) : (
                <p className="text-xs text-orange-400">Select a skill first.</p>
              )}
            </div>
          </>
        )}

        {/* ── Per item ── */}
        {priceMatrix?.type === "per_item" && (() => {
          const piMatrix = priceMatrix as PerItemPriceMatrix;
          const piTotal = Array.from(selectedPerItemIds).reduce((sum, id) => {
            const itm = piMatrix.items.find((x) => x.id === id);
            if (!itm) return sum;
            return sum + itm.price * Math.max(1, perItemQuantities[id] ?? 1);
          }, 0);

          return (
            <div className="space-y-1.5">
              {/* Header with Multiple toggle */}
              <div className="flex items-center justify-between gap-2">
                <label className="text-sm font-medium">
                  {perItemMultiMode ? "Select items" : "Select item"}{" "}
                  {!perItemMultiMode && <span className="text-destructive">*</span>}
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setPerItemMultiMode((v) => !v);
                    setSelectedPerItemIds(new Set());
                    setPerItemQuantities({});
                    setPerItemSearch("");
                  }}
                  className={cn(
                    "flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border transition-colors",
                    perItemMultiMode
                      ? "border-primary/50 bg-primary/10 text-primary"
                      : "border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--border-default)]"
                  )}
                >
                  <Layers className="h-3 w-3" />
                  {perItemMultiMode ? "Single" : "Multiple"}
                </button>
              </div>

              {!perItemMultiMode ? (
                /* ── Single mode ── */
                <>
                  <SearchableItemSelect
                    items={piMatrix.items}
                    value={(selections["item"] as string) ?? ""}
                    onChange={(id) => set("item", id)}
                    placeholder="— Select —"
                    formatPrice={formatUSD}
                    showDifficultyFilter={false}
                  />
                  {/* Quantity input */}
                  {selections["item"] && (
                    <div className="flex items-center gap-3 pt-1">
                      <label className="text-sm text-[var(--text-muted)] shrink-0">Quantity</label>
                      <ClearableNumberInput
                        value={(selections["quantity"] as number) ?? 1}
                        min={1}
                        max={9999}
                        onChange={(v) => set("quantity", v)}
                        className="w-28 h-9 rounded-lg border border-[var(--border-default)] bg-[var(--bg-elevated)] px-3 text-sm focus:outline-none focus:border-primary transition-colors"
                      />
                    </div>
                  )}
                </>
              ) : (
                /* ── Multi mode: product card grid (Image 1 style) ── */
                <div className="space-y-3">
                  {/* Toolbar row */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-[var(--text-muted)]">
                      {selectedPerItemIds.size > 0
                        ? `${selectedPerItemIds.size} of ${piMatrix.items.length} selected`
                        : `${piMatrix.items.length} items`}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedPerItemIds(new Set(piMatrix.items.map((i) => i.id)))}
                        className="text-xs text-[var(--text-muted)] hover:text-primary transition-colors"
                      >
                        Select all
                      </button>
                      <span className="text-[var(--border-default)]">·</span>
                      <button
                        type="button"
                        onClick={() => { setSelectedPerItemIds(new Set()); setPerItemQuantities({}); }}
                        className="text-xs text-[var(--text-muted)] hover:text-primary transition-colors"
                      >
                        Clear
                      </button>
                    </div>
                  </div>

                  {/* Search bar */}
                  <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border border-[var(--border-default)] bg-[var(--bg-elevated)]">
                    <Search className="h-4 w-4 text-[var(--text-muted)] shrink-0" />
                    <input
                      type="text"
                      value={perItemSearch}
                      onChange={(e) => setPerItemSearch(e.target.value)}
                      placeholder={`Search ${piMatrix.items.length} items…`}
                      className="flex-1 bg-transparent text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none"
                    />
                    {perItemSearch && (
                      <button type="button" onClick={() => setPerItemSearch("")} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Product card grid */}
                  <div className="grid grid-cols-2 gap-3">
                    {piMatrix.items
                      .filter((it) => !perItemSearch || it.label.toLowerCase().includes(perItemSearch.toLowerCase()))
                      .map((it) => {
                        const isChecked = selectedPerItemIds.has(it.id);
                        const qty = perItemQuantities[it.id] ?? 1;
                        const imgSrc = (it as { image_url?: string | null }).image_url ?? service.image_url ?? game.logo_url;
                        return (
                          <div
                            key={it.id}
                            className={cn(
                              "relative rounded-2xl border transition-all duration-200 overflow-hidden group",
                              isChecked
                                ? "border-primary shadow-md shadow-primary/15 bg-[var(--bg-card)]"
                                : "border-[var(--border-default)] bg-[var(--bg-card)] hover:border-primary/40 hover:shadow-sm"
                            )}
                          >
                            {/* Orange accent bar when selected */}
                            {isChecked && (
                              <div className="absolute top-0 left-0 right-0 h-0.5 bg-primary" />
                            )}

                            {/* Image area — clickable to toggle */}
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedPerItemIds((prev) => {
                                  const next = new Set(prev);
                                  if (next.has(it.id)) next.delete(it.id);
                                  else next.add(it.id);
                                  return next;
                                });
                              }}
                              className={cn(
                                "w-full flex items-center justify-center py-5 transition-colors",
                                isChecked
                                  ? "bg-gradient-to-b from-primary/8 to-[var(--bg-card)]"
                                  : "bg-gradient-to-b from-[var(--bg-elevated)] to-[var(--bg-card)] group-hover:from-primary/5"
                              )}
                            >
                              {imgSrc ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={imgSrc}
                                  alt={it.label}
                                  className="h-14 w-14 object-contain drop-shadow-sm"
                                />
                              ) : (
                                <div className={cn(
                                  "h-14 w-14 rounded-xl flex items-center justify-center text-2xl",
                                  isChecked ? "bg-primary/15" : "bg-[var(--bg-elevated)]"
                                )}>
                                  🎮
                                </div>
                              )}

                              {/* Checkmark overlay */}
                              {isChecked && (
                                <div className="absolute top-2.5 left-2.5 h-5 w-5 rounded-full bg-primary flex items-center justify-center shadow-sm">
                                  <Check className="h-3 w-3 text-white" />
                                </div>
                              )}
                            </button>

                            {/* Card content */}
                            <div className="px-2.5 pb-3 space-y-2.5">
                              {/* Title */}
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedPerItemIds((prev) => {
                                    const next = new Set(prev);
                                    if (next.has(it.id)) next.delete(it.id);
                                    else next.add(it.id);
                                    return next;
                                  });
                                }}
                                className="w-full text-left"
                              >
                                <p className={cn(
                                  "text-[13px] font-semibold leading-tight line-clamp-2 min-h-[2.4rem]",
                                  isChecked ? "text-primary" : "text-[var(--text-primary)] group-hover:text-primary transition-colors"
                                )}>
                                  {it.label}
                                </p>
                                {it.description && (
                                  <p className="text-[11px] text-[var(--text-muted)] line-clamp-1 mt-0.5">{it.description}</p>
                                )}
                              </button>

                              {/* Quantity + price + cart */}
                              <div className="flex items-center gap-1.5">
                                {/* Quantity stepper */}
                                <div className="flex items-center gap-1 rounded-lg border border-[var(--border-default)] bg-[var(--bg-elevated)] px-1 py-1">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setPerItemQuantities((prev) => ({ ...prev, [it.id]: Math.max(1, (prev[it.id] ?? 1) - 1) }));
                                    }}
                                    className="h-5 w-5 flex items-center justify-center text-[var(--text-muted)] hover:text-primary transition-colors text-sm font-bold rounded"
                                  >
                                    −
                                  </button>
                                  <span className="text-xs font-mono w-5 text-center text-[var(--text-primary)] font-semibold">{qty}</span>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setPerItemQuantities((prev) => ({ ...prev, [it.id]: (prev[it.id] ?? 1) + 1 }));
                                      if (!isChecked) setSelectedPerItemIds((prev) => { const next = new Set(prev); next.add(it.id); return next; });
                                    }}
                                    className="h-5 w-5 flex items-center justify-center text-[var(--text-muted)] hover:text-primary transition-colors text-sm font-bold rounded"
                                  >
                                    +
                                  </button>
                                </div>

                                {/* Price */}
                                <span className="text-xs font-bold text-[var(--text-primary)] flex-1 text-center">
                                  {formatUSD(it.price * qty)}
                                </span>

                                {/* Cart button */}
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedPerItemIds((prev) => { const next = new Set(prev); next.add(it.id); return next; });
                                  }}
                                  className={cn(
                                    "h-7 w-7 rounded-lg flex items-center justify-center transition-all shrink-0",
                                    isChecked
                                      ? "bg-primary text-white shadow-sm shadow-primary/30"
                                      : "bg-[var(--bg-elevated)] border border-[var(--border-default)] text-[var(--text-muted)] hover:bg-primary hover:text-white hover:border-primary"
                                  )}
                                >
                                  {isChecked ? <Check className="h-3.5 w-3.5" /> : <ShoppingCart className="h-3.5 w-3.5" />}
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}

                    {piMatrix.items.filter((it) => !perItemSearch || it.label.toLowerCase().includes(perItemSearch.toLowerCase())).length === 0 && (
                      <div className="col-span-2 py-10 text-center text-[var(--text-muted)]">
                        <p className="text-sm">No items match &ldquo;{perItemSearch}&rdquo;</p>
                      </div>
                    )}
                  </div>

                  {/* Footer: total + checkout actions */}
                  {selectedPerItemIds.size > 0 && (
                    <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-elevated)] px-4 py-3 space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-[var(--text-muted)]">{selectedPerItemIds.size} item{selectedPerItemIds.size > 1 ? "s" : ""} selected</span>
                        <span className="font-bold text-[var(--text-primary)] text-base">{formatUSD(piTotal)}</span>
                      </div>
                      <button
                        type="button"
                        onClick={handleAddMultiplePerItemToCart}
                        className={cn(
                          "w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold text-sm transition-all",
                          multiAdded > 0
                            ? "border border-green-400/40 bg-green-400/10 text-green-400"
                            : "bg-primary text-white hover:bg-primary/90 shadow-sm shadow-primary/25"
                        )}
                      >
                        {multiAdded > 0 ? (
                          <><Check className="h-4 w-4" />{multiAdded} item{multiAdded > 1 ? "s" : ""} added to cart!</>
                        ) : (
                          <><ShoppingCart className="h-4 w-4" />Add {selectedPerItemIds.size} item{selectedPerItemIds.size > 1 ? "s" : ""} to cart</>
                        )}
                      </button>
                      {multiAdded > 0 && (
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => router.push("/cart")}
                            className="flex items-center justify-center gap-1.5 py-2 rounded-xl border border-[var(--border-default)] text-xs font-medium text-[var(--text-secondary)] hover:border-primary/40 hover:text-[var(--text-primary)] transition-colors"
                          >
                            <ShoppingCart className="h-3.5 w-3.5" />
                            View cart
                          </button>
                          <button
                            type="button"
                            onClick={() => router.push("/checkout")}
                            className="flex items-center justify-center gap-1.5 py-2 rounded-xl bg-primary text-white text-xs font-semibold hover:bg-primary/90 transition-colors"
                          >
                            <Zap className="h-3.5 w-3.5" />
                            Checkout
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })()}

        {/* ── Per unit ── */}
        {priceMatrix?.type === "per_unit" && (
          <div className="space-y-1.5">
            <label className="text-sm font-medium">
              Number of {(priceMatrix as PerUnitPriceMatrix).unit_label}
            </label>
            <ClearableNumberInput
              value={(selections["quantity"] as number) ?? ((priceMatrix as PerUnitPriceMatrix).minimum_units ?? 1)}
              min={(priceMatrix as PerUnitPriceMatrix).minimum_units ?? 1}
              max={(priceMatrix as PerUnitPriceMatrix).maximum_units ?? 9999}
              onChange={(v) => set("quantity", v)}
              className="w-full h-10 rounded-lg border border-[var(--border-default)] bg-[var(--bg-elevated)] px-3 text-sm focus:outline-none focus:border-primary transition-colors"
            />
            {(priceMatrix as PerUnitPriceMatrix).minimum_units && (
              <p className="text-xs text-[var(--text-muted)]">
                Min. {(priceMatrix as PerUnitPriceMatrix).minimum_units}
                {(priceMatrix as PerUnitPriceMatrix).maximum_units
                  ? ` — Max. ${(priceMatrix as PerUnitPriceMatrix).maximum_units}`
                  : ""}
              </p>
            )}
          </div>
        )}

        {/* ── Gold tiered ── */}
        {priceMatrix?.type === "gold_tiered" && goldMatrix && (() => {
          const amount = Number(selections["gold_amount"] ?? goldMatrix.minimum_units ?? 1);
          const sortedTiers = [...goldMatrix.tiers].sort((a, b) => a.min_amount - b.min_amount);
          const activeTier = [...sortedTiers].reverse().find((t) => amount >= t.min_amount) ?? sortedTiers[0];

          return (
            <>
              {/* Amount input */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium">
                  Amount ({goldMatrix.unit_label}) <span className="text-destructive">*</span>
                </label>
                <ClearableNumberInput
                  value={amount}
                  min={goldMatrix.minimum_units ?? 1}
                  max={goldMatrix.maximum_units ?? 99999}
                  onChange={(v) => set("gold_amount", v)}
                  className="w-full h-10 rounded-lg border border-[var(--border-default)] bg-[var(--bg-elevated)] px-3 text-sm focus:outline-none focus:border-primary transition-colors"
                />
                <p className="text-xs text-[var(--text-muted)]">
                  Min. {goldMatrix.minimum_units ?? 1} {goldMatrix.unit_label}
                  {goldMatrix.maximum_units ? ` — Max. ${goldMatrix.maximum_units} ${goldMatrix.unit_label}` : ""}
                </p>
              </div>

              {/* Volume tiers breakdown */}
              {sortedTiers.length > 1 && (
                <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-elevated)] p-3 space-y-1.5">
                  <p className="text-xs font-medium text-[var(--text-muted)] flex items-center gap-1.5">
                    <TrendingDown className="h-3.5 w-3.5" /> Volume discounts
                  </p>
                  <div className="space-y-1">
                    {sortedTiers.map((tier, i) => {
                      const nextTier = sortedTiers[i + 1];
                      const range = nextTier
                        ? `${tier.min_amount}–${nextTier.min_amount - 1} ${goldMatrix.unit_label}`
                        : `${tier.min_amount}+ ${goldMatrix.unit_label}`;
                      const isActive = activeTier === tier;
                      return (
                        <div key={i} className={cn(
                          "flex items-center justify-between text-xs px-2 py-1 rounded-md transition-colors",
                          isActive ? "bg-primary/10 text-primary font-medium" : "text-[var(--text-muted)]"
                        )}>
                          <span>{range}</span>
                          <span>${tier.price_per_unit.toFixed(4)} / {goldMatrix.unit_label}</span>
                          {isActive && <span className="text-[10px] font-semibold bg-primary/20 text-primary px-1.5 py-0.5 rounded-full">Active</span>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Modifiers */}
              {(goldMatrix.modifiers ?? []).map((mod) => {
                const selKey = `gold_mod_${mod.id}`;
                if (mod.type === "select" || mod.type === "radio") {
                  return (
                    <div key={mod.id} className="space-y-1.5">
                      <label className="text-sm font-medium">{mod.label}{mod.required && <span className="text-destructive ml-0.5">*</span>}</label>
                      <div className="flex flex-wrap gap-2">
                        {(mod.options ?? []).map((opt) => {
                          const key = opt.value || opt.label;
                          const selected = selections[selKey] === key;
                          return (
                            <button key={key} type="button" onClick={() => set(selKey, key)}
                              className={cn("px-3 py-1.5 rounded-lg border text-sm transition-colors",
                                selected ? "border-primary bg-primary/10 text-primary" : "border-[var(--border-default)] bg-[var(--bg-elevated)] hover:border-primary/40")}>
                              {opt.label}
                              {opt.multiplier && opt.multiplier !== 1 && (
                                <span className="ml-1 text-[11px] text-[var(--text-muted)]">×{opt.multiplier}</span>
                              )}
                              {opt.price_add && opt.price_add > 0 && (
                                <span className="ml-1 text-[11px] text-[var(--text-muted)]">+${opt.price_add}</span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                }
                if (mod.type === "checkbox") {
                  return (
                    <label key={mod.id} className="flex items-center gap-2.5 cursor-pointer group">
                      <input type="checkbox" checked={!!selections[selKey]}
                        onChange={(e) => set(selKey, e.target.checked)}
                        className="h-4 w-4 rounded border-[var(--border-default)]" />
                      <span className="text-sm">{mod.label}</span>
                      {mod.multiplier && mod.multiplier !== 1 && (
                        <span className="text-xs text-[var(--text-muted)]">×{mod.multiplier}</span>
                      )}
                      {mod.price_add && mod.price_add > 0 && (
                        <span className="text-xs text-[var(--text-muted)]">+${mod.price_add}</span>
                      )}
                    </label>
                  );
                }
                return null;
              })}
            </>
          );
        })()}

        {/* ── Stat based ── */}
        {priceMatrix?.type === "stat_based" && statMatrix && (
          <StatCalculator
            matrix={statMatrix}
            selections={selections as StatSelections}
            onChange={(statSels) => setSelections((prev) => ({ ...prev, ...statSels }))}
            hidden={!!selectedLoadoutId}
          />
        )}

        {/* ── Per item + stat based (questing) ── */}
        {priceMatrix?.type === "per_item_stat_based" && perItemStatMatrix && (() => {
          const selectedItemId = selections["item"] as string | undefined;
          const selectedPackageId = selections["package_id"] as string | undefined;
          const selectedItem = perItemStatMatrix.items.find((i) => i.id === selectedItemId);
          const selectedPackage = perItemStatMatrix.packages?.find((p) => p.id === selectedPackageId);
          // Use per-quest/per-package stats if defined, else global stats
          const activeStats = (selectedPackage?.stats && selectedPackage.stats.length > 0)
            ? selectedPackage.stats
            : (selectedItem?.stats && selectedItem.stats.length > 0)
              ? selectedItem.stats
              : perItemStatMatrix.stats;
          const activeModifiers = selectedPackage?.modifiers ?? selectedItem?.modifiers ?? perItemStatMatrix.modifiers ?? [];

          return (
            <>
              {/* Quest picker header */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <label className="text-sm font-medium">
                    {multiMode ? "Select quests" : "Select quest or package"}{" "}
                    {!multiMode && <span className="text-destructive">*</span>}
                  </label>
                  <div className="flex items-center gap-1">
                    {!multiMode && (
                      <button
                        type="button"
                        title={listView ? "Switch to search dropdown" : "Switch to full overview"}
                        onClick={() => { setListView((v) => !v); setListSearch(""); }}
                        className={cn(
                          "flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border transition-colors",
                          listView
                            ? "border-primary/50 bg-primary/10 text-primary"
                            : "border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--border-default)]"
                        )}
                      >
                        {listView ? <Search className="h-3 w-3" /> : <LayoutList className="h-3 w-3" />}
                        {listView ? "Search" : "Browse"}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setMultiMode((v) => !v);
                        setListView(false);
                        setListSearch("");
                        setSelectedQuestIds(new Set());
                        setPerQuestMods({});
                        setExpandedQuestIds(new Set());
                        setSelections((prev) => ({ ...prev, item: undefined, package_id: undefined }));
                      }}
                      className={cn(
                        "flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border transition-colors",
                        multiMode
                          ? "border-primary/50 bg-primary/10 text-primary"
                          : "border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--border-default)]"
                      )}
                    >
                      <Layers className="h-3 w-3" />
                      {multiMode ? "Single" : "Multiple"}
                    </button>
                  </div>
                </div>

                {!multiMode ? (
                  <>
                    {!listView ? (
                      <SearchableItemSelect
                        items={perItemStatMatrix.items}
                        value={selectedPackageId ? "" : (selectedItemId ?? "")}
                        onChange={(newItemId) => {
                          const newItem = perItemStatMatrix.items.find((i) => i.id === newItemId);
                          const newStats = (newItem?.stats && newItem.stats.length > 0)
                            ? newItem.stats
                            : perItemStatMatrix.stats;
                          const statPrefills: Selections = {};
                          for (const stat of newStats) {
                            statPrefills[`stat_${stat.id}`] = stat.max;
                          }
                          setSelections((prev) => {
                            const next: Selections = {};
                            for (const k in prev) if (!k.startsWith("quest_mod_")) next[k] = prev[k];
                            return { ...next, item: newItemId, package_id: undefined, ...statPrefills };
                          });
                        }}
                        placeholder="— Search quests —"
                        formatPrice={formatUSD}
                        showDifficultyFilter
                      />
                    ) : (
                      /* ── Browse / list view ── */
                      <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] overflow-hidden">
                        {/* Search bar */}
                        <div className="flex items-center gap-2 px-3 py-2.5 border-b border-[var(--border-subtle)] bg-[var(--bg-elevated)]">
                          <Search className="h-3.5 w-3.5 text-[var(--text-muted)] shrink-0" />
                          <input
                            type="text"
                            value={listSearch}
                            onChange={(e) => setListSearch(e.target.value)}
                            placeholder={`Search ${perItemStatMatrix.items.length} quests…`}
                            className="flex-1 bg-transparent text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none"
                          />
                          {listSearch && (
                            <button type="button" onClick={() => setListSearch("")} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                              <X className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                        {/* Quest rows */}
                        <div className="max-h-72 overflow-y-auto divide-y divide-[var(--border-subtle)]">
                          {perItemStatMatrix.items
                            .filter((q) => !listSearch || q.label.toLowerCase().includes(listSearch.toLowerCase()))
                            .map((qItem) => {
                              const isSelected = selectedItemId === qItem.id && !selectedPackageId;
                              const price = questPrices[qItem.id] ?? qItem.price;
                              return (
                                <button
                                  key={qItem.id}
                                  type="button"
                                  onClick={() => {
                                    if (isSelected) {
                                      setSelections((prev) => {
                                        const next: Selections = {};
                                        for (const k in prev) if (!k.startsWith("quest_mod_")) next[k] = prev[k];
                                        return { ...next, item: undefined, package_id: undefined };
                                      });
                                      return;
                                    }
                                    const newStats = (qItem.stats && qItem.stats.length > 0) ? qItem.stats : perItemStatMatrix.stats;
                                    const statPrefills: Selections = {};
                                    for (const stat of newStats) statPrefills[`stat_${stat.id}`] = stat.max;
                                    setSelections((prev) => {
                                      const next: Selections = {};
                                      for (const k in prev) if (!k.startsWith("quest_mod_")) next[k] = prev[k];
                                      return { ...next, item: qItem.id, package_id: undefined, ...statPrefills };
                                    });
                                  }}
                                  className={cn(
                                    "w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors",
                                    isSelected ? "bg-primary/[0.08]" : "hover:bg-white/[0.04]"
                                  )}
                                >
                                  <div className={cn(
                                    "h-4 w-4 shrink-0 rounded-full border-2 flex items-center justify-center transition-colors",
                                    isSelected ? "border-primary bg-primary" : "border-[var(--border-default)]"
                                  )}>
                                    {isSelected && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-[var(--text-primary)] truncate">{qItem.label}</p>
                                    {qItem.description && (
                                      <p className="text-xs text-[var(--text-muted)] truncate mt-0.5">{qItem.description}</p>
                                    )}
                                  </div>
                                  <span className="text-xs font-medium text-primary shrink-0">{formatUSD(price)}</span>
                                </button>
                              );
                            })}
                          {perItemStatMatrix.items.filter((q) => !listSearch || q.label.toLowerCase().includes(listSearch.toLowerCase())).length === 0 && (
                            <p className="px-3 py-6 text-sm text-center text-[var(--text-muted)]">No quests match &ldquo;{listSearch}&rdquo;</p>
                          )}
                        </div>
                      </div>
                    )}
                    {(selectedItem && !selectedPackageId) && (
                      <p className="text-xs text-[var(--text-muted)]">
                        Base: {formatUSD(selectedItem.price)}
                        {activeStats.length > 0 && " — adjusted by your stats below"}
                      </p>
                    )}
                    {selectedPackage && (
                      <p className="text-xs text-[var(--text-muted)]">
                        Package: {formatUSD(questPrices[selectedPackage.id] ?? selectedPackage.base_price)}
                        {activeStats.length > 0 && " — adjusted by your stats below"}
                      </p>
                    )}

                    {/* Quest packages (multiple quests in one) */}
                    {(perItemStatMatrix.packages?.length ?? 0) > 0 && (
                      <div className="pt-2 space-y-1.5">
                        <p className="text-xs font-medium text-[var(--text-muted)]">Or choose a package</p>
                        <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] divide-y divide-[var(--border-subtle)] overflow-hidden">
                          {perItemStatMatrix.packages!.map((pkg) => {
                            const isSelected = selectedPackageId === pkg.id;
                            const price = questPrices[pkg.id] ?? pkg.base_price;
                            return (
                              <button
                                key={pkg.id}
                                type="button"
                                onClick={() => {
                                  if (isSelected) {
                                    setSelections((prev) => ({ ...prev, package_id: undefined }));
                                    return;
                                  }
                                  const pkgStats = (pkg.stats && pkg.stats.length > 0) ? pkg.stats : perItemStatMatrix.stats;
                                  const statPrefills: Selections = {};
                                  for (const stat of pkgStats) {
                                    statPrefills[`stat_${stat.id}`] = stat.max;
                                  }
                                  setSelections((prev) => {
                                    const next: Selections = {};
                                    for (const k in prev) if (!k.startsWith("quest_mod_")) next[k] = prev[k];
                                    return { ...next, package_id: pkg.id, item: undefined, ...statPrefills };
                                  });
                                }}
                                className={cn(
                                  "w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors",
                                  isSelected ? "bg-primary/[0.08]" : "hover:bg-white/[0.04]"
                                )}
                              >
                                <div className={cn(
                                  "h-4 w-4 shrink-0 rounded border flex items-center justify-center",
                                  isSelected ? "border-primary bg-primary" : "border-[var(--border-default)] bg-transparent"
                                )}>
                                  {isSelected && <Check className="h-2.5 w-2.5 text-white" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between gap-2">
                                    <p className="text-sm font-medium text-[var(--text-primary)]">{pkg.label}</p>
                                    <span className="text-sm font-semibold text-primary shrink-0">{formatUSD(price)}</span>
                                  </div>
                                  {pkg.description && (
                                    <p className="text-xs text-[var(--text-muted)] mt-0.5">{pkg.description}</p>
                                  )}
                                  {/* Quest names */}
                                  <div className="flex flex-wrap gap-1 mt-1.5">
                                    {pkg.quest_ids.map((qid) => {
                                      const qName = perItemStatMatrix.items.find((q) => q.id === qid)?.label ?? null;
                                      return qName ? (
                                        <span key={qid} className="text-[11px] px-1.5 py-0.5 rounded bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-[var(--text-muted)]">
                                          {qName}
                                        </span>
                                      ) : null;
                                    })}
                                  </div>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  /* ── Multi-quest checklist ── */
                  <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] overflow-hidden">
                    {/* Toolbar */}
                    <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-[var(--border-subtle)] bg-[var(--bg-elevated)]">
                      <span className="text-xs text-[var(--text-muted)]">
                        {selectedQuestIds.size > 0
                          ? `${selectedQuestIds.size} selected`
                          : `${perItemStatMatrix.items.length} quests`}
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedQuestIds(new Set(perItemStatMatrix.items.map((i) => i.id)))}
                          className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                        >
                          All
                        </button>
                        <span className="text-[var(--border-default)]">·</span>
                        <button
                          type="button"
                          onClick={() => setSelectedQuestIds(new Set())}
                          className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                        >
                          Clear
                        </button>
                      </div>
                    </div>

                    {/* Packages section in multi mode */}
                    {(perItemStatMatrix.packages?.length ?? 0) > 0 && (
                      <div className="border-b border-[var(--border-default)] bg-[var(--bg-elevated)/50]">
                        <p className="px-3 pt-2 pb-1 text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wide">Packages</p>
                        {perItemStatMatrix.packages!.map((pkg) => {
                          const isChecked = selectedQuestIds.has(`pkg:${pkg.id}`);
                          const price = questPrices[pkg.id] ?? pkg.base_price;
                          return (
                            <label
                              key={pkg.id}
                              className={cn(
                                "flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors select-none border-t border-[var(--border-subtle)]",
                                isChecked ? "bg-primary/[0.06]" : "hover:bg-white/[0.04]"
                              )}
                            >
                              <div className={cn(
                                "h-4 w-4 shrink-0 rounded border flex items-center justify-center transition-colors",
                                isChecked ? "border-primary bg-primary" : "border-[var(--border-default)]"
                              )}>
                                {isChecked && <Check className="h-2.5 w-2.5 text-white" />}
                              </div>
                              <input
                                type="checkbox"
                                className="sr-only"
                                checked={isChecked}
                                onChange={(e) => {
                                  setSelectedQuestIds((prev) => {
                                    const next = new Set(prev);
                                    if (e.target.checked) next.add(`pkg:${pkg.id}`);
                                    else next.delete(`pkg:${pkg.id}`);
                                    return next;
                                  });
                                }}
                              />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2">
                                  <p className="text-sm font-medium text-[var(--text-primary)]">{pkg.label}</p>
                                  <span className="text-xs font-medium text-primary shrink-0">{formatUSD(price)}</span>
                                </div>
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {pkg.quest_ids.map((qid) => {
                                    const qName = perItemStatMatrix.items.find((q) => q.id === qid)?.label ?? null;
                                    return qName ? (
                                      <span key={qid} className="text-[11px] px-1.5 py-0.5 rounded bg-[var(--bg-card)] border border-[var(--border-subtle)] text-[var(--text-muted)]">
                                        {qName}
                                      </span>
                                    ) : null;
                                  })}
                                </div>
                              </div>
                            </label>
                          );
                        })}
                        <p className="px-3 pt-2 pb-1 text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wide">Individual quests</p>
                      </div>
                    )}

                    {/* Search bar in multi-mode */}
                    <div className="flex items-center gap-2 px-3 py-2 border-b border-[var(--border-subtle)] bg-[var(--bg-elevated)]">
                      <Search className="h-3.5 w-3.5 text-[var(--text-muted)] shrink-0" />
                      <input
                        type="text"
                        value={listSearch}
                        onChange={(e) => setListSearch(e.target.value)}
                        placeholder={`Search ${perItemStatMatrix.items.length} quests…`}
                        className="flex-1 bg-transparent text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none"
                      />
                      {listSearch && (
                        <button type="button" onClick={() => setListSearch("")} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Quest list */}
                    <div className="max-h-[28rem] overflow-y-auto divide-y divide-[var(--border-subtle)]">
                      {perItemStatMatrix.items
                        .map((qItem, origIdx) => ({ qItem, origIdx }))
                        .filter(({ qItem }) => !listSearch || qItem.label.toLowerCase().includes(listSearch.toLowerCase()))
                        .map(({ qItem, origIdx }) => {
                        // Use origIdx as guaranteed-unique key (qItem.id may be empty or duplicate)
                        const stateKey = String(origIdx);
                        const isChecked = selectedQuestIds.has(qItem.id);
                        // Use multiModeQuestPrices (index-keyed, includes per-quest upcharges)
                        const price = multiModeQuestPrices[stateKey] ?? questPrices[qItem.id] ?? qItem.price;
                        const questMods = (qItem.modifiers && qItem.modifiers.length > 0)
                          ? qItem.modifiers
                          : (perItemStatMatrix.modifiers ?? []);
                        const hasMods = questMods.length > 0;
                        // Auto-expand when checked, unless user manually collapsed it; unchecked quests default collapsed
                        const isExpanded = isChecked
                          ? !expandedQuestIds.has(`collapsed:${stateKey}`)
                          : expandedQuestIds.has(stateKey);
                        const questModSels = perQuestMods[stateKey] ?? {};
                        return (
                          <div key={stateKey} className={cn(isChecked ? "bg-primary/[0.06]" : "")}>
                            {/* Quest row */}
                            <div className={cn(
                              "flex items-center gap-3 px-3 py-2.5 transition-colors",
                              !isChecked && "hover:bg-white/[0.04]"
                            )}>
                              {/* Checkbox */}
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedQuestIds((prev) => {
                                    const next = new Set(prev);
                                    if (next.has(qItem.id)) next.delete(qItem.id);
                                    else next.add(qItem.id);
                                    return next;
                                  });
                                }}
                                className="flex items-center gap-3 flex-1 text-left min-w-0"
                              >
                                <div className={cn(
                                  "h-4 w-4 shrink-0 rounded border flex items-center justify-center transition-colors",
                                  isChecked ? "border-primary bg-primary" : "border-[var(--border-default)] bg-transparent"
                                )}>
                                  {isChecked && <Check className="h-2.5 w-2.5 text-white" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-[var(--text-primary)] truncate">{qItem.label}</p>
                                  {qItem.description && (
                                    <p className="text-xs text-[var(--text-muted)] truncate mt-0.5">{qItem.description}</p>
                                  )}
                                </div>
                                <span className="text-xs font-medium text-primary shrink-0">{formatUSD(price)}</span>
                              </button>
                              {/* Upcharges collapse/expand button — only when quest is checked */}
                              {hasMods && isChecked && (
                                <button
                                  type="button"
                                  onClick={() => setExpandedQuestIds((prev) => {
                                    const next = new Set(prev);
                                    // When checked: default is expanded; clicking manually collapses/re-expands
                                    if (next.has(`collapsed:${stateKey}`)) next.delete(`collapsed:${stateKey}`);
                                    else next.add(`collapsed:${stateKey}`);
                                    return next;
                                  })}
                                  title={expandedQuestIds.has(`collapsed:${stateKey}`) ? "Show upcharges" : "Hide upcharges"}
                                  className="shrink-0 p-1 rounded text-[var(--text-muted)] hover:text-primary hover:bg-primary/10 transition-colors"
                                >
                                  {expandedQuestIds.has(`collapsed:${stateKey}`) ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
                                </button>
                              )}
                            </div>
                            {/* Inline upcharge fields */}
                            {hasMods && isExpanded && (
                              <div className="px-3 pb-3 space-y-2 border-t border-[var(--border-subtle)] bg-[var(--bg-elevated)]/50">
                                <p className="text-[10px] text-[var(--text-muted)] pt-2 font-medium uppercase tracking-wide">Upcharges for {qItem.label}</p>
                                {questMods.map((mod, modIdx) => {
                                  const posKey = `pos${modIdx}`;
                                  const val = questModSels[posKey];
                                  const setVal = (v: unknown) => setPerQuestMods((prev) => ({
                                    ...prev,
                                    [stateKey]: { ...(prev[stateKey] ?? {}), [posKey]: v },
                                  }));
                                  return (
                                    <div key={modIdx}>
                                      {mod.type !== "checkbox" && (
                                        <p className="text-xs font-medium text-[var(--text-secondary)] mb-1">
                                          {mod.label}{mod.required && <span className="text-destructive ml-0.5">*</span>}
                                        </p>
                                      )}
                                      {mod.type === "checkbox" && (
                                        <button
                                          type="button"
                                          onClick={() => setVal(!(val as boolean))}
                                          className={cn(
                                            "w-full px-2.5 py-2 rounded-lg border text-xs font-medium transition-all text-left flex items-center gap-2",
                                            val
                                              ? "border-primary bg-primary/10 text-primary"
                                              : "border-[var(--border-default)] hover:border-primary/40 text-[var(--text-secondary)]"
                                          )}
                                        >
                                          <span className={cn(
                                            "h-3 w-3 rounded border shrink-0 flex items-center justify-center text-[9px]",
                                            val ? "bg-primary border-primary text-white" : "border-current"
                                          )}>{!!val && "✓"}</span>
                                          <span className="flex-1">{mod.label}</span>
                                          {mod.multiplier && mod.multiplier !== 1 && (
                                            <span className="opacity-60">×{mod.multiplier} (+{Math.round((mod.multiplier - 1) * 100)}%)</span>
                                          )}
                                          {mod.price_add ? <span className="opacity-60">+${mod.price_add}</span> : null}
                                        </button>
                                      )}
                                      {mod.type === "radio" && (
                                        <div className="flex flex-wrap gap-1.5">
                                          {mod.options?.map((opt) => {
                                            const key = opt.value || opt.label;
                                            const isSel = val === key;
                                            return (
                                              <button key={key} type="button"
                                                onClick={() => setVal(isSel ? "" : key)}
                                                className={cn(
                                                  "px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all",
                                                  isSel ? "border-primary bg-primary/10 text-primary" : "border-[var(--border-default)] hover:border-primary/40 text-[var(--text-secondary)]"
                                                )}>
                                                {opt.label}
                                                {opt.multiplier && opt.multiplier !== 1 && <span className="ml-1 opacity-60">×{opt.multiplier}</span>}
                                              </button>
                                            );
                                          })}
                                        </div>
                                      )}
                                      {mod.type === "select" && (
                                        <select value={(val as string) ?? ""} onChange={(e) => setVal(e.target.value)}
                                          className="w-full h-8 rounded-lg border border-[var(--border-default)] bg-[var(--bg-elevated)] px-2 text-xs focus:outline-none focus:border-primary transition-colors">
                                          <option value="">— Select —</option>
                                          {mod.options?.map((opt) => {
                                            const key = opt.value || opt.label;
                                            return <option key={key} value={key}>{opt.label}{opt.multiplier && opt.multiplier !== 1 ? ` (+${Math.round((opt.multiplier - 1) * 100)}%)` : ""}</option>;
                                          })}
                                        </select>
                                      )}
                                      {mod.type === "multi_select" && (
                                        <div className="flex flex-wrap gap-1.5">
                                          {mod.options?.map((opt) => {
                                            const key = opt.value || opt.label;
                                            const cur = (val as string[]) ?? [];
                                            const isSel = cur.includes(key);
                                            return (
                                              <button key={key} type="button"
                                                onClick={() => setVal(isSel ? cur.filter((v) => v !== key) : [...cur, key])}
                                                className={cn(
                                                  "px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all flex items-center gap-1",
                                                  isSel ? "border-primary bg-primary/10 text-primary" : "border-[var(--border-default)] hover:border-primary/40 text-[var(--text-secondary)]"
                                                )}>
                                                {isSel && <Check className="h-2.5 w-2.5" />}
                                                {opt.label}
                                              </button>
                                            );
                                          })}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Footer: totaal + add button */}
                    {selectedQuestIds.size > 0 && (
                      <div className="px-3 py-3 border-t border-[var(--border-default)] bg-[var(--bg-elevated)] space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-[var(--text-muted)]">Total</span>
                          <span className="font-semibold text-[var(--text-primary)]">
                            {formatUSD(
                              Array.from(selectedQuestIds).reduce((sum, id) => {
                                if (id.startsWith("pkg:")) {
                                  const pkg = perItemStatMatrix.packages?.find((p) => p.id === id.slice(4));
                                  return sum + (pkg ? (questPrices[pkg.id] ?? pkg.base_price) : 0);
                                }
                                // Use index-keyed multiModeQuestPrices to include per-quest upcharges
                                const idx = perItemStatMatrix.items.findIndex((q) => q.id === id);
                                return sum + (idx >= 0
                                  ? (multiModeQuestPrices[String(idx)] ?? questPrices[id] ?? 0)
                                  : (questPrices[id] ?? 0));
                              }, 0)
                            )}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={handleAddMultipleToCart}
                          className={cn(
                            "w-full flex items-center justify-center gap-2 py-2.5 rounded-lg font-medium text-sm transition-all",
                            multiAdded > 0
                              ? "border border-green-400/40 bg-green-400/10 text-green-400"
                              : "bg-primary text-white hover:bg-primary/90"
                          )}
                        >
                          {multiAdded > 0 ? (
                            <><Check className="h-4 w-4" />{multiAdded} quest{multiAdded > 1 ? "s" : ""} added!</>
                          ) : (
                            <><ShoppingCart className="h-4 w-4" />Add {selectedQuestIds.size} quest{selectedQuestIds.size > 1 ? "s" : ""} to cart</>
                          )}
                        </button>
                        {multiAdded > 0 && (
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              onClick={() => router.push("/cart")}
                              className="flex items-center justify-center gap-1.5 py-2 rounded-lg border border-[var(--border-default)] text-xs font-medium text-[var(--text-secondary)] hover:border-primary/40 hover:text-[var(--text-primary)] transition-colors"
                            >
                              <ShoppingCart className="h-3.5 w-3.5" />
                              View cart
                            </button>
                            <button
                              type="button"
                              onClick={() => router.push("/checkout")}
                              className="flex items-center justify-center gap-1.5 py-2 rounded-lg bg-primary text-white text-xs font-semibold hover:bg-primary/90 transition-colors"
                            >
                              <Zap className="h-3.5 w-3.5" />
                              Checkout
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Per-quest/per-package or global stats */}
              {(selectedItem || selectedPackage || multiMode) && activeStats.length > 0 && !selectedLoadoutId && (
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Account stats</label>
                  <p className="text-xs text-[var(--text-muted)]">Higher stats = lower price.</p>
                  <StatCalculator
                    matrix={{ type: "stat_based", base_price: 0, stats: activeStats }}
                    selections={selections as StatSelections}
                    onChange={(statSels) => setSelections((prev) => ({ ...prev, ...statSels }))}
                  />
                </div>
              )}

              {/* Per-quest/per-package modifiers — in multi-mode zijn deze inline per quest */}
              {(selectedItem || selectedPackage) && !multiMode && activeModifiers.length > 0 && activeModifiers.map((mod, modIdx) => {
                // Always include position index to guarantee uniqueness even when IDs are duplicate or empty
                const selKey = `quest_mod_pos${modIdx}`;
                return (
                  <div key={modIdx} className="space-y-1.5">
                    {mod.type !== "checkbox" && (
                      <p className="text-sm font-medium flex items-center gap-1">
                        {mod.label}
                        {mod.required && <span className="text-destructive">*</span>}
                      </p>
                    )}

                    {/* Radio: single choice as buttons */}
                    {mod.type === "radio" && (
                      <div className="grid grid-cols-2 gap-2">
                        {mod.options?.map((opt) => {
                          const key = opt.value || opt.label;
                          const isSelected = selections[selKey] === key;
                          return (
                            <button key={key} type="button"
                              onClick={() => set(selKey, isSelected ? "" : key)}
                              className={cn(
                                "px-3 py-2.5 rounded-lg border text-sm font-medium transition-all text-left",
                                isSelected
                                  ? "border-primary bg-primary/10 text-primary"
                                  : "border-[var(--border-default)] hover:border-primary/40 text-[var(--text-secondary)]"
                              )}>
                              <span>{opt.label}</span>
                              {opt.multiplier && opt.multiplier !== 1 && (
                                <span className="text-xs ml-1 opacity-60">×{opt.multiplier}</span>
                              )}
                              {opt.price_add ? <span className="text-xs ml-1 opacity-60">+${opt.price_add}</span> : null}
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {/* Select: dropdown */}
                    {mod.type === "select" && (
                      <select
                        value={(selections[selKey] as string) ?? ""}
                        onChange={(e) => set(selKey, e.target.value)}
                        className="w-full h-10 rounded-lg border border-[var(--border-default)] bg-[var(--bg-elevated)] px-3 text-sm focus:outline-none focus:border-primary transition-colors"
                      >
                        <option value="">— Select —</option>
                        {mod.options?.map((opt) => {
                          const key = opt.value || opt.label;
                          return (
                            <option key={key} value={key}>
                              {opt.label}
                              {opt.multiplier && opt.multiplier !== 1 ? ` (×${opt.multiplier})` : ""}
                              {opt.price_add ? ` (+$${opt.price_add})` : ""}
                            </option>
                          );
                        })}
                      </select>
                    )}

                    {/* Multi-select: multiple options as toggle buttons */}
                    {mod.type === "multi_select" && (
                      <div className="grid grid-cols-2 gap-2">
                        {mod.options?.map((opt) => {
                          const key = opt.value || opt.label;
                          const current = (selections[selKey] as string[]) ?? [];
                          const isSelected = current.includes(key);
                          return (
                            <button key={key} type="button"
                              onClick={() => {
                                const next = isSelected
                                  ? current.filter((v) => v !== key)
                                  : [...current, key];
                                set(selKey, next);
                              }}
                              className={cn(
                                "px-3 py-2.5 rounded-lg border text-sm font-medium transition-all text-left flex items-start gap-2",
                                isSelected
                                  ? "border-primary bg-primary/10 text-primary"
                                  : "border-[var(--border-default)] hover:border-primary/40 text-[var(--text-secondary)]"
                              )}>
                              <span className={cn(
                                "mt-0.5 h-3.5 w-3.5 rounded border shrink-0 flex items-center justify-center text-[10px]",
                                isSelected ? "bg-primary border-primary text-white" : "border-current"
                              )}>
                                {isSelected && "✓"}
                              </span>
                              <span className="flex-1">
                                {opt.label}
                                {opt.multiplier && opt.multiplier !== 1 && (
                                  <span className="text-xs ml-1 opacity-60">×{opt.multiplier}</span>
                                )}
                                {opt.price_add ? <span className="text-xs ml-1 opacity-60">+\${opt.price_add}</span> : null}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {/* Checkbox: toggle button (geen <input> om browser-associatie bugs te vermijden) */}
                    {mod.type === "checkbox" && (() => {
                      const isChecked = (selections[selKey] as boolean) ?? false;
                      return (
                        <button
                          type="button"
                          onClick={() => set(selKey, !isChecked)}
                          className={cn(
                            "w-full px-3 py-2.5 rounded-lg border text-sm font-medium transition-all text-left flex items-center gap-2.5",
                            isChecked
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-[var(--border-default)] hover:border-primary/40 text-[var(--text-secondary)]"
                          )}
                        >
                          <span className={cn(
                            "h-3.5 w-3.5 rounded border shrink-0 flex items-center justify-center text-[10px]",
                            isChecked ? "bg-primary border-primary text-white" : "border-current"
                          )}>
                            {isChecked && "✓"}
                          </span>
                          <span className="flex-1">
                            {mod.label}
                            {mod.required && <span className="text-destructive ml-0.5">*</span>}
                            {mod.price_add ? (
                              <span className="text-xs opacity-60 ml-1.5">+{formatUSD(mod.price_add)}</span>
                            ) : mod.multiplier && mod.multiplier !== 1 ? (
                              <span className="text-xs opacity-60 ml-1.5">×{mod.multiplier}</span>
                            ) : null}
                          </span>
                        </button>
                      );
                    })()}
                  </div>
                );
              })}
            </>
          );
        })()}

        {/* ── Boss tiered ── */}
        {priceMatrix?.type === "boss_tiered" && bossTieredMatrix && (() => {
          const selectedBossId = selections["boss"] as string | undefined;
          const selectedBoss = bossPricingInsights?.selectedBoss;
          const activeStats = bossPricingInsights?.statSummaries ?? [];
          const activeModifiers = (selectedBoss?.modifiers && selectedBoss.modifiers.length > 0)
            ? selectedBoss.modifiers
            : (bossTieredMatrix.modifiers ?? []);
          const activeLoadoutMods = bossPricingInsights?.activeLoadoutMods ?? [];
          const showGearSection = activeStats.length > 0 || activeLoadoutMods.length > 0;

          const unitLabel = bossPricingInsights?.unitLabel ?? bossTieredMatrix.unit_label ?? "kills";
          const kills = bossPricingInsights?.kills ?? Number(selections["kills"] ?? bossTieredMatrix.minimum_kills ?? 1);
          const killTiers = selectedBoss?.kill_tiers ?? [];
          const activeTier = bossPricingInsights?.activeTier
            ?? killTiers.find((t) => kills >= t.min_kills && kills <= t.max_kills)
            ?? killTiers[killTiers.length - 1];

          return (
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.95fr)] xl:items-start">
              <div className="space-y-4">
              {/* Boss selector — product card grid */}
              {bossTieredMatrix.bosses.length > 0 && (
                <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] overflow-hidden">
                  <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-[var(--border-subtle)] bg-gradient-to-r from-primary/[0.08] to-transparent">
                    <div>
                      <p className="text-sm font-semibold text-[var(--text-primary)]">Choose boss</p>
                      <p className="text-[11px] text-[var(--text-muted)] mt-0.5">Select the exact service variant.</p>
                    </div>
                    <span className="text-[10px] rounded-full border border-[var(--border-default)] bg-[var(--bg-elevated)] px-2 py-1 text-[var(--text-muted)] shrink-0 text-right max-w-[140px] leading-tight">
                      {bossSearch.trim()
                        ? `${filteredBossTieredBosses.length}/${bossTieredMatrix.bosses.length} shown`
                        : `${bossTieredMatrix.bosses.length} option${bossTieredMatrix.bosses.length !== 1 ? "s" : ""}`}
                    </span>
                  </div>

                  {bossTieredMatrix.bosses.length > 4 && (
                    <div className="flex items-center gap-2.5 px-4 py-2.5 border-b border-[var(--border-subtle)] bg-[var(--bg-card)]">
                      <Search className="h-4 w-4 text-[var(--text-muted)] shrink-0" />
                      <input
                        type="search"
                        value={bossSearch}
                        onChange={(e) => setBossSearch(e.target.value)}
                        placeholder={`Search ${bossTieredMatrix.bosses.length} bosses…`}
                        autoComplete="off"
                        className="flex-1 min-w-0 bg-transparent text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none"
                      />
                      {bossSearch.trim() && (
                        <button
                          type="button"
                          onClick={() => setBossSearch("")}
                          className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors shrink-0"
                          aria-label="Clear boss search"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  )}

                  {/* Quantity — directly under header so it stays visible above the scrollable boss list */}
                  <div className="px-4 py-3 border-b border-[var(--border-subtle)] bg-[var(--bg-elevated)]/25 space-y-2">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
                      <div className="space-y-1.5 min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <label className="text-sm font-medium">Number of {unitLabel}</label>
                          {selectedBoss && activeTier && (
                            <span className="text-xs text-[var(--text-muted)] shrink-0">
                              {formatUSD(activeTier.price_per_kill)}/{unitLabel.replace(/s$/, "")}
                              {killTiers.length > 1 && (
                                <span className="ml-1 text-primary">
                                  ({activeTier.min_kills}–{activeTier.max_kills === 999999 ? "∞" : activeTier.max_kills} {unitLabel})
                                </span>
                              )}
                            </span>
                          )}
                        </div>
                        <ClearableNumberInput
                          value={kills}
                          min={bossTieredMatrix.minimum_kills ?? 1}
                          max={bossTieredMatrix.maximum_kills ?? 10000}
                          onChange={(v) => set("kills", v)}
                          className="w-full max-w-[200px] h-10 rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)] px-3 text-sm focus:outline-none focus:border-primary transition-colors"
                        />
                      </div>
                      {!selectedBoss ? (
                        <p className="text-[11px] text-[var(--text-muted)] sm:max-w-[220px] sm:text-right sm:pb-0.5">
                          Pick a boss below — pricing tiers apply per boss.
                        </p>
                      ) : (
                        <p className="text-[11px] text-[var(--text-muted)] sm:max-w-[240px] sm:text-right sm:pb-0.5">
                          <span className="font-medium text-[var(--text-secondary)]">{selectedBoss.label}</span>
                          {" · "}adjust quantity anytime; tier rates update automatically.
                        </p>
                      )}
                    </div>
                    {killTiers.length > 1 && selectedBoss && (
                      <div className="flex gap-2 flex-wrap pt-0.5">
                        {killTiers.map((tier, i) => {
                          const isActiveTier = kills >= tier.min_kills && kills <= tier.max_kills;
                          return (
                            <span key={i} className={cn(
                              "text-[10px] px-2 py-0.5 rounded-full border transition-colors",
                              isActiveTier
                                ? "border-primary bg-primary/10 text-primary font-semibold"
                                : "border-[var(--border-default)] text-[var(--text-muted)]"
                            )}>
                              {tier.min_kills}–{tier.max_kills === 999999 ? "∞" : tier.max_kills}: {formatUSD(tier.price_per_kill)}/{unitLabel.replace(/s$/, "")}
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div className="max-h-[min(440px,52vh)] overflow-y-auto overscroll-y-contain [scrollbar-gutter:stable]">
                  <div className="grid grid-cols-2 gap-3 p-3">
                    {filteredBossTieredBosses.length === 0 ? (
                      <div className="col-span-2 flex flex-col items-center justify-center py-12 px-4 text-center text-[var(--text-muted)]">
                        <p className="text-sm">No bosses match &ldquo;{bossSearch.trim()}&rdquo;</p>
                        <button
                          type="button"
                          onClick={() => setBossSearch("")}
                          className="text-xs text-primary hover:underline mt-2"
                        >
                          Clear search
                        </button>
                      </div>
                    ) : null}
                    {filteredBossTieredBosses.map((boss) => {
                      const isActive = selectedBossId === boss.id;
                      const bossImg = boss.image_url ?? service.image_url ?? game.logo_url;
                      return (
                        <button key={boss.id} type="button"
                          onClick={() => {
                            const statPrefills: Selections = {};
                            const newStats = (boss.stats && boss.stats.length > 0) ? boss.stats : (bossTieredMatrix.stats ?? []);
                            for (const stat of newStats) {
                              statPrefills[`stat_${stat.id}`] = stat.max;
                            }
                            setSelections((prev) => {
                              const next: Selections = { ...prev };
                              for (const k of Object.keys(next)) {
                                if (k.startsWith("boss_mod_")) delete next[k];
                              }
                              return {
                                ...next,
                                boss: boss.id,
                                kills: bossTieredMatrix.minimum_kills ?? 1,
                                ...statPrefills,
                              };
                            });
                          }}
                          className={cn(
                            "relative rounded-2xl border text-left transition-all duration-200 overflow-hidden group",
                            isActive
                              ? "border-primary bg-primary/[0.055] shadow-lg shadow-primary/20 -translate-y-0.5"
                              : "border-[var(--border-default)] bg-[var(--bg-elevated)]/45 hover:border-primary/35 hover:bg-[var(--bg-elevated)] hover:shadow-lg hover:shadow-primary/10 hover:-translate-y-0.5"
                          )}
                        >
                          {/* Orange top accent */}
                          {isActive && (
                            <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary via-[var(--color-accent)] to-primary" />
                          )}

                          {/* Image area */}
                          <div className={cn(
                            "relative flex items-center justify-center py-5 transition-colors",
                            isActive
                              ? "bg-gradient-to-b from-primary/8 to-[var(--bg-card)]"
                              : "bg-gradient-to-b from-[var(--bg-elevated)] to-[var(--bg-card)] group-hover:from-primary/5"
                          )}>
                            {bossImg ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={bossImg}
                                alt={boss.label}
                                className="h-14 w-14 object-contain drop-shadow-sm transition-transform duration-200 group-hover:scale-105"
                              />
                            ) : (
                              <div className={cn(
                                "h-14 w-14 rounded-xl flex items-center justify-center text-2xl transition-transform duration-200 group-hover:scale-105",
                                isActive ? "bg-primary/15" : "bg-[var(--bg-elevated)]"
                              )}>
                                ⚔️
                              </div>
                            )}
                            {isActive && (
                              <span className="absolute top-2.5 right-2.5 h-5 w-5 rounded-full bg-primary text-white flex items-center justify-center shadow-sm shadow-primary/30">
                                <Check className="h-3 w-3" />
                              </span>
                            )}
                          </div>

                          {/* Card content */}
                          <div className="px-3 pb-3.5 space-y-2">
                            <p className={cn(
                              "text-[13px] font-semibold leading-tight line-clamp-2 min-h-[2.4rem]",
                              isActive ? "text-primary" : "text-[var(--text-primary)] group-hover:text-primary transition-colors"
                            )}>
                              {boss.label}
                            </p>
                            {boss.description && (
                              <p className="text-[11px] text-[var(--text-muted)] line-clamp-2 leading-relaxed">{boss.description}</p>
                            )}
                            <div className="flex items-center justify-between gap-1 pt-0.5">
                              {boss.kill_tiers.length > 0 ? (
                                <span className="leading-tight">
                                  <span className="block text-[9px] uppercase tracking-wide text-[var(--text-muted)]">Starts at</span>
                                  <span className="text-xs font-bold text-primary">{formatUSD(boss.kill_tiers[0].price_per_kill)}<span className="font-normal text-[var(--text-muted)]">/{unitLabel.replace(/s$/, "")}</span></span>
                                </span>
                              ) : (
                                <span />
                              )}
                              <span className={cn(
                                "text-[10px] font-semibold px-2 py-1 rounded-full border transition-all shrink-0",
                                isActive
                                  ? "border-primary/50 bg-primary text-white shadow-sm shadow-primary/25"
                                  : "border-[var(--border-subtle)] text-[var(--text-muted)] group-hover:border-primary/30"
                              )}>
                                {isActive ? "Selected" : "Select"}
                              </span>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  </div>
                </div>
              )}

              {/* Stats (combat level etc.) */}
              {activeStats.length > 0 && !selectedLoadoutId && (
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Account stats</label>
                  <StatCalculator
                    key={selectedBossId ?? "global"}
                    matrix={{ type: "stat_based", base_price: 0, stats: activeStats.map((stat) => ({
                      id: stat.id,
                      label: stat.label,
                      min: selectedBoss?.stats?.find((item) => item.id === stat.id)?.min
                        ?? (bossTieredMatrix.stats ?? []).find((item) => item.id === stat.id)?.min
                        ?? 1,
                      max: selectedBoss?.stats?.find((item) => item.id === stat.id)?.max
                        ?? (bossTieredMatrix.stats ?? []).find((item) => item.id === stat.id)?.max
                        ?? 99,
                      thresholds: selectedBoss?.stats?.find((item) => item.id === stat.id)?.thresholds
                        ?? (bossTieredMatrix.stats ?? []).find((item) => item.id === stat.id)?.thresholds
                        ?? [],
                    })) }}
                    selections={Object.fromEntries(
                      activeStats.map((s) => [`stat_${s.id}`, (selections[`stat_${s.id}`] as number) ?? s.value])
                    ) as StatSelections}
                    onChange={(vals) => {
                      setSelections((prev) => ({ ...prev, ...vals }));
                    }}
                  />
                </div>
              )}

              {/* Modifiers */}
              {activeModifiers.length > 0 && (
                <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] overflow-hidden">
                  <div className="px-4 py-3 border-b border-[var(--border-subtle)] bg-gradient-to-r from-primary/[0.06] to-transparent">
                    <p className="text-sm font-semibold text-[var(--text-primary)]">Boss options</p>
                    <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                      Select anything your account is missing.
                    </p>
                  </div>
                  <div className="p-3 space-y-3">
                    {activeModifiers.map((mod) => {
                      const selKey = `boss_mod_${mod.id}`;
                      return (
                        <div key={mod.id} className="space-y-2">
                          {(mod.type !== "checkbox" || mod.options?.length) && (
                            <label className="text-xs font-semibold text-[var(--text-secondary)] flex items-center gap-1">
                              {mod.label}
                              {mod.required && <span className="text-destructive">*</span>}
                            </label>
                          )}
                          {mod.type === "radio" && (
                            <div className="grid grid-cols-2 gap-2">
                              {mod.options?.map((opt) => {
                                const key = opt.value || opt.label;
                                const active = selections[selKey] === key;
                                return (
                                  <button key={key} type="button"
                                    onClick={() => set(selKey, active ? "" : key)}
                                    className={cn(
                                      "rounded-xl border px-3 py-2.5 text-left transition-all",
                                      active
                                        ? "border-primary bg-primary/10 text-primary shadow-sm shadow-primary/10"
                                        : "border-[var(--border-default)] bg-[var(--bg-elevated)]/45 hover:border-primary/35 text-[var(--text-secondary)]"
                                    )}
                                  >
                                    <span className="flex items-center justify-between gap-2 text-xs font-semibold">
                                      {opt.label}
                                      {active && <Check className="h-3.5 w-3.5 shrink-0" />}
                                    </span>
                                    {opt.multiplier && opt.multiplier !== 1 && (
                                      <span className="mt-1 block text-[10px] text-[var(--text-muted)]">
                                        {opt.multiplier > 1 ? "+" : "-"}{Math.round(Math.abs(opt.multiplier - 1) * 100)}%
                                      </span>
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                          {mod.type === "select" && (
                            <select value={(selections[selKey] as string) ?? ""}
                              onChange={(e) => set(selKey, e.target.value)}
                              className="w-full h-10 rounded-xl border border-[var(--border-default)] bg-[var(--bg-elevated)] px-3 text-sm focus:outline-none focus:border-primary transition-colors">
                              <option value="">— Select —</option>
                              {mod.options?.map((opt) => {
                                const key = opt.value || opt.label;
                                return (
                                  <option key={key} value={key}>
                                    {opt.label}{opt.multiplier && opt.multiplier !== 1 ? ` (${opt.multiplier > 1 ? "+" : "-"}${Math.round(Math.abs(opt.multiplier - 1) * 100)}%)` : ""}
                                  </option>
                                );
                              })}
                            </select>
                          )}
                          {mod.type === "multi_select" && (
                            <div className="grid grid-cols-2 gap-2">
                              {mod.options?.map((opt) => {
                                const key = opt.value || opt.label;
                                const cur = (selections[selKey] as string[]) ?? [];
                                const active = cur.includes(key);
                                return (
                                  <button key={key} type="button"
                                    onClick={() => set(selKey, active ? cur.filter((v) => v !== key) : [...cur, key])}
                                    className={cn(
                                      "rounded-xl border px-3 py-2.5 text-left transition-all",
                                      active
                                        ? "border-primary bg-primary/10 text-primary shadow-sm shadow-primary/10"
                                        : "border-[var(--border-default)] bg-[var(--bg-elevated)]/45 hover:border-primary/35 text-[var(--text-secondary)]"
                                    )}
                                  >
                                    <span className="flex items-center justify-between gap-2 text-xs font-semibold">
                                      {opt.label}
                                      {active && <Check className="h-3.5 w-3.5 shrink-0" />}
                                    </span>
                                    {opt.multiplier && opt.multiplier !== 1 && (
                                      <span className="mt-1 block text-[10px] text-[var(--text-muted)]">
                                        x{opt.multiplier}
                                      </span>
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                          {mod.type === "checkbox" && (
                            <button
                              type="button"
                              onClick={() => set(selKey, !((selections[selKey] as boolean) ?? false))}
                              className={cn(
                                "w-full rounded-xl border px-3 py-2.5 text-left transition-all flex items-center justify-between gap-3",
                                (selections[selKey] as boolean) ?? false
                                  ? "border-primary bg-primary/10 text-primary shadow-sm shadow-primary/10"
                                  : "border-[var(--border-default)] bg-[var(--bg-elevated)]/45 hover:border-primary/35 text-[var(--text-secondary)]"
                              )}
                            >
                              <span>
                                <span className="block text-xs font-semibold">
                                  {mod.label}{mod.required && <span className="text-destructive ml-1">*</span>}
                                </span>
                                <span className="mt-0.5 block text-[10px] text-[var(--text-muted)]">
                                  Toggle this option if it applies to your account.
                                </span>
                              </span>
                              <span className={cn(
                                "h-5 w-5 rounded-full border flex items-center justify-center shrink-0 transition-colors",
                                (selections[selKey] as boolean) ?? false
                                  ? "border-primary bg-primary text-white"
                                  : "border-[var(--border-default)]"
                              )}>
                                {((selections[selKey] as boolean) ?? false) && <Check className="h-3 w-3" />}
                              </span>
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {showGearSection && gearSection}
              </div>

              <div className="space-y-4 xl:sticky xl:top-28">
                {checkoutCard}
                {bossSummaryCard}
              </div>
            </div>
          );
        })()}

        {/* ── Dynamic modifier fields ── */}
        {formConfig?.fields
          .filter((f) => {
            if (f.type === "skill_range" || f.id === "training_method") return false;
            // For xp_based: all fields are handled per-segment in the route planner
            if (priceMatrix?.type === "xp_based") return false;
            // For per_item_stat_based and boss_tiered: modifiers are handled inline
            if (priceMatrix?.type === "per_item_stat_based") return false;
            if (priceMatrix?.type === "boss_tiered") return false;
            return true;
          })
          .map((field) => (
            <div key={field.id} id={`field-${field.id}`} className="space-y-1.5">
              {field.type !== "checkbox" && (
                <label className="text-sm font-medium flex items-center gap-1">
                  {field.label}
                  {field.required && <span className="text-destructive">*</span>}
                </label>
              )}

              {field.type === "select" && (
                <select
                  value={(selections[field.id] as string) ?? ""}
                  onChange={(e) => set(field.id, e.target.value)}
                  className="w-full h-10 rounded-lg border border-[var(--border-default)] bg-[var(--bg-elevated)] px-3 text-sm focus:outline-none focus:border-primary transition-colors"
                >
                  <option value="">— Select an option —</option>
                  {field.options?.map((opt, oi) => {
                    const optKey = opt.value || opt.label;
                    return (
                      <option key={oi} value={optKey}>
                        {opt.label}
                        {opt.multiplier && opt.multiplier !== 1 ? ` (×${opt.multiplier})` : ""}
                        {opt.price_add ? ` (+\$${opt.price_add})` : ""}
                      </option>
                    );
                  })}
                </select>
              )}

              {field.type === "radio" && (
                <div className="grid grid-cols-2 gap-2">
                  {field.options?.map((opt, oi) => {
                    const optKey = opt.value || opt.label;
                    const isSelected = selections[field.id] === optKey;
                    return (
                      <button
                        key={oi}
                        type="button"
                        onClick={() => set(field.id, optKey)}
                        className={cn(
                          "px-3 py-2.5 rounded-lg border text-sm font-medium transition-all text-left",
                          isSelected
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-[var(--border-default)] hover:border-primary/40 text-[var(--text-secondary)]"
                        )}
                      >
                        <span>{opt.label}</span>
                        {opt.multiplier && opt.multiplier !== 1 && (
                          <span className="text-xs ml-1 opacity-60">×{opt.multiplier}</span>
                        )}
                        {opt.price_add ? (
                          <span className="text-xs ml-1 opacity-60">+\${opt.price_add}</span>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              )}

              {field.type === "multi_select" && (
                <div className="grid grid-cols-2 gap-2">
                  {field.options?.map((opt, oi) => {
                    const optKey = opt.value || opt.label;
                    const selected = (selections[field.id] as string[] | undefined) ?? [];
                    const isChecked = selected.includes(optKey);
                    const toggle = () => {
                      const next = isChecked
                        ? selected.filter((k) => k !== optKey)
                        : [...selected, optKey];
                      set(field.id, next);
                    };
                    return (
                      <button
                        key={oi}
                        type="button"
                        onClick={toggle}
                        className={cn(
                          "px-3 py-2.5 rounded-lg border text-sm font-medium transition-all text-left flex items-start gap-2",
                          isChecked
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-[var(--border-default)] hover:border-primary/40 text-[var(--text-secondary)]"
                        )}
                      >
                        {/* Checkbox indicator */}
                        <span className={cn(
                          "mt-0.5 h-4 w-4 shrink-0 rounded border flex items-center justify-center transition-colors",
                          isChecked ? "border-primary bg-primary" : "border-[var(--border-default)]"
                        )}>
                          {isChecked && (
                            <svg className="h-2.5 w-2.5 text-primary-foreground" fill="none" viewBox="0 0 12 12">
                              <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          )}
                        </span>
                        <span className="flex-1">
                          <span>{opt.label}</span>
                          {opt.multiplier && opt.multiplier !== 1 && (
                            <span className="text-xs ml-1 opacity-60">×{opt.multiplier}</span>
                          )}
                          {opt.price_add ? (
                            <span className="text-xs ml-1 opacity-60">+\${opt.price_add}</span>
                          ) : null}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}

              {field.type === "checkbox" && (
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={(selections[field.id] as boolean) ?? false}
                    onChange={(e) => set(field.id, e.target.checked)}
                    className="rounded border-[var(--border-default)]"
                  />
                  <span className="text-sm text-[var(--text-secondary)]">{field.placeholder || field.label}</span>
                </label>
              )}

              {field.type === "text" && (
                <input
                  type="text"
                  value={(selections[field.id] as string) ?? ""}
                  onChange={(e) => set(field.id, e.target.value)}
                  placeholder={field.placeholder}
                  className="w-full h-10 rounded-lg border border-[var(--border-default)] bg-[var(--bg-elevated)] px-3 text-sm focus:outline-none focus:border-primary transition-colors"
                />
              )}

              {field.type === "textarea" && (
                <textarea
                  value={(selections[field.id] as string) ?? ""}
                  onChange={(e) => set(field.id, e.target.value)}
                  placeholder={field.placeholder}
                  rows={3}
                  className="w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-elevated)] px-3 py-2 text-sm focus:outline-none focus:border-primary transition-colors resize-none"
                />
              )}
            </div>
          ))}

        {!isBossTiered && !multiMode && !perItemMultiMode && (
          <>
            <div className="space-y-2 pt-2">
              <button
                onClick={handleBuyNow}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-primary text-white font-semibold hover:bg-primary/90 transition-all hover:shadow-lg hover:shadow-primary/25"
              >
                <Zap className="h-4 w-4" />
                {editItemId ? "Update & go to checkout" : "Order now"}
              </button>
              <button
                onClick={handleAddToCart}
                className={cn(
                  "w-full flex items-center justify-center gap-2 py-3 rounded-xl border font-medium text-sm transition-all",
                  added
                    ? "border-green-400/40 bg-green-400/10 text-green-400"
                    : "border-[var(--border-default)] hover:border-primary/40 hover:bg-white/5 text-[var(--text-secondary)]"
                )}
              >
                {added ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                {added
                  ? priceMatrix?.type === "per_item_stat_based"
                    ? "Added! Pick another quest →"
                    : "Added!"
                  : editItemId
                  ? "Update in cart"
                  : skills.length > 1
                  ? `Add ${currentSkill?.label ?? "skill"} to cart`
                  : "Add to cart"}
              </button>
            </div>

            <p className="text-xs text-center text-[var(--text-muted)]">
              Secure payment via SSL
            </p>
          </>
        )}
      </div>
    </div>
  );
}
