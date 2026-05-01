"use client";

import { Plus, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { NumericInput } from "@/components/ui/numeric-input";
import { Label } from "@/components/ui/label";
import type { PerItemPriceMatrix, PriceItem } from "@/types/service-config";

interface Props {
  matrix: PerItemPriceMatrix;
  onChange: (matrix: PerItemPriceMatrix) => void;
}

export default function PerItemConfig({ matrix, onChange }: Props) {
  const addItem = () => {
    onChange({
      ...matrix,
      items: [...matrix.items, { id: "", label: "", price: 0 }],
    });
  };

  const updateItem = (index: number, field: keyof PriceItem, value: string | number) => {
    const updated = matrix.items.map((item, i) =>
      i === index
        ? {
            ...item,
            [field]: value,
            ...(field === "label" && !item.id
              ? { id: String(value).toLowerCase().replace(/\s+/g, "_") }
              : {}),
          }
        : item
    );
    onChange({ ...matrix, items: updated });
  };

  const removeItem = (index: number) => {
    onChange({ ...matrix, items: matrix.items.filter((_, i) => i !== index) });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Items</Label>
          <button
            type="button"
            onClick={addItem}
            className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" /> Add item
          </button>
        </div>

        {matrix.items.length === 0 && (
          <p className="text-xs text-muted-foreground py-2">No items yet. Add quests, dungeons, etc.</p>
        )}

        {/* Header */}
        {matrix.items.length > 0 && (
          <div className="grid grid-cols-[1fr_1fr_auto_auto] gap-2 px-2 text-xs text-muted-foreground font-medium">
            <span>Name</span>
            <span>ID (slug)</span>
            <span>Price ($)</span>
            <span />
          </div>
        )}

        <div className="space-y-2">
          {matrix.items.map((item, i) => (
            <div key={i} className="grid grid-cols-[1fr_1fr_auto_auto] gap-2 items-center p-2 rounded-lg border border-border bg-muted/20">
              <Input
                value={item.label}
                onChange={(e) => updateItem(i, "label", e.target.value)}
                placeholder="e.g. Dragon Slayer II"
                className="h-8 text-sm"
              />
              <Input
                value={item.id}
                onChange={(e) => updateItem(i, "id", e.target.value.toLowerCase().replace(/\s+/g, "_"))}
                placeholder="dragon_slayer_2"
                className="h-8 text-sm font-mono"
              />
              <NumericInput
                step="0.01" min={0}
                value={item.price}
                onChange={(val) => updateItem(i, "price", val)}
                placeholder="0.00"
                className="h-8 text-sm w-24"
              />
              <button
                type="button"
                onClick={() => removeItem(i)}
                className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
