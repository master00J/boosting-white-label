"use client";

import { useState, useCallback, useEffect } from "react";
import { Search, Loader2, AlertCircle, ChevronDown, ChevronUp, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type { StatBasedPriceMatrix, StatConfig } from "@/types/service-config";

export type StatSelections = Record<string, number>;

interface Props {
  matrix: StatBasedPriceMatrix;
  selections: StatSelections;
  onChange: (selections: StatSelections) => void;
  /** When true, hide the RuneScape username lookup (user has saved account) */
  hideUsernameLookup?: boolean;
  /** When true, render nothing */
  hidden?: boolean;
}

// ─── Stat input row ───────────────────────────────────────────────────────────

function StatRow({ stat, value, onChange }: {
  stat: StatConfig;
  value: number;
  onChange: (v: number) => void;
}) {
  const [raw, setRaw] = useState(String(value));

  useEffect(() => {
    setRaw(String(value));
  }, [value]);

  const commit = () => {
    const parsed = parseInt(raw);
    if (!isNaN(parsed)) {
      const clamped = Math.max(stat.min, Math.min(stat.max, parsed));
      setRaw(String(clamped));
      onChange(clamped);
    } else {
      setRaw(String(value));
    }
  };

  // Find which threshold band this value falls into
  const sorted = [...stat.thresholds].sort((a, b) => a.max - b.max);
  const activeBand = sorted.find((t) => value <= t.max);
  const multiplier = activeBand?.multiplier ?? 1;

  const bandColor =
    multiplier > 1.5 ? "text-red-400 border-red-400/30 bg-red-400/5" :
    multiplier > 1.1 ? "text-orange-400 border-orange-400/30 bg-orange-400/5" :
    "text-green-400 border-green-400/30 bg-green-400/5";

  const displayLabel = (stat.label || stat.id || "").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) || "Stat";

  return (
    <div className="space-y-1.5">
      {/* Label row */}
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-[var(--text-primary)]">{displayLabel}</label>
        <div className={cn(
          "px-2 py-0.5 rounded-md border text-xs font-semibold",
          bandColor
        )}>
          {multiplier === 1 ? "×1.0" : `×${multiplier}`}
        </div>
      </div>
      {/* Slider + number input */}
      <div className="flex items-center gap-2">
        <input
          type="range"
          min={stat.min}
          max={stat.max}
          value={value}
          onChange={(e) => {
            const v = parseInt(e.target.value);
            setRaw(String(v));
            onChange(v);
          }}
          className="flex-1 h-1.5 accent-primary cursor-pointer"
        />
        <input
          type="number"
          min={stat.min}
          max={stat.max}
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => { if (e.key === "Enter") commit(); }}
          className="w-14 h-8 rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)] text-[var(--text-primary)] px-2 text-sm text-center focus:outline-none focus:border-primary transition-colors"
        />
      </div>
    </div>
  );
}

// ─── Main StatCalculator ──────────────────────────────────────────────────────

export default function StatCalculator({ matrix, selections, onChange, hideUsernameLookup: _hideUsernameLookup, hidden }: Props) {
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fetched, setFetched] = useState(false);
  const [showManual, setShowManual] = useState(true);

  const fetchStats = useCallback(async () => {
    const name = username.trim();
    if (!name) return;
    setLoading(true);
    setError(null);
    setFetched(false);

    try {
      const res = await fetch(`/api/osrs-stats?player=${encodeURIComponent(name)}`);
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Failed to fetch stats");
        return;
      }

      // Map API stat keys to our stat config IDs.
      // stat.id is always the exact OSRS Hiscores key (e.g. "ranged", "defence").
      // Special case: "combat" is calculated from the API stats.
      const apiStats: Record<string, number> = data.stats ?? {};

      // Calculate combat level from raw stats if needed
      const calcCombat = (): number => {
        const att = apiStats.attack ?? 1;
        const str = apiStats.strength ?? 1;
        const def = apiStats.defence ?? 1;
        const hp  = apiStats.hitpoints ?? 10;
        const pray= apiStats.prayer ?? 1;
        const range = apiStats.ranged ?? 1;
        const magic = apiStats.magic ?? 1;
        const base = 0.25 * (def + hp + Math.floor(pray / 2));
        const melee = 0.325 * (att + str);
        const rangeContrib = 0.325 * Math.floor(range * 1.5);
        const magicContrib = 0.325 * Math.floor(magic * 1.5);
        return Math.floor(base + Math.max(melee, rangeContrib, magicContrib));
      };

      const newSelections: StatSelections = { ...selections };
      for (const stat of matrix.stats) {
        if (stat.id === "combat") {
          newSelections[`stat_${stat.id}`] = calcCombat();
        } else if (apiStats[stat.id] !== undefined) {
          newSelections[`stat_${stat.id}`] = apiStats[stat.id];
        }
      }

      onChange(newSelections);
      setFetched(true);
      setShowManual(true);
    } catch {
      setError("Network error — please try again");
    } finally {
      setLoading(false);
    }
  }, [username, matrix.stats, selections, onChange]);

  const setStatValue = (statId: string, value: number) => {
    onChange({ ...selections, [`stat_${statId}`]: value });
  };

  const getStatValue = (stat: StatConfig): number => {
    const v = selections[`stat_${stat.id}`];
    return v !== undefined ? Number(v) : stat.max;
  };

  if (hidden) return null;

  return (
    <div className="space-y-4">
      {/* Username lookup */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-[var(--text-primary)]">
          RuneScape username <span className="text-[var(--text-muted)] font-normal">(optional)</span>
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={username}
            onChange={(e) => { setUsername(e.target.value); setFetched(false); setError(null); }}
            onKeyDown={(e) => { if (e.key === "Enter") fetchStats(); }}
            placeholder="Enter your OSRS username"
            className="flex-1 h-10 rounded-lg border border-[var(--border-default)] bg-[var(--bg-elevated)] text-[var(--text-primary)] px-3 text-sm focus:outline-none focus:border-primary transition-colors placeholder:text-[var(--text-muted)]"
          />
          <button
            type="button"
            onClick={fetchStats}
            disabled={loading || !username.trim()}
            className="flex items-center gap-1.5 px-4 h-10 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50 hover:bg-primary/90 transition-colors shrink-0"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
            Get Stats
          </button>
        </div>

        {error && (
          <div className="flex items-center gap-1.5 text-xs text-destructive">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            {error}
          </div>
        )}
        {fetched && !error && (
          <div className="flex items-center gap-1.5 text-xs text-green-400">
            <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
            Stats loaded for <span className="font-medium">{username}</span> — adjust below if needed.
          </div>
        )}
      </div>

      {/* Manual stat inputs */}
      <div className="space-y-1">
        <button
          type="button"
          onClick={() => setShowManual((v) => !v)}
          className="flex items-center gap-1 text-sm font-medium text-[var(--text-primary)] w-full"
        >
          <span className="flex-1 text-left">
            {fetched ? "Your stats" : "Enter your stats"}
          </span>
          {showManual ? <ChevronUp className="h-4 w-4 text-[var(--text-muted)]" /> : <ChevronDown className="h-4 w-4 text-[var(--text-muted)]" />}
        </button>

        {showManual && (
          <div className="space-y-3 pt-1">
            {matrix.stats.map((stat) => (
              <StatRow
                key={stat.id}
                stat={stat}
                value={getStatValue(stat)}
                onChange={(v) => setStatValue(stat.id, v)}
              />
            ))}
            <p className="text-[11px] text-[var(--text-muted)]">
              Higher stats = lower price. The multiplier shown reflects the price impact of each stat on the final price.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
