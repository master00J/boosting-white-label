"use client";

import {
  BarChart2,
  Coins,
  Hash,
  Package,
  ScrollText,
  Trophy,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type { PricingType } from "@/types/service-config";

const OPTIONS: { value: PricingType; label: string; description: string; Icon: React.ElementType }[] = [
  {
    value: "xp_based",
    label: "XP Based",
    description: "Price calculated from XP difference between start and end level. Used for skilling / powerleveling.",
    Icon: Zap,
  },
  {
    value: "per_item",
    label: "Per Item",
    description: "Fixed price per item (quest, dungeon, etc.). Each item has its own price.",
    Icon: Package,
  },
  {
    value: "per_unit",
    label: "Per Unit",
    description: "Price per kill, run, point, or any other countable unit.",
    Icon: Hash,
  },
  {
    value: "stat_based",
    label: "Stat Based",
    description: "Price based on account stats (e.g. Range, Prayer). Higher stats = lower price. Used for Fire Cape, Infernal, etc.",
    Icon: BarChart2,
  },
  {
    value: "per_item_stat_based",
    label: "Quest + Stats",
    description: "Customer picks a quest, then account stats apply multipliers. Higher stats = lower price. Used for questing.",
    Icon: ScrollText,
  },
  {
    value: "boss_tiered",
    label: "Boss Tiered",
    description: "Customer picks a boss, enters kill count. Price per kill decreases at higher quantities. Combat level applies multipliers.",
    Icon: Trophy,
  },
  {
    value: "gold_tiered",
    label: "Gold Sales",
    description: "Sell in-game gold with volume tiers. Higher quantities get a lower price per unit. Optional modifiers for delivery method etc.",
    Icon: Coins,
  },
];

interface Props {
  value: PricingType;
  onChange: (v: PricingType) => void;
}

export default function PricingTypeSelector({ value, onChange }: Props) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-white">Pricing model</p>
        <p className="text-xs text-white/60">Choose the model that matches how customers are billed.</p>
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {OPTIONS.map((opt) => {
          const selected = value === opt.value;
          const Icon = opt.Icon;
          return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            aria-pressed={selected}
            className={cn(
              "group flex flex-col gap-3 rounded-2xl border p-4 text-left transition-all shadow-sm",
              selected
                ? "border-primary bg-primary/12 shadow-[0_0_0_1px_rgba(99,102,241,0.22)]"
                : "border-white/12 bg-white/[0.05] hover:border-primary/40 hover:bg-white/[0.08]"
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div className={cn(
                "flex h-10 w-10 items-center justify-center rounded-xl border transition-colors",
                selected
                  ? "border-primary/30 bg-primary/15 text-primary"
                  : "border-white/12 bg-[#111827] text-white/70 group-hover:text-white"
              )}>
                <Icon className="h-4.5 w-4.5" />
              </div>
              <span
                className={cn(
                  "rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide transition-colors",
                  selected
                    ? "border-primary/20 bg-primary/15 text-primary"
                    : "border-white/12 bg-[#111827] text-white/60"
                )}
              >
                {selected ? "Selected" : "Available"}
              </span>
            </div>
            <div className="space-y-1">
              <span className="block text-sm font-semibold text-white">{opt.label}</span>
              <span className="block text-xs leading-relaxed text-white/65">{opt.description}</span>
            </div>
          </button>
          );
        })}
      </div>
    </div>
  );
}
