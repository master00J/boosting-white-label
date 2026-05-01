"use client";

import { useState, useReducer, useMemo, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  ChevronDown,
  ChevronUp,
  Trash2,
  Settings2,
  Swords,
  ScrollText,
  Trophy,
  ShoppingCart,
  Zap,
  Sparkles,
  Search,
  BookUser,
  LogIn,
  Check,
  X,
  RotateCcw,
  Pencil,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { formatUSD } from "@/lib/format";
import { calculatePrice, type Selections } from "@/lib/pricing-engine";
import StatCalculator, {
  type StatSelections,
} from "@/components/storefront/StatCalculator";
import RoutePlanner from "@/components/storefront/RoutePlanner";
import InlineLoadoutCreator from "@/components/storefront/InlineLoadoutCreator";
import { useCartStore } from "@/stores/cart-store";
import { useUIStore } from "@/stores/ui-store";
import { useAuth } from "@/components/providers/auth-provider";
import { createClient } from "@/lib/supabase/client";
import { toPricingStats, OSRS_SKILLS } from "@/lib/osrs-skills";
import { normaliseEquipmentByStyle, EQUIPMENT_SLOTS } from "@/lib/osrs-equipment";
import type {
  FormConfig,
  FormField,
  PriceMatrix,
  XpBasedPriceMatrix,
  PerItemStatBasedPriceMatrix,
  BossTieredPriceMatrix,
  PerItemPriceMatrix,
  PerUnitPriceMatrix,
  StatBasedPriceMatrix,
  RouteSegment,
} from "@/types/service-config";

/* â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”
   Item lookup â€” maps itemId â†’ { label, icon, slotLabel }
   â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â” */

const ITEM_LOOKUP = new Map<string, { id: string; label: string; icon: string; slotLabel: string }>();
for (const slot of EQUIPMENT_SLOTS) {
  for (const item of slot.items) {
    if (item.id) {
      ITEM_LOOKUP.set(item.id, { id: item.id, label: item.label, icon: item.icon, slotLabel: slot.label });
    }
  }
}

/* â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”
   Types (unchanged)
   â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â” */

type ServiceData = {
  id: string;
  name: string;
  slug: string;
  base_price: number;
  price_per_unit: number | null;
  min_quantity: number | null;
  max_quantity: number | null;
  form_config: unknown;
  price_matrix: unknown;
  category_id: string;
};

type GameData = {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
};

type CategoryData = {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
};

export type BuildItem = {
  id: string;
  serviceId: string;
  service: ServiceData;
  configuration: Record<string, unknown>;
  price: number;
  label: string;
  tab: "skills" | "quests" | "extras";
  /** For quests: serviceId:itemId; for others: serviceId */
  buildKey?: string;
};

type BuildState = {
  stats: StatSelections;
  configs: Record<string, Record<string, unknown>>;
  active: Set<string>;
};

/* â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”
   Design tokens â€” tab accent colors
   â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â” */

const TAB_THEME = {
  skills: {
    accent: "gold",
    icon: Swords,
    activeClasses: "border-[#E8720C]/50 bg-[#E8720C]/[0.07] shadow-[0_0_20px_rgba(201,149,42,0.08)]",
    badgeClasses: "bg-[#E8720C]/20 text-[#FF9438]",
    tabActiveClasses:
      "bg-[#E8720C]/10 text-[#FF9438] border-[#E8720C]/30 shadow-[0_0_12px_rgba(201,149,42,0.12)]",
    priceClasses: "text-[#FF9438]",
    summaryBg: "bg-[#E8720C]/[0.04]",
    glowColor: "rgba(201,149,42,0.15)",
    sliderTrack: "accent-orange-500",
  },
  quests: {
    accent: "gold",
    icon: ScrollText,
    activeClasses: "border-[#E8720C]/50 bg-[#E8720C]/[0.07] shadow-[0_0_20px_rgba(201,149,42,0.08)]",
    badgeClasses: "bg-[#E8720C]/20 text-[#FF9438]",
    tabActiveClasses:
      "bg-[#E8720C]/10 text-[#FF9438] border-[#E8720C]/30 shadow-[0_0_12px_rgba(201,149,42,0.12)]",
    priceClasses: "text-[#FF9438]",
    summaryBg: "bg-[#E8720C]/[0.04]",
    glowColor: "rgba(201,149,42,0.15)",
    sliderTrack: "accent-orange-500",
  },
  extras: {
    accent: "gold",
    icon: Trophy,
    activeClasses: "border-[#E8720C]/50 bg-[#E8720C]/[0.07] shadow-[0_0_20px_rgba(201,149,42,0.08)]",
    badgeClasses: "bg-[#E8720C]/20 text-[#FF9438]",
    tabActiveClasses:
      "bg-[#E8720C]/10 text-[#FF9438] border-[#E8720C]/30 shadow-[0_0_12px_rgba(201,149,42,0.12)]",
    priceClasses: "text-[#FF9438]",
    summaryBg: "bg-[#E8720C]/[0.04]",
    glowColor: "rgba(201,149,42,0.15)",
    sliderTrack: "accent-orange-500",
  },
} as const;

/* â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”
   Reducer (unchanged)
   â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â” */

function buildReducer(
  state: BuildState,
  action: { type: string; [k: string]: unknown }
): BuildState {
  switch (action.type) {
    case "SET_STATS":
      return { ...state, stats: action.stats as StatSelections };
    case "SET_CONFIG": {
      const cfg = {
        ...state.configs,
        [action.serviceId as string]: action.config as Record<string, unknown>,
      };
      return { ...state, configs: cfg };
    }
    case "TOGGLE_SERVICE": {
      const sid = action.serviceId as string;
      const next = new Set(state.active);
      if (next.has(sid)) next.delete(sid);
      else next.add(sid);
      return { ...state, active: next };
    }
    case "REMOVE_SERVICE": {
      const next = new Set(state.active);
      next.delete(action.serviceId as string);
      return { ...state, active: next };
    }
    case "TOGGLE_QUEST_ITEM": {
      const sid = action.serviceId as string;
      const itemId = action.itemId as string;
      const key = `${sid}:${itemId}`;
      const next = new Set(state.active);
      if (next.has(key)) {
        next.delete(key);
        const cfg = { ...state.configs };
        delete cfg[key];
        return { ...state, active: next, configs: cfg };
      }
      next.add(key);
      return {
        ...state,
        active: next,
        configs: { ...state.configs, [key]: { item: itemId } },
      };
    }
    case "CLEAR_ALL":
      return { ...state, active: new Set(), configs: {} };
    default:
      return state;
  }
}

/* â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”
   Helpers
   â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â” */

function getPricingType(pm: unknown): string | null {
  const m = pm as { type?: string } | null;
  return m?.type ?? null;
}

function getSkillIcon(skillId: string): string | null {
  return OSRS_SKILLS.find((s) => s.id === skillId)?.icon ?? null;
}

function getTabForService(service: ServiceData): "skills" | "quests" | "extras" {
  const type = getPricingType(service.price_matrix);
  if (type === "xp_based") return "skills";
  if (type === "per_item_stat_based") return "quests";
  return "extras";
}


/* â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”
   Level Input â€” small number input with subtle styling
   â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â” */

function LevelInput({
  value,
  min,
  max,
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  const [localValue, setLocalValue] = useState(String(value));

  useEffect(() => {
    setLocalValue(String(value));
  }, [value]);

  return (
    <input
      type="number"
      min={min}
      max={max}
      value={localValue}
      onChange={(e) => {
        setLocalValue(e.target.value);
        const parsed = parseInt(e.target.value);
        if (!isNaN(parsed)) {
          onChange(Math.max(min, Math.min(max, parsed)));
        }
      }}
      onBlur={() => {
        const parsed = parseInt(localValue);
        if (isNaN(parsed)) {
          // Leeg veld: herstel de huidige waarde i.p.v. terug naar min springen
          setLocalValue(String(value));
        } else {
          const clamped = Math.max(min, Math.min(max, parsed));
          setLocalValue(String(clamped));
          onChange(clamped);
        }
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          const parsed = parseInt(localValue);
          if (!isNaN(parsed)) {
            const clamped = Math.max(min, Math.min(max, parsed));
            setLocalValue(String(clamped));
            onChange(clamped);
          } else {
            setLocalValue(String(value));
          }
        }
      }}
      className={cn(
        "w-[72px] h-9 rounded-lg text-center text-sm font-semibold tabular-nums",
        "bg-black/30 border border-[#E8720C]/15",
        "text-[var(--text-primary)] placeholder:text-[var(--text-muted)]",
        "focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20",
        "transition-all duration-200"
      )}
    />
  );
}

/* â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”
   SkillSlider â€” xp_based service card
   â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â” */

function SkillSlider({
  service,
  config,
  priceMatrix,
  formConfig,
  onChange,
  onRemove,
  onToggle,
  isActive,
}: {
  service: ServiceData;
  config: Record<string, unknown>;
  priceMatrix: XpBasedPriceMatrix;
  formConfig: FormConfig | null;
  onChange: (cfg: Record<string, unknown>) => void;
  onRemove: () => void;
  onToggle: () => void;
  isActive: boolean;
}) {
  const skills = priceMatrix.skills ?? [];
  const skillId = (config["skill"] as string) ?? skills[0]?.id;
  const skillConfig = skills.find((s) => s.id === skillId) ?? skills[0];
  const methods = skillConfig?.methods ?? [];
  const tierModFields = skillConfig?.tier_modifier_fields ?? [];

  const routeSegments = useMemo(
    () => (config["route_segments"] as RouteSegment[]) ?? [],
    [config]
  );

  const setCfg = (updates: Record<string, unknown>) =>
    onChange({ ...config, ...updates });

  // Seed route segments: always start with a single segment (user can add more)
  useEffect(() => {
    if (routeSegments.length > 0 || !skillConfig) return;
    setCfg({
      route_segments: [{ id: String(Date.now()), from_level: 1, to_level: 99, method_id: null }],
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skillId, skillConfig]);

  const selections = useMemo(
    () => ({
      ...config,
      skill: skillId,
      route_segments: routeSegments,
    }),
    [config, skillId, routeSegments]
  );

  const breakdown = useMemo(() => {
    if (!formConfig || !priceMatrix) return null;
    try {
      return calculatePrice(priceMatrix, formConfig, selections as Selections);
    } catch {
      return null;
    }
  }, [priceMatrix, formConfig, selections]);

  const price = breakdown?.final ?? service.base_price;
  const theme = TAB_THEME.skills;

  /* â”€â”€ Collapsed state â”€â”€ */
  if (!isActive) {
    const allSkillIcons = skills
      .map((s) => ({ id: s.id, label: s.label, icon: getSkillIcon(s.id) }))
      .filter((s) => s.icon !== null);
    const primaryIcon = getSkillIcon(skillId);

    return (
      <div
        className={cn(
          "group relative rounded-xl border border-[#E8720C]/12 bg-[#E8720C]/[0.02] p-4",
          "cursor-pointer transition-all duration-300",
          "hover:border-[#E8720C]/30 hover:bg-[#E8720C]/[0.04]",
          "hover:shadow-[0_0_24px_rgba(16,185,129,0.08)]"
        )}
        onClick={onToggle}
      >
        <div className="flex items-center gap-3">
          {/* Icon area */}
          {allSkillIcons.length > 1 ? (
            <div className="flex shrink-0 -space-x-1.5">
              {allSkillIcons.slice(0, 4).map((s, i) => (
                <div
                  key={s.id}
                  className="relative h-8 w-8 rounded-lg bg-black/50 border border-[#E8720C]/15 flex items-center justify-center overflow-hidden"
                  style={{ zIndex: allSkillIcons.length - i }}
                  title={s.label}
                >
                  <Image src={s.icon!} alt={s.label} width={20} height={20} className="object-contain" unoptimized />
                </div>
              ))}
              {allSkillIcons.length > 4 && (
                <div className="h-8 w-8 rounded-lg bg-black/50 border border-[#E8720C]/15 flex items-center justify-center text-[10px] text-[var(--text-muted)] font-bold">
                  +{allSkillIcons.length - 4}
                </div>
              )}
            </div>
          ) : primaryIcon ? (
            <div className="shrink-0 h-10 w-10 rounded-xl bg-[#E8720C]/[0.06] border border-[#E8720C]/20 flex items-center justify-center group-hover:border-[#E8720C]/40 group-hover:bg-[#E8720C]/[0.10] transition-all duration-300">
              <Image src={primaryIcon} alt={skills[0]?.label ?? service.name} width={24} height={24} className="object-contain" unoptimized />
            </div>
          ) : (
            <div className="shrink-0 h-10 w-10 rounded-xl bg-[#E8720C]/[0.08] border border-[#E8720C]/20 flex items-center justify-center">
              <Swords className="h-4.5 w-4.5 text-[#FF9438]" />
            </div>
          )}

          <div className="flex-1 min-w-0">
            <p className="font-semibold text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] transition-colors truncate leading-tight">
              {service.name}
            </p>
            {/* Subtitle: skill label or count */}
            {skills.length === 1 && skills[0]?.label && (
              <p className="text-[11px] text-[var(--text-muted)] mt-0.5">{skills[0].label}</p>
            )}
            {skills.length > 1 && (
              <p className="text-[11px] text-[var(--text-muted)] mt-0.5">{skills.length} skills</p>
            )}
            {/* Config hints: methods + tier modifier fields */}
            {(methods.length > 0 || tierModFields.length > 0) && (
              <div className="flex flex-wrap items-center gap-1 mt-1.5">
                {methods.length > 0 && (
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-[#E8720C]/[0.08] border border-[#E8720C]/20 text-[10px] text-[#FF9438]/70 font-medium">
                    {methods.length} method{methods.length !== 1 ? "s" : ""}
                  </span>
                )}
                {tierModFields.map((f) => (
                  <span key={f.id} className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-orange-500/[0.07] border border-orange-500/[0.18] text-[10px] text-orange-400/70 font-medium">
                    {f.label}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="shrink-0 flex flex-col items-end gap-1">
            <span className="text-sm font-bold tabular-nums text-[var(--text-muted)] group-hover:text-[#FF9438]/80 transition-colors">
              {formatUSD(price)}
            </span>
            <span className="text-[10px] font-semibold text-[#FF9438]/50 opacity-0 group-hover:opacity-100 transition-all duration-200 flex items-center gap-0.5">
              Configure â†’
            </span>
          </div>
        </div>
      </div>
    );
  }

  /* â”€â”€ Expanded state â”€â”€ */
  return (
    <div
      className={cn(
        "relative rounded-xl border p-4 space-y-4 transition-all duration-300",
        theme.activeClasses
      )}
    >
      {/* Top glow line */}
      <div className="absolute top-0 left-4 right-4 h-px bg-gradient-to-r from-transparent via-[#E8720C]/40 to-transparent" />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          {getSkillIcon(skillId) ? (
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#E8720C]/[0.08] border border-[#E8720C]/25">
              <Image src={getSkillIcon(skillId)!} alt={skillConfig?.label ?? service.name} width={20} height={20} className="object-contain" unoptimized />
            </div>
          ) : (
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#E8720C]/[0.08]">
              <Swords className="h-3.5 w-3.5 text-[#FF9438]" />
            </div>
          )}
          <span className="font-semibold text-[var(--text-primary)]">
            {service.name}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span
            className={cn(
              "text-sm font-bold tabular-nums",
              theme.priceClasses
            )}
          >
            {formatUSD(price)}
          </span>
          <button
            type="button"
            onClick={onRemove}
            className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-red-400 hover:bg-red-500/10 transition-all duration-200"
            aria-label="Remove"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Skill selector (if multiple) â€” visual icon grid */}
      {skills.length > 1 && (
        <div className="space-y-2">
          <label className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
            Skill
          </label>
          <div className="flex flex-wrap gap-2">
            {skills.map((s) => {
              const icon = getSkillIcon(s.id);
              const isSel = skillId === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setCfg({ skill: s.id })}
                  className={cn(
                    "flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-all duration-200",
                    isSel
                      ? "border-[#E8720C]/50 bg-[#E8720C]/10 text-[#FF9438] shadow-[0_0_10px_rgba(201,149,42,0.10)]"
                      : "border-[#E8720C]/12 bg-[#E8720C]/[0.02] text-[var(--text-secondary)] hover:border-[#E8720C]/30 hover:bg-[#E8720C]/[0.05]"
                  )}
                >
                  {icon && (
                    <Image src={icon} alt={s.label} width={16} height={16} className="object-contain" unoptimized />
                  )}
                  {s.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Route planner â€” altijd getoond */}
      {skillId && (
        <RoutePlanner
          skillId={skillId}
          matrix={priceMatrix}
          segments={routeSegments}
          formFields={(formConfig?.fields ?? []).filter(
            (f) =>
              f.type !== "skill_range" &&
              f.id !== "training_method" &&
              !tierModFields.some((tmf) => tmf.id === f.id) &&
              ["select", "radio", "multi_select"].includes(f.type)
          ) as import("@/types/service-config").FormField[]}
          onChange={(segs) => setCfg({ route_segments: segs })}
        />
      )}
    </div>
  );
}

/* â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”
   QuestItemRow â€” single quest row with price
   â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â” */

function QuestItemRow({
  item,
  service,
  priceMatrix,
  formConfig,
  stats,
  config,
  onConfigChange,
  isActive,
  onToggle,
  onRemove,
}: {
  item: { id: string; label: string; price?: number; modifiers?: { id: string; label: string; type: string; required?: boolean; options?: { value: string; label: string }[] }[] };
  service: ServiceData;
  priceMatrix: PerItemStatBasedPriceMatrix;
  formConfig: FormConfig | null;
  stats: StatSelections;
  config: Record<string, unknown>;
  onConfigChange: (updates: Record<string, unknown>) => void;
  isActive: boolean;
  onToggle: () => void;
  onRemove: () => void;
}) {
  const theme = TAB_THEME.quests;
  const activeModifiers = item.modifiers ?? priceMatrix.modifiers ?? [];
  const selections = useMemo(
    () => ({
      item: item.id,
      ...config,
      ...Object.fromEntries(
        Object.entries(stats).map(([k, v]) => [
          k.startsWith("stat_") ? k : `stat_${k}`,
          v,
        ])
      ),
    }),
    [item.id, config, stats]
  );
  const breakdown = useMemo(() => {
    if (!formConfig || !priceMatrix) return null;
    try {
      return calculatePrice(priceMatrix, formConfig, selections);
    } catch {
      return null;
    }
  }, [priceMatrix, formConfig, selections]);
  const price = breakdown?.final ?? item.price ?? service.base_price;

  return (
    <div className="border-b border-[#E8720C]/8 last:border-0">
      <div
        className={cn(
          "group flex items-center justify-between px-4 py-3 transition-all duration-200",
          isActive ? "bg-[#E8720C]/[0.06]" : "hover:bg-[#E8720C]/[0.02] cursor-pointer"
        )}
        onClick={() => !isActive && onToggle()}
      >
        <div className="flex items-center gap-2.5 flex-1 min-w-0 mr-3">
          {isActive && (
            <div className="shrink-0 h-4 w-4 rounded-full bg-[#E8720C]/20 border border-[#E8720C]/40 flex items-center justify-center">
              <svg className="h-2 w-2 text-[#FF9438]" fill="none" viewBox="0 0 12 12">
                <path stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M2 6l3 3 5-5" />
              </svg>
            </div>
          )}
          <span
            className={cn(
              "text-sm font-medium truncate",
              isActive ? "text-[var(--text-primary)]" : "text-[var(--text-secondary)]"
            )}
          >
            {item.label}
          </span>
        </div>
        <div className="flex items-center gap-3 shrink-0" onClick={(e) => e.stopPropagation()}>
          <span className={cn("text-sm font-bold tabular-nums", theme.priceClasses)}>
            {formatUSD(price)}
          </span>
          {isActive ? (
            <button
              type="button"
              onClick={onRemove}
              className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-red-400 hover:bg-red-500/10 transition-all duration-200"
              aria-label="Remove"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={onToggle}
              className="px-2 py-1 rounded-lg text-xs font-medium text-[#FF9438] border border-[#E8720C]/30 hover:bg-[#E8720C]/10 transition-all duration-200"
            >
              + Add
            </button>
          )}
        </div>
      </div>
      {/* Per-quest modifiers when active */}
      {isActive && activeModifiers.length > 0 && (
        <div className="px-4 pb-3 pt-1 space-y-2 bg-[#E8720C]/[0.03]" onClick={(e) => e.stopPropagation()}>
          {activeModifiers.map((mod) => (
            <div key={mod.id} className="space-y-1">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-1">
                {mod.label}
                {mod.required && <span className="text-red-400">*</span>}
              </label>
              {mod.type === "radio" && (
                <div className="flex flex-wrap gap-1.5">
                  {mod.options?.map((opt) => {
                    const key = opt.value || opt.label;
                    const sel = (config[`quest_mod_${mod.id}`] as string) === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() =>
                          onConfigChange({ [`quest_mod_${mod.id}`]: sel ? "" : key })
                        }
                        className={cn(
                          "px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all",
                          sel
                            ? "border-[#E8720C]/50 bg-[#E8720C]/10 text-[#FF9438]"
                            : "border-[#E8720C]/15 hover:border-[#E8720C]/30 text-[var(--text-secondary)]"
                        )}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              )}
              {mod.type === "select" && (
                <select
                  value={(config[`quest_mod_${mod.id}`] as string) ?? ""}
                  onChange={(e) =>
                    onConfigChange({ [`quest_mod_${mod.id}`]: e.target.value })
                  }
                  className={cn(
                    "w-full h-8 rounded-lg border border-[#E8720C]/15 bg-black/20 px-2 text-xs",
                    "focus:outline-none focus:border-[#E8720C]/40 [color-scheme:dark]"
                  )}
                >
                  <option value="">â€” Select â€”</option>
                  {mod.options?.map((opt) => (
                    <option key={opt.value || opt.label} value={opt.value || opt.label}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              )}
              {mod.type === "checkbox" && (
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={(config[`quest_mod_${mod.id}`] as boolean) ?? false}
                    onChange={(e) =>
                      onConfigChange({ [`quest_mod_${mod.id}`]: e.target.checked })
                    }
                    className="rounded border-[#E8720C]/25 text-orange-500"
                  />
                  <span className="text-sm text-[var(--text-secondary)]">
                    {mod.label}
                    {(mod as { multiplier?: number }).multiplier &&
                      (mod as { multiplier?: number }).multiplier !== 1 && (
                        <span className="text-[#FF9438]/80 ml-1">
                          Ã—{(mod as { multiplier?: number }).multiplier}
                        </span>
                      )}
                    {(mod as { price_add?: number }).price_add != null && (
                      <span className="text-[#FF9438]/80 ml-1">
                        +{formatUSD((mod as { price_add?: number }).price_add!)}
                      </span>
                    )}
                  </span>
                </label>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”
   QuestCard â€” per_item_stat_based (multiple quests addable)
   â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â” */

function QuestCard({
  service,
  priceMatrix,
  formConfig,
  stats,
  getItemConfig,
  onConfigChange,
  onToggleItem,
  onRemoveItem,
  isItemActive,
}: {
  service: ServiceData;
  priceMatrix: PerItemStatBasedPriceMatrix;
  formConfig: FormConfig | null;
  stats: StatSelections;
  getItemConfig: (itemId: string) => Record<string, unknown>;
  onConfigChange: (itemId: string, updates: Record<string, unknown>) => void;
  onToggleItem: (itemId: string) => void;
  onRemoveItem: (itemId: string) => void;
  isItemActive: (itemId: string) => boolean;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const filteredItems = useMemo(() => {
    const list = priceMatrix.items ?? [];
    if (!searchQuery.trim()) return list;
    const q = searchQuery.trim().toLowerCase();
    return list.filter((i) => i.label.toLowerCase().includes(q));
  }, [priceMatrix.items, searchQuery]);

  return (
    <div className="rounded-xl border border-[#E8720C]/12 bg-[#E8720C]/[0.02] overflow-hidden">
      <div className="flex items-center gap-2.5 px-4 py-3 border-b border-[#E8720C]/8">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#E8720C]/[0.08]">
          <ScrollText className="h-3.5 w-3.5 text-[#FF9438]" />
        </div>
        <span className="font-semibold text-[var(--text-primary)]">{service.name}</span>
      </div>
      <div className="px-3 py-2 border-b border-[#E8720C]/8">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--text-muted)] pointer-events-none" />
          <input
            type="search"
            placeholder="Search quests..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={cn(
              "w-full pl-8 pr-3 py-2 rounded-lg text-sm",
              "bg-black/20 border border-[#E8720C]/15",
              "text-[var(--text-primary)] placeholder:text-[var(--text-muted)]",
              "focus:outline-none focus:border-[#E8720C]/40"
            )}
          />
        </div>
      </div>
      <div className="divide-y divide-white/[0.04]">
        {filteredItems.length === 0 ? (
          <div className="px-4 py-6 text-center text-sm text-[var(--text-muted)]">
            {searchQuery.trim() ? "No quests found for this search." : "No quests available."}
          </div>
        ) : (
          filteredItems.map((item) => (
            <QuestItemRow
              key={item.id}
              item={item}
              service={service}
              priceMatrix={priceMatrix}
              formConfig={formConfig}
              stats={stats}
              config={getItemConfig(item.id)}
              onConfigChange={(updates) => onConfigChange(item.id, updates)}
              isActive={isItemActive(item.id)}
              onToggle={() => onToggleItem(item.id)}
              onRemove={() => onRemoveItem(item.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}

/* â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”
   ExtrasCard â€” boss_tiered, per_item, per_unit, stat_based
   â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â” */

type GearLoadoutOption = {
  id: string;
  name: string;
  equipment?: Record<string, unknown>;
  special_weapons?: string[];
};

function ExtrasCard({
  service,
  config,
  priceMatrix,
  formConfig,
  stats,
  loadoutItems,
  loadouts,
  selectedLoadoutId,
  hasSavedAccount: _hasSavedAccount,
  onStatsChange,
  onChange,
  onRemove,
  onToggle,
  isActive,
  onLoadoutUpdated,
}: {
  service: ServiceData;
  config: Record<string, unknown>;
  priceMatrix:
    | BossTieredPriceMatrix
    | PerItemPriceMatrix
    | PerUnitPriceMatrix
    | StatBasedPriceMatrix;
  formConfig: FormConfig | null;
  stats: StatSelections;
  loadoutItems?: string[];
  loadouts?: GearLoadoutOption[];
  selectedLoadoutId?: string | null;
  /** When true, hide username/stats input â€” stats come from saved loadout */
  hasSavedAccount?: boolean;
  onStatsChange?: (stats: StatSelections) => void;
  onChange: (cfg: Record<string, unknown>) => void;
  onRemove: () => void;
  onToggle: () => void;
  isActive: boolean;
  /** Called when gear is saved via inline editor â€” parent should merge into loadouts */
  onLoadoutUpdated?: (updated: GearLoadoutOption & { stats?: Record<string, number> }) => void;
}) {
  const type =
    (priceMatrix as { type?: string })?.type ??
    (formConfig as { pricing_type?: string } | null)?.pricing_type ??
    null;

  // â”€â”€ Gear loadout selection (per-card override) â”€â”€
  const [gearLoadoutId, setGearLoadoutId] = useState<string | null>(
    selectedLoadoutId ?? null
  );
  useEffect(() => {
    setGearLoadoutId(selectedLoadoutId ?? null);
  }, [selectedLoadoutId]);

  // Manual item-level overrides (null = use loadout as-is)
  const [overrideGearItems, setOverrideGearItems] = useState<string[] | null>(null);
  // Inline gear editor â€” when true, show InlineLoadoutCreator for selected loadout
  const [showGearEditor, setShowGearEditor] = useState(false);
  // Reset manual overrides whenever the selected loadout changes
  useEffect(() => {
    setOverrideGearItems(null);
  }, [gearLoadoutId]);

  // Derive gear items from the per-card selected loadout
  const localLoadoutItems = useMemo(() => {
    if (!loadouts?.length) return loadoutItems ?? [];
    if (!gearLoadoutId) return [];
    const loadout = loadouts.find((l) => l.id === gearLoadoutId);
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
  }, [loadouts, gearLoadoutId, loadoutItems]);

  // Use manual override if the user removed items, otherwise use the loadout
  const effectiveGearItems = overrideGearItems ?? localLoadoutItems;

  const selections = useMemo(
    () =>
      ({
        ...config,
        ...(type === "stat_based" ||
        type === "boss_tiered" ||
        type === "per_item_stat_based"
          ? Object.fromEntries(
              Object.entries(stats).map(([k, v]) => [
                k.startsWith("stat_") ? k : `stat_${k}`,
                v,
              ])
            )
          : {}),
        ...(type === "stat_based" || type === "boss_tiered"
          ? { loadout_items: effectiveGearItems }
          : {}),
      }) as Selections,
    [config, stats, type, effectiveGearItems]
  );

  const breakdown = useMemo(() => {
    if (!formConfig || !priceMatrix) return null;
    try {
      return calculatePrice(priceMatrix, formConfig, selections);
    } catch {
      return null;
    }
  }, [priceMatrix, formConfig, selections]);

  const price = breakdown?.final ?? service.base_price;
  const theme = TAB_THEME.extras;

  return (
    <div
      className={cn(
        "group relative rounded-xl border p-4 cursor-pointer transition-all duration-300",
        isActive
          ? theme.activeClasses
          : "border-[#E8720C]/12 bg-[#E8720C]/[0.02] hover:border-[#E8720C]/25 hover:bg-[#E8720C]/[0.04]"
      )}
      onClick={onToggle}
    >
      {isActive && (
        <div className="absolute top-0 left-4 right-4 h-px bg-gradient-to-r from-transparent via-[#E8720C]/40 to-transparent" />
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          {isActive && (
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#E8720C]/[0.08]">
              <Trophy className="h-3.5 w-3.5 text-[#FF9438]" />
            </div>
          )}
          <div className="min-w-0">
            <span
              className={cn(
                "font-semibold transition-colors block truncate",
                isActive
                  ? "text-[var(--text-primary)]"
                  : "text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]"
              )}
            >
              {service.name}
            </span>
            {/* Boss summary subtitle */}
            {type === "boss_tiered" && (() => {
              const bm = priceMatrix as BossTieredPriceMatrix;
              const unitLabel = bm.unit_label ?? "kills";
              const selectedBossId = (config["boss"] as string) ?? bm.bosses?.[0]?.id;
              const selectedBoss = bm.bosses?.find((b) => b.id === selectedBossId);
              const kills = Number(config["kills"] ?? bm.minimum_kills ?? 1);
              return selectedBoss ? (
                <span className="text-[11px] text-[#FF9438]/60 mt-0.5 block">
                  {selectedBoss.label} Â· {kills} {unitLabel}
                </span>
              ) : null;
            })()}
            {/* Gear badge when not active */}
            {!isActive && gearLoadoutId && localLoadoutItems.length > 0 && (
              <span className="text-[10px] text-[#FF9438]/60 mt-0.5 flex items-center gap-1">
                <Settings2 className="h-2.5 w-2.5" />
                Gear: {loadouts?.find((l) => l.id === gearLoadoutId)?.name}
              </span>
            )}
          </div>
        </div>
        <div
          className="flex items-center gap-3"
          onClick={(e) => e.stopPropagation()}
        >
          <span
            className={cn(
              "text-sm font-bold tabular-nums",
              theme.priceClasses
            )}
          >
            {formatUSD(price)}
          </span>
          {isActive && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onRemove();
              }}
              className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-red-400 hover:bg-red-500/10 transition-all duration-200"
              aria-label="Remove"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
          {!isActive && (
            <span className="text-xs font-medium text-[#E8720C]/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              + Add
            </span>
          )}
        </div>
      </div>

      {/* â”€â”€ Active loadout modifier badges â”€â”€ */}
      {(type === "boss_tiered" || type === "stat_based") &&
        breakdown?.loadout_modifiers_active &&
        breakdown.loadout_modifiers_active.length > 0 && (
          <div
            className="mt-2 flex flex-wrap gap-1.5"
            onClick={(e) => e.stopPropagation()}
          >
            {breakdown.loadout_modifiers_active.map((m) => (
              <span
                key={m.id}
                title={`Loadout modifier: ${m.label}`}
                className={cn(
                  "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold",
                  m.multiplier < 1
                    ? "bg-[#E8720C]/15 text-[#FF9438] border border-[#E8720C]/25"
                    : "bg-orange-500/15 text-orange-400 border border-orange-500/20"
                )}
              >
                <Settings2 className="h-2.5 w-2.5" />
                {m.label}{" "}
                {m.multiplier < 1
                  ? `âˆ’${Math.round((1 - m.multiplier) * 100)}%`
                  : `+${Math.round((m.multiplier - 1) * 100)}%`}
              </span>
            ))}
          </div>
        )}

      {/* â”€â”€ Config options when active â”€â”€ */}
      {isActive && (
        <div
          className="mt-4 pt-4 border-t border-[#E8720C]/8 space-y-4"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Gear loadout selector â€” always visible for combat-based services */}
          {(type === "boss_tiered" || type === "stat_based") && (
            <div className="space-y-2 pb-3 border-b border-[#E8720C]/8">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-1.5">
                <Settings2 className="h-3 w-3" />
                Gear Loadout
              </label>
              {loadouts && loadouts.length > 0 ? (
                <>
                  {/* Loadout picker buttons */}
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setGearLoadoutId(null);
                        onChange({ ...config, loadout_id: null });
                      }}
                      className={cn(
                        "px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all",
                        !gearLoadoutId
                          ? "border-[#E8720C]/50 bg-[#E8720C]/10 text-[#FF9438]"
                          : "border-[#E8720C]/15 hover:border-[#E8720C]/35 text-[var(--text-secondary)]"
                      )}
                    >
                      No account selected
                    </button>
                    {loadouts.map((l) => (
                      <button
                        key={l.id}
                        type="button"
                        onClick={() => {
                          setGearLoadoutId(l.id);
                          onChange({ ...config, loadout_id: l.id });
                        }}
                        className={cn(
                          "px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all",
                          gearLoadoutId === l.id
                            ? "border-[#E8720C]/50 bg-[#E8720C]/10 text-[#FF9438]"
                            : "border-[#E8720C]/15 hover:border-[#E8720C]/35 text-[var(--text-secondary)]"
                        )}
                      >
                        {l.name}
                      </button>
                    ))}
                  </div>

                  {/* Edit gear button â€” opent inline editor op de pagina */}
                  {gearLoadoutId && !showGearEditor && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowGearEditor(true);
                      }}
                      className="inline-flex items-center gap-1.5 text-[11px] font-medium text-[#FF9438]/80 hover:text-[#FF9438] transition-colors"
                    >
                      <Pencil className="h-3 w-3" />
                      Edit gear
                    </button>
                  )}

                  {/* Inline gear editor */}
                  {gearLoadoutId && showGearEditor && (() => {
                    const editingLoadout = loadouts.find((l) => l.id === gearLoadoutId);
                    return editingLoadout ? (
                      <InlineLoadoutCreator
                        existingCount={loadouts?.length ?? 0}
                        editingLoadout={editingLoadout}
                        onCreated={(updated) => {
                          onLoadoutUpdated?.(updated);
                          setShowGearEditor(false);
                        }}
                        onCancel={() => setShowGearEditor(false)}
                      />
                    ) : null;
                  })()}

                  {/* Items from selected loadout */}
                  {gearLoadoutId && localLoadoutItems.length === 0 && (
                    <p className="text-[10px] text-orange-400/70 flex items-center gap-1">
                      <span>âš </span> This account has no gear configured.
                    </p>
                  )}
                  {gearLoadoutId && localLoadoutItems.length > 0 && (
                    <div className="space-y-2">
                      {/* Status row */}
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <span className="text-[10px] text-[#FF9438]/70">
                          {effectiveGearItems.length} item{effectiveGearItems.length !== 1 ? "s" : ""} active
                          {overrideGearItems !== null && (
                            <span className="ml-1 text-orange-400/70">(modified)</span>
                          )}
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowGearEditor(true);
                            }}
                            className="inline-flex items-center gap-1 text-[10px] font-medium text-[#FF9438]/80 hover:text-[#FF9438] transition-colors"
                          >
                            <Pencil className="h-3 w-3" />
                            Edit gear
                          </button>
                          {overrideGearItems !== null && (
                            <button
                              type="button"
                              onClick={() => setOverrideGearItems(null)}
                              className="flex items-center gap-1 text-[10px] text-[var(--text-muted)] hover:text-[#FF9438]/70 transition-colors"
                            >
                              <RotateCcw className="h-2.5 w-2.5" />
                              Reset
                            </button>
                          )}
                        </div>
                      </div>
                      {/* Item chips */}
                      {effectiveGearItems.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {effectiveGearItems.map((itemId) => {
                            const details = ITEM_LOOKUP.get(itemId);
                            return (
                              <div
                                key={itemId}
                                className="group flex items-center gap-1.5 pl-1.5 pr-1 py-1 rounded-lg bg-[#E8720C]/[0.04] border border-[#E8720C]/12 hover:border-[#E8720C]/30 transition-colors"
                              >
                                {details?.icon ? (
                                  <Image
                                    src={details.icon}
                                    alt={details.label}
                                    width={20}
                                    height={20}
                                    className="w-5 h-5 object-contain flex-shrink-0"
                                    onError={(e) => {
                                      (e.target as HTMLImageElement).style.display = "none";
                                    }}
                                  />
                                ) : (
                                  <div className="w-5 h-5 rounded bg-[#E8720C]/[0.08] flex-shrink-0" />
                                )}
                                <span className="text-[11px] text-[var(--text-secondary)] leading-tight max-w-[110px] truncate">
                                  {details?.label ?? itemId}
                                </span>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setOverrideGearItems(
                                      (overrideGearItems ?? localLoadoutItems).filter(
                                        (id) => id !== itemId
                                      )
                                    )
                                  }
                                  className="ml-0.5 text-[var(--text-muted)] hover:text-red-400/80 transition-colors flex-shrink-0"
                                  title="Remove from pricing"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-[10px] text-[var(--text-muted)] italic">
                          All items removed â€” no gear bonus applied.
                        </p>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <a
                  href="/loadouts"
                  className="inline-flex items-center gap-1.5 text-xs text-[var(--text-muted)] hover:text-[#FF9438]/70 transition-colors"
                >
                  <BookUser className="h-3 w-3" />
                  Save your account at /loadouts to enable gear-based pricing
                </a>
              )}
            </div>
          )}

          {/* Per item: item selector */}
          {type === "per_item" && (
            <div className="space-y-2">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                Select item <span className="text-red-400">*</span>
              </label>
              <select
                value={(config["item"] as string) ?? ""}
                onChange={(e) => onChange({ ...config, item: e.target.value })}
                className={cn(
                  "w-full h-9 rounded-lg border border-[#E8720C]/15 bg-black/20",
                  "px-3 text-sm text-[var(--text-primary)]",
                  "focus:outline-none focus:border-[#E8720C]/40 [color-scheme:dark]"
                )}
              >
                <option value="">â€” Select â€”</option>
                {((priceMatrix as PerItemPriceMatrix).items ?? []).map((it) => (
                  <option key={it.id} value={it.id}>
                    {it.label} â€” {formatUSD(it.price)}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Per unit: quantity */}
          {type === "per_unit" && (() => {
            const pm = priceMatrix as PerUnitPriceMatrix;
            const minU = pm.minimum_units ?? 1;
            const maxU = pm.maximum_units ?? 9999;
            const qty = Math.max(minU, Math.min(maxU, Number(config["quantity"]) || minU));
            const unitSingular = (pm.unit_label ?? "units").replace(/s$/, "");
            return (
              <div className="space-y-2">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                  Number of {pm.unit_label}
                </label>
                <div className="flex items-center gap-2.5">
                  <LevelInput
                    value={qty}
                    min={minU}
                    max={maxU}
                    onChange={(v) => onChange({ ...config, quantity: v })}
                  />
                  {pm.price_per_unit != null && pm.price_per_unit > 0 && (
                    <span className="text-[11px] text-[#FF9438]/60">
                      {formatUSD(pm.price_per_unit)}/{unitSingular}
                    </span>
                  )}
                </div>
                {minU > 0 && (
                  <p className="text-[11px] text-[var(--text-muted)]">
                    Min. {minU}
                    {maxU < 999999 ? ` â€” Max. ${maxU}` : ""}
                  </p>
                )}
              </div>
            );
          })()}

          {/* Boss tiered: boss selector, kills, modifiers */}
          {type === "boss_tiered" && (() => {
            const bm = priceMatrix as BossTieredPriceMatrix;
            const unitLabel = bm.unit_label ?? "kills";
            const unitSingular = unitLabel.replace(/s$/, "");
            const bosses = bm.bosses ?? [];
            const selectedBossId = (config["boss"] as string) ?? bosses[0]?.id;
            const selectedBoss = bosses.find((b) => b.id === selectedBossId);
            const activeModifiers = (selectedBoss?.modifiers?.length ? selectedBoss.modifiers : bm.modifiers) ?? [];
            const minK = bm.minimum_kills ?? 1;
            const maxK = bm.maximum_kills ?? 10000;
            const kills = Math.max(minK, Math.min(maxK, Number(config["kills"]) || minK));
            const applicableTier = selectedBoss?.kill_tiers?.find(
              (t) => kills >= t.min_kills && kills <= t.max_kills
            ) ?? selectedBoss?.kill_tiers?.[0];
            return (
              <>
                {bosses.length > 1 && (
                  <div className="space-y-2">
                    <label className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                      Boss
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {bosses.map((boss) => {
                        const sel = selectedBossId === boss.id;
                        return (
                          <button
                            key={boss.id}
                            type="button"
                            onClick={() =>
                              onChange({
                                ...config,
                                boss: boss.id,
                                kills: bm.minimum_kills ?? 1,
                              })
                            }
                            className={cn(
                              "px-3 py-2 rounded-lg border text-xs font-medium text-left transition-all",
                              sel
                                ? "border-[#E8720C]/50 bg-[#E8720C]/10 text-[#FF9438]"
                                : "border-[#E8720C]/12 hover:border-[#E8720C]/30 text-[var(--text-secondary)]"
                            )}
                          >
                            {boss.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
                <div className="space-y-2">
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                    Number of {unitLabel}
                  </label>
                  <div className="flex items-center gap-2.5">
                    <LevelInput
                      value={kills}
                      min={minK}
                      max={maxK}
                      onChange={(v) => onChange({ ...config, kills: v })}
                    />
                    {applicableTier && (
                      <span className="text-[11px] text-[#FF9438]/60">
                        {formatUSD(applicableTier.price_per_kill)}/{unitSingular}
                      </span>
                    )}
                  </div>
                  {minK > 0 && (
                    <p className="text-[11px] text-[var(--text-muted)]">
                      Min. {minK}{maxK < 999999 ? ` â€” Max. ${maxK}` : ""}
                    </p>
                  )}
                </div>
                {activeModifiers.map((mod) => (
                  <div key={mod.id} className="space-y-2">
                    <label className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-1">
                      {mod.label}
                      {mod.required && <span className="text-red-400">*</span>}
                    </label>
                    {mod.type === "radio" && (
                      <div className="flex flex-wrap gap-1.5">
                        {mod.options?.map((opt) => {
                          const key = opt.value || opt.label;
                          const sel = (config[`boss_mod_${mod.id}`] as string) === key;
                          return (
                            <button
                              key={key}
                              type="button"
                              onClick={() =>
                                onChange({
                                  ...config,
                                  [`boss_mod_${mod.id}`]: sel ? "" : key,
                                })
                              }
                              className={cn(
                                "px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all",
                                sel
                                  ? "border-[#E8720C]/50 bg-[#E8720C]/10 text-[#FF9438]"
                                  : "border-[#E8720C]/12 hover:border-[#E8720C]/30 text-[var(--text-secondary)]"
                              )}
                            >
                              {opt.label}
                            </button>
                          );
                        })}
                      </div>
                    )}
                    {mod.type === "select" && (
                      <select
                        value={(config[`boss_mod_${mod.id}`] as string) ?? ""}
                        onChange={(e) =>
                          onChange({ ...config, [`boss_mod_${mod.id}`]: e.target.value })
                        }
                        className={cn(
                          "w-full h-9 rounded-lg border border-[#E8720C]/15 bg-black/20 px-3 text-sm",
                          "focus:outline-none focus:border-[#E8720C]/40 [color-scheme:dark]"
                        )}
                      >
                        <option value="">â€” Select â€”</option>
                        {mod.options?.map((opt) => (
                          <option key={opt.value || opt.label} value={opt.value || opt.label}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                ))}
                {/* Boss tiered stats: show StatCalculator (like Firecape) when no account selected */}
                {((selectedBoss?.stats ?? bm.stats)?.length ?? 0) > 0 && (
                  <div className="space-y-2 pt-2 border-t border-[#E8720C]/8">
                    {(selectedLoadoutId || gearLoadoutId) ? (
                      <p className="text-[11px] text-white/30">
                        Pricing uses loadout stats.
                      </p>
                    ) : onStatsChange ? (
                      <>
                        <label className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                          Enter your stats
                        </label>
                        <p className="text-[11px] text-white/30 mb-2">
                          Higher stats = lower price.
                        </p>
                        <StatCalculator
                          matrix={{
                            type: "stat_based",
                            base_price: 0,
                            stats: selectedBoss?.stats ?? bm.stats ?? [],
                          } as StatBasedPriceMatrix}
                          selections={stats}
                          onChange={onStatsChange}
                        />
                      </>
                    ) : (
                      <p className="text-[11px] text-white/30">
                        Pricing uses loadout stats.
                      </p>
                    )}
                  </div>
                )}
              </>
            );
          })()}

          {/* Stat based: show StatCalculator when no account selected, else use loadout stats */}
          {type === "stat_based" && (
            <div className="space-y-4">
              {gearLoadoutId ? (
                <p className="text-[11px] text-white/30">
                  Pricing uses loadout stats.
                </p>
              ) : (priceMatrix as StatBasedPriceMatrix).stats?.length > 0 &&
                onStatsChange ? (
                  <div className="space-y-2">
                    <label className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                      Enter your stats
                    </label>
                    <p className="text-[11px] text-white/30 mb-2">
                      Higher stats = lower price.
                    </p>
                    <StatCalculator
                      matrix={
                        {
                          type: "stat_based",
                          base_price: 0,
                          stats: (priceMatrix as StatBasedPriceMatrix).stats,
                        } as StatBasedPriceMatrix
                      }
                      selections={stats}
                      onChange={onStatsChange}
                    />
                  </div>
                ) : (
                  <p className="text-[11px] text-white/30">
                    Pricing uses loadout stats.
                  </p>
                )}
              {formConfig?.fields
                ?.filter(
                  (f: FormField) =>
                    f.type !== "skill_range" &&
                    f.type !== "item_select" &&
                    f.type !== "number"
                )
                ?.map((field: FormField) => (
                  <div key={field.id} className="space-y-2">
                    <label className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-1">
                      {field.label}
                      {field.required && <span className="text-red-400">*</span>}
                    </label>
                    {field.type === "checkbox" && (
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={(config[field.id] as boolean) ?? false}
                          onChange={(e) =>
                            onChange({ ...config, [field.id]: e.target.checked })
                          }
                          className="rounded border-[#E8720C]/30 text-orange-500"
                        />
                        <span className="text-sm text-[var(--text-secondary)]">
                          {field.placeholder || field.label}
                          {field.multiplier && field.multiplier !== 1 && (
                            <span className="text-[#FF9438]/80 ml-1">
                              Ã—{field.multiplier}
                            </span>
                          )}
                          {field.price_add && (
                            <span className="text-[#FF9438]/80 ml-1">
                              +{formatUSD(field.price_add)}
                            </span>
                          )}
                        </span>
                      </label>
                    )}
                    {field.type === "select" && (
                      <select
                        value={(config[field.id] as string) ?? ""}
                        onChange={(e) =>
                          onChange({ ...config, [field.id]: e.target.value })
                        }
                        className={cn(
                          "w-full h-9 rounded-lg border border-[#E8720C]/15 bg-black/20 px-3 text-sm",
                          "focus:outline-none focus:border-[#E8720C]/40 [color-scheme:dark]"
                        )}
                      >
                        <option value="">â€” Select â€”</option>
                        {field.options?.map((opt) => {
                          const key = opt.value || opt.label;
                          return (
                            <option key={key} value={key}>
                              {opt.label}
                              {opt.multiplier && opt.multiplier !== 1
                                ? ` (Ã—${opt.multiplier})`
                                : ""}
                              {opt.price_add
                                ? ` (+${formatUSD(opt.price_add)})`
                                : ""}
                            </option>
                          );
                        })}
                      </select>
                    )}
                    {field.type === "radio" && (
                      <div className="flex flex-wrap gap-1.5">
                        {field.options?.map((opt) => {
                          const key = opt.value || opt.label;
                          const sel =
                            (config[field.id] as string) === key;
                          return (
                            <button
                              key={key}
                              type="button"
                              onClick={() =>
                                onChange({
                                  ...config,
                                  [field.id]: sel ? "" : key,
                                })
                              }
                              className={cn(
                                "px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all",
                                sel
                                  ? "border-[#E8720C]/50 bg-[#E8720C]/10 text-[#FF9438]"
                                  : "border-[#E8720C]/12 hover:border-[#E8720C]/30 text-[var(--text-secondary)]"
                              )}
                            >
                              {opt.label}
                              {opt.multiplier &&
                                opt.multiplier !== 1 &&
                                ` Ã—${opt.multiplier}`}
                            </button>
                          );
                        })}
                      </div>
                    )}
                    {field.type === "multi_select" && (
                      <div className="flex flex-wrap gap-1.5">
                        {field.options?.map((opt) => {
                          const key = opt.value || opt.label;
                          const cur =
                            (config[field.id] as string[] | undefined) ?? [];
                          const sel = cur.includes(key);
                          return (
                            <button
                              key={key}
                              type="button"
                              onClick={() =>
                                onChange({
                                  ...config,
                                  [field.id]: sel
                                    ? cur.filter((k) => k !== key)
                                    : [...cur, key],
                                })
                              }
                              className={cn(
                                "px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all",
                                sel
                                  ? "border-[#E8720C]/50 bg-[#E8720C]/10 text-[#FF9438]"
                                  : "border-[#E8720C]/12 hover:border-[#E8720C]/30 text-[var(--text-secondary)]"
                              )}
                            >
                              {opt.label}
                              {opt.multiplier &&
                                opt.multiplier !== 1 &&
                                ` Ã—${opt.multiplier}`}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}
            </div>
          )}

          {/* Fallback when type unknown or no config UI */}
          {type && !["per_item", "per_unit", "boss_tiered", "stat_based"].includes(type) && (
            <p className="text-[11px] text-white/30">
              Configured in admin. Price: {formatUSD(price)}.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

/* â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”
   Summary Item â€” single row in the build summary
   â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â” */

function SummaryItem({
  item,
  onRemove,
}: {
  item: BuildItem;
  onRemove: () => void;
}) {
  const theme = TAB_THEME[item.tab];
  const Icon = theme.icon;

  // Try to extract a skill icon for skills tab items
  const skillIconUrl = item.tab === "skills"
    ? OSRS_SKILLS.find((s) =>
        item.label.toLowerCase().includes(s.label.toLowerCase())
      )?.icon ?? null
    : null;

  return (
    <div
      className={cn(
        "flex items-center justify-between py-2.5 px-3 rounded-lg transition-colors",
        theme.summaryBg,
        "group/item"
      )}
    >
      <div className="flex items-center gap-2.5 min-w-0 flex-1">
        {skillIconUrl ? (
          <Image src={skillIconUrl} alt="" width={16} height={16} className="shrink-0 object-contain" unoptimized />
        ) : (
          <Icon className={cn("h-3.5 w-3.5 shrink-0", theme.priceClasses)} />
        )}
        <span className="text-sm text-[var(--text-secondary)] truncate">
          {item.label}
        </span>
      </div>
      <div className="flex items-center gap-2.5 shrink-0">
        <span
          className={cn(
            "text-sm font-bold tabular-nums",
            theme.priceClasses
          )}
        >
          {formatUSD(item.price)}
        </span>
        <button
          type="button"
          onClick={onRemove}
          className="p-0.5 text-white/10 hover:text-red-400 opacity-0 group-hover/item:opacity-100 transition-all duration-200"
          aria-label="Remove"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}

/* â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”
   Empty state for tabs
   â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â” */

function EmptyTab({ message }: { message: string }) {
  return (
    <div className="col-span-2 text-center py-16">
      <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-white/[0.03] border border-white/[0.06] mb-4">
        <Sparkles className="h-6 w-6 text-white/15" />
      </div>
      <p className="text-sm text-white/20">{message}</p>
    </div>
  );
}

/* â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”
   Main â€” AccountBuilderClient
   â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â” */

interface Props {
  game: GameData;
  categories: CategoryData[];
  servicesByCategory: Record<string, ServiceData[]>;
}

export default function AccountBuilderClient({
  game,
  categories,
  servicesByCategory,
}: Props) {
  const router = useRouter();
  const { addItem } = useCartStore();
  const { setCartOpen } = useUIStore();
  const { user } = useAuth();
  const supabase = createClient();

  const [state, dispatch] = useReducer(buildReducer, {
    stats: {},
    configs: {},
    active: new Set<string>(),
  });

  type LoadoutSummary = GearLoadoutOption & { stats?: Record<string, number> };
  const [loadouts, setLoadouts] = useState<LoadoutSummary[]>([]);       // all loadouts (for gear selector)
  const [statsLoadouts, setStatsLoadouts] = useState<LoadoutSummary[]>([]); // only loadouts with stats
  const [selectedLoadoutId, setSelectedLoadoutId] = useState<string | null>(null);
  const [loadoutsLoading, setLoadoutsLoading] = useState(false);
  const [loadoutItems, setLoadoutItems] = useState<string[]>([]);

  // Fetch all loadouts + auto-select active loadout
  useEffect(() => {
    if (!user?.id) return;
    setLoadoutsLoading(true);
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
        const withStats = all.filter((l) => l.stats && Object.keys(l.stats).length > 0);
        setLoadouts(all);          // alle loadouts â†’ gear selector
        setStatsLoadouts(withStats); // enkel met stats â†’ saved accounts picker
        if (activeId && withStats.find((l) => l.id === activeId)) {
          setSelectedLoadoutId(activeId);
        }
      } catch {
        // ignore
      } finally {
        setLoadoutsLoading(false);
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, supabase]);

  const applyLoadout = useCallback((loadout: LoadoutSummary) => {
    setSelectedLoadoutId(loadout.id);
  }, []);

  const clearLoadout = useCallback(() => {
    setSelectedLoadoutId(null);
    setLoadoutItems([]);
    dispatch({ type: "SET_STATS", stats: {} });
  }, []);

  // Category slugs for tabs (first category as default)
  const categorySlugs = useMemo(
    () => categories.map((c) => c.slug).filter(Boolean),
    [categories]
  );
  const validTabSlugs = useMemo(
    () => [...categorySlugs, ...(servicesByCategory["other"]?.length ? ["other"] : [])],
    [categorySlugs, servicesByCategory]
  );
  const [activeTab, setActiveTab] = useState<string>(
    () => validTabSlugs[0] ?? ""
  );
  useEffect(() => {
    if (validTabSlugs.length > 0 && !validTabSlugs.includes(activeTab)) {
      setActiveTab(validTabSlugs[0]);
    }
  }, [validTabSlugs, activeTab]);
  const [statsExpanded, setStatsExpanded] = useState(true);

  /* â”€â”€ Derived data (unchanged logic) â”€â”€ */

  const allServices = useMemo(
    () => Object.values(servicesByCategory).flat(),
    [servicesByCategory]
  );

  const skillServices = useMemo(
    () =>
      allServices.filter(
        (s) => getPricingType(s.price_matrix) === "xp_based"
      ),
    [allServices]
  );

  // When selectedLoadoutId or statsLoadouts changes: apply stats + skill start_levels + gear
  useEffect(() => {
    if (!selectedLoadoutId) return;
    const loadout = statsLoadouts.find((l) => l.id === selectedLoadoutId);
    if (!loadout) return;

    // 1. Stats voor quest/boss pricing
    dispatch({ type: "SET_STATS", stats: toPricingStats(loadout.stats ?? {}) });

    // 2. Pre-fill start_level per skill-service op basis van het account level
    for (const service of skillServices) {
      const pm = service.price_matrix as { skills?: { id: string }[] } | null;
      const firstSkill = pm?.skills?.[0];
      if (!firstSkill) continue;
      const lvl = loadout.stats?.[firstSkill.id];
      if (lvl && lvl >= 1 && lvl < 99) {
        dispatch({
          type: "SET_CONFIG",
          serviceId: service.id,
          config: { skill: firstSkill.id, start_level: lvl, end_level: 99 },
        });
      }
    }

    // 3. Deriveer een platte lijst van uitgeruste item-IDs voor loadout-gebaseerde prijsmodifiers
    const items: string[] = [];
    const equipment = normaliseEquipmentByStyle(loadout.equipment ?? null);
    for (const slotMap of Object.values(equipment)) {
      for (const itemId of Object.values(slotMap)) {
        if (itemId && !items.includes(itemId)) items.push(itemId);
      }
    }
    for (const itemId of loadout.special_weapons ?? []) {
      if (itemId && !items.includes(itemId)) items.push(itemId);
    }
    setLoadoutItems(items);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedLoadoutId, statsLoadouts]);

  const questServices = useMemo(
    () =>
      allServices.filter(
        (s) => getPricingType(s.price_matrix) === "per_item_stat_based"
      ),
    [allServices]
  );
  const extrasServices = useMemo(
    () =>
      allServices.filter((s) => {
        const t = getPricingType(s.price_matrix);
        return t && !["xp_based", "per_item_stat_based"].includes(t);
      }),
    [allServices]
  );

  const needsStats =
    questServices.length > 0 ||
    extrasServices.some((s) => {
      const pm = s.price_matrix as {
        type?: string;
        stats?: unknown[];
      } | null;
      return (
        pm?.type === "boss_tiered" ||
        pm?.type === "stat_based" ||
        pm?.type === "per_item_stat_based"
      );
    });

  // Map loadout id â†’ gear item ids (zelfde logica als service configurator)
  const loadoutIdToItems = useMemo((): Record<string, string[]> => {
    const map: Record<string, string[]> = {};
    for (const loadout of loadouts) {
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
      map[loadout.id] = items;
    }
    return map;
  }, [loadouts]);

  const buildItems = useMemo((): BuildItem[] => {
    const items: BuildItem[] = [];
    for (const key of state.active) {
      const isQuestItem = key.includes(":");
      const [sid, itemIdFromKey] = isQuestItem ? key.split(":") : [key, null];
      const service = allServices.find((s) => s.id === sid);
      if (!service) continue;
      const config = state.configs[key] ?? (isQuestItem && itemIdFromKey ? { item: itemIdFromKey } : {});
      const formConfig = service.form_config as FormConfig | null;
      const priceMatrix = service.price_matrix as PriceMatrix | null;
      if (!formConfig || !priceMatrix) continue;
      const pmType = (priceMatrix as { type?: string }).type;
      const effectiveLoadoutId = (config["loadout_id"] as string | null | undefined) ?? selectedLoadoutId ?? null;
      const loadoutItemsForService = effectiveLoadoutId ? (loadoutIdToItems[effectiveLoadoutId] ?? []) : [];
      const selections = {
        ...config,
        ...(isQuestItem ? { item: itemIdFromKey ?? config["item"] } : {}),
        ...(needsStats
          ? Object.fromEntries(
              Object.entries(state.stats).map(([k, v]) => [
                k.startsWith("stat_") ? k : `stat_${k}`,
                v,
              ])
            )
          : {}),
        ...(pmType === "boss_tiered" || pmType === "stat_based"
          ? { loadout_items: loadoutItemsForService }
          : {}),
      } as Selections;
      let price = service.base_price;
      try {
        const bd = calculatePrice(priceMatrix, formConfig, selections);
        price = bd.final;
      } catch {
        // keep base_price
      }
      const tab = getTabForService(service);
      let label = service.name;
      if (
        priceMatrix &&
        (priceMatrix as XpBasedPriceMatrix).type === "xp_based"
      ) {
        const routeSegs = config["route_segments"] as RouteSegment[] | undefined;
        if (routeSegs && routeSegs.length > 0) {
          const firstFrom = routeSegs[0]?.from_level ?? 1;
          const lastTo = routeSegs[routeSegs.length - 1]?.to_level ?? 99;
          label = `${service.name} ${firstFrom}â†’${lastTo} (route)`;
        } else {
          const from = config["start_level"] ?? 1;
          const to = config["end_level"] ?? 99;
          label = `${service.name} ${from}â†’${to}`;
        }
      }
      if (
        priceMatrix &&
        (priceMatrix as PerItemStatBasedPriceMatrix).type === "per_item_stat_based"
      ) {
        const pm = priceMatrix as PerItemStatBasedPriceMatrix;
        const itemId = (config["item"] as string) ?? itemIdFromKey;
        const item = pm.items?.find((i) => i.id === itemId);
        if (item) {
          label = `${service.name}: ${item.label}`;
        }
      }
      if (priceMatrix && (priceMatrix as PerItemPriceMatrix).type === "per_item") {
        const pm = priceMatrix as PerItemPriceMatrix;
        const itemId = config["item"] as string | undefined;
        const item = pm.items?.find((i) => i.id === itemId);
        if (item) {
          label = `${service.name}: ${item.label}`;
        }
      }
      if (priceMatrix && (priceMatrix as BossTieredPriceMatrix).type === "boss_tiered") {
        const pm = priceMatrix as BossTieredPriceMatrix;
        const unitLabel = pm.unit_label ?? "kills";
        const bossId = config["boss"] as string | undefined;
        const boss = pm.bosses?.find((b) => b.id === bossId) ?? pm.bosses?.[0];
        const kills = config["kills"] ?? pm.minimum_kills ?? 1;
        if (boss) {
          label = `${service.name}: ${boss.label} (${kills} ${unitLabel})`;
        }
      }
      if (priceMatrix && (priceMatrix as PerUnitPriceMatrix).type === "per_unit") {
        const pm = priceMatrix as PerUnitPriceMatrix;
        const qty = config["quantity"] ?? pm.minimum_units ?? 1;
        label = `${service.name}: ${qty} ${pm.unit_label}`;
      }
      items.push({
        id: `${key}-${Date.now()}`,
        serviceId: sid,
        service,
        configuration: config,
        price,
        label,
        tab,
        buildKey: key, // serviceId or serviceId:itemId for quests
      });
    }
    return items;
  }, [state.active, state.configs, state.stats, allServices, needsStats, loadoutIdToItems, selectedLoadoutId]);

  const total = useMemo(
    () => buildItems.reduce((sum, i) => sum + i.price, 0),
    [buildItems]
  );

  const setConfig = useCallback(
    (serviceId: string, config: Record<string, unknown>) => {
      dispatch({ type: "SET_CONFIG", serviceId, config });
    },
    []
  );

  const statMatrixForCalculator = useMemo((): StatBasedPriceMatrix | null => {
    const first =
      questServices[0] ??
      extrasServices.find(
        (s) =>
          (s.price_matrix as { stats?: unknown[] })?.stats?.length
      );
    const pm = first?.price_matrix as {
      stats?: {
        id: string;
        label: string;
        min: number;
        max: number;
        thresholds: { max: number; multiplier: number }[];
      }[];
    } | null;
    if (!pm?.stats?.length) return null;
    return {
      type: "stat_based",
      base_price: 0,
      stats: pm.stats,
    } as StatBasedPriceMatrix;
  }, [questServices, extrasServices]);

  const buildCartConfiguration = useCallback(
    (item: BuildItem) => {
      const cfg = { ...item.configuration };
      if (needsStats && Object.keys(state.stats).length > 0) {
        for (const [k, v] of Object.entries(state.stats)) {
          cfg[k.startsWith("stat_") ? k : `stat_${k}`] = v;
        }
      }
      return cfg;
    },
    [needsStats, state.stats]
  );

  const categorySlugByServiceId = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of categories) {
      for (const s of servicesByCategory[c.slug] ?? []) {
        map.set(s.id, c.slug);
      }
    }
    for (const s of servicesByCategory["other"] ?? []) {
      if (!map.has(s.id)) map.set(s.id, "other");
    }
    return map;
  }, [categories, servicesByCategory]);

  const handleAddToCart = useCallback(() => {
    for (const item of buildItems) {
      addItem({
        id: `${item.serviceId}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        serviceId: item.serviceId,
        gameId: game.id,
        gameName: game.name,
        gameSlug: game.slug,
        categorySlug: categorySlugByServiceId.get(item.serviceId),
        serviceName: item.label,
        serviceSlug: item.service.slug,
        gameLogoUrl: game.logo_url,
        configuration: buildCartConfiguration(item),
        basePrice: item.price,
        finalPrice: item.price,
        quantity: 1,
      });
    }
    setCartOpen(true);
  }, [buildItems, game, addItem, setCartOpen, buildCartConfiguration, categorySlugByServiceId]);

  const handleCheckout = useCallback(() => {
    for (const item of buildItems) {
      addItem({
        id: `${item.serviceId}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        serviceId: item.serviceId,
        gameId: game.id,
        gameName: game.name,
        gameSlug: game.slug,
        categorySlug: categorySlugByServiceId.get(item.serviceId),
        serviceName: item.label,
        serviceSlug: item.service.slug,
        gameLogoUrl: game.logo_url,
        configuration: buildCartConfiguration(item),
        basePrice: item.price,
        finalPrice: item.price,
        quantity: 1,
      });
    }
    router.push("/checkout");
  }, [buildItems, game, addItem, router, buildCartConfiguration, categorySlugByServiceId]);

  /* â”€â”€ Category tabs (elke categorie vermeld) â”€â”€ */
  const categoryTabs = useMemo(() => {
    const tabs: { id: string; label: string; slug: string; count: number; icon: string | null }[] = [];
    for (const cat of categories) {
      const svcs = servicesByCategory[cat.slug] ?? [];
      const count = buildItems.filter((i) => svcs.some((s) => s.id === i.serviceId)).length;
      tabs.push({ id: cat.id, label: cat.name, slug: cat.slug, count, icon: cat.icon });
    }
    if (servicesByCategory["other"]?.length) {
      const count = buildItems.filter((i) => (servicesByCategory["other"] ?? []).some((s) => s.id === i.serviceId)).length;
      tabs.push({ id: "other", label: "Other", slug: "other", count, icon: null });
    }
    return tabs;
  }, [categories, servicesByCategory, buildItems]);

  const activeCategorySlug = categoryTabs.some((t) => t.slug === activeTab) ? activeTab : (categoryTabs[0]?.slug ?? "");

  return (
    <div className="space-y-6">
      {/* â”€â”€ Header â”€â”€ */}
      <div className="relative">
        <div className="absolute -top-20 left-0 w-[600px] h-[200px] bg-[#E8720C]/[0.04] rounded-full blur-3xl pointer-events-none" />
        <div className="relative flex items-start gap-4">
          {game.logo_url && (
            <div className="shrink-0 h-14 w-14 sm:h-16 sm:w-16 rounded-2xl overflow-hidden border border-white/[0.08] bg-black/30 hidden sm:flex items-center justify-center">
              <Image src={game.logo_url} alt={game.name} width={64} height={64} className="object-cover w-full h-full" unoptimized />
            </div>
          )}
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <h1 className="font-heading text-2xl sm:text-3xl font-bold text-[var(--text-primary)] tracking-tight">
                Account Builder
              </h1>
              <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#E8720C]/10 border border-[#E8720C]/25 text-[10px] font-semibold text-[#FF9438] uppercase tracking-wider">
                <Sparkles className="h-2.5 w-2.5" />
                Live pricing
              </span>
            </div>
            <p className="text-[var(--text-muted)] text-sm">
              {game.name} Â· Configure skills, quests &amp; extras â€” one checkout
            </p>
          </div>
        </div>
      </div>

      {/* â”€â”€ Loadout picker â”€â”€ */}
      <div className={cn(
        "rounded-2xl border overflow-hidden transition-all duration-300",
        "border-[#E8720C]/15 bg-[#E8720C]/[0.02]"
      )}>
        <div className="flex items-center justify-between px-4 py-3 gap-3">
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#E8720C]/10">
              <BookUser className="h-3.5 w-3.5 text-[#FF9438]" />
            </div>
            <span className="font-medium text-[var(--text-primary)] text-sm">
              Saved accounts
            </span>
            {selectedLoadoutId && (
              <span className="flex items-center gap-1 text-[11px] text-[#FF9438] font-semibold">
                <Check className="h-3 w-3" />
                Stats loaded
              </span>
            )}
          </div>

          {!user ? (
            <a
              href="/login"
              className="flex items-center gap-1.5 text-xs font-semibold text-[#E8720C]/70 hover:text-[#FF9438] transition-colors"
            >
              <LogIn className="h-3.5 w-3.5" />
              Sign in
            </a>
          ) : loadoutsLoading ? (
            <span className="text-xs text-white/25">Loadingâ€¦</span>
          ) : statsLoadouts.length === 0 ? (
            <a
              href="/loadouts"
              className="text-xs text-white/30 hover:text-white/50 transition-colors"
            >
              Save your account â†’
            </a>
          ) : (
            <div className="flex items-center gap-1.5 flex-wrap justify-end">
              {statsLoadouts.map((l) => {
                const isSel = selectedLoadoutId === l.id;
                return (
                  <button
                    key={l.id}
                    type="button"
                    onClick={() => isSel ? clearLoadout() : applyLoadout(l)}
                    className={cn(
                      "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all duration-200",
                      isSel
                        ? "border-[#E8720C]/50 bg-[#E8720C]/10 text-[#FF9438]"
                        : "border-white/[0.07] bg-white/[0.02] text-[var(--text-secondary)] hover:border-[#E8720C]/25 hover:bg-[#E8720C]/[0.04]"
                    )}
                  >
                    {isSel && <Check className="h-3 w-3" />}
                    {l.name}
                  </button>
                );
              })}
              <a
                href="/loadouts"
                className="text-[11px] text-white/20 hover:text-white/40 transition-colors ml-1"
                title="Manage accounts"
              >
                + New
              </a>
            </div>
          )}
        </div>
      </div>

      {/* â”€â”€ Stats panel â€” only show when no saved account (stats come from loadout when account set up) â”€â”€ */}
      {needsStats && statMatrixForCalculator && !selectedLoadoutId && (
        <div
          className={cn(
            "rounded-2xl border overflow-hidden transition-all duration-300",
            "border-[#E8720C]/15 bg-[#E8720C]/[0.02]",
            "hover:border-[#E8720C]/28"
          )}
        >
          <button
            type="button"
            onClick={() => setStatsExpanded((v) => !v)}
            className="w-full flex items-center justify-between p-4 text-left group/stats"
          >
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-orange-500/10">
                <Settings2 className="h-3.5 w-3.5 text-orange-400" />
              </div>
              <span className="font-medium text-[var(--text-primary)]">
                Account stats
              </span>
              <span className="text-xs text-white/20">
                affects quest & boss pricing
              </span>
            </div>
            <div className="p-1 rounded-lg text-white/30 group-hover/stats:text-white/50 transition-colors">
              {statsExpanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </div>
          </button>
          {statsExpanded && (
            <div className="px-4 pb-4 border-t border-[#E8720C]/08">
              <StatCalculator
                matrix={statMatrixForCalculator}
                selections={state.stats}
                onChange={(s) => dispatch({ type: "SET_STATS", stats: s })}
              />
            </div>
          )}
        </div>
      )}

      {/* â”€â”€ Main grid â”€â”€ */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 items-start">
        {/* Left: services */}
        <div>
          {/* Category tabs */}
          <div className="flex gap-2 mb-5 p-1 rounded-2xl bg-black/20 border border-white/[0.04] w-fit flex-wrap">
            {categoryTabs.map((tab) => {
              const isActive = activeCategorySlug === tab.slug;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.slug)}
                  className={cn(
                    "relative flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-semibold transition-all duration-300",
                    isActive
                      ? TAB_THEME.extras.tabActiveClasses
                      : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
                  )}
                >
                  <span className="text-base">{tab.icon ?? "ðŸ“¦"}</span>
                  {tab.label}
                  {tab.count > 0 && (
                    <span
                      className={cn(
                        "px-1.5 py-0.5 rounded-full text-[10px] font-bold tabular-nums",
                        isActive
                          ? TAB_THEME.extras.badgeClasses
                          : "bg-white/[0.08] text-white/40"
                      )}
                    >
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Services per category â€” elke categorie toont zijn eigen services */}
          {categoryTabs.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(servicesByCategory[activeCategorySlug] ?? []).length === 0 ? (
                <EmptyTab message="No services in this category yet." />
              ) : (
              (servicesByCategory[activeCategorySlug] ?? []).map((service) => {
                const pmType = getPricingType(service.price_matrix);
                const pm = service.price_matrix;
                const fc = service.form_config as FormConfig | null;

                if (pmType === "xp_based") {
                  const xpPm = pm as XpBasedPriceMatrix;
                  const skills = xpPm?.skills ?? [];
                  const defaultSkill = skills[0]?.id;
                  const config = state.configs[service.id] ?? {
                    skill: defaultSkill,
                    start_level: 1,
                    end_level: 99,
                  };
                  return (
                    <SkillSlider
                      key={service.id}
                      service={service}
                      config={config}
                      priceMatrix={xpPm}
                      formConfig={fc}
                      onChange={(cfg) => setConfig(service.id, cfg)}
                      onRemove={() =>
                        dispatch({ type: "REMOVE_SERVICE", serviceId: service.id })
                      }
                      onToggle={() =>
                        dispatch({ type: "TOGGLE_SERVICE", serviceId: service.id })
                      }
                      isActive={state.active.has(service.id)}
                    />
                  );
                }

                if (pmType === "per_item_stat_based") {
                  return (
                    <QuestCard
                      key={service.id}
                      service={service}
                      priceMatrix={pm as PerItemStatBasedPriceMatrix}
                      formConfig={fc}
                      stats={state.stats}
                      getItemConfig={(itemId) =>
                        state.configs[`${service.id}:${itemId}`] ?? { item: itemId }
                      }
                      onConfigChange={(itemId, updates) => {
                        const key = `${service.id}:${itemId}`;
                        const cur = state.configs[key] ?? { item: itemId };
                        dispatch({
                          type: "SET_CONFIG",
                          serviceId: key,
                          config: { ...cur, ...updates },
                        });
                      }}
                      onToggleItem={(itemId) =>
                        dispatch({
                          type: "TOGGLE_QUEST_ITEM",
                          serviceId: service.id,
                          itemId,
                        })
                      }
                      onRemoveItem={(itemId) =>
                        dispatch({
                          type: "REMOVE_SERVICE",
                          serviceId: `${service.id}:${itemId}`,
                        })
                      }
                      isItemActive={(itemId) =>
                        state.active.has(`${service.id}:${itemId}`)
                      }
                    />
                  );
                }

                const pmTypeExtras = (pm as { type?: string })?.type ?? (fc as { pricing_type?: string })?.pricing_type;
                const config = state.configs[service.id] ?? (() => {
                  if (!pm && !fc) return {};
                  if (pmTypeExtras === "boss_tiered" && pm) {
                    const bm = pm as BossTieredPriceMatrix;
                    return {
                      boss: bm.bosses?.[0]?.id,
                      kills: bm.minimum_kills ?? 1,
                    };
                  }
                  if (pmTypeExtras === "per_item" && pm) {
                    const im = pm as PerItemPriceMatrix;
                    return { item: im.items?.[0]?.id };
                  }
                  if (pmTypeExtras === "per_unit" && pm) {
                    const um = pm as PerUnitPriceMatrix;
                    return { quantity: um.minimum_units ?? 1 };
                  }
                  return {};
                })();
                return (
                  <ExtrasCard
                    key={service.id}
                    service={service}
                    config={config}
                    priceMatrix={pm as BossTieredPriceMatrix | PerItemPriceMatrix | PerUnitPriceMatrix | StatBasedPriceMatrix}
                    formConfig={fc}
                    stats={state.stats}
                    loadoutItems={loadoutItems}
                    loadouts={loadouts}
                    selectedLoadoutId={selectedLoadoutId}
                    hasSavedAccount={!!selectedLoadoutId}
                    onLoadoutUpdated={(l) =>
                      setLoadouts((prev) =>
                        prev.map((x) => (x.id === l.id ? { ...x, ...l } : x))
                      )
                    }
                    onStatsChange={(s) =>
                      dispatch({ type: "SET_STATS", stats: s })
                    }
                    onChange={(cfg) => setConfig(service.id, cfg)}
                    onRemove={() =>
                      dispatch({ type: "REMOVE_SERVICE", serviceId: service.id })
                    }
                    onToggle={() =>
                      dispatch({ type: "TOGGLE_SERVICE", serviceId: service.id })
                    }
                    isActive={state.active.has(service.id)}
                  />
                );
              }))}
              {(servicesByCategory[activeCategorySlug] ?? []).length === 0 && (
                <EmptyTab message="No services in this category yet." />
              )}
            </div>
          )}
        </div>

        {/* â”€â”€ Right: sticky build summary â”€â”€ */}
        <div
          className={cn(
            "lg:sticky lg:top-24 rounded-2xl overflow-hidden",
            "border border-[#E8720C]/20",
            "bg-gradient-to-b from-[#E8720C]/[0.03] to-black/20",
            "shadow-[0_8px_40px_rgba(0,0,0,0.25)]"
          )}
        >
          {/* Summary header */}
          <div className="p-5 border-b border-[#E8720C]/12">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 border border-primary/20">
                  <Zap className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <h2 className="font-bold text-[var(--text-primary)] leading-tight">
                    Your Build
                  </h2>
                  <span className="text-[11px] text-white/25">
                    {buildItems.length === 0
                      ? "No services selected"
                      : `${buildItems.length} ${buildItems.length === 1 ? "service" : "services"}`}
                  </span>
                </div>
              </div>
              {buildItems.length > 0 && (
                <button
                  type="button"
                  onClick={() => dispatch({ type: "CLEAR_ALL" })}
                  className="text-[11px] font-semibold text-red-400/50 hover:text-red-400 transition-colors"
                >
                  Clear all
                </button>
              )}
            </div>
          </div>

          {/* Item list */}
          <div className="p-3 max-h-[50vh] overflow-y-auto space-y-1">
            {buildItems.length === 0 ? (
              <div className="text-center py-12">
                <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-white/[0.03] border border-white/[0.05] mb-3">
                  <ShoppingCart className="h-5 w-5 text-white/10" />
                </div>
                <p className="text-sm text-white/20 mb-1">
                  Select services to start
                </p>
                <p className="text-[11px] text-white/10">
                  Click any card to configure &amp; add
                </p>
              </div>
            ) : (
              buildItems.map((item) => (
                <SummaryItem
                  key={item.id}
                  item={item}
                  onRemove={() =>
                    dispatch({
                      type: "REMOVE_SERVICE",
                      serviceId: item.buildKey ?? item.serviceId,
                    })
                  }
                />
              ))
            )}
          </div>

          {/* Totals + buttons */}
          <div className="p-5 border-t border-[#E8720C]/12 bg-gradient-to-t from-black/30 to-transparent">
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs text-white/25 font-medium uppercase tracking-wider">
                Total
              </span>
              <span className="font-heading text-3xl font-bold text-[var(--text-primary)] tabular-nums tracking-tight">
                {formatUSD(total)}
              </span>
            </div>
            {buildItems.length > 0 && (
              <p className="text-[11px] text-white/20 text-right mb-5">
                {buildItems.length} {buildItems.length === 1 ? "service" : "services"} included
              </p>
            )}
            {buildItems.length === 0 && <div className="mb-5" />}
            <div className="flex gap-2">
              <button
                type="button"
                disabled={buildItems.length === 0}
                onClick={handleAddToCart}
                className={cn(
                  "flex-1 py-3 rounded-xl border font-semibold text-sm transition-all duration-300",
                  buildItems.length > 0
                    ? "border-[#E8720C]/35 text-[#FF9438] hover:bg-[#E8720C]/10 hover:border-[#E8720C]/55 hover:shadow-[0_0_16px_rgba(201,149,42,0.12)]"
                    : "border-white/[0.06] text-white/20 cursor-not-allowed"
                )}
              >
                <ShoppingCart className="inline h-3.5 w-3.5 mr-1.5 -mt-0.5" />
                Add to cart
              </button>
              <button
                type="button"
                disabled={buildItems.length === 0}
                onClick={handleCheckout}
                className={cn(
                  "flex-1 py-3 rounded-xl font-semibold text-sm transition-all duration-300",
                  buildItems.length > 0
                    ? "bg-[#E8720C] text-[#0E0B07] hover:bg-[#FF9438] shadow-[0_4px_20px_rgba(201,149,42,0.25)]"
                    : "bg-white/[0.04] text-white/20 cursor-not-allowed"
                )}
              >
                Checkout â†’
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
