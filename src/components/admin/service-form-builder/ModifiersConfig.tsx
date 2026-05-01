"use client";

import { Plus, Trash2, GripVertical, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { NumericInput } from "@/components/ui/numeric-input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils/cn";
import type { FormField, FormFieldType, ModifierOption } from "@/types/service-config";

interface Props {
  fields: FormField[];
  onChange: (fields: FormField[]) => void;
}

const FIELD_TYPES: { value: FormFieldType; label: string; description: string }[] = [
  { value: "radio",        label: "Radio buttons",   description: "Button group — pick one option" },
  { value: "multi_select", label: "Multi-select",    description: "Checkboxes — pick multiple options, all multipliers stack" },
  { value: "select",       label: "Dropdown",        description: "Dropdown — best for 5+ options" },
  { value: "checkbox",     label: "Checkbox",        description: "Single toggle with optional price modifier" },
  { value: "text",         label: "Text input",      description: "Free text (no price impact)" },
  { value: "textarea",     label: "Text area",       description: "Multiline text (no price impact)" },
];

function newField(): FormField {
  return { id: "", type: "radio", label: "", required: true, options: [] };
}

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
}

function newOption(): ModifierOption {
  return { value: "", label: "", multiplier: 1.0 };
}

function FieldEditor({
  field,
  index,
  onChange,
  onRemove,
}: {
  field: FormField;
  index: number;
  onChange: (f: FormField) => void;
  onRemove: () => void;
}) {
  const [open, setOpen] = useState(true);

  const updateOption = (i: number, key: keyof ModifierOption, val: string | number) => {
    const opts = (field.options ?? []).map((o, idx) => {
      if (idx !== i) return o;
      const updated = { ...o, [key]: val };
      // Auto-sync value from label if value hasn't been manually customised
      if (key === "label" && (o.value === "" || o.value === slugify(o.label))) {
        updated.value = slugify(val as string);
      }
      return updated;
    });
    onChange({ ...field, options: opts });
  };

  const addOption = () => onChange({ ...field, options: [...(field.options ?? []), newOption()] });
  const removeOption = (i: number) => onChange({ ...field, options: (field.options ?? []).filter((_, idx) => idx !== i) });

  const hasOptions = field.type === "radio" || field.type === "select" || field.type === "multi_select";

  return (
    <div className="rounded-xl border border-border bg-muted/20 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2.5 bg-muted/40">
        <GripVertical className="h-4 w-4 text-muted-foreground/40 cursor-grab flex-shrink-0" />
        <span className="flex-1 text-sm font-medium truncate">
          {field.label || <span className="text-muted-foreground italic">Unnamed field</span>}
        </span>
        <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded-md">
          {FIELD_TYPES.find((t) => t.value === field.type)?.label ?? field.type}
        </span>
        <button type="button" onClick={() => setOpen((v) => !v)} className="p-1 text-muted-foreground hover:text-foreground">
          {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
        <button type="button" onClick={onRemove} className="p-1 text-muted-foreground hover:text-destructive transition-colors">
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {open && (
        <div className="p-3 space-y-3">
          {/* Basic settings */}
          <div className="space-y-1">
            <Label className="text-xs">Field label</Label>
            <Input
              value={field.label}
              onChange={(e) => onChange({
                ...field,
                label: e.target.value,
                id: field.id || e.target.value.toLowerCase().replace(/\s+/g, "_"),
              })}
              placeholder="e.g. Fish type"
              className="h-8 text-sm"
            />
            <p className="text-[10px] text-muted-foreground font-mono pl-1">
              id: {field.id || <span className="italic">auto</span>}
            </p>
          </div>

          {/* Type + required */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Field type</Label>
              <select
                value={field.type}
                onChange={(e) => onChange({ ...field, type: e.target.value as FormFieldType, options: field.options ?? [] })}
                className="w-full h-8 rounded-md border border-input bg-background text-foreground px-2 text-sm"
              >
                {FIELD_TYPES.map((t) => (
                  <option key={t.value} value={t.value} className="bg-background text-foreground">{t.label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Required?</Label>
              <div className="flex items-center gap-2 h-8">
                <input
                  type="checkbox"
                  checked={field.required ?? false}
                  onChange={(e) => onChange({ ...field, required: e.target.checked })}
                  className="rounded"
                  id={`req-${index}`}
                />
                <label htmlFor={`req-${index}`} className="text-sm text-muted-foreground cursor-pointer">
                  Customer must fill this in
                </label>
              </div>
            </div>
          </div>

          {/* Checkbox modifier */}
          {field.type === "checkbox" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Price multiplier when checked</Label>
                <NumericInput
                  step="0.01" min={0}
                  value={field.multiplier ?? 1}
                  onChange={(val) => onChange({ ...field, multiplier: val })}
                  placeholder="1.0"
                  className="h-8 text-sm"
                />
                <p className="text-xs text-muted-foreground">1.0 = no change, 1.2 = 20% more</p>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Flat price addition ($)</Label>
                <NumericInput
                  step="0.01" min={0}
                  value={field.price_add ?? 0}
                  onChange={(val) => onChange({ ...field, price_add: val })}
                  placeholder="0.00"
                  className="h-8 text-sm"
                />
              </div>
            </div>
          )}

          {/* Options for radio / select */}
          {hasOptions && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Options</Label>
                <button
                  type="button"
                  onClick={addOption}
                  className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors"
                >
                  <Plus className="h-3 w-3" /> Add option
                </button>
              </div>

              {(field.options ?? []).length === 0 && (
                <p className="text-xs text-muted-foreground">No options yet.</p>
              )}

              {(field.options ?? []).length > 0 && (
                <div className="grid grid-cols-[1fr_72px_72px_20px] gap-1.5 px-1 text-xs text-muted-foreground font-medium">
                  <span>Label</span>
                  <span className="text-center">×mult</span>
                  <span className="text-center">+$</span>
                  <span />
                </div>
              )}

              <div className="space-y-1.5">
                {(field.options ?? []).map((opt, i) => (
                  <div key={i} className={cn(
                    "grid grid-cols-[1fr_72px_72px_20px] gap-1.5 items-center p-1.5 rounded-lg border border-border/60 bg-background"
                  )}>
                    <div className="space-y-0.5">
                      <Input
                        value={opt.label}
                        onChange={(e) => updateOption(i, "label", e.target.value)}
                        placeholder="e.g. Shark"
                        className="h-7 text-xs"
                      />
                      <p className="text-[10px] text-muted-foreground font-mono pl-1">
                        id: {opt.value || <span className="italic">auto</span>}
                      </p>
                    </div>
                    <NumericInput
                      step="0.05" min={0}
                      value={opt.multiplier ?? 1}
                      onChange={(val) => updateOption(i, "multiplier", val)}
                      className="h-7 text-xs text-center"
                      title="Price multiplier (1.0 = no change, 1.2 = 20% more)"
                    />
                    <NumericInput
                      step="0.01" min={0}
                      value={opt.price_add ?? 0}
                      onChange={(val) => updateOption(i, "price_add", val)}
                      className="h-7 text-xs text-center"
                      title="Flat price addition in $"
                    />
                    <button
                      type="button"
                      onClick={() => removeOption(i)}
                      className="p-1 text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function ModifiersConfig({ fields, onChange }: Props) {
  const addField = () => onChange([...fields, newField()]);
  const updateField = (i: number, f: FormField) => onChange(fields.map((fld, idx) => idx === i ? f : fld));
  const removeField = (i: number) => onChange(fields.filter((_, idx) => idx !== i));

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">Customer form fields</p>
          <p className="text-xs text-muted-foreground">Fields the customer fills in. Options can have price multipliers.</p>
        </div>
        <button
          type="button"
          onClick={addField}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-dashed border-primary/40 text-xs text-primary hover:bg-primary/5 transition-colors"
        >
          <Plus className="h-3.5 w-3.5" /> Add field
        </button>
      </div>

      {fields.length === 0 && (
        <div className="py-6 text-center text-sm text-muted-foreground border border-dashed border-border rounded-xl">
          No fields yet. Add a field to let customers choose training method, gear, etc.
        </div>
      )}

      <div className="space-y-2">
        {fields.map((field, i) => (
          <FieldEditor
            key={i}
            field={field}
            index={i}
            onChange={(f) => updateField(i, f)}
            onRemove={() => removeField(i)}
          />
        ))}
      </div>
    </div>
  );
}
