"use client";

import { useEffect, useState, useRef } from "react";
import Image from "next/image";
import { Wand2, ChevronDown, ChevronUp, Loader2, Shield, AlertCircle, CheckCircle2, Sword, Crosshair, Zap, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { getBossProfile } from "@/lib/osrs-boss-profiles";
import type { OptimizeResult, GearSetup, SlotRecommendation, BankItem } from "@/lib/gear-optimizer";
import type { CombatStyle } from "@/lib/osrs-boss-profiles";

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  /** Resolved optimizer boss profile ID (e.g. "fight_caves", "bandos") */
  bossProfileId: string | null;
  /** Available items from the player's loadout/bank */
  bankItems: BankItem[];
  /** Player stats */
  stats: Record<string, number>;
  /** Called when gear result is available (optional: parent can use it) */
  onResult?: (result: OptimizeResult) => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STYLE_COLORS: Record<CombatStyle, string> = {
  melee:  "text-red-400 border-red-400/30 bg-red-400/10",
  ranged: "text-green-400 border-green-400/30 bg-green-400/10",
  magic:  "text-blue-400 border-blue-400/30 bg-blue-400/10",
};

const STYLE_ICONS: Record<CombatStyle, React.ReactNode> = {
  melee:  <Sword     className="h-3 w-3" />,
  ranged: <Crosshair className="h-3 w-3" />,
  magic:  <Zap       className="h-3 w-3" />,
};

const SLOT_LABELS: Record<string, string> = {
  head: "Head", cape: "Cape", neck: "Neck", ammo: "Ammo",
  weapon: "Weapon", shield: "Shield",
  body: "Body", legs: "Legs", hands: "Gloves", feet: "Boots", ring: "Ring",
};

const SLOT_ORDER = ["head","cape","neck","ammo","weapon","shield","body","legs","hands","feet","ring"];

// ─── Compact slot row ─────────────────────────────────────────────────────────

function CompactSlot({ rec }: { rec: SlotRecommendation }) {
  return (
    <div className="flex items-center gap-2 py-1.5">
      {/* Icon */}
      <div className="w-7 h-7 rounded-md bg-[#0A0803] border border-[#E8720C]/20 flex items-center justify-center overflow-hidden shrink-0">
        {rec.item?.icon_url ? (
          <Image
            src={rec.item.icon_url}
            alt={rec.item.name}
            width={28} height={28}
            className="object-contain"
            unoptimized
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
        ) : (
          <Shield className="h-3.5 w-3.5 text-[var(--text-muted)]" />
        )}
      </div>
      {/* Slot label */}
      <span className="text-[10px] text-[#E8720C]/60 w-12 shrink-0 font-medium uppercase tracking-wide">
        {SLOT_LABELS[rec.slot] ?? rec.slot}
      </span>
      {/* Item name */}
      <span className={cn(
        "text-xs flex-1 truncate",
        rec.item ? "text-[var(--text-primary)] font-medium" : "text-[var(--text-muted)] italic"
      )}>
        {rec.item?.name ?? "—"}
      </span>
    </div>
  );
}

function SetupColumn({ setup, label }: { setup: GearSetup; label?: string }) {
  return (
    <div className="space-y-0.5">
      {label && (
        <div className={cn(
          "flex items-center gap-1.5 px-2 py-0.5 rounded-full border w-fit text-[10px] font-semibold mb-2",
          STYLE_COLORS[setup.style]
        )}>
          {STYLE_ICONS[setup.style]}
          {label}
        </div>
      )}
      {SLOT_ORDER.map((slot) => {
        const rec = setup.slots[slot as keyof typeof setup.slots];
        if (!rec) return null;
        return <CompactSlot key={slot} rec={rec} />;
      })}
      {setup.setBonus.length > 0 && (
        <div className="mt-2 pt-2 border-t border-[#E8720C]/10">
          {setup.setBonus.map((s) => (
            <div key={s.name} className="flex items-start gap-1 text-[10px] text-[#FF9438]/80">
              <CheckCircle2 className="h-3 w-3 shrink-0 mt-0.5" />
              <span><span className="font-semibold">{s.name}:</span> {s.bonus}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function AutoGearSuggestion({ bossProfileId, bankItems, stats, onResult }: Props) {
  const [result, setResult]     = useState<OptimizeResult | null>(null);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [expanded, setExpanded] = useState(true);
  const abortRef = useRef<AbortController | null>(null);

  const profile = bossProfileId ? getBossProfile(bossProfileId) : null;

  useEffect(() => {
    if (!bossProfileId || bankItems.length === 0) {
      setResult(null);
      return;
    }

    // Cancel previous request
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);
    setResult(null);

    fetch("/api/gear-optimize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        bossId:    bossProfileId,
        bankItems: bankItems,
        stats:     stats,
      }),
      signal: controller.signal,
    })
      .then((r) => r.json())
      .then((data) => {
        if (controller.signal.aborted) return;
        if (data.error) {
          setError(data.error);
        } else {
          setResult(data as OptimizeResult);
          onResult?.(data as OptimizeResult);
          setExpanded(true);
        }
      })
      .catch((err) => {
        if (err.name === "AbortError") return;
        setError("Could not load gear suggestion");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bossProfileId, JSON.stringify(bankItems.map(i => i.name)), JSON.stringify(stats)]);

  // Nothing to show if no boss profile or no items
  if (!profile || bankItems.length === 0) return null;

  return (
    <div className="rounded-xl border border-[#E8720C]/25 bg-[#E8720C]/[0.03] overflow-hidden">
      {/* Header */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-2.5 px-3.5 py-2.5 hover:bg-[#E8720C]/[0.04] transition-colors"
      >
        {loading ? (
          <Loader2 className="h-4 w-4 text-[#FF9438] animate-spin shrink-0" />
        ) : (
          <Wand2 className="h-4 w-4 text-[#FF9438] shrink-0" />
        )}
        <span className="text-sm font-semibold text-[var(--text-primary)] flex-1 text-left">
          {loading ? "Analysing your gear…" : `Suggested gear for ${profile.name}`}
        </span>
        {!loading && (result || error) && (
          expanded
            ? <ChevronUp   className="h-4 w-4 text-[var(--text-muted)]" />
            : <ChevronDown className="h-4 w-4 text-[var(--text-muted)]" />
        )}
      </button>

      {/* Body */}
      {expanded && (
        <div className="px-3.5 pb-3.5 space-y-3">
          <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2">
            <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
              Built from your saved account, our embedded OSRS boss profile for{" "}
              <span className="font-semibold text-[var(--text-primary)]">{profile.name}</span>, and the internal gear-stats library.
            </p>
            {profile.wiki_url && (
              <a
                href={profile.wiki_url}
                target="_blank"
                rel="noreferrer"
                className="mt-1 inline-flex items-center gap-1 text-[11px] text-[#FF9438] hover:text-[#FFD67A] transition-colors"
              >
                Boss reference
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>

          {/* Loading skeleton */}
          {loading && (
            <div className="space-y-2 animate-pulse">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-md bg-white/[0.06]" />
                  <div className="w-12 h-3 rounded bg-white/[0.04]" />
                  <div className="flex-1 h-3 rounded bg-white/[0.04]" />
                </div>
              ))}
            </div>
          )}

          {/* Error */}
          {!loading && error && (
            <div className="flex items-start gap-2 text-xs text-orange-400">
              <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Result */}
          {!loading && result && (
            <>
              {/* Warnings */}
              {result.primary.warnings.length > 0 && (
                <div className="space-y-1">
                  {result.primary.warnings.map((w, i) => (
                    <p key={i} className="text-[11px] text-orange-400/90">{w}</p>
                  ))}
                </div>
              )}

              {/* Notes */}
              {result.primary.notes.length > 0 && (
                <div className="rounded-lg bg-white/[0.02] border border-white/[0.05] px-3 py-2">
                  {result.primary.notes.map((n, i) => (
                    <p key={i} className="text-[11px] text-[var(--text-secondary)]">{n}</p>
                  ))}
                </div>
              )}

              {/* Two-column for multi-style */}
              {result.secondary ? (
                <div className="grid grid-cols-2 gap-4 divide-x divide-[#E8720C]/10">
                  <SetupColumn setup={result.primary}   label={`${result.primary.style} setup`} />
                  <div className="pl-4">
                    <SetupColumn setup={result.secondary} label={`${result.secondary.style} setup`} />
                  </div>
                </div>
              ) : (
                <SetupColumn setup={result.primary} />
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
