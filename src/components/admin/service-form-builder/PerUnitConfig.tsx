"use client";

import { Input } from "@/components/ui/input";
import { NumericInput } from "@/components/ui/numeric-input";
import { Label } from "@/components/ui/label";
import type { PerUnitPriceMatrix } from "@/types/service-config";

interface Props {
  matrix: PerUnitPriceMatrix;
  onChange: (matrix: PerUnitPriceMatrix) => void;
}

export default function PerUnitConfig({ matrix, onChange }: Props) {
  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label>Unit label</Label>
        <Input
          value={matrix.unit_label}
          onChange={(e) => onChange({ ...matrix, unit_label: e.target.value })}
          placeholder="e.g. kills, runs, points"
          className="w-64"
        />
        <p className="text-xs text-muted-foreground">Shown to the customer: &quot;How many {matrix.unit_label || "units"}?&quot;</p>
      </div>

      <div className="space-y-1.5">
        <Label>Price per {matrix.unit_label || "unit"} ($)</Label>
        <NumericInput
          step="0.01" min={0}
          value={matrix.price_per_unit}
          onChange={(val) => onChange({ ...matrix, price_per_unit: val })}
          placeholder="1.20"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Minimum {matrix.unit_label || "units"}</Label>
          <Input
            type="number"
            min="1"
            value={matrix.minimum_units ?? ""}
            onChange={(e) => onChange({ ...matrix, minimum_units: parseInt(e.target.value) || undefined })}
            placeholder="1"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Maximum {matrix.unit_label || "units"}</Label>
          <Input
            type="number"
            min="1"
            value={matrix.maximum_units ?? ""}
            onChange={(e) => onChange({ ...matrix, maximum_units: parseInt(e.target.value) || undefined })}
            placeholder="Unlimited"
          />
        </div>
      </div>
    </div>
  );
}
