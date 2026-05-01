"use client";

import { useState } from "react";
import { Plus, Trash2, ChevronDown, ChevronUp, Database, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { NumericInput } from "@/components/ui/numeric-input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils/cn";
import { getXpDiff } from "@/lib/osrs-xp-table";
import { getMethodPresets } from "@/lib/osrs-method-presets";
import { OSRS_SKILLS } from "@/lib/osrs-skills";
import type { XpBasedPriceMatrix, SkillConfig, XpTier, XpTableKey, MethodOption, TierModifierField, ModifierOption } from "@/types/service-config";
import type { GameSkill, GameMethod } from "@/app/(admin)/admin/games/[gameId]/setup/setup-client";

interface SkillingPriceRow {
  method_id: number;
  method_name: string;
  level_min: number;
  level_max: number;
  gp_per_xp: number;
  sort_order: number;
}

interface Props {
  matrix: XpBasedPriceMatrix;
  onChange: (matrix: XpBasedPriceMatrix) => void;
  gameSkills?: GameSkill[];
  gameMethods?: GameMethod[];
  gameId?: string;
}

const XP_TABLES: { value: XpTableKey; label: string }[] = [
  { value: "osrs", label: "Old School RuneScape (OSRS)" },
  { value: "rs3",  label: "RuneScape 3 (RS3)" },
];

// ─── OSRS Icon Picker ─────────────────────────────────────────────────────────

function OsrsIconPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const isUrl = value?.startsWith("http");
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-10 h-7 rounded border border-input bg-background flex items-center justify-center hover:bg-muted transition-colors"
        title="Pick skill icon"
      >
        {isUrl
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={value} alt="" width={18} height={18} className="object-contain" />
          : <span className="text-base">{value || "?"}</span>
        }
      </button>
      {open && (
        <div className="absolute top-8 left-0 z-30 bg-background border border-border rounded-xl p-2 shadow-2xl" style={{ width: 208 }}>
          <div className="grid grid-cols-6 gap-1">
            {OSRS_SKILLS.map((s) => (
              <button
                key={s.id}
                type="button"
                title={s.label}
                onClick={() => { onChange(s.icon); setOpen(false); }}
                className={cn(
                  "p-1 rounded hover:bg-muted transition-colors",
                  value === s.icon && "bg-primary/20 ring-1 ring-primary"
                )}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={s.icon} alt={s.label} width={20} height={20} className="object-contain" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/** Returns the OSRS wiki icon URL for a given skill id/slug, falling back to first icon */
function osrsIcon(skillId: string): string {
  return OSRS_SKILLS.find((s) => s.id === skillId)?.icon ?? OSRS_SKILLS[0].icon;
}

function newTier(fromLevel: number): XpTier {
  return { from_level: fromLevel, to_level: 99, price_per_xp: 0.000001 };
}

function newSkill(): SkillConfig {
  return {
    id: "",
    label: "",
    icon: OSRS_SKILLS[0].icon,
    tiers: [{ from_level: 1, to_level: 99, price_per_xp: 0.000001 }],
    methods: [],
  };
}

// ─── Tier row ─────────────────────────────────────────────────────────────────

function TierRow({ tier, total, methods, onChange, onRemove }: {
  tier: XpTier;
  total: number;
  methods: MethodOption[];
  onChange: (t: XpTier) => void;
  onRemove: () => void;
}) {
  const selectedMethod = methods.find((m) => m.id === tier.method_id);

  const basePricePerXp = selectedMethod?.price_per_xp != null
    ? selectedMethod.price_per_xp
    : selectedMethod
      ? tier.price_per_xp * selectedMethod.multiplier
      : tier.price_per_xp;

  const tierXp = getXpDiff(tier.from_level, tier.to_level);
  const tierCost = tierXp * basePricePerXp;

  return (
    <div className="rounded-lg border border-border/50 bg-background p-2 space-y-1.5">
      <div className="flex flex-wrap gap-2 items-center">
        {/* Level range */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground w-6 text-right">Lv</span>
          <NumericInput integer min={1} max={98}
            value={tier.from_level}
            onChange={(val) => onChange({ ...tier, from_level: val })}
            className="h-7 w-14 text-xs text-center" />
          <span className="text-xs text-muted-foreground">→</span>
          <NumericInput integer min={2} max={99}
            value={tier.to_level}
            onChange={(val) => onChange({ ...tier, to_level: val })}
            className="h-7 w-14 text-xs text-center" />
        </div>

        {/* Default method selector */}
        {methods.length > 0 && (
          <select
            value={tier.method_id ?? ""}
            onChange={(e) => onChange({ ...tier, method_id: e.target.value || null })}
            className="h-7 rounded-md border border-input bg-background text-foreground px-2 text-xs min-w-[120px]"
          >
            <option value="" className="bg-background text-foreground">— No default —</option>
            {methods.map((m) => (
              <option key={m.id} value={m.id} className="bg-background text-foreground">
                {m.name}{m.price_per_xp == null ? ` (×${m.multiplier})` : ""}
              </option>
            ))}
          </select>
        )}

        {/* Price per XP */}
        <div className="flex items-center gap-1 ml-auto">
          {selectedMethod?.price_per_xp == null ? (
            <>
              <span className="text-xs text-muted-foreground">$</span>
              <NumericInput step="0.0000001" min={0}
                value={tier.price_per_xp}
                onChange={(val) => onChange({ ...tier, price_per_xp: val })}
                className="h-7 w-28 text-xs font-mono" placeholder="0.0000010" />
              <span className="text-xs text-muted-foreground">/XP</span>
            </>
          ) : (
            <div className="flex items-center gap-1 opacity-50">
              <span className="text-xs text-muted-foreground line-through">base $/XP</span>
              <span className="text-xs text-primary">overridden</span>
            </div>
          )}
        </div>

        {/* Remove */}
        {total > 1 ? (
          <button type="button" onClick={onRemove}
            className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
            <Trash2 className="h-3 w-3" />
          </button>
        ) : <span className="w-5" />}
      </div>

      {/* Cost preview */}
      {tierXp > 0 && tierCost > 0 && (
        <div className="text-[10px] text-muted-foreground pl-1">
          {(tierXp / 1_000_000).toFixed(2)}M XP →{" "}
          <span className="text-foreground font-medium">${tierCost.toFixed(4)}</span>
          {selectedMethod && <span className="ml-1 text-primary">via {selectedMethod.name}</span>}
        </div>
      )}
    </div>
  );
}

// ─── Tier modifier field editor ───────────────────────────────────────────────

function TierModifierFieldEditor({ field, onChange, onRemove }: {
  field: TierModifierField;
  onChange: (f: TierModifierField) => void;
  onRemove: () => void;
}) {
  const addOption = () =>
    onChange({ ...field, options: [...field.options, { value: "", label: "", multiplier: 1 }] });
  const updateOption = (i: number, patch: Partial<ModifierOption>) => {
    const opts = field.options.map((o, idx) => {
      if (idx !== i) return o;
      const updated = { ...o, ...patch };
      // Auto-sync value from label
      if ("label" in patch && (o.value === "" || o.value === o.label.toLowerCase().replace(/\s+/g, "_"))) {
        updated.value = (patch.label as string).toLowerCase().replace(/\s+/g, "_");
      }
      return updated;
    });
    onChange({ ...field, options: opts });
  };
  const removeOption = (i: number) =>
    onChange({ ...field, options: field.options.filter((_, idx) => idx !== i) });

  return (
    <div className="rounded-lg border border-border bg-background p-2.5 space-y-2">
      <div className="flex items-center gap-2">
        <Input
          value={field.label}
          onChange={(e) => {
            const label = e.target.value;
            onChange({ ...field, label, id: field.id || label.toLowerCase().replace(/\s+/g, "_") });
          }}
          placeholder="Field name (e.g. Fish type)"
          className="h-7 text-xs flex-1"
        />
        <span className="text-[10px] text-muted-foreground font-mono shrink-0">id: {field.id || "auto"}</span>
        <button type="button" onClick={onRemove}
          className="p-1 text-muted-foreground hover:text-destructive transition-colors shrink-0">
          <Trash2 className="h-3 w-3" />
        </button>
      </div>

      <div className="space-y-1">
        {field.options.length > 0 && (
          <div className="grid grid-cols-[1fr_72px_20px] gap-1.5 px-1 text-[10px] text-muted-foreground font-medium">
            <span>Option label</span>
            <span className="text-center">×mult</span>
            <span />
          </div>
        )}
        {field.options.map((opt, i) => (
          <div key={i} className="grid grid-cols-[1fr_72px_20px] gap-1.5 items-center">
            <div className="space-y-0.5">
              <Input value={opt.label}
                onChange={(e) => updateOption(i, { label: e.target.value })}
                placeholder="e.g. Shark"
                className="h-6 text-xs" />
              <p className="text-[9px] text-muted-foreground font-mono pl-1">
                {opt.value || <span className="italic">auto</span>}
              </p>
            </div>
            <NumericInput step="0.05" min={0.01}
              value={opt.multiplier ?? 1}
              onChange={(val) => updateOption(i, { multiplier: val })}
              className="h-6 text-xs text-center"
              title="Price multiplier (1.0 = no change)" />
            <button type="button" onClick={() => removeOption(i)}
              className="p-0.5 text-muted-foreground hover:text-destructive transition-colors">
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        ))}
        <button type="button" onClick={addOption}
          className="flex items-center gap-1 text-[10px] text-primary hover:text-primary/80 transition-colors mt-1">
          <Plus className="h-2.5 w-2.5" /> Add option
        </button>
      </div>
    </div>
  );
}

// ─── Method row (inside SkillCard) ────────────────────────────────────────────

function MethodRow({ method, onChange, onRemove }: {
  method: MethodOption;
  onChange: (m: MethodOption) => void;
  onRemove: () => void;
}) {
  const useOwnPrice = method.price_per_xp != null;

  return (
    <div className="grid grid-cols-[1fr_90px_90px_20px] gap-2 items-start px-3 py-2 rounded-lg border border-border bg-background">
      <div className="min-w-0 space-y-1">
        <Input
          value={method.name}
          onChange={(e) => onChange({ ...method, name: e.target.value })}
          placeholder="Method name"
          className="h-6 text-xs font-medium"
          aria-label="Training method name"
        />
        <Input
          value={method.description ?? ""}
          onChange={(e) =>
            onChange({
              ...method,
              description: e.target.value.trim() ? e.target.value : null,
            })
          }
          placeholder="Description (optional)"
          className="h-6 text-[10px] text-muted-foreground"
          aria-label="Training method description"
        />
      </div>

      {/* Toggle ×mult vs $/XP */}
      <div className="flex rounded-lg border border-border overflow-hidden">
        <button type="button"
          onClick={() => onChange({ ...method, price_per_xp: null })}
          className={cn("flex-1 py-1 text-[10px] font-medium transition-colors",
            !useOwnPrice ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground")}>
          ×mult
        </button>
        <button type="button"
          onClick={() => onChange({ ...method, price_per_xp: method.price_per_xp ?? 0.000001 })}
          className={cn("flex-1 py-1 text-[10px] font-medium transition-colors border-l border-border",
            useOwnPrice ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground")}>
          $/XP
        </button>
      </div>

      {/* Value */}
      <div>
        {useOwnPrice ? (
          <NumericInput step="0.0000001" min={0}
            value={method.price_per_xp ?? 0}
            onChange={(val) => onChange({ ...method, price_per_xp: val })}
            className="h-6 w-full text-xs font-mono text-center" placeholder="0.0000025" />
        ) : (
          <div className="flex items-center gap-1">
            <span className="text-xs text-muted-foreground">×</span>
            <NumericInput step="0.01" min={0.01}
              value={method.multiplier}
              onChange={(val) => onChange({ ...method, multiplier: val })}
              className="h-6 flex-1 text-xs text-center" />
          </div>
        )}
      </div>

      <button type="button" onClick={onRemove}
        className="p-1 text-muted-foreground hover:text-destructive transition-colors">
        <Trash2 className="h-3 w-3" />
      </button>
    </div>
  );
}

// ─── Skill card ───────────────────────────────────────────────────────────────

function SkillCard({ skill, gameMethods, gameId, onChange, onRemove }: {
  skill: SkillConfig;
  gameMethods: GameMethod[];
  gameId?: string;
  onChange: (s: SkillConfig) => void;
  onRemove: () => void;
}) {
  const [open, setOpen] = useState(true);
  const [showPresets, setShowPresets] = useState(false);
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customDescription, setCustomDescription] = useState("");
  const [importingSkilling, setImportingSkilling] = useState(false);

  const skillMethods: MethodOption[] = skill.methods ?? [];
  const skillMethodIds = new Set(skillMethods.map((m) => m.id));
  const tierModFields: TierModifierField[] = skill.tier_modifier_fields ?? [];

  // Game-level methods not yet added
  const availableGameMethods = gameMethods.filter((m) => !skillMethodIds.has(m.id));

  // Preset methods for this skill not yet added
  const presets = getMethodPresets(skill.id);
  const availablePresets = presets.filter((p) => !skillMethodIds.has(p.id));

  const updateTier = (i: number, t: XpTier) =>
    onChange({ ...skill, tiers: skill.tiers.map((tier, idx) => (idx === i ? t : tier)) });
  const addTier = () => {
    const lastTo = skill.tiers[skill.tiers.length - 1]?.to_level ?? 1;
    onChange({ ...skill, tiers: [...skill.tiers, newTier(lastTo)] });
  };
  const removeTier = (i: number) =>
    onChange({ ...skill, tiers: skill.tiers.filter((_, idx) => idx !== i) });

  const addMethodFromGame = (gm: GameMethod) => {
    if (skillMethodIds.has(gm.id)) return;
    onChange({ ...skill, methods: [...skillMethods, { id: gm.id, name: gm.name, description: gm.description, multiplier: gm.multiplier }] });
  };
  const addMethodFromPreset = (preset: { id: string; name: string; description: string; multiplier: number }) => {
    if (skillMethodIds.has(preset.id)) return;
    onChange({ ...skill, methods: [...skillMethods, { id: preset.id, name: preset.name, description: preset.description, multiplier: preset.multiplier }] });
  };
  const addAllPresets = () => {
    const toAdd = availablePresets.map((p) => ({ id: p.id, name: p.name, description: p.description, multiplier: p.multiplier }));
    if (toAdd.length === 0) return;
    onChange({ ...skill, methods: [...skillMethods, ...toAdd] });
    setShowPresets(false);
  };
  const addCustomMethod = () => {
    const name = customName.trim();
    if (!name) return;
    const id = `${skill.id}_custom_${name.toLowerCase().replace(/\s+/g, "_")}_${Date.now()}`;
    onChange({ ...skill, methods: [...skillMethods, { id, name, description: customDescription.trim() || null, multiplier: 1.0 }] });
    setCustomName("");
    setCustomDescription("");
    setShowCustomForm(false);
  };

  const importFromSkillingPrices = async () => {
    if (!gameId || !skill.id) return;
    setImportingSkilling(true);
    try {
      const [skillingRes, ratesRes] = await Promise.all([
        fetch(`/api/skilling-prices?game_id=${encodeURIComponent(gameId)}&skill_slug=${encodeURIComponent(skill.id)}`),
        fetch("/api/currency-rates"),
      ]);
      const skillingJson = await skillingRes.json();
      if (!skillingRes.ok) throw new Error(skillingJson.error ?? "Failed to fetch skilling prices");
      const rows: SkillingPriceRow[] = skillingJson.methods ?? [];
      if (rows.length === 0) return;
      const ratesJson = await ratesRes.json();
      const gameCfg = ratesJson.games?.[gameId] as { gold_per_usd?: number } | undefined;
      const goldPerUsd = gameCfg?.gold_per_usd;
      const methods: MethodOption[] = rows.map((r) => {
        const name = `${r.method_name} (${r.level_min}–${r.level_max})`;
        const id = `${skill.id}_skilling_${r.method_id}_${r.level_min}_${r.level_max}`;
        const gpPerXp = Number(r.gp_per_xp) || 0;
        const goldPerUsdNum = Number(goldPerUsd) || 0;
        const pricePerXp = goldPerUsdNum > 0 && gpPerXp > 0
          ? gpPerXp / goldPerUsdNum
          : undefined;
        return { id, name, description: null, multiplier: 1, price_per_xp: pricePerXp };
      });
      const tiers: XpTier[] = rows
        .sort((a, b) => a.level_min - b.level_min)
        .map((r) => {
          const methodId = `${skill.id}_skilling_${r.method_id}_${r.level_min}_${r.level_max}`;
          const method = methods.find((m) => m.id === methodId);
          return {
            from_level: r.level_min,
            to_level: r.level_max,
            price_per_xp: method?.price_per_xp ?? 0.000001,
            method_id: methodId,
          };
        });
      onChange({ ...skill, methods, tiers });
    } catch (err) {
      alert(err instanceof Error ? err.message : "Import failed");
    } finally {
      setImportingSkilling(false);
    }
  };
  const updateMethod = (id: string, patch: Partial<MethodOption>) =>
    onChange({ ...skill, methods: skillMethods.map((m) => m.id === id ? { ...m, ...patch } : m) });
  const removeMethod = (id: string) => {
    // Also clear any tier that references this method
    const newTiers = skill.tiers.map((t) => t.method_id === id ? { ...t, method_id: null } : t);
    onChange({ ...skill, methods: skillMethods.filter((m) => m.id !== id), tiers: newTiers });
  };

  // Tier modifier fields CRUD
  const addTierModField = () => {
    const newField: TierModifierField = { id: "", label: "", options: [] };
    onChange({ ...skill, tier_modifier_fields: [...tierModFields, newField] });
  };
  const updateTierModField = (i: number, f: TierModifierField) =>
    onChange({ ...skill, tier_modifier_fields: tierModFields.map((fld, idx) => idx === i ? f : fld) });
  const removeTierModField = (i: number) => {
    onChange({ ...skill, tier_modifier_fields: tierModFields.filter((_, idx) => idx !== i) });
  };

  const hasOverlap = (() => {
    const t = skill.tiers;
    for (let i = 0; i < t.length; i++)
      for (let j = i + 1; j < t.length; j++)
        if (t[i].from_level < t[j].to_level && t[j].from_level < t[i].to_level) return true;
    return false;
  })();

  return (
    <div className="rounded-xl border border-border bg-muted/10 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 bg-muted/30">
        <OsrsIconPicker
          value={skill.icon?.startsWith("http") ? skill.icon : osrsIcon(skill.id)}
          onChange={(v) => onChange({ ...skill, icon: v })}
        />
        <Input value={skill.label}
          onChange={(e) => onChange({ ...skill, label: e.target.value, id: skill.id || e.target.value.toLowerCase().replace(/\s+/g, "_") })}
          placeholder="Skill name" className="flex-1 h-7 text-sm font-medium" />
        <Input value={skill.id}
          onChange={(e) => onChange({ ...skill, id: e.target.value.toLowerCase().replace(/\s+/g, "_") })}
          placeholder="skill_id" className="w-24 h-7 text-xs font-mono" title="Internal ID" />
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {skill.tiers.length} tier{skill.tiers.length !== 1 ? "s" : ""}
          {skillMethods.length > 0 && ` · ${skillMethods.length} method${skillMethods.length !== 1 ? "s" : ""}`}
        </span>
        <button type="button" onClick={() => setOpen((v) => !v)}
          className="p-1 text-muted-foreground hover:text-foreground">
          {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
        <button type="button" onClick={onRemove}
          className="p-1 text-muted-foreground hover:text-destructive transition-colors">
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {open && (
        <div className="p-3 space-y-4">
          {/* ── Tiers ── */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Pricing tiers</span>
            </div>
            {skill.tiers.map((tier, i) => (
              <TierRow key={i} tier={tier} total={skill.tiers.length} methods={skillMethods}
                onChange={(t) => updateTier(i, t)} onRemove={() => removeTier(i)} />
            ))}
            <button type="button" onClick={addTier}
              className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors">
              <Plus className="h-3 w-3" /> Add tier
            </button>
            {hasOverlap && (
              <p className="text-xs text-amber-400 bg-amber-400/10 px-2 py-1 rounded-lg">
                Warning: some tiers overlap — this may cause inaccurate pricing.
              </p>
            )}
          </div>

          {/* ── Methods ── */}
          <div className="space-y-2 border-t border-border pt-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span className="text-xs font-medium text-muted-foreground">
                Training methods
                {skillMethods.length > 0 && (
                  <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-semibold">
                    {skillMethods.length}
                  </span>
                )}
              </span>
              <div className="flex items-center gap-1.5 flex-wrap justify-end">
                {/* Import from osrs_skilling_prices */}
                {gameId && (
                  <button type="button" onClick={importFromSkillingPrices} disabled={importingSkilling}
                    className={cn(
                      "flex items-center gap-1 px-2 py-0.5 rounded-lg border text-[10px] font-medium transition-colors",
                      importingSkilling
                        ? "border-border bg-muted text-muted-foreground cursor-wait"
                        : "border-dashed border-emerald-500/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/5"
                    )}>
                    <Database className="h-2.5 w-2.5" />
                    {importingSkilling ? "Loading…" : "Import GP/XP data"}
                  </button>
                )}
                {/* Preset suggest button */}
                {availablePresets.length > 0 && (
                  <button type="button" onClick={() => { setShowPresets((v) => !v); setShowCustomForm(false); }}
                    className={cn(
                      "flex items-center gap-1 px-2 py-0.5 rounded-lg border text-[10px] font-medium transition-colors",
                      showPresets
                        ? "border-primary/50 bg-primary/10 text-primary"
                        : "border-dashed border-primary/30 text-primary hover:bg-primary/5"
                    )}>
                    <Sparkles className="h-2.5 w-2.5" />
                    Suggest ({availablePresets.length})
                  </button>
                )}
                {/* Add custom method */}
                <button type="button" onClick={() => { setShowCustomForm((v) => !v); setShowPresets(false); }}
                  className={cn(
                    "flex items-center gap-1 px-2 py-0.5 rounded-lg border text-[10px] font-medium transition-colors",
                    showCustomForm
                      ? "border-border bg-muted text-foreground"
                      : "border-dashed border-border text-muted-foreground hover:text-foreground hover:bg-white/5"
                  )}>
                  <Plus className="h-2.5 w-2.5" />
                  Custom
                </button>
                {/* Game-level methods */}
                {availableGameMethods.map((gm) => (
                  <button key={gm.id} type="button" onClick={() => addMethodFromGame(gm)}
                    className="flex items-center gap-1 px-2 py-0.5 rounded-lg border border-dashed border-border text-[10px] text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors">
                    <Plus className="h-2.5 w-2.5" />
                    {gm.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Preset picker panel */}
            {showPresets && availablePresets.length > 0 && (
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-2.5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold text-primary uppercase tracking-wide">
                    OSRS method suggestions for {skill.label || skill.id}
                  </span>
                  <button type="button" onClick={addAllPresets}
                    className="text-[10px] text-primary hover:text-primary/80 font-medium transition-colors">
                    Add all
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {availablePresets.map((p) => (
                    <button key={p.id} type="button" onClick={() => { addMethodFromPreset(p); }}
                      className="flex items-center gap-1 px-2 py-1 rounded-lg border border-primary/20 bg-background text-[10px] text-foreground hover:bg-primary/10 hover:border-primary/40 transition-colors text-left">
                      <Plus className="h-2.5 w-2.5 text-primary shrink-0" />
                      <span className="font-medium">{p.name}</span>
                      {p.description && (
                        <span className="text-muted-foreground hidden sm:inline"> — {p.description}</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Custom method form */}
            {showCustomForm && (
              <div className="rounded-lg border border-border bg-muted/20 p-2.5 space-y-2">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">New custom method</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addCustomMethod())}
                    placeholder="Method name (e.g. Tick fishing)"
                    className="h-7 rounded-md border border-input bg-background text-foreground px-2.5 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                    autoFocus
                  />
                  <input
                    type="text"
                    value={customDescription}
                    onChange={(e) => setCustomDescription(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addCustomMethod())}
                    placeholder="Description (optional)"
                    className="h-7 rounded-md border border-input bg-background text-foreground px-2.5 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>
                <div className="flex gap-1.5 justify-end">
                  <button type="button" onClick={() => { setShowCustomForm(false); setCustomName(""); setCustomDescription(""); }}
                    className="px-2.5 py-1 rounded-md border border-border text-[10px] text-muted-foreground hover:text-foreground transition-colors">
                    Cancel
                  </button>
                  <button type="button" onClick={addCustomMethod} disabled={!customName.trim()}
                    className="px-2.5 py-1 rounded-md bg-primary text-primary-foreground text-[10px] font-medium disabled:opacity-40 hover:bg-primary/90 transition-colors">
                    Add method
                  </button>
                </div>
              </div>
            )}

            {skillMethods.length === 0 ? (
              <p className="text-[11px] text-muted-foreground">
                No methods added — customers can only choose a level range.
              </p>
            ) : (
              <div className="space-y-1.5">
                {/* Column headers */}
                <div className="grid grid-cols-[1fr_90px_90px_20px] gap-2 px-3">
                  <span className="text-[10px] text-muted-foreground font-medium">Method</span>
                  <span className="text-[10px] text-muted-foreground font-medium text-center">Pricing</span>
                  <span className="text-[10px] text-muted-foreground font-medium text-center">Value</span>
                  <span />
                </div>
                {skillMethods.map((m) => (
                  <MethodRow key={m.id} method={m}
                    onChange={(updated) => updateMethod(m.id, updated)}
                    onRemove={() => removeMethod(m.id)} />
                ))}
              </div>
            )}
          </div>

          {/* ── Tier modifier fields ── */}
          <div className="space-y-2 border-t border-border pt-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">
                Tier options
                <span className="ml-1 text-[10px] text-muted-foreground/60">(extra dropdowns per level range, e.g. fish type)</span>
                {tierModFields.length > 0 && (
                  <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-amber-400/10 text-amber-400 text-[10px] font-semibold">
                    {tierModFields.length}
                  </span>
                )}
              </span>
              <button type="button" onClick={addTierModField}
                className="flex items-center gap-1 px-2 py-0.5 rounded-lg border border-dashed border-amber-400/30 text-[10px] text-amber-400 hover:bg-amber-400/5 transition-colors">
                <Plus className="h-2.5 w-2.5" /> Add option field
              </button>
            </div>
            {tierModFields.length === 0 ? (
              <p className="text-[11px] text-muted-foreground">
                No tier options — each tier uses only its method and base price.
              </p>
            ) : (
              <div className="space-y-1.5">
                {tierModFields.map((field, i) => (
                  <TierModifierFieldEditor key={i} field={field}
                    onChange={(f) => updateTierModField(i, f)}
                    onRemove={() => removeTierModField(i)} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main XpBasedConfig ───────────────────────────────────────────────────────

export default function XpBasedConfig({ matrix, onChange, gameSkills = [], gameMethods = [], gameId }: Props) {
  const skills: SkillConfig[] = matrix.skills ?? [];
  const importedIds = new Set(skills.map((s) => s.id));
  const unimportedSkills = gameSkills.filter((gs) => !importedIds.has(gs.slug));

  const addSkill = () => onChange({ ...matrix, skills: [...skills, newSkill()] });
  const updateSkill = (i: number, s: SkillConfig) =>
    onChange({ ...matrix, skills: skills.map((sk, idx) => (idx === i ? s : sk)) });
  const removeSkill = (i: number) =>
    onChange({ ...matrix, skills: skills.filter((_, idx) => idx !== i) });

  const importAllSkills = () => {
    const toAdd: SkillConfig[] = unimportedSkills.map((gs) => ({
      id: gs.slug, label: gs.name, icon: osrsIcon(gs.slug),
      tiers: [{ from_level: 1, to_level: 99, price_per_xp: 0.000001 }],
      methods: [],
    }));
    if (toAdd.length > 0) onChange({ ...matrix, skills: [...skills, ...toAdd] });
  };
  const importSkill = (gs: GameSkill) => {
    if (skills.some((s) => s.id === gs.slug)) return;
    onChange({ ...matrix, skills: [...skills, { id: gs.slug, label: gs.name, icon: osrsIcon(gs.slug), tiers: [{ from_level: 1, to_level: 99, price_per_xp: 0.000001 }], methods: [] }] });
  };

  return (
    <div className="space-y-4">
      {/* Global settings */}
      <div className="space-y-1.5">
        <Label className="text-xs">XP table</Label>
        <select value={matrix.xp_table}
          onChange={(e) => onChange({ ...matrix, xp_table: e.target.value as XpTableKey })}
          className="w-full h-8 rounded-md border border-input bg-background text-foreground px-3 text-xs">
          {XP_TABLES.map((t) => <option key={t.value} value={t.value} className="bg-background text-foreground">{t.label}</option>)}
        </select>
      </div>

      {/* Import strip */}
      {unimportedSkills.length > 0 && (
        <details className="group rounded-lg border border-dashed border-border overflow-hidden">
          <summary className="flex items-center gap-2 px-3 py-2 cursor-pointer text-xs text-muted-foreground hover:text-foreground select-none">
            <Database className="h-3.5 w-3.5 shrink-0" />
            <span className="flex-1">
              {unimportedSkills.length} skill{unimportedSkills.length !== 1 ? "s" : ""} available to import
            </span>
            <button type="button" onClick={(e) => { e.preventDefault(); importAllSkills(); }}
              className="text-primary hover:text-primary/80 font-medium transition-colors">
              Import all
            </button>
          </summary>
          <div className="px-3 pb-3 pt-1 flex flex-wrap gap-1.5 border-t border-border bg-muted/10">
            {unimportedSkills.map((gs) => {
              const chipIcon = osrsIcon(gs.slug);
              return (
                <button key={gs.id} type="button" onClick={() => importSkill(gs)}
                  className="flex items-center gap-1.5 px-2 py-1 rounded-lg border border-dashed border-primary/30 text-xs text-primary hover:bg-primary/5 transition-colors">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={chipIcon} alt={gs.name} width={14} height={14} className="object-contain flex-shrink-0" />
                  <span>{gs.name}</span>
                  <Plus className="h-2.5 w-2.5" />
                </button>
              );
            })}
          </div>
        </details>
      )}
      {unimportedSkills.length === 0 && gameSkills.length > 0 && (
        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
          <Database className="h-3.5 w-3.5" /> All game skills imported.
        </p>
      )}

      {/* Skills list header */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">
          {skills.length === 0 ? "No skills added yet" : `${skills.length} skill${skills.length !== 1 ? "s" : ""} configured`}
        </span>
        <button type="button" onClick={addSkill}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-dashed border-primary/40 text-xs text-primary hover:bg-primary/5 transition-colors">
          <Plus className="h-3.5 w-3.5" /> Add manually
        </button>
      </div>

      {skills.length === 0 && (
        <div className="py-8 text-center text-sm text-muted-foreground border border-dashed border-border rounded-xl">
          {gameSkills.length > 0 ? "Import skills from above or add manually." : "Add at least one skill with pricing tiers."}
        </div>
      )}

      <div className="space-y-2">
        {skills.map((skill, i) => (
          <SkillCard key={i} skill={skill} gameMethods={gameMethods} gameId={gameId}
            onChange={(s) => updateSkill(i, s)} onRemove={() => removeSkill(i)} />
        ))}
      </div>
    </div>
  );
}
