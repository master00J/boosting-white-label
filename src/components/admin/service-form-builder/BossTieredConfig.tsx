"use client";

import { useState, useMemo } from "react";
import { Plus, Trash2, ChevronDown, ChevronUp, ListFilter, Search, X, Check, ExternalLink } from "lucide-react";
import { ImageUpload } from "@/components/ui/image-upload";
import { Input } from "@/components/ui/input";
import { NumericInput } from "@/components/ui/numeric-input";
import { cn } from "@/lib/utils/cn";
import type {
  BossTieredPriceMatrix,
  BossConfig,
  KillTier,
  StatConfig,
  StatThreshold,
  QuestModifierField,
  QuestModifierOption,
  LoadoutModifier,
} from "@/types/service-config";
import { OSRS_STATS } from "./StatBasedConfig";
import LoadoutModifiersConfig from "./LoadoutModifiersConfig";
import { BOSS_PROFILES } from "@/lib/osrs-boss-profiles";
import type { BossCategory } from "@/lib/osrs-boss-profiles";

// Re-export for use in BossRow
type BossRowTab = "tiers" | "stats" | "modifiers" | "gear";

interface Props {
  matrix: BossTieredPriceMatrix;
  onChange: (matrix: BossTieredPriceMatrix) => void;
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
  return (
    <div className="flex items-center gap-2 rounded-md border border-border/60 bg-muted/20 px-3 py-2">
      <div className="flex items-center gap-1.5 flex-1">
        <span className="text-[11px] text-muted-foreground shrink-0">Stat ≤</span>
        <NumericInput integer min={1} max={99}
          value={threshold.max}
          onChange={(val) => onChange({ ...threshold, max: val })}
          className="h-7 w-16 text-sm text-center font-medium" />
      </div>
      <span className="text-muted-foreground text-xs shrink-0">→</span>
      <div className="flex items-center gap-1.5 flex-1">
        <span className="text-[11px] text-muted-foreground shrink-0">Price ×</span>
        <NumericInput step="0.05" min={0.01}
          value={threshold.multiplier}
          onChange={(val) => onChange({ ...threshold, multiplier: val })}
          className="h-7 w-20 text-sm text-center font-mono font-medium" />
        <span className={cn("text-[10px] font-semibold shrink-0",
          isExpensive ? "text-red-400" : isMedium ? "text-amber-400" :
          threshold.multiplier < 0.9 ? "text-green-400" : "text-muted-foreground")}>
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
  const sorted = [...stat.thresholds].sort((a, b) => a.max - b.max);

  const updateThreshold = (i: number, t: StatThreshold) =>
    onChange({ ...stat, thresholds: stat.thresholds.map((th, idx) => idx === i ? t : th) });
  const removeThreshold = (i: number) =>
    onChange({ ...stat, thresholds: stat.thresholds.filter((_, idx) => idx !== i) });
  const addThreshold = () => {
    const lastMax = stat.thresholds[stat.thresholds.length - 1]?.max ?? 50;
    onChange({ ...stat, thresholds: [...stat.thresholds, { max: Math.min(99, lastMax + 10), multiplier: 1.0 }] });
  };

  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="flex items-center gap-2 px-3 py-2">
        <div className="flex-1 min-w-0">
          <Input value={stat.label}
            onChange={(e) => onChange({ ...stat, label: e.target.value })}
            onBlur={(e) => {
              if (!e.target.value && stat.id)
                onChange({ ...stat, label: stat.id.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) });
            }}
            placeholder={stat.id ? stat.id.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "Stat label (e.g. Combat Level)"}
            className={cn("h-7 text-sm font-medium border-0 bg-transparent px-0 focus-visible:ring-0 focus-visible:ring-offset-0",
              !stat.label && "text-amber-400")} />
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <span className="text-[10px] text-muted-foreground font-mono px-1.5 py-0.5 rounded bg-muted">{stat.id || "id"}</span>
          <span className="text-[10px] text-muted-foreground">{stat.thresholds.length} band{stat.thresholds.length !== 1 ? "s" : ""}</span>
          <button type="button" onClick={() => setOpen((v) => !v)} className="p-1 text-muted-foreground hover:text-foreground">
            {open ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
          <button type="button" onClick={onRemove} className="p-1 text-muted-foreground hover:text-destructive transition-colors">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      {open && (
        <div className="px-3 pb-3 space-y-3 border-t border-border pt-2.5">
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
                className="h-7 text-xs text-center" />
            </div>
            <div className="space-y-1">
              <p className="text-[10px] text-muted-foreground font-medium">Max level</p>
              <NumericInput integer min={2} max={126}
                value={stat.max}
                onChange={(val) => onChange({ ...stat, max: val })}
                className="h-7 text-xs text-center" />
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-[11px] text-muted-foreground font-medium">Price bands</p>
            {sorted.map((t, i) => (
              <ThresholdRow key={i} threshold={t} total={stat.thresholds.length}
                onChange={(updated) => updateThreshold(stat.thresholds.indexOf(t), updated)}
                onRemove={() => removeThreshold(stat.thresholds.indexOf(t))} />
            ))}
            <button type="button" onClick={addThreshold}
              className="flex items-center gap-1 text-[10px] text-primary hover:text-primary/80 transition-colors mt-1 px-2 py-1 rounded border border-dashed border-primary/30 hover:bg-primary/5">
              <Plus className="h-2.5 w-2.5" /> Add price band
            </button>
          </div>
          {sorted.length > 0 && (
            <div className="rounded-md bg-muted/40 border border-border/40 px-3 py-2 space-y-1">
              <p className="text-[11px] text-muted-foreground font-semibold mb-1.5">Band overview</p>
              {sorted.map((t, i) => {
                const prevMax = i === 0 ? stat.min : sorted[i - 1].max + 1;
                const pct = t.multiplier !== 1
                  ? (t.multiplier > 1 ? `+${Math.round((t.multiplier - 1) * 100)}%` : `-${Math.round((1 - t.multiplier) * 100)}%`)
                  : "no change";
                return (
                  <div key={i} className="flex items-center justify-between">
                    <span className="text-[11px] text-muted-foreground">Level {prevMax}–{t.max}</span>
                    <span className={cn("text-[11px] font-semibold",
                      t.multiplier > 1.5 ? "text-red-400" : t.multiplier > 1.1 ? "text-amber-400" :
                      t.multiplier < 0.9 ? "text-green-400" : "text-muted-foreground")}>
                      ×{t.multiplier} ({pct})
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Modifier option row ──────────────────────────────────────────────────────

function ModifierOptionRow({ opt, onChange, onRemove }: {
  opt: QuestModifierOption;
  onChange: (o: QuestModifierOption) => void;
  onRemove: () => void;
}) {
  return (
    <div className="flex items-center gap-2 rounded border border-border/50 bg-muted/10 px-2 py-1.5">
      <Input value={opt.label} onChange={(e) => onChange({ ...opt, label: e.target.value })}
        placeholder="Option label" className="h-6 text-[11px] flex-1" />
      <Input value={opt.value} onChange={(e) => onChange({ ...opt, value: e.target.value.toLowerCase().replace(/\s+/g, "_") })}
        placeholder="value" className="h-6 text-[11px] w-24 font-mono" />
      <NumericInput step="0.05" min={0} value={opt.multiplier ?? 1}
        onChange={(val) => onChange({ ...opt, multiplier: val })}
        className="h-6 text-[11px] w-16 text-center" />
      <NumericInput step="0.01" min={0} value={opt.price_add ?? 0}
        onChange={(val) => onChange({ ...opt, price_add: val })}
        className="h-6 text-[11px] w-16 text-center" />
      <button type="button" onClick={onRemove} className="p-0.5 text-muted-foreground hover:text-destructive transition-colors shrink-0">
        <Trash2 className="h-3 w-3" />
      </button>
    </div>
  );
}

// ─── Modifier field row ───────────────────────────────────────────────────────

function ModifierFieldRow({ mod, onChange, onRemove }: {
  mod: QuestModifierField;
  onChange: (m: QuestModifierField) => void;
  onRemove: () => void;
}) {
  const [open, setOpen] = useState(false);
  const options = mod.options ?? [];

  const updateOption = (i: number, o: QuestModifierOption) =>
    onChange({ ...mod, options: options.map((op, idx) => idx === i ? o : op) });
  const removeOption = (i: number) =>
    onChange({ ...mod, options: options.filter((_, idx) => idx !== i) });
  const addOption = () =>
    onChange({ ...mod, options: [...options, { label: "", value: "", multiplier: 1, price_add: 0 }] });

  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="flex items-center gap-2 px-2.5 py-2">
        <Input value={mod.label} onChange={(e) => onChange({ ...mod, label: e.target.value })}
          placeholder="Field label (e.g. Loot split)" className="h-6 text-[11px] flex-1 border-0 bg-transparent px-0 focus-visible:ring-0 focus-visible:ring-offset-0" />
        <select value={mod.type}
          onChange={(e) => onChange({ ...mod, type: e.target.value as QuestModifierField["type"] })}
          className="h-6 text-[10px] rounded border border-border bg-background px-1">
          <option value="radio">Radio (single)</option>
          <option value="multi_select">Multi-select</option>
          <option value="select">Dropdown</option>
          <option value="checkbox">Checkbox</option>
        </select>
        <span className="text-[10px] text-muted-foreground font-mono px-1">{mod.id || "id"}</span>
        <button type="button" onClick={() => setOpen((v) => !v)} className="p-0.5 text-muted-foreground hover:text-foreground">
          {open ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </button>
        <button type="button" onClick={onRemove} className="p-0.5 text-muted-foreground hover:text-destructive transition-colors">
          <Trash2 className="h-3 w-3" />
        </button>
      </div>
      {open && mod.type === "checkbox" && (
        <div className="px-2.5 pb-2 space-y-2 border-t border-border/40 pt-1.5">
          <p className="text-[9px] text-muted-foreground">When the customer checks this option, the following price effect is applied.</p>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 flex-1">
              <span className="text-[10px] text-muted-foreground shrink-0">× Multiplier</span>
              <NumericInput step="0.05" min={0.01} max={10}
                value={mod.multiplier ?? 1}
                onChange={(val) => onChange({ ...mod, multiplier: val })}
                className="h-6 w-20 text-[11px] text-center font-mono" />
              <span className={cn("text-[10px] font-semibold shrink-0 w-10",
                (mod.multiplier ?? 1) > 1 ? "text-red-400" : (mod.multiplier ?? 1) < 1 ? "text-green-400" : "text-muted-foreground")}>
                {(mod.multiplier ?? 1) > 1 ? `+${Math.round(((mod.multiplier ?? 1) - 1) * 100)}%`
                  : (mod.multiplier ?? 1) < 1 ? `-${Math.round((1 - (mod.multiplier ?? 1)) * 100)}%`
                  : "no change"}
              </span>
            </div>
            <div className="flex items-center gap-1.5 flex-1">
              <span className="text-[10px] text-muted-foreground shrink-0">+ Flat $</span>
              <NumericInput step="0.50" min={0}
                value={mod.price_add ?? 0}
                onChange={(val) => onChange({ ...mod, price_add: val })}
                className="h-6 w-20 text-[11px] text-center font-mono" />
            </div>
          </div>
        </div>
      )}
      {open && mod.type !== "checkbox" && (
        <div className="px-2.5 pb-2 space-y-1 border-t border-border/40 pt-1.5">
          {mod.type === "multi_select" && (
            <p className="text-[9px] text-primary/70 mb-1">Customer can select multiple options — multipliers stack.</p>
          )}
          <div className="grid grid-cols-[1fr_80px_64px_64px_20px] gap-1 px-1 text-[9px] text-muted-foreground font-medium">
            <span>Label</span><span>Value</span><span className="text-center">×mult</span><span className="text-center">+$</span><span />
          </div>
          {options.map((opt, i) => (
            <ModifierOptionRow key={i} opt={opt}
              onChange={(updated) => updateOption(i, updated)}
              onRemove={() => removeOption(i)} />
          ))}
          <button type="button" onClick={addOption}
            className="flex items-center gap-1 text-[9px] text-primary hover:text-primary/80 transition-colors px-1 py-0.5 rounded border border-dashed border-primary/30 hover:bg-primary/5">
            <Plus className="h-2 w-2" /> Add option
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Kill tier row ────────────────────────────────────────────────────────────

function KillTierRow({ tier, total, onChange, onRemove }: {
  tier: KillTier;
  total: number;
  onChange: (t: KillTier) => void;
  onRemove: () => void;
}) {
  return (
    <div className="flex items-center gap-2 rounded-md border border-border/60 bg-muted/20 px-3 py-2">
      <div className="flex items-center gap-1.5 flex-1">
        <span className="text-[11px] text-muted-foreground shrink-0">Kills</span>
        <NumericInput integer min={1}
          value={tier.min_kills}
          onChange={(val) => onChange({ ...tier, min_kills: val })}
          className="h-7 w-16 text-sm text-center font-medium" />
        <span className="text-[11px] text-muted-foreground shrink-0">–</span>
        <NumericInput integer min={1}
          value={tier.max_kills}
          onChange={(val) => onChange({ ...tier, max_kills: val })}
          className="h-7 w-20 text-sm text-center font-medium" />
      </div>
      <div className="flex items-center gap-1.5 flex-1">
        <span className="text-[11px] text-muted-foreground shrink-0">$/kill</span>
        <NumericInput step="0.0001" min={0}
          value={tier.price_per_kill}
          onChange={(val) => onChange({ ...tier, price_per_kill: val })}
          className="h-7 w-28 text-sm text-center font-mono font-medium" />
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

// ─── Boss picker modal ────────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<BossCategory, string> = {
  gwd:       "God Wars Dungeon",
  slayer:    "Slayer Bosses",
  raid:      "Raids",
  wilderness:"Wilderness",
  minigame:  "Minigames",
  dt2:       "Desert Treasure II",
  dragon:    "Dragons",
  dagannoth: "Dagannoth Kings",
  barrows:   "Barrows",
  other:     "Other Bosses",
};

const CATEGORY_ORDER: BossCategory[] = ["gwd", "raid", "slayer", "dt2", "minigame", "wilderness", "dragon", "dagannoth", "barrows", "other"];

function BossPickerModal({ existingIds, onAdd, onClose }: {
  existingIds: Set<string>;
  onAdd: (bosses: { id: string; label: string }[]) => void;
  onClose: () => void;
}) {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [activeCategory, setActiveCategory] = useState<BossCategory | "all">("all");

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return BOSS_PROFILES.filter((p) => {
      if (activeCategory !== "all" && p.category !== activeCategory) return false;
      if (!q) return true;
      return p.name.toLowerCase().includes(q) || p.id.includes(q);
    });
  }, [search, activeCategory]);

  const grouped = useMemo(() => {
    const map = new Map<BossCategory, typeof BOSS_PROFILES>();
    for (const p of filtered) {
      if (!map.has(p.category)) map.set(p.category, []);
      map.get(p.category)!.push(p);
    }
    return map;
  }, [filtered]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleAdd = () => {
    const toAdd = BOSS_PROFILES
      .filter((p) => selected.has(p.id))
      .map((p) => ({ id: p.id, label: p.name }));
    onAdd(toAdd);
    onClose();
  };

  const styleColor: Record<string, string> = {
    melee:  "text-red-400 bg-red-400/10",
    ranged: "text-green-400 bg-green-400/10",
    magic:  "text-blue-400 bg-blue-400/10",
    multi:  "text-purple-400 bg-purple-400/10",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-2xl max-h-[80vh] flex flex-col rounded-2xl border border-border bg-card shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border shrink-0">
          <ListFilter className="h-4 w-4 text-primary shrink-0" />
          <h2 className="text-sm font-semibold flex-1">Select bosses / activities</h2>
          {selected.size > 0 && (
            <span className="text-[11px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
              {selected.size} selected
            </span>
          )}
          <button type="button" onClick={onClose} className="p-1 text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Search + category filter */}
        <div className="px-4 py-2.5 border-b border-border shrink-0 space-y-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search bosses…"
              className="w-full h-8 pl-8 pr-3 text-xs rounded-md border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary"
              autoFocus
            />
          </div>
          <div className="flex gap-1 flex-wrap">
            <button
              type="button"
              onClick={() => setActiveCategory("all")}
              className={cn("px-2 py-0.5 rounded text-[10px] font-medium transition-colors",
                activeCategory === "all" ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground")}
            >
              All ({BOSS_PROFILES.length})
            </button>
            {CATEGORY_ORDER.map((cat) => {
              const count = BOSS_PROFILES.filter((p) => p.category === cat).length;
              if (!count) return null;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setActiveCategory(cat)}
                  className={cn("px-2 py-0.5 rounded text-[10px] font-medium transition-colors",
                    activeCategory === cat ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground")}
                >
                  {CATEGORY_LABELS[cat]} ({count})
                </button>
              );
            })}
          </div>
        </div>

        {/* Boss list */}
        <div className="overflow-y-auto flex-1 px-4 py-3 space-y-4">
          {filtered.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-6">No bosses match your search.</p>
          )}
          {CATEGORY_ORDER.map((cat) => {
            const bosses = grouped.get(cat);
            if (!bosses?.length) return null;
            return (
              <div key={cat}>
                <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mb-1.5">
                  {CATEGORY_LABELS[cat]}
                </p>
                <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                  {bosses.map((p) => {
                    const isAdded   = existingIds.has(p.id);
                    const isSel     = selected.has(p.id);
                    return (
                      <button
                        key={p.id}
                        type="button"
                        disabled={isAdded}
                        onClick={() => toggle(p.id)}
                        className={cn(
                          "flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-left transition-all",
                          isAdded
                            ? "opacity-40 cursor-not-allowed border-border bg-muted/20"
                            : isSel
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-border bg-card hover:border-primary/40 hover:bg-muted/30",
                        )}
                      >
                        <div className={cn(
                          "w-4 h-4 rounded border flex items-center justify-center shrink-0",
                          isAdded ? "border-border bg-muted" : isSel ? "border-primary bg-primary" : "border-border",
                        )}>
                          {(isAdded || isSel) && <Check className="h-2.5 w-2.5 text-white" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[11px] font-medium truncate leading-tight">{p.name}</p>
                          <div className="flex items-center gap-1 mt-0.5">
                            <span className={cn("text-[9px] px-1 py-0 rounded font-semibold", styleColor[p.primary_style] ?? styleColor.melee)}>
                              {p.primary_style}
                            </span>
                            {p.wiki_url && (
                              <a href={p.wiki_url} target="_blank" rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="text-muted-foreground hover:text-foreground">
                                <ExternalLink className="h-2.5 w-2.5" />
                              </a>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 px-4 py-3 border-t border-border shrink-0">
          <p className="text-[11px] text-muted-foreground">
            {selected.size === 0
              ? "Click bosses to select them"
              : `${selected.size} boss${selected.size !== 1 ? "es" : ""} will be added with default kill tiers`}
          </p>
          <div className="flex gap-2">
            <button type="button" onClick={onClose}
              className="px-3 py-1.5 text-xs rounded-md border border-border text-muted-foreground hover:text-foreground transition-colors">
              Cancel
            </button>
            <button type="button" onClick={handleAdd} disabled={selected.size === 0}
              className="px-3 py-1.5 text-xs rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
              Add {selected.size > 0 ? `${selected.size} boss${selected.size !== 1 ? "es" : ""}` : "selected"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function cloneConfigJson<T>(x: T): T {
  return JSON.parse(JSON.stringify(x)) as T;
}

// ─── Boss row ─────────────────────────────────────────────────────────────────

function BossRow({
  boss,
  globalStats,
  globalModifiers,
  globalLoadoutMods,
  onUpdate,
  onRemove,
}: {
  boss: BossConfig;
  globalStats: StatConfig[];
  globalModifiers: QuestModifierField[];
  globalLoadoutMods: LoadoutModifier[];
  onUpdate: (b: BossConfig) => void;
  onRemove: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<BossRowTab>("tiers");

  const bossStats = boss.stats ?? [];
  const bossModifiers = boss.modifiers ?? [];
  const bossLoadoutMods = boss.loadout_modifiers ?? [];
  const hasCustomConfig = bossStats.length > 0 || bossModifiers.length > 0 || bossLoadoutMods.length > 0;

  const defaultStat = (): StatConfig => ({
    id: "attack",
    label: "Attack",
    min: 1,
    max: 99,
    thresholds: [{ max: 70, multiplier: 1.2 }, { max: 99, multiplier: 1.0 }],
  });

  const addBossStat = () => onUpdate({ ...boss, stats: [...bossStats, defaultStat()] });
  const updateBossStat = (i: number, s: StatConfig) =>
    onUpdate({ ...boss, stats: bossStats.map((st, idx) => idx === i ? s : st) });
  const removeBossStat = (i: number) =>
    onUpdate({ ...boss, stats: bossStats.filter((_, idx) => idx !== i) });

  const defaultMod = (): QuestModifierField => ({
    id: `mod_${Date.now()}`, label: "", type: "radio", options: [],
  });
  const addBossMod = () => onUpdate({ ...boss, modifiers: [...bossModifiers, defaultMod()] });
  const updateBossMod = (i: number, m: QuestModifierField) =>
    onUpdate({ ...boss, modifiers: bossModifiers.map((md, idx) => idx === i ? m : md) });
  const removeBossMod = (i: number) =>
    onUpdate({ ...boss, modifiers: bossModifiers.filter((_, idx) => idx !== i) });

  const killTiers = boss.kill_tiers ?? [];
  const addKillTier = () => {
    const lastMax = killTiers[killTiers.length - 1]?.max_kills ?? 0;
    onUpdate({ ...boss, kill_tiers: [...killTiers, { min_kills: lastMax + 1, max_kills: lastMax + 50, price_per_kill: 0.50 }] });
  };
  const updateKillTier = (i: number, t: KillTier) =>
    onUpdate({ ...boss, kill_tiers: killTiers.map((kt, idx) => idx === i ? t : kt) });
  const removeKillTier = (i: number) =>
    onUpdate({ ...boss, kill_tiers: killTiers.filter((_, idx) => idx !== i) });

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      {/* Header row */}
      <div className="flex items-center gap-3 px-3 py-2.5">
        <div className="flex-1 min-w-0 grid grid-cols-[1fr_1fr] gap-2">
          <Input value={boss.label}
            onChange={(e) => onUpdate({
              ...boss, label: e.target.value,
              id: !boss.id ? e.target.value.toLowerCase().replace(/\s+/g, "_") : boss.id,
            })}
            placeholder="Boss name (e.g. Zulrah)" className="h-7 text-sm font-medium" />
          <Input value={boss.id}
            onChange={(e) => onUpdate({ ...boss, id: e.target.value.toLowerCase().replace(/\s+/g, "_") })}
            placeholder="id (e.g. zulrah)" className="h-7 text-xs font-mono" />
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {hasCustomConfig && (
            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium">custom config</span>
          )}
          <span className="text-[10px] text-muted-foreground">{killTiers.length} tier{killTiers.length !== 1 ? "s" : ""}</span>
          <button type="button" onClick={() => setOpen((v) => !v)} className="p-1 text-muted-foreground hover:text-foreground">
            {open ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
          <button type="button" onClick={onRemove} className="p-1 text-muted-foreground hover:text-destructive transition-colors">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-border">
          {/* Description + Image upload */}
          <div className="px-3 pt-2.5 pb-2 space-y-2">
            <Input value={boss.description ?? ""}
              onChange={(e) => onUpdate({ ...boss, description: e.target.value })}
              placeholder="Short description (optional)" className="h-7 text-xs text-muted-foreground" />
            <div className="flex items-start gap-3">
              <div className="shrink-0">
                <p className="text-[10px] text-muted-foreground mb-1">Boss image</p>
                <ImageUpload
                  value={boss.image_url ?? ""}
                  onChange={(url) => onUpdate({ ...boss, image_url: url || undefined })}
                  bucket="game-assets"
                  folder="boss-images"
                  label="Upload"
                  aspectRatio="square"
                  useAdminUpload
                />
              </div>
              {boss.image_url && (
                <div className="flex-1 min-w-0 pt-4">
                  <p className="text-[10px] text-muted-foreground mb-1">Current URL</p>
                  <p className="text-[10px] text-muted-foreground/70 break-all font-mono leading-relaxed">
                    {boss.image_url}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 px-3 pb-2 flex-wrap">
            {(["tiers", "stats", "modifiers", "gear"] as const).map((t) => (
              <button key={t} type="button" onClick={() => setTab(t)}
                className={cn("px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors",
                  tab === t ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground")}>
                {t === "tiers" ? `Kill tiers (${killTiers.length})` :
                 t === "stats" ? `Combat stats (${bossStats.length > 0 ? `${bossStats.length} this boss` : "service default"})` :
                 t === "modifiers" ? `Upcharges (${bossModifiers.length > 0 ? `${bossModifiers.length} this boss` : "service default"})` :
                 `Gear (${bossLoadoutMods.length > 0 ? `${bossLoadoutMods.length} this boss` : "service default"})`}
              </button>
            ))}
          </div>

          <div className="px-3 pb-3 space-y-2">
            {/* Kill tiers tab */}
            {tab === "tiers" && (
              <>
                <p className="text-[10px] text-muted-foreground">Price per kill decreases at higher quantities.</p>
                {killTiers.map((kt, i) => (
                  <KillTierRow key={i} tier={kt} total={killTiers.length}
                    onChange={(updated) => updateKillTier(i, updated)}
                    onRemove={() => removeKillTier(i)} />
                ))}
                {killTiers.length === 0 && (
                  <p className="text-[11px] text-amber-400 py-1">No kill tiers yet — add at least one.</p>
                )}
                <button type="button" onClick={addKillTier}
                  className="flex items-center gap-1 text-[10px] text-primary hover:text-primary/80 transition-colors px-2 py-1 rounded border border-dashed border-primary/30 hover:bg-primary/5">
                  <Plus className="h-2.5 w-2.5" /> Add kill tier
                </button>

                {/* Kill tier preview */}
                {killTiers.length > 0 && (
                  <div className="rounded-md bg-muted/40 border border-border/40 px-3 py-2 space-y-1 mt-1">
                    <p className="text-[11px] text-muted-foreground font-semibold mb-1">Pricing overview</p>
                    {killTiers.map((kt, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <span className="text-[11px] text-muted-foreground">{kt.min_kills}–{kt.max_kills === 999999 ? "∞" : kt.max_kills} kills</span>
                        <span className="text-[11px] font-semibold text-primary">${kt.price_per_kill}/kill</span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* Stats tab */}
            {tab === "stats" && (
              <>
                {bossStats.length === 0 && (
                  <div className="rounded-lg border border-primary/20 bg-primary/[0.06] px-3 py-2 text-[11px] text-muted-foreground leading-snug space-y-1.5">
                    <p>
                      <span className="font-medium text-foreground">Per-boss combat stats: </span>
                      Open <strong className="text-foreground">Add stat</strong> below to set level bands (Combat, Prayer, …) for{" "}
                      <strong className="text-foreground">this boss only</strong>. Until then, the storefront uses the{" "}
                      <strong className="text-foreground">service-wide</strong> stats from the &quot;Global stats&quot; section above.
                    </p>
                  </div>
                )}
                {bossStats.length > 0 && (
                  <p className="text-[10px] text-muted-foreground">
                    These stats replace the service-wide list while this boss is selected.
                  </p>
                )}
                {bossStats.length > 0 && (
                  <button type="button"
                    onClick={() => onUpdate({ ...boss, stats: [] })}
                    className="text-[9px] text-amber-400 hover:text-amber-300 transition-colors px-1.5 py-0.5 rounded border border-amber-400/30">
                    Clear boss stats (use service-wide again)
                  </button>
                )}
                {bossStats.map((s, i) => (
                  <StatCard key={i} stat={s}
                    onChange={(updated) => updateBossStat(i, updated)}
                    onRemove={() => removeBossStat(i)} />
                ))}
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={addBossStat}
                    className="flex items-center gap-1 text-[10px] text-primary hover:text-primary/80 transition-colors px-2 py-1 rounded border border-dashed border-primary/30 hover:bg-primary/5">
                    <Plus className="h-2.5 w-2.5" /> Add stat for this boss
                  </button>
                  {globalStats.length > 0 && bossStats.length === 0 && (
                    <button type="button"
                      onClick={() => onUpdate({ ...boss, stats: cloneConfigJson(globalStats) })}
                      className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded border border-dashed border-border hover:bg-muted/30">
                      Copy service-wide stats as template
                    </button>
                  )}
                </div>
              </>
            )}

            {/* Modifiers tab */}
            {tab === "modifiers" && (
              <>
                {bossModifiers.length === 0 && (
                  <div className="rounded-lg border border-primary/20 bg-primary/[0.06] px-3 py-2 text-[11px] text-muted-foreground leading-snug">
                    <p>
                      <span className="font-medium text-foreground">Per-boss upcharges: </span>
                      Use <strong className="text-foreground">Add upcharge</strong> for modifiers that only apply to this boss (loot split, defence mode, …).
                      Until then, customers see the <strong className="text-foreground">service-wide</strong> upcharges from &quot;Global upcharges&quot; above.
                    </p>
                  </div>
                )}
                {bossModifiers.length > 0 && (
                  <p className="text-[10px] text-muted-foreground">
                    These options replace the service-wide upcharge list for this boss.
                  </p>
                )}
                {bossModifiers.length > 0 && (
                  <button type="button"
                    onClick={() => onUpdate({ ...boss, modifiers: [] })}
                    className="text-[9px] text-amber-400 hover:text-amber-300 transition-colors px-1.5 py-0.5 rounded border border-amber-400/30">
                    Clear boss upcharges (use service-wide again)
                  </button>
                )}
                {bossModifiers.map((m, i) => (
                  <ModifierFieldRow key={i} mod={m}
                    onChange={(updated) => updateBossMod(i, updated)}
                    onRemove={() => removeBossMod(i)} />
                ))}
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={addBossMod}
                    className="flex items-center gap-1 text-[10px] text-primary hover:text-primary/80 transition-colors px-2 py-1 rounded border border-dashed border-primary/30 hover:bg-primary/5">
                    <Plus className="h-2.5 w-2.5" /> Add upcharge for this boss
                  </button>
                  {globalModifiers.length > 0 && bossModifiers.length === 0 && (
                    <button type="button"
                      onClick={() => onUpdate({ ...boss, modifiers: cloneConfigJson(globalModifiers) })}
                      className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded border border-dashed border-border hover:bg-muted/30">
                      Copy service-wide upcharges as template
                    </button>
                  )}
                </div>
              </>
            )}

            {/* Gear tab */}
            {tab === "gear" && (
              <>
                {bossLoadoutMods.length === 0 && (
                  <div className="rounded-lg border border-primary/20 bg-primary/[0.06] px-3 py-2 text-[11px] text-muted-foreground leading-snug mb-2">
                    <p>
                      <span className="font-medium text-foreground">Per-boss gear rules: </span>
                      Use <strong className="text-foreground">Add item</strong> below (Twisted bow, fire cape, …) with a price multiplier when the customer has that item equipped.
                      Until you add rules here, the storefront uses <strong className="text-foreground">service-wide</strong> gear rules from &quot;Global gear&quot; above.
                    </p>
                  </div>
                )}
                {bossLoadoutMods.length > 0 && (
                  <p className="text-[10px] text-muted-foreground mb-2">
                    These loadout rules replace the service-wide gear list for this boss.
                  </p>
                )}
                {bossLoadoutMods.length > 0 && (
                  <button
                    type="button"
                    onClick={() => onUpdate({ ...boss, loadout_modifiers: [] })}
                    className="text-[9px] text-amber-400 hover:text-amber-300 transition-colors px-1.5 py-0.5 rounded border border-amber-400/30 mb-2"
                  >
                    Clear boss gear rules (use service-wide again)
                  </button>
                )}
                {globalLoadoutMods.length > 0 && bossLoadoutMods.length === 0 && (
                  <button
                    type="button"
                    onClick={() => onUpdate({ ...boss, loadout_modifiers: cloneConfigJson(globalLoadoutMods) })}
                    className="mb-2 flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded border border-dashed border-border hover:bg-muted/30"
                  >
                    Copy service-wide gear rules as template
                  </button>
                )}
                <LoadoutModifiersConfig
                  modifiers={bossLoadoutMods}
                  onChange={(mods: LoadoutModifier[]) =>
                    onUpdate({ ...boss, loadout_modifiers: mods.length ? mods : undefined })
                  }
                />
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main BossTieredConfig ────────────────────────────────────────────────────

export default function BossTieredConfig({ matrix, onChange }: Props) {
  const globalStats = matrix.stats ?? [];
  const globalModifiers = matrix.modifiers ?? [];
  const globalLoadoutMods = matrix.loadout_modifiers ?? [];
  const [showPicker, setShowPicker] = useState(false);
  const [openSections, setOpenSections] = useState({
    stats: globalStats.length > 0,
    modifiers: globalModifiers.length > 0,
    gear: globalLoadoutMods.length > 0,
    settings: true,
  });

  const existingBossIds = useMemo(
    () => new Set(matrix.bosses.map((b) => b.id)),
    [matrix.bosses],
  );

  const defaultBoss = (): BossConfig => ({
    id: "", label: "",
    kill_tiers: [
      { min_kills: 1, max_kills: 49, price_per_kill: 0.50 },
      { min_kills: 50, max_kills: 99, price_per_kill: 0.40 },
      { min_kills: 100, max_kills: 999999, price_per_kill: 0.30 },
    ],
  });

  const addBoss = () => onChange({ ...matrix, bosses: [...matrix.bosses, defaultBoss()] });

  const addBossesFromPicker = (picked: { id: string; label: string }[]) => {
    const newBosses: BossConfig[] = picked.map(({ id, label }) => ({
      id,
      label,
      kill_tiers: [
        { min_kills: 1, max_kills: 49, price_per_kill: 0.50 },
        { min_kills: 50, max_kills: 99, price_per_kill: 0.40 },
        { min_kills: 100, max_kills: 999999, price_per_kill: 0.30 },
      ],
    }));
    onChange({ ...matrix, bosses: [...matrix.bosses, ...newBosses] });
  };
  const updateBoss = (i: number, b: BossConfig) =>
    onChange({ ...matrix, bosses: matrix.bosses.map((boss, idx) => idx === i ? b : boss) });
  const removeBoss = (i: number) =>
    onChange({ ...matrix, bosses: matrix.bosses.filter((_, idx) => idx !== i) });

  const defaultStat = (): StatConfig => ({
    id: "attack",
    label: "Attack",
    min: 1,
    max: 99,
    thresholds: [{ max: 70, multiplier: 1.2 }, { max: 99, multiplier: 1.0 }],
  });
  const addGlobalStat = () => onChange({ ...matrix, stats: [...globalStats, defaultStat()] });
  const updateGlobalStat = (i: number, s: StatConfig) =>
    onChange({ ...matrix, stats: globalStats.map((st, idx) => idx === i ? s : st) });
  const removeGlobalStat = (i: number) =>
    onChange({ ...matrix, stats: globalStats.filter((_, idx) => idx !== i) });

  const defaultMod = (): QuestModifierField => ({
    id: `mod_${Date.now()}`, label: "", type: "radio", options: [],
  });
  const addGlobalMod = () => onChange({ ...matrix, modifiers: [...globalModifiers, defaultMod()] });
  const updateGlobalMod = (i: number, m: QuestModifierField) =>
    onChange({ ...matrix, modifiers: globalModifiers.map((md, idx) => idx === i ? m : md) });
  const removeGlobalMod = (i: number) =>
    onChange({ ...matrix, modifiers: globalModifiers.filter((_, idx) => idx !== i) });

  const unitLabel = matrix.unit_label ?? "kills";
  const toggleSection = (key: keyof typeof openSections) =>
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border/70 bg-card/40 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-primary">
            Boss-first setup
          </span>
          <span className="inline-flex items-center rounded-full border border-border bg-background px-2.5 py-1 text-[10px] font-medium text-muted-foreground">
            {matrix.bosses.length} boss{matrix.bosses.length !== 1 ? "es" : ""}
          </span>
          <span className="inline-flex items-center rounded-full border border-border bg-background px-2.5 py-1 text-[10px] font-medium text-muted-foreground">
            {globalStats.length} global stat{globalStats.length !== 1 ? "s" : ""}
          </span>
          <span className="inline-flex items-center rounded-full border border-border bg-background px-2.5 py-1 text-[10px] font-medium text-muted-foreground">
            {globalModifiers.length} upcharge{globalModifiers.length !== 1 ? "s" : ""}
          </span>
          <span className="inline-flex items-center rounded-full border border-border bg-background px-2.5 py-1 text-[10px] font-medium text-muted-foreground">
            {globalLoadoutMods.length} gear rule{globalLoadoutMods.length !== 1 ? "s" : ""}
          </span>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Start with the bosses customers can pick. Use the advanced sections below only when you need shared stat rules,
          shared upcharges, gear adjustments, or pricing limits.
        </p>
      </div>

      {/* Boss picker modal */}
      {showPicker && (
        <BossPickerModal
          existingIds={existingBossIds}
          onAdd={addBossesFromPicker}
          onClose={() => setShowPicker(false)}
        />
      )}

      <section className="rounded-xl border border-border bg-card">
        <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
          <div>
            <p className="text-sm font-semibold">Bosses & tiers</p>
            <p className="text-xs text-muted-foreground mt-1">
              Expand a boss row: <strong className="text-foreground">Kill tiers</strong> are always per boss. Use{" "}
              <strong className="text-foreground">Combat stats</strong>, <strong className="text-foreground">Upcharges</strong>, and{" "}
              <strong className="text-foreground">Gear</strong> to override the service-wide defaults for that boss only (via &quot;Add …&quot;).
            </p>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => setShowPicker(true)}
              className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors px-3 py-2 rounded-lg border border-primary/40 hover:bg-primary/5 font-medium">
              <ListFilter className="h-3.5 w-3.5" /> Pick from list
            </button>
            <button type="button" onClick={addBoss}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-3 py-2 rounded-lg border border-dashed border-border hover:bg-muted/30">
              <Plus className="h-3.5 w-3.5" /> Add manually
            </button>
          </div>
        </div>
        <div className="space-y-3 p-4">
          {matrix.bosses.length === 0 && (
            <div className="rounded-lg border border-dashed border-border bg-muted/10 px-4 py-6 text-center">
              <p className="text-sm font-medium">No bosses yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                Pick bosses from the OSRS list or add one manually. Expand a boss to set kill tiers — use the{" "}
                <strong className="text-foreground">Combat stats</strong>, <strong className="text-foreground">Upcharges</strong>, and{" "}
                <strong className="text-foreground">Gear</strong> tabs for rules that apply to that boss only.
              </p>
            </div>
          )}
          {matrix.bosses.map((boss, i) => (
            <BossRow
              key={i}
              boss={boss}
              globalStats={globalStats}
              globalModifiers={globalModifiers}
              globalLoadoutMods={globalLoadoutMods}
              onUpdate={(updated) => updateBoss(i, updated)}
              onRemove={() => removeBoss(i)}
            />
          ))}
        </div>
      </section>

      <div className="space-y-3">
        <section className="rounded-xl border border-border bg-card">
          <button
            type="button"
            onClick={() => toggleSection("stats")}
            className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
          >
            <div>
              <p className="text-sm font-semibold">Global stats</p>
              <p className="text-xs text-muted-foreground mt-1">
                Shared stat thresholds used by bosses without their own custom stat rules.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded-full border border-border bg-background px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                {globalStats.length}
              </span>
              {openSections.stats ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
            </div>
          </button>
          {openSections.stats && (
            <div className="space-y-2 border-t border-border px-4 py-4">
          <p className="text-xs text-muted-foreground">
            Global stats apply to all bosses that don&apos;t have their own stats configured.
            Use OSRS skill IDs (attack, strength, defence, ranged, magic, …); higher levels usually mean lower prices.
          </p>
          {globalStats.map((s, i) => (
            <StatCard key={i} stat={s}
              onChange={(updated) => updateGlobalStat(i, updated)}
              onRemove={() => removeGlobalStat(i)} />
          ))}
          <button type="button" onClick={addGlobalStat}
            className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors px-3 py-2 rounded-lg border border-dashed border-primary/30 hover:bg-primary/5 w-full justify-center">
            <Plus className="h-3.5 w-3.5" /> Add global stat
          </button>
            </div>
          )}
        </section>

        <section className="rounded-xl border border-border bg-card">
          <button
            type="button"
            onClick={() => toggleSection("modifiers")}
            className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
          >
            <div>
              <p className="text-sm font-semibold">Global upcharges</p>
              <p className="text-xs text-muted-foreground mt-1">
                Shared add-ons such as rush, loot split, or account type that apply across bosses.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded-full border border-border bg-background px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                {globalModifiers.length}
              </span>
              {openSections.modifiers ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
            </div>
          </button>
          {openSections.modifiers && (
            <div className="space-y-2 border-t border-border px-4 py-4">
          <p className="text-xs text-muted-foreground">
            Global upcharges apply to all bosses that don&apos;t have their own upcharges.
            e.g. Loot split, Account type, Rush.
          </p>
          {globalModifiers.map((m, i) => (
            <ModifierFieldRow key={i} mod={m}
              onChange={(updated) => updateGlobalMod(i, updated)}
              onRemove={() => removeGlobalMod(i)} />
          ))}
          <button type="button" onClick={addGlobalMod}
            className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors px-3 py-2 rounded-lg border border-dashed border-primary/30 hover:bg-primary/5 w-full justify-center">
            <Plus className="h-3.5 w-3.5" /> Add global upcharge
          </button>
            </div>
          )}
        </section>

        <section className="rounded-xl border border-border bg-card">
          <button
            type="button"
            onClick={() => toggleSection("gear")}
            className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
          >
            <div>
              <p className="text-sm font-semibold">Gear modifiers</p>
              <p className="text-xs text-muted-foreground mt-1">
                Shared loadout-based modifiers used when bosses don&apos;t override them individually.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded-full border border-border bg-background px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                {globalLoadoutMods.length}
              </span>
              {openSections.gear ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
            </div>
          </button>
          {openSections.gear && (
            <div className="border-t border-border px-4 py-4">
              <LoadoutModifiersConfig
                modifiers={globalLoadoutMods}
                onChange={(mods: LoadoutModifier[]) => onChange({ ...matrix, loadout_modifiers: mods.length ? mods : undefined })}
              />
            </div>
          )}
        </section>

        <section className="rounded-xl border border-border bg-card">
          <button
            type="button"
            onClick={() => toggleSection("settings")}
            className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
          >
            <div>
              <p className="text-sm font-semibold">Pricing settings</p>
              <p className="text-xs text-muted-foreground mt-1">
                Set shared limits and the label shown to customers for kill-based pricing.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded-full border border-border bg-background px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                {unitLabel}
              </span>
              {openSections.settings ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
            </div>
          </button>
          {openSections.settings && (
            <div className="space-y-3 border-t border-border px-4 py-4">
          <div className="space-y-1.5">
            <p className="text-xs font-medium">Unit label</p>
            <p className="text-[10px] text-muted-foreground">What is being counted? e.g. kills, points, runs, games</p>
            <Input
              value={unitLabel}
              onChange={(e) => onChange({ ...matrix, unit_label: e.target.value.trim() || "kills" })}
              placeholder="kills"
              className="h-8 text-sm max-w-[160px]"
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <p className="text-xs font-medium">Minimum price ($)</p>
              <NumericInput step="0.01" min={0} value={matrix.minimum_price ?? 0}
                onChange={(val) => onChange({ ...matrix, minimum_price: val })}
                className="h-8 text-sm" />
            </div>
            <div className="space-y-1.5">
              <p className="text-xs font-medium">Minimum {unitLabel}</p>
              <NumericInput integer min={1} value={matrix.minimum_kills ?? 1}
                onChange={(val) => onChange({ ...matrix, minimum_kills: val })}
                className="h-8 text-sm" />
            </div>
            <div className="space-y-1.5">
              <p className="text-xs font-medium">Maximum {unitLabel}</p>
              <NumericInput integer min={1} value={matrix.maximum_kills ?? 1000}
                onChange={(val) => onChange({ ...matrix, maximum_kills: val })}
                className="h-8 text-sm" />
            </div>
          </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
