"use client";

import { useState } from "react";
import { Plus, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { Input } from "@/components/ui/input";
import { NumericInput } from "@/components/ui/numeric-input";
import { cn } from "@/lib/utils/cn";
import type { GoldTieredPriceMatrix, GoldTier, QuestModifierField, ModifierOption } from "@/types/service-config";

interface Props {
  matrix: GoldTieredPriceMatrix;
  onChange: (m: GoldTieredPriceMatrix) => void;
}

// ─── Modifier row (reused from other configs) ─────────────────────────────────

function ModifierOptionRow({
  opt,
  onUpdate,
  onRemove,
}: {
  opt: ModifierOption;
  onUpdate: (o: ModifierOption) => void;
  onRemove: () => void;
}) {
  return (
    <div className="flex items-center gap-2 pl-4">
      <Input value={opt.label} onChange={(e) => onUpdate({ ...opt, label: e.target.value })}
        placeholder="Option label" className="h-6 text-xs flex-1" />
      <div className="flex items-center gap-1 text-[10px] text-muted-foreground shrink-0">
        <span>×</span>
        <NumericInput step="0.01" value={opt.multiplier ?? 1} onChange={(v) => onUpdate({ ...opt, multiplier: v })}
          className="h-6 text-xs w-14 text-center" />
        <span>+$</span>
        <NumericInput step="0.01" value={opt.price_add ?? 0} onChange={(v) => onUpdate({ ...opt, price_add: v })}
          className="h-6 text-xs w-14 text-center" />
      </div>
      <button type="button" onClick={onRemove} className="text-muted-foreground hover:text-destructive">
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function ModifierRow({
  mod,
  onUpdate,
  onRemove,
}: {
  mod: QuestModifierField;
  onUpdate: (m: QuestModifierField) => void;
  onRemove: () => void;
}) {
  const [open, setOpen] = useState(false);
  const opts = mod.options ?? [];
  const updateOpt = (i: number, o: ModifierOption) =>
    onUpdate({ ...mod, options: opts.map((op, idx) => idx === i ? o : op) });
  const removeOpt = (i: number) =>
    onUpdate({ ...mod, options: opts.filter((_, idx) => idx !== i) });
  const addOpt = () =>
    onUpdate({ ...mod, options: [...opts, { value: "", label: "", multiplier: 1, price_add: 0 }] });

  return (
    <div className="rounded-md border border-border bg-muted/10 p-2 space-y-1.5">
      <div className="flex items-center gap-2">
        <Input value={mod.label} onChange={(e) => onUpdate({ ...mod, label: e.target.value })}
          placeholder="Modifier label (e.g. Delivery method)" className="h-6 text-xs flex-1" />
        <select value={mod.type} onChange={(e) => onUpdate({ ...mod, type: e.target.value as QuestModifierField["type"] })}
          className="h-6 text-xs rounded border border-border bg-background px-1">
          <option value="select">Select</option>
          <option value="radio">Radio</option>
          <option value="multi_select">Multi-select</option>
          <option value="checkbox">Checkbox</option>
        </select>
        <button type="button" onClick={() => setOpen(!open)} className="text-muted-foreground hover:text-foreground">
          {open ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </button>
        <button type="button" onClick={onRemove} className="text-muted-foreground hover:text-destructive">
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
      {open && (
        <div className="space-y-1 pt-1">
          {mod.type === "checkbox" ? (
            <div className="flex items-center gap-2 pl-4 text-[10px] text-muted-foreground">
              <span>When checked:</span>
              <span>×</span>
              <NumericInput step="0.01" value={mod.multiplier ?? 1} onChange={(v) => onUpdate({ ...mod, multiplier: v })}
                className="h-6 text-xs w-14 text-center" />
              <span>+$</span>
              <NumericInput step="0.01" value={mod.price_add ?? 0} onChange={(v) => onUpdate({ ...mod, price_add: v })}
                className="h-6 text-xs w-14 text-center" />
            </div>
          ) : (
            <>
              {opts.map((opt, i) => (
                <ModifierOptionRow key={i} opt={opt} onUpdate={(o) => updateOpt(i, o)} onRemove={() => removeOpt(i)} />
              ))}
              <button type="button" onClick={addOpt}
                className="ml-4 flex items-center gap-1 text-[11px] text-primary hover:text-primary/80">
                <Plus className="h-3 w-3" /> Add option
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main GoldTieredConfig ────────────────────────────────────────────────────

export default function GoldTieredConfig({ matrix, onChange }: Props) {
  const tiers = matrix.tiers ?? [];
  const mods = matrix.modifiers ?? [];

  const addTier = () => {
    const last = tiers[tiers.length - 1];
    onChange({
      ...matrix,
      tiers: [...tiers, {
        min_amount: last ? last.min_amount * 2 : matrix.minimum_units ?? 1,
        price_per_unit: last ? +(last.price_per_unit * 0.9).toFixed(4) : 1,
      }],
    });
  };
  const updateTier = (i: number, t: GoldTier) =>
    onChange({ ...matrix, tiers: tiers.map((tier, idx) => idx === i ? t : tier) });
  const removeTier = (i: number) =>
    onChange({ ...matrix, tiers: tiers.filter((_, idx) => idx !== i) });

  const addModifier = () =>
    onChange({ ...matrix, modifiers: [...mods, { id: `mod_${Date.now()}`, label: "", type: "select", options: [] }] });
  const updateMod = (i: number, m: QuestModifierField) =>
    onChange({ ...matrix, modifiers: mods.map((mod, idx) => idx === i ? m : mod) });
  const removeMod = (i: number) =>
    onChange({ ...matrix, modifiers: mods.filter((_, idx) => idx !== i) });

  // Sort tiers by min_amount for display
  const sortedForDisplay = [...tiers].map((t, i) => ({ ...t, _idx: i }))
    .sort((a, b) => a.min_amount - b.min_amount);

  return (
    <div className="space-y-6">

      {/* ── Section 1: Unit settings ── */}
      <div className="space-y-3">
        <p className="text-sm font-medium">Unit settings</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="space-y-1 col-span-2">
            <p className="text-[10px] text-muted-foreground">Unit label <span className="text-muted-foreground/60">(e.g. &quot;M GP&quot;, &quot;K GP&quot;)</span></p>
            <Input
              value={matrix.unit_label}
              onChange={(e) => onChange({ ...matrix, unit_label: e.target.value })}
              placeholder="M GP"
              className="h-7 text-xs"
            />
          </div>
          <div className="space-y-1">
            <p className="text-[10px] text-muted-foreground">Min order</p>
            <NumericInput
              value={matrix.minimum_units ?? 1}
              onChange={(v) => onChange({ ...matrix, minimum_units: v })}
              min={1}
              className="h-7 text-xs"
            />
          </div>
          <div className="space-y-1">
            <p className="text-[10px] text-muted-foreground">Max order <span className="text-muted-foreground/60">(optional)</span></p>
            <NumericInput
              value={matrix.maximum_units ?? 0}
              onChange={(v) => onChange({ ...matrix, maximum_units: v > 0 ? v : undefined })}
              min={0}
              placeholder="No limit"
              className="h-7 text-xs"
            />
          </div>
        </div>
      </div>

      {/* ── Section 2: Volume tiers ── */}
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-sm font-medium">Volume tiers</p>
            <p className="text-[11px] text-muted-foreground">
              Higher quantity → lower price per unit. The tier with the highest &quot;from&quot; that applies is used.
            </p>
          </div>
          <button type="button" onClick={addTier}
            className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors shrink-0">
            <Plus className="h-3.5 w-3.5" /> Add tier
          </button>
        </div>

        {tiers.length === 0 && (
          <p className="text-xs text-muted-foreground py-2">No tiers yet. Add at least one tier.</p>
        )}

        {/* Header */}
        {tiers.length > 0 && (
          <div className="grid grid-cols-[1fr_1fr_auto] gap-2 px-2 text-[10px] text-muted-foreground">
            <span>From (units)</span>
            <span>Price per unit ($)</span>
            <span />
          </div>
        )}

        <div className="space-y-1.5">
          {sortedForDisplay.map((tier, displayIdx) => (
            <div key={tier._idx}
              className={cn(
                "grid grid-cols-[1fr_1fr_auto] gap-2 items-center rounded-lg border border-border px-3 py-2",
                displayIdx === 0 && "bg-muted/20"
              )}>
              <div className="space-y-0.5">
                <NumericInput
                  value={tier.min_amount}
                  onChange={(v) => updateTier(tier._idx, { ...tier, min_amount: v })}
                  min={0}
                  className="h-7 text-xs"
                />
                {displayIdx === 0 && (
                  <p className="text-[10px] text-muted-foreground pl-1">Base tier</p>
                )}
              </div>
              <div className="flex items-center gap-1">
                <span className="text-xs text-muted-foreground">$</span>
                <NumericInput
                  step="0.0001"
                  value={tier.price_per_unit}
                  onChange={(v) => updateTier(tier._idx, { ...tier, price_per_unit: v })}
                  min={0}
                  className="h-7 text-xs"
                />
                <span className="text-[10px] text-muted-foreground">/ {matrix.unit_label || "unit"}</span>
              </div>
              <button type="button" onClick={() => removeTier(tier._idx)}
                className="text-muted-foreground hover:text-destructive transition-colors">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>

        {/* Preview */}
        {tiers.length > 0 && (
          <div className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-[11px] text-muted-foreground">
            <span className="font-medium text-primary">Preview: </span>
            {sortedForDisplay.map((t, i) => {
              const next = sortedForDisplay[i + 1];
              const range = next ? `${t.min_amount}–${next.min_amount - 1}` : `${t.min_amount}+`;
              return (
                <span key={t._idx}>
                  {i > 0 && " · "}
                  <span className="font-medium">{range} {matrix.unit_label || "units"}</span>
                  {" → "}${t.price_per_unit}/{matrix.unit_label || "unit"}
                </span>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Section 3: Modifiers ── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Modifiers <span className="text-[10px] text-muted-foreground font-normal">(optional)</span></p>
            <p className="text-[11px] text-muted-foreground">
              Add options like delivery method or rush order that adjust the price.
            </p>
          </div>
          <button type="button" onClick={addModifier}
            className="flex items-center gap-1 px-2 py-1 rounded-lg border border-dashed border-primary/30 text-[11px] text-primary hover:bg-primary/5 transition-colors">
            <Plus className="h-3 w-3" /> Add modifier
          </button>
        </div>
        {mods.length === 0 && (
          <p className="text-[11px] text-muted-foreground py-2">No modifiers. Add delivery method, rush order, etc.</p>
        )}
        <div className="space-y-2">
          {mods.map((mod, i) => (
            <ModifierRow key={i} mod={mod} onUpdate={(m) => updateMod(i, m)} onRemove={() => removeMod(i)} />
          ))}
        </div>
      </div>
    </div>
  );
}
