"use client";

import { useMemo } from "react";

/** Normalize value for `<input type="color">` (requires #rrggbb). */
export function hexForColorInput(css: string): string {
  const t = css.trim();
  if (/^#[0-9A-Fa-f]{6}$/.test(t)) return t;
  if (/^#[0-9A-Fa-f]{3}$/.test(t)) {
    const r = t[1];
    const g = t[2];
    const b = t[3];
    return `#${r}${r}${g}${g}${b}${b}`;
  }
  return "#000000";
}

export function parseRgba(input: string): { r: number; g: number; b: number; a: number } | null {
  const m = input
    .trim()
    .match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+)\s*)?\)$/i);
  if (!m) return null;
  const r = Math.min(255, Math.max(0, parseInt(m[1], 10)));
  const g = Math.min(255, Math.max(0, parseInt(m[2], 10)));
  const b = Math.min(255, Math.max(0, parseInt(m[3], 10)));
  const a = m[4] !== undefined ? Math.min(1, Math.max(0, parseFloat(m[4]))) : 1;
  return { r, g, b, a };
}

export function rgbToHex(r: number, g: number, b: number): string {
  const h = (n: number) => n.toString(16).padStart(2, "0");
  return `#${h(r)}${h(g)}${h(b)}`;
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hexForColorInput(hex).slice(1);
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

export function ColorHexRow({
  label,
  value,
  onChange,
  inputClassName,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  inputClassName: string;
}) {
  const pickerVal = useMemo(() => hexForColorInput(value), [value]);
  return (
    <div>
      <label className="block text-xs font-medium mb-1.5">{label}</label>
      <div className="flex gap-2 items-center">
        <input
          type="color"
          value={pickerVal}
          onChange={(e) => onChange(e.target.value)}
          className="w-10 h-10 rounded-lg cursor-pointer border-0 bg-transparent shrink-0"
          title="Pick color"
          aria-label={`Pick color: ${label}`}
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={inputClassName}
          spellCheck={false}
        />
      </div>
    </div>
  );
}

export function BorderRgbaRow({
  label,
  value,
  onChange,
  fallbackRgb,
  inputClassName,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  fallbackRgb: { r: number; g: number; b: number };
  inputClassName: string;
}) {
  const parsed = useMemo(() => parseRgba(value), [value]);
  const rgb = parsed ?? fallbackRgb;
  const alpha = parsed?.a ?? 0.18;
  const hex = rgbToHex(rgb.r, rgb.g, rgb.b);

  return (
    <div>
      <label className="block text-xs font-medium mb-1.5">{label}</label>
      <div className="flex flex-wrap gap-2 items-center">
        <input
          type="color"
          value={hexForColorInput(hex)}
          onChange={(e) => {
            const { r, g, b } = hexToRgb(e.target.value);
            const a = parseRgba(value)?.a ?? alpha;
            onChange(`rgba(${r}, ${g}, ${b}, ${a})`);
          }}
          className="w-10 h-10 rounded-lg cursor-pointer border-0 bg-transparent shrink-0"
          title="Border tint"
          aria-label={`Pick border tint: ${label}`}
        />
        <div className="flex items-center gap-2 min-w-[120px] flex-1 max-w-[200px]">
          <input
            type="range"
            min={0}
            max={1}
            step={0.02}
            value={alpha}
            onChange={(e) => {
              const a = Number(e.target.value);
              const p = parseRgba(value) ?? { ...fallbackRgb, a: 0.18 };
              onChange(`rgba(${p.r}, ${p.g}, ${p.b}, ${a})`);
            }}
            className="w-full accent-primary h-2"
            aria-label={`${label} opacity`}
          />
          <span className="text-[10px] text-[var(--text-muted)] w-9 tabular-nums shrink-0">
            {Math.round(alpha * 100)}%
          </span>
        </div>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`${inputClassName} flex-1 min-w-[140px]`}
          spellCheck={false}
        />
      </div>
    </div>
  );
}
