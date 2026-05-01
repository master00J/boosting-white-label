"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import { Wand2, Loader2, AlertCircle, ChevronDown, CheckCircle2, Shield, Sword, Crosshair, Zap, Info } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { BOSS_PROFILES, BOSS_CATEGORIES, getBossesByCategory } from "@/lib/osrs-boss-profiles";
import type { BossCategory, CombatStyle } from "@/lib/osrs-boss-profiles";
import type { OptimizeResult, SlotRecommendation, GearSetup, BankItem } from "@/lib/gear-optimizer";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  /** Bank items from RuneLite export */
  bankItems: BankItem[];
  /** Player stats */
  stats: Record<string, number>;
}

const STYLE_ICONS: Record<CombatStyle, React.ReactNode> = {
  melee:  <Sword    className="h-3.5 w-3.5" />,
  ranged: <Crosshair className="h-3.5 w-3.5" />,
  magic:  <Zap      className="h-3.5 w-3.5" />,
};

const STYLE_COLORS: Record<CombatStyle, string> = {
  melee:  "text-red-400    border-red-400/30    bg-red-400/10",
  ranged: "text-green-400  border-green-400/30  bg-green-400/10",
  magic:  "text-blue-400   border-blue-400/30   bg-blue-400/10",
};

const SLOT_ORDER = [
  "head","cape","neck","ammo",
  "weapon","shield",
  "body","legs","hands","feet","ring",
] as const;

const SLOT_LABELS: Record<string, string> = {
  head: "Head", cape: "Cape", neck: "Neck", ammo: "Ammo",
  weapon: "Weapon", shield: "Shield",
  body: "Body", legs: "Legs", hands: "Gloves", feet: "Boots", ring: "Ring",
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function SlotRow({ rec }: { rec: SlotRecommendation }) {
  const [showAlts, setShowAlts] = useState(false);

  return (
    <div className="space-y-1">
      <div className={cn(
        "flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-colors",
        rec.item
          ? "bg-[#E8720C]/[0.04] border-[#E8720C]/20 hover:border-[#E8720C]/35"
          : "bg-white/[0.02] border-white/[0.06]"
      )}>
        {/* Icon */}
        <div className="w-8 h-8 rounded-md bg-[#0A0803] border border-[#E8720C]/20 flex items-center justify-center shrink-0 overflow-hidden">
          {rec.item?.icon_url ? (
            <Image
              src={rec.item.icon_url}
              alt={rec.item.name}
              width={32}
              height={32}
              className="object-contain"
              unoptimized
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
          ) : (
            <Shield className="h-4 w-4 text-[var(--text-muted)]" />
          )}
        </div>

        {/* Slot + item */}
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[#E8720C]/60">
            {SLOT_LABELS[rec.slot] ?? rec.slot}
          </p>
          <p className={cn(
            "text-sm font-medium truncate",
            rec.item ? "text-[var(--text-primary)]" : "text-[var(--text-muted)] italic"
          )}>
            {rec.item?.name ?? "Nothing suitable found"}
          </p>
        </div>

        {/* Score */}
        {rec.item && (
          <div className="text-right shrink-0">
            <p className="text-[10px] text-[var(--text-muted)]">score</p>
            <p className="text-xs font-mono font-semibold text-[#FF9438]">
              {rec.score.toFixed(0)}
            </p>
          </div>
        )}

        {/* Alts toggle */}
        {rec.alternatives.length > 0 && (
          <button
            type="button"
            onClick={() => setShowAlts((v) => !v)}
            className="shrink-0 text-[var(--text-muted)] hover:text-[#FF9438] transition-colors"
            title="Show alternatives"
          >
            <ChevronDown className={cn("h-4 w-4 transition-transform", showAlts && "rotate-180")} />
          </button>
        )}
      </div>

      {/* Alternatives */}
      {showAlts && rec.alternatives.length > 0 && (
        <div className="ml-3 space-y-1 border-l border-[#E8720C]/15 pl-3">
          {rec.alternatives.map(({ item, score }) => (
            <div key={item.id} className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
              <div className="w-5 h-5 rounded bg-[#0A0803] border border-white/[0.06] flex items-center justify-center overflow-hidden shrink-0">
                {item.icon_url ? (
                  <Image src={item.icon_url} alt={item.name} width={20} height={20} className="object-contain" unoptimized
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                ) : <Shield className="h-3 w-3" />}
              </div>
              <span className="truncate">{item.name}</span>
              <span className="ml-auto font-mono text-[#E8720C]/60 shrink-0">{score.toFixed(0)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SetupPanel({ setup, label }: { setup: GearSetup; label?: string }) {
  return (
    <div className="space-y-3">
      {label && (
        <div className="flex items-center gap-2">
          <span className={cn(
            "flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-semibold",
            STYLE_COLORS[setup.style]
          )}>
            {STYLE_ICONS[setup.style]}
            {label}
          </span>
          <span className="text-xs text-[var(--text-muted)]">
            Total score: <span className="text-[#FF9438] font-mono">{setup.totalScore.toFixed(0)}</span>
          </span>
        </div>
      )}

      <div className="space-y-1.5">
        {SLOT_ORDER.map((slot) => {
          const rec = setup.slots[slot];
          if (!rec) return null;
          return <SlotRow key={slot} rec={rec} />;
        })}
      </div>

      {/* Set bonuses */}
      {setup.setBonus.length > 0 && (
        <div className="rounded-lg border border-[#FF9438]/25 bg-[#FF9438]/[0.04] p-3 space-y-1">
          <p className="text-xs font-semibold text-[#FF9438] flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5" /> Active set bonuses
          </p>
          {setup.setBonus.map((s) => (
            <p key={s.name} className="text-xs text-[var(--text-secondary)]">
              <span className="font-medium text-[#FF9438]">{s.name}</span> — {s.bonus}
            </p>
          ))}
        </div>
      )}

      {/* Warnings */}
      {setup.warnings.length > 0 && (
        <div className="rounded-lg border border-orange-500/25 bg-orange-500/[0.06] p-3 space-y-1">
          {setup.warnings.map((w, i) => (
            <p key={i} className="text-xs text-orange-400">{w}</p>
          ))}
        </div>
      )}

      {/* Notes */}
      {setup.notes.length > 0 && (
        <div className="rounded-lg border border-[var(--border-subtle)] bg-white/[0.02] p-3">
          <p className="text-xs font-semibold text-[var(--text-muted)] flex items-center gap-1.5 mb-1">
            <Info className="h-3.5 w-3.5" /> Tips
          </p>
          {setup.notes.map((n, i) => (
            <p key={i} className="text-xs text-[var(--text-secondary)]">{n}</p>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function GearOptimizer({ bankItems, stats }: Props) {
  const [selectedBoss, setSelectedBoss] = useState<string>("");
  const [forceStyle, setForceStyle]     = useState<CombatStyle | "">("");
  const [loading, setLoading]           = useState(false);
  const [result, setResult]             = useState<OptimizeResult | null>(null);
  const [error, setError]               = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<BossCategory | "">("");

  const bossesByCategory = useMemo(() => getBossesByCategory(), []);

  const visibleBosses = useMemo(() => {
    if (categoryFilter) return bossesByCategory[categoryFilter] ?? [];
    return BOSS_PROFILES;
  }, [categoryFilter, bossesByCategory]);

  const selectedProfile = BOSS_PROFILES.find((p) => p.id === selectedBoss);

  const optimize = async () => {
    if (!selectedBoss) return;
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/gear-optimize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bossId:    selectedBoss,
          bankItems: bankItems,
          stats:     stats,
          forceStyle: forceStyle || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong");
      } else {
        setResult(data as OptimizeResult);
      }
    } catch {
      setError("Network error — please try again");
    } finally {
      setLoading(false);
    }
  };

  if (bankItems.length === 0) {
    return (
      <div className="rounded-xl border border-[var(--border-subtle)] bg-white/[0.02] p-6 text-center space-y-2">
        <Wand2 className="h-8 w-8 mx-auto text-[var(--text-muted)]" />
        <p className="text-sm font-medium text-[var(--text-secondary)]">No bank data available</p>
        <p className="text-xs text-[var(--text-muted)]">
          Upload your bank export above to use the gear optimizer.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Wand2 className="h-4 w-4 text-[#FF9438]" />
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">Gear Optimizer</h3>
        <span className="text-xs text-[var(--text-muted)] ml-auto">{bankItems.length} items in bank</span>
      </div>

      {/* Category filter */}
      <div className="flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={() => setCategoryFilter("")}
          className={cn(
            "px-2.5 py-1 rounded-full text-xs font-medium border transition-colors",
            !categoryFilter
              ? "border-[#E8720C]/50 bg-[#E8720C]/15 text-[#FF9438]"
              : "border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[#FF9438] hover:border-[#E8720C]/30"
          )}
        >
          All
        </button>
        {(Object.entries(BOSS_CATEGORIES) as [BossCategory, string][]).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => { setCategoryFilter(id); setSelectedBoss(""); }}
            className={cn(
              "px-2.5 py-1 rounded-full text-xs font-medium border transition-colors",
              categoryFilter === id
                ? "border-[#E8720C]/50 bg-[#E8720C]/15 text-[#FF9438]"
                : "border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[#FF9438] hover:border-[#E8720C]/30"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Boss selector */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-52 overflow-y-auto pr-1">
        {visibleBosses.map((boss) => (
          <button
            key={boss.id}
            type="button"
            onClick={() => { setSelectedBoss(boss.id); setResult(null); }}
            className={cn(
              "flex items-center gap-2 px-2.5 py-2 rounded-lg border text-left text-xs font-medium transition-all",
              selectedBoss === boss.id
                ? "border-[#E8720C]/50 bg-[#E8720C]/12 text-[#FF9438]"
                : "border-[var(--border-subtle)] bg-white/[0.02] text-[var(--text-secondary)] hover:border-[#E8720C]/25 hover:text-[#FF9438]",
              boss.is_wilderness && "border-red-900/30"
            )}
          >
            <span className={cn(
              "flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold shrink-0",
              STYLE_COLORS[boss.primary_style as CombatStyle] ?? "text-[var(--text-muted)] border-[var(--border-subtle)] bg-white/[0.04]"
            )}>
              {STYLE_ICONS[boss.primary_style as CombatStyle] ?? "⚡"}
              {boss.primary_style === "multi" ? "M" : boss.primary_style.slice(0, 1).toUpperCase()}
            </span>
            <span className="truncate">{boss.name}</span>
            {boss.is_wilderness && <span className="ml-auto text-[9px] text-red-400 shrink-0">🌋</span>}
          </button>
        ))}
      </div>

      {/* Style override (for multi-style bosses) */}
      {selectedProfile?.primary_style === "multi" && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-[var(--text-muted)]">Force style:</span>
          {(["melee", "ranged", "magic"] as CombatStyle[]).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setForceStyle(forceStyle === s ? "" : s)}
              className={cn(
                "flex items-center gap-1 px-2 py-1 rounded-md border text-xs font-medium transition-colors",
                forceStyle === s
                  ? STYLE_COLORS[s]
                  : "border-[var(--border-subtle)] text-[var(--text-muted)] hover:border-[#E8720C]/25"
              )}
            >
              {STYLE_ICONS[s]} {s}
            </button>
          ))}
        </div>
      )}

      {/* Optimize button */}
      <button
        type="button"
        onClick={optimize}
        disabled={!selectedBoss || loading}
        className={cn(
          "w-full flex items-center justify-center gap-2 h-10 rounded-lg",
          "text-sm font-semibold transition-all",
          selectedBoss && !loading
            ? "bg-[#E8720C] text-[#0E0B07] hover:bg-[#FF9438] hover:shadow-lg hover:shadow-[#E8720C]/20"
            : "bg-white/[0.06] text-[var(--text-muted)] cursor-not-allowed"
        )}
      >
        {loading ? (
          <><Loader2 className="h-4 w-4 animate-spin" /> Analysing gear…</>
        ) : (
          <><Wand2 className="h-4 w-4" /> Suggest Best Gear</>
        )}
      </button>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 text-sm text-red-400 bg-red-400/10 rounded-lg px-3 py-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="space-y-4 pt-1">
          <div className="flex items-center gap-2 pb-2 border-b border-[#E8720C]/15">
            <CheckCircle2 className="h-4 w-4 text-[#FF9438]" />
            <span className="text-sm font-semibold text-[var(--text-primary)]">
              Best gear for {result.bossName}
            </span>
          </div>

          {result.secondary ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <SetupPanel setup={result.primary}   label={`${result.primary.style} setup`} />
              <SetupPanel setup={result.secondary} label={`${result.secondary.style} setup`} />
            </div>
          ) : (
            <SetupPanel setup={result.primary} />
          )}
        </div>
      )}
    </div>
  );
}
