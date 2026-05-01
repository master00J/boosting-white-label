"use client";

import { useState } from "react";
import { Plus, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { Input } from "@/components/ui/input";
import { NumericInput } from "@/components/ui/numeric-input";
import { cn } from "@/lib/utils/cn";
import type { StatBasedPriceMatrix, StatConfig, StatThreshold, LoadoutModifier } from "@/types/service-config";
import LoadoutModifiersConfig from "./LoadoutModifiersConfig";

/** OSRS stat IDs exactly as returned by the Hiscores API */
export const OSRS_STATS = [
  { id: "attack",      label: "Attack",      min: 1, max: 99 },
  { id: "defence",     label: "Defence",     min: 1, max: 99 },
  { id: "strength",    label: "Strength",    min: 1, max: 99 },
  { id: "hitpoints",   label: "Hitpoints",   min: 10, max: 99 },
  { id: "ranged",      label: "Ranged",      min: 1, max: 99 },
  { id: "prayer",      label: "Prayer",      min: 1, max: 99 },
  { id: "magic",       label: "Magic",       min: 1, max: 99 },
  { id: "cooking",     label: "Cooking",     min: 1, max: 99 },
  { id: "woodcutting", label: "Woodcutting", min: 1, max: 99 },
  { id: "fletching",   label: "Fletching",   min: 1, max: 99 },
  { id: "fishing",     label: "Fishing",     min: 1, max: 99 },
  { id: "firemaking",  label: "Firemaking",  min: 1, max: 99 },
  { id: "crafting",    label: "Crafting",    min: 1, max: 99 },
  { id: "smithing",    label: "Smithing",    min: 1, max: 99 },
  { id: "mining",      label: "Mining",      min: 1, max: 99 },
  { id: "herblore",    label: "Herblore",    min: 1, max: 99 },
  { id: "agility",     label: "Agility",     min: 1, max: 99 },
  { id: "thieving",    label: "Thieving",    min: 1, max: 99 },
  { id: "slayer",      label: "Slayer",      min: 1, max: 99 },
  { id: "farming",     label: "Farming",     min: 1, max: 99 },
  { id: "runecrafting",label: "Runecrafting",min: 1, max: 99 },
  { id: "hunter",      label: "Hunter",      min: 1, max: 99 },
  { id: "construction",label: "Construction",min: 1, max: 99 },
  { id: "combat",      label: "Combat level",min: 3, max: 126 },
];

interface Props {
  matrix: StatBasedPriceMatrix;
  onChange: (matrix: StatBasedPriceMatrix) => void;
}

// ─── Threshold row ────────────────────────────────────────────────────────────

function ThresholdRow({ threshold, total, onChange, onRemove }: {
  threshold: StatThreshold;
  total: number;
  onChange: (t: StatThreshold) => void;
  onRemove: () => void;
}) {
  const isExpensive = threshold.multiplier > 1.5;
  const isMedium = threshold.multiplier > 1.1 && threshold.multiplier <= 1.5;
  const isCheap = threshold.multiplier <= 1.1 && threshold.multiplier >= 0.9;

  return (
    <div className="flex items-center gap-2 rounded-md border border-border/60 bg-muted/20 px-3 py-2">
      <div className="flex items-center gap-1.5 flex-1">
        <span className="text-[11px] text-muted-foreground shrink-0">Stat ≤</span>
        <NumericInput
          integer min={1} max={99}
          value={threshold.max}
          onChange={(val) => onChange({ ...threshold, max: val })}
          className="h-7 w-16 text-sm text-center font-medium"
        />
      </div>

      <span className="text-muted-foreground text-xs shrink-0">→</span>

      <div className="flex items-center gap-1.5 flex-1">
        <span className="text-[11px] text-muted-foreground shrink-0">Price ×</span>
        <NumericInput
          step="0.05" min={0.01}
          value={threshold.multiplier}
          onChange={(val) => onChange({ ...threshold, multiplier: val })}
          className="h-7 w-20 text-sm text-center font-mono font-medium"
        />
        <span className={`text-[10px] font-semibold shrink-0 ${
          isExpensive ? "text-red-400" : isMedium ? "text-amber-400" : isCheap ? "text-green-400" : "text-muted-foreground"
        }`}>
          {threshold.multiplier > 1 ? `+${Math.round((threshold.multiplier - 1) * 100)}%` :
           threshold.multiplier < 1 ? `-${Math.round((1 - threshold.multiplier) * 100)}%` : "no change"}
        </span>
      </div>

      {total > 1 ? (
        <button type="button" onClick={onRemove}
          className="p-1 text-muted-foreground hover:text-destructive transition-colors shrink-0">
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      ) : <span className="w-6" />}
    </div>
  );
}

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({ stat, onChange, onRemove }: {
  stat: StatConfig;
  onChange: (s: StatConfig) => void;
  onRemove: () => void;
}) {
  const [open, setOpen] = useState(true);

  const updateThreshold = (i: number, t: StatThreshold) =>
    onChange({ ...stat, thresholds: stat.thresholds.map((th, idx) => idx === i ? t : th) });
  const removeThreshold = (i: number) =>
    onChange({ ...stat, thresholds: stat.thresholds.filter((_, idx) => idx !== i) });
  const addThreshold = () => {
    const lastMax = stat.thresholds[stat.thresholds.length - 1]?.max ?? 50;
    const newMax = Math.min(99, lastMax + 10);
    onChange({ ...stat, thresholds: [...stat.thresholds, { max: newMax, multiplier: 1.0 }] });
  };

  // Sort thresholds ascending for display
  const sorted = [...stat.thresholds].sort((a, b) => a.max - b.max);

  return (
    <div className="rounded-lg border border-border bg-card">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2">
        <div className="flex-1 min-w-0">
          <Input
            value={stat.label}
            onChange={(e) => onChange({ ...stat, label: e.target.value })}
            onBlur={(e) => {
              if (!e.target.value && stat.id) {
                onChange({ ...stat, label: stat.id.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) });
              }
            }}
            placeholder={stat.id ? stat.id.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "Stat label (e.g. Prayer Level)"}
            className={cn("h-7 text-sm font-medium border-0 bg-transparent px-0 focus-visible:ring-0 focus-visible:ring-offset-0",
              !stat.label && "text-amber-400")}
          />
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <span className="text-[10px] text-muted-foreground font-mono px-1.5 py-0.5 rounded bg-muted">
            {stat.id || "id"}
          </span>
          <span className="text-[10px] text-muted-foreground">
            {stat.thresholds.length} band{stat.thresholds.length !== 1 ? "s" : ""}
          </span>
          <button type="button" onClick={() => setOpen((v) => !v)}
            className="p-1 text-muted-foreground hover:text-foreground">
            {open ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
          <button type="button" onClick={onRemove}
            className="p-1 text-muted-foreground hover:text-destructive transition-colors">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {open && (
        <div className="px-3 pb-3 space-y-3 border-t border-border pt-2.5">
          {/* Stat id + range */}
          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1">
              <p className="text-[10px] text-muted-foreground font-medium">OSRS stat</p>
              <select
                value={stat.id}
                onChange={(e) => {
                  const newId = e.target.value;
                  const preset = OSRS_STATS.find((s) => s.id === newId);
                  onChange({
                    ...stat,
                    id: newId,
                    label: preset?.label ?? newId.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
                    min: preset?.min ?? stat.min,
                    max: preset?.max ?? stat.max,
                  });
                }}
                className="h-7 text-xs font-mono rounded border border-border bg-background px-1 w-full"
              >
                <option value="">— select stat —</option>
                {OSRS_STATS.map((s) => (
                  <option key={s.id} value={s.id}>{s.label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] text-muted-foreground font-medium">Min level</p>
              <NumericInput integer min={1} max={98}
                value={stat.min}
                onChange={(val) => onChange({ ...stat, min: val })}
                className="h-7 text-xs text-center"
              />
            </div>
            <div className="space-y-1">
              <p className="text-[10px] text-muted-foreground font-medium">Max level</p>
              <NumericInput integer min={2} max={99}
                value={stat.max}
                onChange={(val) => onChange({ ...stat, max: val })}
                className="h-7 text-xs text-center"
              />
            </div>
          </div>

          {/* Thresholds */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] text-muted-foreground font-medium">Price bands</p>
                <p className="text-[10px] text-muted-foreground/70">Each band applies a multiplier when the stat is ≤ that level. Add multiple bands for a fully dynamic price curve.</p>
              </div>
            </div>
            {sorted.map((t, i) => (
              <ThresholdRow
                key={i}
                threshold={t}
                total={stat.thresholds.length}
                onChange={(updated) => updateThreshold(stat.thresholds.indexOf(t), updated)}
                onRemove={() => removeThreshold(stat.thresholds.indexOf(t))}
              />
            ))}
            <button type="button" onClick={addThreshold}
              className="flex items-center gap-1 text-[10px] text-primary hover:text-primary/80 transition-colors mt-1 px-2 py-1 rounded border border-dashed border-primary/30 hover:bg-primary/5">
              <Plus className="h-2.5 w-2.5" /> Add price band
            </button>
          </div>

          {/* Preview */}
          {sorted.length > 0 && (
            <div className="rounded-md bg-muted/40 border border-border/40 px-3 py-2 space-y-1">
              <p className="text-[11px] text-muted-foreground font-semibold mb-1.5">Price band overview</p>
              {sorted.map((t, i) => {
                const prevMax = i === 0 ? stat.min : sorted[i - 1].max + 1;
                const pct = t.multiplier !== 1
                  ? (t.multiplier > 1 ? `+${Math.round((t.multiplier - 1) * 100)}%` : `-${Math.round((1 - t.multiplier) * 100)}%`)
                  : "no change";
                return (
                  <div key={i} className="flex items-center justify-between">
                    <span className="text-[11px] text-muted-foreground">Level {prevMax}–{t.max}</span>
                    <span className={cn(
                      "text-[11px] font-semibold",
                      t.multiplier > 1.5 ? "text-red-400" :
                      t.multiplier > 1.1 ? "text-amber-400" :
                      t.multiplier < 0.9 ? "text-green-400" :
                      "text-muted-foreground"
                    )}>
                      ×{t.multiplier} ({pct})
                    </span>
                  </div>
                );
              })}
              {sorted[sorted.length - 1]?.max < stat.max && (
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-muted-foreground">Level {sorted[sorted.length - 1].max + 1}–{stat.max}</span>
                  <span className="text-[11px] font-semibold text-muted-foreground">×1.0 (no change)</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main StatBasedConfig ─────────────────────────────────────────────────────

export default function StatBasedConfig({ matrix, onChange }: Props) {
  const stats = matrix.stats ?? [];
  const loadoutMods = matrix.loadout_modifiers ?? [];

  const addStat = () => {
    const newStat: StatConfig = {
      id: "",
      label: "",
      min: 1,
      max: 99,
      // 3 bands by default: low level = expensive, mid = moderate, high = cheap
      thresholds: [
        { max: 43, multiplier: 2.0 },
        { max: 70, multiplier: 1.3 },
        { max: 99, multiplier: 1.0 },
      ],
    };
    onChange({ ...matrix, stats: [...stats, newStat] });
  };

  const updateStat = (i: number, s: StatConfig) =>
    onChange({ ...matrix, stats: stats.map((st, idx) => idx === i ? s : st) });
  const removeStat = (i: number) =>
    onChange({ ...matrix, stats: stats.filter((_, idx) => idx !== i) });

  return (
    <div className="space-y-4">
      {/* Base price */}
      <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card">
        <div className="space-y-0.5 flex-1">
          <p className="text-sm font-medium">Base price</p>
          <p className="text-[11px] text-muted-foreground">
            Starting price before any stat multipliers are applied.
          </p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-sm text-muted-foreground">$</span>
          <NumericInput
            step="0.5" min={0}
            value={matrix.base_price}
            onChange={(val) => onChange({ ...matrix, base_price: val })}
            className="h-8 w-24 text-sm text-right font-mono"
          />
        </div>
      </div>

      {/* Stats */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-muted-foreground">
            Stats
            {stats.length > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-semibold">
                {stats.length}
              </span>
            )}
          </p>
          <button type="button" onClick={addStat}
            className="flex items-center gap-1 px-2 py-1 rounded-lg border border-dashed border-primary/30 text-[11px] text-primary hover:bg-primary/5 transition-colors">
            <Plus className="h-3 w-3" /> Add stat
          </button>
        </div>

        {stats.length === 0 ? (
          <p className="text-[11px] text-muted-foreground py-2">
            No stats configured. Add stats like Range, Prayer, Defence, Hitpoints.
          </p>
        ) : (
          <div className="space-y-2">
            {stats.map((stat, i) => (
              <StatCard key={i} stat={stat}
                onChange={(s) => updateStat(i, s)}
                onRemove={() => removeStat(i)} />
            ))}
          </div>
        )}
      </div>

      {/* Formula preview */}
      {stats.length > 0 && (
        <div className="rounded-lg bg-muted/30 border border-border px-3 py-2.5 space-y-1">
          <p className="text-[10px] text-muted-foreground font-medium">Price formula</p>
          <p className="text-[11px] text-foreground font-mono">
            ${matrix.base_price.toFixed(2)}
            {stats.map((s) => (
              <span key={s.id} className="text-primary"> × {s.label || s.id || "stat"}</span>
            ))}
            {loadoutMods.length > 0 && <span className="text-amber-400"> × gear modifiers</span>}
            {" × form modifiers"}
          </p>
        </div>
      )}

      {/* Gear modifiers */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-muted-foreground">
            Gear modifiers
            {loadoutMods.length > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-semibold">
                {loadoutMods.length}
              </span>
            )}
          </p>
        </div>
        <LoadoutModifiersConfig
          modifiers={loadoutMods}
          onChange={(mods: LoadoutModifier[]) =>
            onChange({ ...matrix, loadout_modifiers: mods.length ? mods : undefined })
          }
        />
      </div>
    </div>
  );
}
