"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Trash2, ChevronDown, ChevronUp, Download, Loader2, Package, Pencil, X, Check, AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { NumericInput } from "@/components/ui/numeric-input";
import { cn } from "@/lib/utils/cn";
import type {
  PerItemStatBasedPriceMatrix,
  PriceItem,
  StatConfig,
  StatThreshold,
  QuestModifierField,
  QuestPackageItem,
} from "@/types/service-config";
import { OSRS_STATS } from "./StatBasedConfig";

type ApiPackage = { id: string; name: string; slug: string; description: string | null; base_price: number; quest_ids: string[] };

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

// ─── Inline package form ───────────────────────────────────────────────────────

function PackageForm({
  gameId,
  initial,
  questItems,
  onSave,
  onCancel,
}: {
  gameId: string;
  initial?: ApiPackage;
  questItems: PriceItem[];
  onSave: (pkg: ApiPackage) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [basePrice, setBasePrice] = useState(initial?.base_price ?? 0);
  const [selectedIds, setSelectedIds] = useState<string[]>(initial?.quest_ids ?? []);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleNameChange = (v: string) => {
    setName(v);
    if (!initial) setSlug(slugify(v));
  };

  const toggleQuest = (id: string) =>
    setSelectedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedIds.length === 0) { setError("Select at least one quest."); return; }
    setSaving(true);
    setError(null);
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);
      const url = initial ? `/api/admin/quest-packages/${initial.id}` : `/api/admin/games/${gameId}/quest-packages`;
      const method = initial ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, slug, description: description || null, base_price: basePrice, quest_ids: selectedIds }),
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? `Server error (${res.status})`);
        return;
      }
      const saved = await res.json();
      onSave({ id: initial?.id ?? saved.id, name, slug, description: description || null, base_price: basePrice, quest_ids: selectedIds });
    } catch (err) {
      setError(err instanceof Error && err.name === "AbortError" ? "Request timed out. Try again." : "Network error. Try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border border-primary/30 bg-primary/5 p-3 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-semibold text-primary">{initial ? "Edit package" : "New package"}</p>
        <button type="button" onClick={onCancel} className="p-0.5 text-muted-foreground hover:text-foreground"><X className="h-3.5 w-3.5" /></button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1 col-span-2 sm:col-span-1">
          <p className="text-[10px] text-muted-foreground">Name *</p>
          <Input value={name} onChange={(e) => handleNameChange(e.target.value)} placeholder="Starter quest pack" className="h-7 text-xs" required />
        </div>
        <div className="space-y-1 col-span-2 sm:col-span-1">
          <p className="text-[10px] text-muted-foreground">Slug *</p>
          <Input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="starter-quest-pack" className="h-7 text-xs font-mono" required />
        </div>
        <div className="space-y-1 col-span-2">
          <p className="text-[10px] text-muted-foreground">Description (optional)</p>
          <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Short description…" className="h-7 text-xs" />
        </div>
        <div className="space-y-1">
          <p className="text-[10px] text-muted-foreground">Base price ($) *</p>
          <NumericInput step="0.01" min={0} value={basePrice} onChange={setBasePrice} placeholder="0.00" className="h-7 text-xs" />
        </div>
      </div>
      <div className="space-y-1">
        <p className="text-[10px] text-muted-foreground font-medium">
          Quests in package *{" "}
          <span className="font-normal">{selectedIds.length > 0 ? `(${selectedIds.length} selected)` : ""}</span>
        </p>
        <div className="max-h-36 overflow-y-auto rounded-md border border-border bg-background divide-y divide-border/40">
          {questItems.map((q) => (
            <label key={q.id} className={cn("flex items-center gap-2 px-2 py-1.5 cursor-pointer hover:bg-muted/30 transition-colors", selectedIds.includes(q.id) && "bg-primary/5")}>
              <input
                type="checkbox"
                checked={selectedIds.includes(q.id)}
                onChange={() => toggleQuest(q.id)}
                className="h-3.5 w-3.5 rounded"
              />
              <span className="text-[11px]">{q.label}</span>
            </label>
          ))}
          {questItems.length === 0 && (
            <p className="text-[11px] text-muted-foreground px-2 py-2">Import quests first using the button above.</p>
          )}
        </div>
      </div>
      {error && (
        <p className="text-[11px] text-destructive flex items-center gap-1"><AlertCircle className="h-3 w-3" />{error}</p>
      )}
      <div className="flex items-center justify-end gap-2">
        <button type="button" onClick={onCancel} className="text-[11px] text-muted-foreground hover:text-foreground px-2 py-1">Cancel</button>
        <button type="submit" disabled={saving || !name.trim() || !slug.trim() || selectedIds.length === 0}
          className="flex items-center gap-1 text-[11px] font-medium px-3 py-1.5 rounded-md bg-primary text-white hover:bg-primary/90 disabled:opacity-50 transition-colors">
          {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
          {saving ? "Saving…" : initial ? "Save" : "Create"}
        </button>
      </div>
    </form>
  );
}

interface Props {
  matrix: PerItemStatBasedPriceMatrix;
  onChange: (matrix: PerItemStatBasedPriceMatrix) => void;
  gameId?: string;
}

type QuestRow = {
  id: string;
  name: string;
  slug: string;
  difficulty: string;
  length: string;
  quest_points: number;
  series: string | null;
  is_members: boolean;
};

// ─── Threshold row (reused from StatBasedConfig) ──────────────────────────────

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
          isExpensive ? "text-red-400" : isMedium ? "text-amber-400" :
          threshold.multiplier < 0.9 ? "text-green-400" : "text-muted-foreground"
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

  const sorted = [...stat.thresholds].sort((a, b) => a.max - b.max);

  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="flex items-center gap-2 px-3 py-2">
        <div className="flex-1 min-w-0">
          <Input
            value={stat.label}
            onChange={(e) => onChange({ ...stat, label: e.target.value })}
            onBlur={(e) => {
              // Auto-fill label from ID if left empty
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
              <NumericInput
                integer min={1} max={98}
                value={stat.min}
                onChange={(val) => onChange({ ...stat, min: val })}
                className="h-7 text-xs text-center"
              />
            </div>
            <div className="space-y-1">
              <p className="text-[10px] text-muted-foreground font-medium">Max level</p>
              <NumericInput
                integer min={2} max={99}
                value={stat.max}
                onChange={(val) => onChange({ ...stat, max: val })}
                className="h-7 text-xs text-center"
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] text-muted-foreground font-medium">Price bands</p>
                <p className="text-[10px] text-muted-foreground/70">Each band applies a multiplier when the stat is ≤ that level.</p>
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

// ─── QuestItemRow: expandable per-quest config ───────────────────────────────

function QuestItemRow({ item, globalStats, onUpdate, onRemove }: {
  item: PriceItem;
  globalStats: StatConfig[];
  onUpdate: (item: PriceItem) => void;
  onRemove: () => void;
}) {
  const [open, setOpen] = useState(false);

  const questStats = item.stats ?? [];
  const questModifiers = item.modifiers ?? [];
  const hasCustomConfig = questStats.length > 0 || questModifiers.length > 0;

  // ── Per-quest stats ──
  const defaultStat = (): StatConfig => ({
    id: "", label: "", min: 1, max: 99,
    thresholds: [{ max: 43, multiplier: 2.0 }, { max: 70, multiplier: 1.3 }, { max: 99, multiplier: 1.0 }],
  });

  const addQuestStat = () => onUpdate({ ...item, stats: [...questStats, defaultStat()] });
  const updateQuestStat = (i: number, s: StatConfig) =>
    onUpdate({ ...item, stats: questStats.map((st, idx) => idx === i ? s : st) });
  const removeQuestStat = (i: number) =>
    onUpdate({ ...item, stats: questStats.filter((_, idx) => idx !== i) });

  // Copy global stats to this quest
  const copyGlobalStats = () => onUpdate({ ...item, stats: globalStats.map((s) => ({ ...s })) });

  // ── Per-quest modifiers ──
  const addQuestModifier = () => onUpdate({
    ...item,
    modifiers: [...questModifiers, { id: "", label: "", type: "radio" as const, options: [] }],
  });
  const updateQuestModifier = (i: number, mod: QuestModifierField) =>
    onUpdate({ ...item, modifiers: questModifiers.map((m, idx) => idx === i ? mod : m) });
  const removeQuestModifier = (i: number) =>
    onUpdate({ ...item, modifiers: questModifiers.filter((_, idx) => idx !== i) });

  return (
    <div className={cn("rounded-lg border bg-muted/20 overflow-hidden", hasCustomConfig ? "border-primary/30" : "border-border")}>
      {/* Main row */}
      <div className="flex items-center gap-2 p-2">
        <div className="flex-1 min-w-0">
          <Input
            value={item.label}
            onChange={(e) => {
              const label = e.target.value;
              onUpdate({ ...item, label, ...(!item.id ? { id: label.toLowerCase().replace(/\s+/g, "_") } : {}) });
            }}
            placeholder="Quest name"
            className="h-7 text-sm"
          />
          {item.description && (
            <p className="text-[10px] text-muted-foreground mt-0.5 px-1 truncate">{item.description}</p>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <span className="text-xs text-muted-foreground">$</span>
          <NumericInput
            step="0.01" min={0}
            value={item.price}
            onChange={(val) => onUpdate({ ...item, price: val })}
            placeholder="0.00"
            className="h-7 text-sm w-20 text-right"
          />
        </div>
        {/* Config toggle */}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className={cn(
            "flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium transition-colors shrink-0",
            hasCustomConfig
              ? "bg-primary/10 text-primary hover:bg-primary/20"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
          )}
          title="Configure stats & modifiers for this quest"
        >
          {open ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          {hasCustomConfig ? `${questStats.length}s ${questModifiers.length}m` : "config"}
        </button>
        <button type="button" onClick={onRemove}
          className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0">
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Expanded config */}
      {open && (
        <div className="border-t border-border/60 p-3 space-y-4 bg-background/40">

          {/* Stats */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-medium">Account stats for this quest</p>
                <p className="text-[10px] text-muted-foreground">
                  {questStats.length === 0
                    ? "No custom stats — uses global stats below."
                    : `${questStats.length} custom stat${questStats.length !== 1 ? "s" : ""} — overrides global stats.`}
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                {globalStats.length > 0 && questStats.length === 0 && (
                  <button type="button" onClick={copyGlobalStats}
                    className="text-[10px] text-primary hover:text-primary/80 px-2 py-1 rounded border border-dashed border-primary/30 hover:bg-primary/5 transition-colors">
                    Copy global
                  </button>
                )}
                <button type="button" onClick={addQuestStat}
                  className="flex items-center gap-1 text-[10px] text-primary hover:text-primary/80 px-2 py-1 rounded border border-dashed border-primary/30 hover:bg-primary/5 transition-colors">
                  <Plus className="h-2.5 w-2.5" /> Add stat
                </button>
              </div>
            </div>
            {questStats.map((stat, i) => (
              <StatCard key={i} stat={stat}
                onChange={(s) => updateQuestStat(i, s)}
                onRemove={() => removeQuestStat(i)} />
            ))}
          </div>

          {/* Modifiers */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-medium">Price modifiers for this quest</p>
                <p className="text-[10px] text-muted-foreground">
                  {questModifiers.length === 0
                    ? "No custom modifiers — uses global modifiers."
                    : `${questModifiers.length} modifier${questModifiers.length !== 1 ? "s" : ""} — overrides global modifiers.`}
                </p>
              </div>
              <button type="button" onClick={addQuestModifier}
                className="flex items-center gap-1 text-[10px] text-primary hover:text-primary/80 px-2 py-1 rounded border border-dashed border-primary/30 hover:bg-primary/5 transition-colors">
                <Plus className="h-2.5 w-2.5" /> Add modifier
              </button>
            </div>
            {questModifiers.map((mod, i) => (
              <ModifierFieldRow key={i} mod={mod}
                onChange={(m) => updateQuestModifier(i, m)}
                onRemove={() => removeQuestModifier(i)} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── ModifierFieldRow ─────────────────────────────────────────────────────────

function ModifierFieldRow({ mod, onChange, onRemove }: {
  mod: QuestModifierField;
  onChange: (m: QuestModifierField) => void;
  onRemove: () => void;
}) {
  const [open, setOpen] = useState(true);
  const options = mod.options ?? [];

  const addOption = () => onChange({ ...mod, options: [...options, { value: "", label: "", multiplier: 1 }] });
  const updateOption = (i: number, field: string, value: string | number) =>
    onChange({ ...mod, options: options.map((o, idx) => idx === i ? { ...o, [field]: value } : o) });
  const removeOption = (i: number) =>
    onChange({ ...mod, options: options.filter((_, idx) => idx !== i) });

  return (
    <div className="rounded-md border border-border/60 bg-muted/10">
      <div className="flex items-center gap-2 px-2.5 py-1.5">
        <Input
          value={mod.label}
          onChange={(e) => onChange({ ...mod, label: e.target.value, id: mod.id || e.target.value.toLowerCase().replace(/\s+/g, "_") })}
          placeholder="Modifier label (e.g. Account type)"
          className="h-6 text-xs border-0 bg-transparent px-0 focus-visible:ring-0"
        />
        <select
          value={mod.type}
          onChange={(e) => onChange({ ...mod, type: e.target.value as QuestModifierField["type"] })}
          className="h-6 text-[10px] rounded border border-border bg-background px-1"
        >
          <option value="radio">Radio (single choice)</option>
          <option value="multi_select">Multi-select (multiple)</option>
          <option value="select">Dropdown</option>
          <option value="checkbox">Checkbox</option>
        </select>
        <button type="button" onClick={() => setOpen((v) => !v)} className="p-0.5 text-muted-foreground hover:text-foreground">
          {open ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </button>
        <button type="button" onClick={onRemove} className="p-0.5 text-muted-foreground hover:text-destructive transition-colors">
          <Trash2 className="h-3 w-3" />
        </button>
      </div>
      {open && mod.type !== "checkbox" && (
        <div className="px-2.5 pb-2 space-y-1 border-t border-border/40 pt-1.5">
          {mod.type === "multi_select" && (
            <p className="text-[9px] text-primary/70 mb-1">Customer can select multiple options — multipliers stack.</p>
          )}
          {options.map((opt, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <Input value={opt.label} onChange={(e) => updateOption(i, "label", e.target.value)}
                placeholder="Option label" className="h-6 text-xs flex-1" />
              <Input value={opt.value || ""} onChange={(e) => updateOption(i, "value", e.target.value)}
                placeholder="value" className="h-6 text-xs w-20 font-mono" />
              <div className="flex items-center gap-0.5 shrink-0">
                <span className="text-[9px] text-muted-foreground">×</span>
                <NumericInput step="0.05" min={0.01}
                  value={opt.multiplier ?? 1}
                  onChange={(val) => updateOption(i, "multiplier", val)}
                  className="h-6 text-xs w-14 text-center" />
              </div>
              <button type="button" onClick={() => removeOption(i)}
                className="p-0.5 text-muted-foreground hover:text-destructive transition-colors shrink-0">
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ))}
          <button type="button" onClick={addOption}
            className="flex items-center gap-1 text-[10px] text-primary hover:text-primary/80 transition-colors">
            <Plus className="h-2.5 w-2.5" /> Add option
          </button>
        </div>
      )}
      {open && mod.type === "checkbox" && (
        <div className="px-2.5 pb-2 border-t border-border/40 pt-1.5 flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground">When checked: Price ×</span>
          <NumericInput step="0.05" min={0.01}
            value={mod.multiplier ?? 1}
            onChange={(val) => onChange({ ...mod, multiplier: val })}
            className="h-6 text-xs w-16 text-center" />
          <span className="text-[10px] text-muted-foreground">+ $</span>
          <NumericInput step="0.01" min={0}
            value={mod.price_add ?? 0}
            onChange={(val) => onChange({ ...mod, price_add: val })}
            className="h-6 text-xs w-16 text-center" />
        </div>
      )}
    </div>
  );
}

// ─── Main PerItemStatBasedConfig ──────────────────────────────────────────────

export default function PerItemStatBasedConfig({ matrix, onChange, gameId }: Props) {
  const items = matrix.items ?? [];
  const stats = matrix.stats ?? [];

  // ── Import state ──
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importFilter, setImportFilter] = useState<"all" | "members" | "f2p">("all");

  const handleImportQuests = async () => {
    if (!gameId) return;
    setImporting(true);
    setImportError(null);
    try {
      const membersParam = importFilter === "members" ? "true" : importFilter === "f2p" ? "false" : "all";
      const res = await fetch(`/api/admin/game-quests?game_id=${gameId}&members=${membersParam}`);
      if (!res.ok) { setImportError("Failed to load quests"); return; }
      const quests: QuestRow[] = await res.json();
      const existingSlugs = new Set(items.map((i) => i.id));
      const newItems: PriceItem[] = quests
        .filter((q) => !existingSlugs.has(q.slug))
        .map((q) => ({
          id: q.slug,
          label: q.name,
          price: 0,
          description: `${q.difficulty} · ${q.length} · ${q.quest_points} QP${q.series ? ` · ${q.series}` : ""}`,
        }));
      onChange({ ...matrix, items: [...items, ...newItems] });
    } catch {
      setImportError("Something went wrong");
    } finally {
      setImporting(false);
    }
  };

  const addItem = () =>
    onChange({ ...matrix, items: [...items, { id: "", label: "", price: 0 }] });
  const updateItem = (i: number, updated: PriceItem) =>
    onChange({ ...matrix, items: items.map((it, idx) => idx === i ? updated : it) });
  const removeItem = (i: number) =>
    onChange({ ...matrix, items: items.filter((_, idx) => idx !== i) });

  // ── Quest packages ──
  const currentPackages = matrix.packages ?? [];
  const [availablePackages, setAvailablePackages] = useState<ApiPackage[]>([]);
  const [packagesLoading, setPackagesLoading] = useState(false);
  const [packageFormMode, setPackageFormMode] = useState<null | "create" | "edit">(null);
  const [editingPackage, setEditingPackage] = useState<ApiPackage | null>(null);

  const fetchPackages = useCallback(() => {
    if (!gameId) return;
    setPackagesLoading(true);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    fetch(`/api/admin/games/${gameId}/quest-packages`, { signal: controller.signal })
      .then((r) => { clearTimeout(timeout); return r.ok ? r.json() : []; })
      .then((data: ApiPackage[]) => setAvailablePackages(Array.isArray(data) ? data : []))
      .catch(() => setAvailablePackages([]))
      .finally(() => setPackagesLoading(false));
  }, [gameId]);

  useEffect(() => { fetchPackages(); }, [fetchPackages]);

  const selectedPackageIds = new Set(currentPackages.map((p) => p.id));

  const setPackageIncluded = (pkg: ApiPackage, included: boolean) => {
    if (included) {
      const newPkg: QuestPackageItem = {
        id: pkg.id,
        label: pkg.name,
        description: pkg.description ?? undefined,
        base_price: pkg.base_price,
        quest_ids: pkg.quest_ids,
      };
      onChange({ ...matrix, packages: [...currentPackages, newPkg] });
    } else {
      onChange({ ...matrix, packages: currentPackages.filter((p) => p.id !== pkg.id) });
    }
  };

  const openCreatePackage = () => {
    setEditingPackage(null);
    setPackageFormMode("create");
  };

  const openEditPackage = (pkg: ApiPackage) => {
    setEditingPackage(pkg);
    setPackageFormMode("edit");
  };

  const handleDeletePackage = async (pkg: ApiPackage) => {
    if (!confirm(`Delete package "${pkg.name}"? This cannot be undone.`)) return;
    await fetch(`/api/admin/quest-packages/${pkg.id}`, { method: "DELETE" });
    fetchPackages();
    // Also deselect from service
    onChange({ ...matrix, packages: currentPackages.filter((p) => p.id !== pkg.id) });
  };

  const handlePackageSaved = (saved: ApiPackage) => {
    // Refresh list, close form
    fetchPackages();
    setPackageFormMode(null);
    setEditingPackage(null);
    // Auto-include the saved package in this service
    setPackageIncluded(saved, true);
  };

  // ── Global stats ──
  const defaultStat = (): StatConfig => ({
    id: "", label: "", min: 1, max: 99,
    thresholds: [{ max: 43, multiplier: 2.0 }, { max: 70, multiplier: 1.3 }, { max: 99, multiplier: 1.0 }],
  });
  const addStat = () => onChange({ ...matrix, stats: [...stats, defaultStat()] });
  const updateStat = (i: number, s: StatConfig) =>
    onChange({ ...matrix, stats: stats.map((st, idx) => idx === i ? s : st) });
  const removeStat = (i: number) =>
    onChange({ ...matrix, stats: stats.filter((_, idx) => idx !== i) });

  return (
    <div className="space-y-6">

      {/* ── Section 1: Quest list ── */}
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-sm font-medium">Quests</p>
            <p className="text-[11px] text-muted-foreground">
              Set a base price per quest. Click <strong>config</strong> on a quest to set its own stats and modifiers.
            </p>
          </div>
          <button type="button" onClick={addItem}
            className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors shrink-0">
            <Plus className="h-3.5 w-3.5" /> Add
          </button>
        </div>

        {/* Import */}
        {gameId && (
          <div className="rounded-lg border border-dashed border-primary/30 bg-primary/5 p-3 space-y-2">
            <p className="text-[11px] font-medium text-primary">Import from database</p>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex rounded-lg border border-border overflow-hidden text-[11px]">
                {(["all", "members", "f2p"] as const).map((f) => (
                  <button key={f} type="button" onClick={() => setImportFilter(f)}
                    className={cn("px-2.5 py-1 transition-colors",
                      importFilter === f ? "bg-primary text-white" : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                    )}>
                    {f === "all" ? "All" : f === "members" ? "Members" : "F2P"}
                  </button>
                ))}
              </div>
              <button type="button" onClick={handleImportQuests} disabled={importing}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-medium hover:bg-primary/90 disabled:opacity-60 transition-colors">
                {importing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                {importing ? "Importing..." : "Import quests"}
              </button>
              {items.length > 0 && (
                <span className="text-[11px] text-muted-foreground">{items.length} loaded</span>
              )}
            </div>
            {importError && <p className="text-[11px] text-destructive">{importError}</p>}
          </div>
        )}

        {items.length === 0 && (
          <p className="text-xs text-muted-foreground py-2">No quests yet.</p>
        )}

        <div className="space-y-1.5">
          {items.map((item, i) => (
            <QuestItemRow
              key={i}
              item={item}
              globalStats={stats}
              onUpdate={(updated) => updateItem(i, updated)}
              onRemove={() => removeItem(i)}
            />
          ))}
        </div>
      </div>

      {/* ── Section 1b: Quest packages ── */}
      {gameId && (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-primary" />
              <div>
                <p className="text-sm font-medium">Quest packages</p>
                <p className="text-[11px] text-muted-foreground">
                  Bundle multiple quests into one package at a fixed price.
                </p>
              </div>
            </div>
            {packageFormMode === null && (
              <button type="button" onClick={openCreatePackage}
                className="flex items-center gap-1 text-[11px] text-primary hover:text-primary/80 px-2 py-1 rounded border border-dashed border-primary/30 hover:bg-primary/5 transition-colors shrink-0">
                <Plus className="h-3 w-3" /> New package
              </button>
            )}
          </div>

          {/* Inline create/edit form */}
          {packageFormMode !== null && (
            <PackageForm
              gameId={gameId}
              initial={packageFormMode === "edit" && editingPackage ? editingPackage : undefined}
              questItems={items}
              onSave={handlePackageSaved}
              onCancel={() => { setPackageFormMode(null); setEditingPackage(null); }}
            />
          )}

          {/* Package list */}
          {packagesLoading ? (
            <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading packages…
            </p>
          ) : availablePackages.length === 0 ? (
            <p className="text-[11px] text-muted-foreground py-2">
              No packages yet. Click <strong>New package</strong> to create one.
            </p>
          ) : (
            <div className="rounded-lg border border-border bg-muted/10 divide-y divide-border/40 overflow-hidden">
              {availablePackages.map((pkg) => {
                const isIncluded = selectedPackageIds.has(pkg.id);
                return (
                  <div key={pkg.id} className={cn("flex items-center gap-2 px-3 py-2", isIncluded && "bg-primary/5")}>
                    <input
                      type="checkbox"
                      checked={isIncluded}
                      onChange={(e) => setPackageIncluded(pkg, e.target.checked)}
                      className="h-4 w-4 rounded border-border shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium">{pkg.name}</span>
                      <span className="text-[11px] text-muted-foreground ml-2">
                        {pkg.quest_ids.length} quest{pkg.quest_ids.length !== 1 ? "s" : ""} · ${Number(pkg.base_price).toFixed(2)}
                      </span>
                      {pkg.description && (
                        <p className="text-[10px] text-muted-foreground truncate">{pkg.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button type="button" onClick={() => openEditPackage(pkg)}
                        className="p-1 text-muted-foreground hover:text-foreground transition-colors">
                        <Pencil className="h-3 w-3" />
                      </button>
                      <button type="button" onClick={() => handleDeletePackage(pkg)}
                        className="p-1 text-muted-foreground hover:text-destructive transition-colors">
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Section 2: Global stats (fallback) ── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Global account stats <span className="text-[10px] text-muted-foreground font-normal">(fallback)</span></p>
            <p className="text-[11px] text-muted-foreground">
              Applied to quests that have no custom stats configured.
            </p>
          </div>
          <button type="button" onClick={addStat}
            className="flex items-center gap-1 px-2 py-1 rounded-lg border border-dashed border-primary/30 text-[11px] text-primary hover:bg-primary/5 transition-colors">
            <Plus className="h-3 w-3" /> Add stat
          </button>
        </div>
        {stats.length === 0 ? (
          <p className="text-[11px] text-muted-foreground py-2">No global stats. Configure stats per quest or add global ones here.</p>
        ) : (
          <div className="space-y-2">
            {stats.map((stat, i) => (
              <StatCard key={i} stat={stat} onChange={(s) => updateStat(i, s)} onRemove={() => removeStat(i)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
