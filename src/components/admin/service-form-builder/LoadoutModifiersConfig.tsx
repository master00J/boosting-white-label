"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Plus, Trash2, Search, Loader2 } from "lucide-react";
import { NumericInput } from "@/components/ui/numeric-input";
import { cn } from "@/lib/utils/cn";
import type { LoadoutModifier } from "@/types/service-config";

interface WikiSearchResult {
  id: number;
  name: string;
  icon_url: string;
}

function WikiImg({ src, alt }: { src: string; alt: string }) {
  const [failed, setFailed] = useState(false);
  if (failed || !src) return <span className="w-6 h-6 inline-block" />;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      width={22}
      height={22}
      className="object-contain shrink-0"
      onError={() => setFailed(true)}
    />
  );
}

// ─── One modifier row ─────────────────────────────────────────────────────────

function ModifierRow({
  modifier,
  onChange,
  onRemove,
}: {
  modifier: LoadoutModifier;
  onChange: (m: LoadoutModifier) => void;
  onRemove: () => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<WikiSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [showSearch, setShowSearch] = useState(modifier.item_ids.length === 0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedName = modifier.item_ids[0] ?? "";
  const selectedIconUrl = selectedName
    ? `https://oldschool.runescape.wiki/images/${selectedName.replace(/ /g, "_").replace(/'/g, "%27")}.png`
    : "";

  // Close search on outside click
  useEffect(() => {
    if (!showSearch) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSearch(false);
        setQuery("");
        setResults([]);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showSearch]);

  useEffect(() => {
    if (showSearch) setTimeout(() => inputRef.current?.focus(), 50);
  }, [showSearch]);

  const search = useCallback(async (q: string) => {
    setQuery(q);
    if (q.length < 2) { setResults([]); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/osrs/items/search?q=${encodeURIComponent(q)}`);
      if (res.ok) setResults(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  const selectItem = (name: string) => {
    onChange({
      ...modifier,
      item_ids: [name],
      label: modifier.label || name,
    });
    setShowSearch(false);
    setQuery("");
    setResults([]);
  };

  const pct =
    modifier.multiplier < 1
      ? `-${Math.round((1 - modifier.multiplier) * 100)}%`
      : modifier.multiplier > 1
      ? `+${Math.round((modifier.multiplier - 1) * 100)}%`
      : "0%";
  const pctColor =
    modifier.multiplier < 1 ? "text-emerald-500" : modifier.multiplier > 1 ? "text-red-400" : "text-muted-foreground";

  return (
    <div className="flex items-start gap-2 p-3 rounded-lg border border-border/50 bg-muted/10">
      {/* Item selector */}
      <div ref={containerRef} className="flex-1 min-w-0 space-y-1.5 relative">
        {selectedName && !showSearch ? (
          <button
            type="button"
            onClick={() => setShowSearch(true)}
            className="flex items-center gap-2 w-full text-left px-2.5 py-1.5 rounded-md border border-border/40 bg-background hover:border-primary/40 transition-colors"
          >
            <WikiImg src={selectedIconUrl} alt={selectedName} />
            <span className="text-sm font-medium flex-1 truncate">{selectedName}</span>
            <span className="text-[10px] text-muted-foreground shrink-0">click to change</span>
          </button>
        ) : (
          <div className="space-y-1">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => search(e.target.value)}
                placeholder="Search OSRS item…"
                className="w-full pl-8 pr-8 h-8 rounded-md border border-border/40 bg-background text-sm focus:outline-none focus:border-primary"
              />
              {loading && <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 animate-spin text-muted-foreground" />}
            </div>
            {query.length >= 2 && (
              <div className="rounded-md border border-border/40 bg-muted/10 max-h-44 overflow-y-auto divide-y divide-border/10">
                {results.length === 0 && !loading && (
                  <>
                    <p className="px-2.5 py-1.5 text-xs text-muted-foreground italic">No GE results — use the name directly:</p>
                    <button
                      type="button"
                      onClick={() => selectItem(query.trim().replace(/^\w/, (c) => c.toUpperCase()))}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs hover:bg-muted/30 transition-colors text-left font-medium text-primary"
                    >
                      + Use &quot;{query.trim().replace(/^\w/, (c) => c.toUpperCase())}&quot; anyway
                    </button>
                  </>
                )}
                {results.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => selectItem(item.name)}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs hover:bg-muted/30 transition-colors text-left"
                  >
                    <WikiImg src={item.icon_url} alt={item.name} />
                    <span className="flex-1 truncate font-medium">{item.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Multiplier */}
      <div className="flex items-center gap-1.5 shrink-0 pt-0.5">
        <span className="text-[11px] text-muted-foreground">×</span>
        <NumericInput
          step="0.05" min={0.01} max={5}
          value={modifier.multiplier}
          onChange={(val) => onChange({ ...modifier, multiplier: val })}
          className="h-8 w-20 text-sm font-mono text-center"
        />
        <span className={cn("text-xs font-bold w-10 shrink-0", pctColor)}>{pct}</span>
      </div>

      {/* Remove */}
      <button
        type="button"
        onClick={onRemove}
        className="p-1.5 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0 mt-0.5"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

interface Props {
  modifiers: LoadoutModifier[];
  onChange: (modifiers: LoadoutModifier[]) => void;
}

export default function LoadoutModifiersConfig({ modifiers, onChange }: Props) {
  const add = () => {
    onChange([
      ...modifiers,
      { id: `lm_${Date.now()}`, label: "", item_ids: [], multiplier: 0.9 },
    ]);
  };

  const update = (index: number, mod: LoadoutModifier) => {
    const next = [...modifiers];
    next[index] = mod;
    onChange(next);
  };

  const remove = (index: number) => {
    onChange(modifiers.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Set a price modifier per item. If the customer has that item in their loadout, the multiplier is applied.
        E.g. Twisted bow → ×0.85 = −15%.
      </p>

      {modifiers.length > 0 && (
        <div className="flex items-center gap-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          <span className="flex-1">Item</span>
          <span className="w-20 text-center mr-10">Multiplier</span>
        </div>
      )}

      <div className="space-y-2">
        {modifiers.map((mod, i) => (
          <ModifierRow
            key={mod.id}
            modifier={mod}
            onChange={(m) => update(i, m)}
            onRemove={() => remove(i)}
          />
        ))}
      </div>

      <button
        type="button"
        onClick={add}
        className="flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors px-3 py-2 rounded-lg border border-dashed border-primary/30 hover:bg-primary/5 w-full justify-center"
      >
        <Plus className="h-4 w-4" />
        Add item
      </button>
    </div>
  );
}
