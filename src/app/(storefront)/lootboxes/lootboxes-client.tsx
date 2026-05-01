"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { useAuth } from "@/components/providers/auth-provider";
import { createClient } from "@/lib/supabase/client";
import { Star, Lock, Coins, Eye, X, PackageCheck } from "lucide-react";

/* ─── Types ─── */
interface Prize {
  id: string;
  name: string;
  description: string | null;
  prize_type: "balance_credit" | "coupon" | "osrs_item";
  prize_value: number;
  weight: number;
  image_url: string | null;
  rarity: "common" | "uncommon" | "rare" | "legendary";
  is_active: boolean;
}

interface Lootbox {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  cost_points: number;
  is_active: boolean;
  lootbox_prizes?: Prize[] | null;
  layer_closed:    string | null;
  layer_base:      string | null;
  layer_lid:       string | null;
  layer_open:      string | null;
  layer_glow:      string | null;
  layer_particles: string | null;
  layer_beam:      string | null;
}

interface WonPrize {
  id: string;
  name: string;
  description: string | null;
  prize_type: string;
  prize_value: number;
  rarity: string;
  image_url: string | null;
  coupon_code: string | null;
}

interface OpenResult {
  prize: WonPrize;
  remaining_points: number;
  all_prizes?: { id: string; name: string; rarity: string; image_url: string | null }[] | null;
}

interface DropFeedItem {
  box_name:     string;
  prize_name:   string;
  prize_rarity: string;
  prize_value:  number;
  prize_type:   string;
  opened_at:    string;
}

/* ─── Tier detection ─── */
type BoxTier = "bronze" | "silver" | "gold" | "elite";

function getBoxTier(name: string): BoxTier {
  const n = name.toLowerCase();
  if (n.includes("elite"))  return "elite";
  if (n.includes("gold"))   return "gold";
  if (n.includes("silver")) return "silver";
  return "bronze";
}

type LayerOverrides = {
  layer_closed?:    string | null;
  layer_base?:      string | null;
  layer_lid?:       string | null;
  layer_open?:      string | null;
  layer_glow?:      string | null;
  layer_particles?: string | null;
  layer_beam?:      string | null;
};

function getBoxImages(tier: BoxTier, overrides?: LayerOverrides) {
  const fallback = (key: string) => `/lootboxes/${tier}/${key}`;
  return {
    closed:    overrides?.layer_closed    || fallback("closed.png"),
    base:      overrides?.layer_base      || fallback("base.png"),
    lid:       overrides?.layer_lid       || fallback("lid.png"),
    open:      overrides?.layer_open      || fallback("open.png"),
    glow:      overrides?.layer_glow      || fallback("glow.png"),
    particles: overrides?.layer_particles || fallback("particles.png"),
    beam:      overrides?.layer_beam      || fallback("reward_beam.png"),
  };
}

const LOOTBOX_FRAME_COUNT = 6;
const SPRITE_FRAMES_PREFIX = "sprite_frames:v1:";

function parseSpriteFrames(value?: string | null): string[] | null {
  if (!value?.startsWith(SPRITE_FRAMES_PREFIX)) return null;
  try {
    const frames = JSON.parse(value.slice(SPRITE_FRAMES_PREFIX.length));
    return Array.isArray(frames) && frames.every((frame) => typeof frame === "string") ? frames : null;
  } catch {
    return null;
  }
}

function getBoxFrames(tier: BoxTier) {
  return Array.from({ length: LOOTBOX_FRAME_COUNT }, (_, i) => `/lootboxes/${tier}/frame-${i + 1}.png`);
}

function getAnimationFrames(tier: BoxTier, overrides?: LayerOverrides) {
  return parseSpriteFrames(overrides?.layer_closed) ?? getBoxFrames(tier);
}

function hasSpriteFrames(overrides?: LayerOverrides) {
  return Boolean(parseSpriteFrames(overrides?.layer_closed)?.length);
}

function hasLayerOverrides(overrides?: LayerOverrides) {
  if (!overrides) return false;
  if (hasSpriteFrames(overrides)) return false;
  return Boolean(
    overrides.layer_closed ||
    overrides.layer_base ||
    overrides.layer_lid ||
    overrides.layer_open ||
    overrides.layer_glow ||
    overrides.layer_particles ||
    overrides.layer_beam
  );
}

function getActivePrizes(box: Lootbox) {
  return (box.lootbox_prizes ?? []).filter((p) => p.is_active);
}

/* ─── Constants ─── */
const RARITY_GLOW: Record<string, string> = {
  common:    "rgba(156,163,175,0.6)",
  uncommon:  "rgba(34,197,94,0.6)",
  rare:      "rgba(59,130,246,0.6)",
  legendary: "rgba(232,114,12,0.8)",
};

const RARITY_BORDER: Record<string, string> = {
  common:    "#6b7280",
  uncommon:  "#22c55e",
  rare:      "#3b82f6",
  legendary: "#E8720C",
};

const RARITY_LABEL: Record<string, string> = {
  common:    "Common",
  uncommon:  "Uncommon",
  rare:      "Rare",
  legendary: "Legendary",
};

const SLIDER_ITEMS  = 40;
const ITEM_WIDTH    = 120;
const ITEM_GAP      = 12;
const SPIN_DURATION = 7000;

function playLootboxSound(kind: "tick" | "open" | "win", rarity?: string) {
  try {
    const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const now = ctx.currentTime;
    const isLegendary = rarity === "legendary";
    const isRare = rarity === "rare" || isLegendary;

    osc.type = kind === "tick" ? "square" : "sine";
    osc.frequency.setValueAtTime(kind === "tick" ? 520 : kind === "open" ? 180 : isLegendary ? 880 : isRare ? 660 : 520, now);
    if (kind === "open") osc.frequency.exponentialRampToValueAtTime(420, now + 0.16);
    if (kind === "win") osc.frequency.exponentialRampToValueAtTime(isLegendary ? 1320 : 760, now + 0.22);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(kind === "tick" ? 0.025 : 0.07, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + (kind === "tick" ? 0.08 : 0.32));
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + (kind === "tick" ? 0.09 : 0.34));
    window.setTimeout(() => void ctx.close(), 450);
  } catch {
    // Sound is enhancement only; browsers may block it in some cases.
  }
}

/* ─── Relative time helper ─── */
function timeAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60)  return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

/* ═══════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════ */
export default function LootboxesClient({ lootboxes }: { lootboxes?: Lootbox[] | null }) {
  const { user } = useAuth();
  const safeLootboxes = Array.isArray(lootboxes) ? lootboxes : [];
  const [loyaltyPoints,  setLoyaltyPoints]  = useState<number | null>(null);
  const [selectedBox,    setSelectedBox]    = useState<Lootbox | null>(null);
  const [openCount,      setOpenCount]      = useState<1 | 3 | 5>(1);
  const [phase,          setPhase]          = useState<"idle" | "spinning" | "opening" | "revealed" | "batch-loading" | "batch-revealed">("idle");
  const [result,         setResult]         = useState<OpenResult | null>(null);
  const [batchResults,   setBatchResults]   = useState<WonPrize[]>([]);
  const [error,          setError]          = useState("");
  const [prizesForModal, setPrizesForModal] = useState<Lootbox | null>(null);

  useEffect(() => {
    if (!user) return;
    const supabase = createClient();
    supabase
      .from("loyalty_points")
      .select("points")
      .eq("profile_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        setLoyaltyPoints((data as { points: number } | null)?.points ?? 0);
      });
  }, [user]);

  const handleOpen = useCallback(
    async (box: Lootbox, count: 1 | 3 | 5 = 1) => {
      if (!user) { setError("Please log in to open lootboxes"); return; }
      const totalCost = box.cost_points * count;
      if (loyaltyPoints !== null && loyaltyPoints < totalCost) {
        setError("Not enough loyalty points"); return;
      }
      setSelectedBox(box);
      setOpenCount(count);
      setError("");

      if (count === 1) {
        setPhase("spinning");
        try {
          const res = await fetch("/api/lootbox/open", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ lootbox_id: box.id }),
          });
          if (!res.ok) { const d = await res.json(); throw new Error(d.error || "Failed"); }
          const data: OpenResult = await res.json();
          setResult(data);
          setLoyaltyPoints(data.remaining_points);
        } catch (err) {
          setError(err instanceof Error ? err.message : "Something went wrong");
          setPhase("idle");
          setSelectedBox(null);
        }
      } else {
        setPhase("batch-loading");
        try {
          const calls = Array.from({ length: count }, () =>
            fetch("/api/lootbox/open", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ lootbox_id: box.id }),
            }).then((r) => r.json() as Promise<OpenResult>)
          );
          const results = await Promise.all(calls);
          const prizes  = results.map((r) => r.prize);
          const lastRemaining = results[results.length - 1]?.remaining_points;
          if (lastRemaining !== undefined) setLoyaltyPoints(lastRemaining);
          setBatchResults(prizes);
          setPhase("batch-revealed");
        } catch (err) {
          setError(err instanceof Error ? err.message : "Something went wrong");
          setPhase("idle");
          setSelectedBox(null);
        }
      }
    },
    [user, loyaltyPoints]
  );

  const closeModal = () => {
    setSelectedBox(null);
    setPhase("idle");
    setResult(null);
    setBatchResults([]);
  };

  return (
    <div className="min-h-screen pt-8 pb-20">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="font-heading text-3xl sm:text-4xl font-bold mb-3">
            <span className="bg-gradient-to-r from-[#E8720C] to-[#FF9438] bg-clip-text text-transparent">
              Lootboxes
            </span>
          </h1>
          <p className="text-[var(--text-secondary)] max-w-lg mx-auto">
            Spend your loyalty points for a chance to win balance credits and discount codes.
          </p>
          {user && loyaltyPoints !== null && (
            <div className="mt-4 flex flex-col items-center justify-center gap-2 sm:flex-row">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--bg-card)] border border-[var(--border-default)]">
                <Star className="h-4 w-4 text-[#E8720C]" />
                <span className="text-sm font-semibold">{loyaltyPoints.toLocaleString()} points</span>
              </div>
              <Link
                href="/lootbox-rewards"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#E8720C]/10 border border-[#E8720C]/25 text-[#E8720C] text-sm font-semibold hover:bg-[#E8720C]/15 transition-colors"
              >
                <PackageCheck className="h-4 w-4" />
                View / claim rewards
              </Link>
            </div>
          )}
        </div>

        {/* Live drops feed */}
        <RecentDropsFeed />

        {error && (
          <div className="mb-6 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center">
            {error}
          </div>
        )}

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {safeLootboxes.map((box) => (
            <LootboxCard
              key={box.id}
              box={box}
              canAfford={loyaltyPoints !== null && loyaltyPoints >= box.cost_points}
              loggedIn={!!user}
              loyaltyPoints={loyaltyPoints}
              onOpen={(count) => handleOpen(box, count)}
              onViewPrizes={() => setPrizesForModal(box)}
            />
          ))}
        </div>

        {safeLootboxes.length === 0 && (
          <div className="text-center py-20 text-[var(--text-muted)]">
            <p>No lootboxes available right now.</p>
          </div>
        )}
      </div>

      {/* Single-open modal */}
      {selectedBox && (phase === "spinning" || phase === "opening" || phase === "revealed") && (
        <SpinModal
          box={selectedBox}
          phase={phase as "spinning" | "opening" | "revealed"}
          result={result}
          onPhaseChange={setPhase}
          onClose={closeModal}
        />
      )}

      {/* Batch-loading overlay */}
      {selectedBox && phase === "batch-loading" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/90" />
          <div className="relative flex flex-col items-center gap-4 text-white">
            <div className="w-10 h-10 border-4 border-[#E8720C] border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-[var(--text-secondary)]">
              Opening {openCount}x {selectedBox.name}…
            </p>
          </div>
        </div>
      )}

      {/* Batch-revealed modal */}
      {selectedBox && phase === "batch-revealed" && (
        <BatchRevealModal
          box={selectedBox}
          prizes={batchResults}
          onClose={closeModal}
        />
      )}

      {/* Prize pool / odds modal */}
      {prizesForModal && (
        <PrizesModal box={prizesForModal} onClose={() => setPrizesForModal(null)} />
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   LIVE DROPS FEED
═══════════════════════════════════════════════════════ */
function RecentDropsFeed() {
  const [drops, setDrops] = useState<DropFeedItem[]>([]);

  const fetchDrops = useCallback(async () => {
    try {
      const supabase = createClient();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase as any).rpc("public_lootbox_feed", { lim: 20 });
      if (data && Array.isArray(data)) setDrops(data as DropFeedItem[]);
    } catch {
      /* silent — feed is non-critical */
    }
  }, []);

  useEffect(() => {
    fetchDrops();
    const id = setInterval(fetchDrops, 30_000);
    return () => clearInterval(id);
  }, [fetchDrops]);

  if (drops.length === 0) return null;

  const doubled = [...drops, ...drops];

  return (
    <div className="mb-8 overflow-hidden rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] relative">
      <div className="absolute left-0 top-0 bottom-0 w-8 z-10 bg-gradient-to-r from-[var(--bg-card)] to-transparent pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-8 z-10 bg-gradient-to-l from-[var(--bg-card)] to-transparent pointer-events-none" />

      <div
        className="flex items-center py-2.5 px-4 gap-6"
        style={{
          width: "max-content",
          animation: `marquee-scroll ${drops.length * 3}s linear infinite`,
        }}
      >
        {doubled.map((drop, i) => (
          <div
            key={i}
            className="flex items-center gap-2 flex-shrink-0 text-sm"
          >
            <span className="text-[var(--text-muted)] text-xs">🎁</span>
            <span className="text-[var(--text-secondary)]">{drop.box_name}</span>
            <span className="text-[var(--text-muted)]">—</span>
            <span
              className="font-semibold"
              style={{ color: RARITY_BORDER[drop.prize_rarity] || "#6b7280" }}
            >
              {drop.prize_name}
            </span>
            <span
              className="text-[10px] px-1.5 py-0.5 rounded-full"
              style={{
                color: RARITY_BORDER[drop.prize_rarity] || "#6b7280",
                backgroundColor: (RARITY_GLOW[drop.prize_rarity] || RARITY_GLOW.common).replace(/[\d.]+\)$/, "0.12)"),
                border: `1px solid ${RARITY_BORDER[drop.prize_rarity] || "#6b7280"}40`,
              }}
            >
              {RARITY_LABEL[drop.prize_rarity] || drop.prize_rarity}
            </span>
            <span className="text-[var(--text-muted)] text-xs">{timeAgo(drop.opened_at)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   LOOTBOX CARD
═══════════════════════════════════════════════════════ */
function LootboxCard({
  box, canAfford, loggedIn, loyaltyPoints, onOpen, onViewPrizes,
}: {
  box: Lootbox;
  canAfford: boolean;
  loggedIn: boolean;
  loyaltyPoints: number | null;
  onOpen: (count: 1 | 3 | 5) => void;
  onViewPrizes: () => void;
}) {
  const tier = getBoxTier(box.name);
  const imgs = getBoxImages(tier, box);
  const useSpritePreview = !hasLayerOverrides(box);
  const activePrizes = getActivePrizes(box);
  const rarities = [...new Set(activePrizes.map((p) => p.rarity))];
  const [isHovering, setIsHovering] = useState(false);

  const canAfford3 = loggedIn && loyaltyPoints !== null && loyaltyPoints >= box.cost_points * 3;
  const canAfford5 = loggedIn && loyaltyPoints !== null && loyaltyPoints >= box.cost_points * 5;

  return (
    <div className="group relative rounded-2xl bg-[var(--bg-card)] border border-[var(--border-default)] hover:border-[#E8720C]/30 transition-all duration-300 overflow-hidden">
      {/* Box image area */}
      <div className="relative h-52 flex items-center justify-center bg-gradient-to-b from-[var(--bg-elevated)] to-[var(--bg-card)] overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <Image
            src={imgs.glow}
            alt=""
            width={200}
            height={200}
            className="object-contain opacity-0 group-hover:opacity-60 transition-opacity duration-700"
            style={{ filter: "blur(4px)" }}
          />
        </div>
        <div style={{ animation: isHovering ? "box-hover-shake 0.5s ease-in-out" : "box-float 3s ease-in-out infinite" }}>
          {useSpritePreview ? (
            <AnimatedLootboxPreview tier={tier} overrides={box} alt={box.name} active={isHovering} />
          ) : (
            <Image
              src={imgs.closed}
              alt={box.name}
              width={140}
              height={140}
              className="object-contain drop-shadow-2xl group-hover:scale-105 transition-transform duration-500 relative z-10"
            />
          )}
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg-card)] via-transparent to-transparent" />
      </div>

      {/* Content */}
      <div className="p-5">
        <h3 className="font-heading font-bold text-lg mb-1">{box.name}</h3>
        {box.description && (
          <p className="text-xs text-[var(--text-muted)] mb-3">{box.description}</p>
        )}

        {/* Rarity badges */}
        <div className="flex items-center gap-1.5 mb-4 flex-wrap">
          {rarities.map((r) => (
            <span
              key={r}
              className="text-[10px] font-medium px-2 py-0.5 rounded-full"
              style={{
                color: RARITY_BORDER[r],
                backgroundColor: RARITY_GLOW[r].replace("0.6","0.1").replace("0.8","0.1"),
                border: `1px solid ${RARITY_BORDER[r]}30`,
              }}
            >
              {RARITY_LABEL[r]}
            </span>
          ))}
        </div>

        {/* Primary open button */}
        <button
          onClick={() => onOpen(1)}
          onMouseEnter={() => setIsHovering(true)}
          onMouseLeave={() => setIsHovering(false)}
          disabled={!loggedIn || !canAfford}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed mb-2"
          style={{
            background: loggedIn && canAfford ? "linear-gradient(135deg, #E8720C, #C95E08)" : undefined,
            color: loggedIn && canAfford ? "white" : undefined,
          }}
        >
          {!loggedIn ? (
            <><Lock className="h-4 w-4" /> Log in to open</>
          ) : !canAfford ? (
            <><Coins className="h-4 w-4" /> Not enough points</>
          ) : (
            <><Star className="h-4 w-4" /> Open for {box.cost_points.toLocaleString()} pts</>
          )}
        </button>

        {/* Multi-open row */}
        {loggedIn && (
          <div className="flex gap-2 mb-3">
            <button
              onClick={() => onOpen(3)}
              onMouseEnter={() => setIsHovering(true)}
              onMouseLeave={() => setIsHovering(false)}
              disabled={!canAfford3}
              className="flex-1 py-1.5 rounded-lg text-xs font-semibold border transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed"
              style={{
                borderColor: canAfford3 ? "#E8720C60" : undefined,
                color:       canAfford3 ? "#E8720C"   : undefined,
              }}
            >
              3x — {(box.cost_points * 3).toLocaleString()} pts
            </button>
            <button
              onClick={() => onOpen(5)}
              onMouseEnter={() => setIsHovering(true)}
              onMouseLeave={() => setIsHovering(false)}
              disabled={!canAfford5}
              className="flex-1 py-1.5 rounded-lg text-xs font-semibold border transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed"
              style={{
                borderColor: canAfford5 ? "#E8720C60" : undefined,
                color:       canAfford5 ? "#E8720C"   : undefined,
              }}
            >
              5x — {(box.cost_points * 5).toLocaleString()} pts
            </button>
          </div>
        )}

        {/* View prizes link */}
        {activePrizes.length > 0 && (
          <button
            onClick={onViewPrizes}
            className="w-full flex items-center justify-center gap-1.5 py-1.5 text-xs text-[var(--text-muted)] hover:text-[#E8720C] transition-colors duration-200"
          >
            <Eye className="h-3.5 w-3.5" />
            View possible prizes &amp; odds
          </button>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   PRIZES MODAL  (odds / prize pool)
═══════════════════════════════════════════════════════ */
function PrizesModal({ box, onClose }: { box: Lootbox; onClose: () => void }) {
  const activePrizes = getActivePrizes(box);
  const totalWeight  = activePrizes.reduce((s, p) => s + p.weight, 0);

  const sorted = [...activePrizes].sort((a, b) => {
    const order = { legendary: 0, rare: 1, uncommon: 2, common: 3 };
    return (order[a.rarity] ?? 4) - (order[b.rarity] ?? 4);
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/80" onClick={onClose} />
      <div className="relative w-full max-w-md mx-4 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-default)] overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-default)]">
          <h3 className="font-heading font-bold text-lg">{box.name} — Prize Pool</h3>
          <button onClick={onClose} className="text-[var(--text-muted)] hover:text-white transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Prize list */}
        <div className="overflow-y-auto max-h-[60vh] p-4 space-y-2">
          {sorted.map((prize) => {
            const pct = totalWeight > 0 ? ((prize.weight / totalWeight) * 100).toFixed(2) : "0.00";
            return (
              <div
                key={prize.id}
                className="flex items-center gap-3 p-3 rounded-xl border"
                style={{
                  borderColor: `${RARITY_BORDER[prize.rarity]}40`,
                  background: `radial-gradient(ellipse at left, ${(RARITY_GLOW[prize.rarity] || RARITY_GLOW.common).replace(/[\d.]+\)$/, "0.07)")}, transparent)`,
                }}
              >
                {prize.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={prize.image_url} alt={prize.name} width={40} height={40} className="object-contain rounded-lg flex-shrink-0" />
                ) : (
                  <div
                    className="w-10 h-10 rounded-lg flex-shrink-0 flex items-center justify-center text-lg"
                    style={{ backgroundColor: `${RARITY_BORDER[prize.rarity]}20` }}
                  >
                    {prize.prize_type === "balance_credit" ? "💰" : prize.prize_type === "osrs_item" ? "⚔️" : "🎟️"}
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{prize.name}</p>
                  <p className="text-xs text-[var(--text-muted)]">
                    {prize.prize_type === "balance_credit"
                      ? `$${Number(prize.prize_value).toFixed(2)} credit`
                      : prize.prize_type === "osrs_item"
                      ? "OSRS item — delivered by booster"
                      : "Coupon code"}
                  </p>
                </div>

                <div className="text-right flex-shrink-0">
                  <span
                    className="block text-xs font-bold px-2 py-0.5 rounded-full mb-1"
                    style={{
                      color: RARITY_BORDER[prize.rarity],
                      backgroundColor: (RARITY_GLOW[prize.rarity] || RARITY_GLOW.common).replace(/[\d.]+\)$/, "0.15)"),
                    }}
                  >
                    {RARITY_LABEL[prize.rarity]}
                  </span>
                  <span className="text-xs text-[var(--text-muted)]">{pct}%</span>
                </div>
              </div>
            );
          })}
        </div>

        <p className="text-center text-[10px] text-[var(--text-muted)] px-6 py-3 border-t border-[var(--border-default)]">
          Probabilities based on weighted random draw. 94% RTP guaranteed.
        </p>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   BATCH REVEAL MODAL
═══════════════════════════════════════════════════════ */
function BatchRevealModal({
  box, prizes, onClose,
}: {
  box: Lootbox;
  prizes: WonPrize[];
  onClose: () => void;
}) {
  useEffect(() => {
    const timers = prizes.map((prize, index) =>
      window.setTimeout(() => playLootboxSound("win", prize.rarity), index * 180)
    );
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [prizes]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/90" onClick={onClose} />

      <div className="relative w-full max-w-2xl mx-4">
        <div className="text-center mb-6 relative z-10">
          <h2 className="font-heading text-xl font-bold text-white">{box.name} — {prizes.length}x Results</h2>
        </div>

        <div
          className="grid gap-3 relative z-10"
          style={{ gridTemplateColumns: `repeat(${prizes.length}, minmax(0, 1fr))` }}
        >
          {prizes.map((prize, i) => (
            <div
              key={i}
              className="flex flex-col items-center p-4 rounded-2xl border-2 text-center"
              style={{
                borderColor: RARITY_BORDER[prize.rarity] || "#6b7280",
                background: `radial-gradient(ellipse at center, ${(RARITY_GLOW[prize.rarity] || RARITY_GLOW.common).replace(/[\d.]+\)$/, "0.12)")}, var(--bg-card))`,
                boxShadow: `0 0 20px ${RARITY_GLOW[prize.rarity] || RARITY_GLOW.common}`,
                animation: `batch-prize-in 0.5s ease-out ${i * 0.12}s both`,
              }}
            >
              <span
                className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full mb-3"
                style={{
                  color: RARITY_BORDER[prize.rarity],
                  backgroundColor: (RARITY_GLOW[prize.rarity] || "").replace(/[\d.]+\)$/, "0.15)"),
                  border: `1px solid ${RARITY_BORDER[prize.rarity]}50`,
                }}
              >
                {RARITY_LABEL[prize.rarity] || prize.rarity}
              </span>

              {prize.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={prize.image_url}
                  alt={prize.name}
                  width={prize.prize_type === "osrs_item" ? 72 : 56}
                  height={prize.prize_type === "osrs_item" ? 72 : 56}
                  className="object-contain mb-3"
                  style={prize.prize_type === "osrs_item" ? { animation: `item-float-up 0.7s cubic-bezier(0.22,1,0.36,1) ${i * 0.12 + 0.3}s both` } : undefined}
                />
              ) : box.image_url ? (
                <Image
                  src={box.image_url}
                  alt={prize.name}
                  width={56} height={56}
                  className="object-contain mb-3"
                />
              ) : (
                <div className="text-3xl mb-3">
                  {prize.prize_type === "balance_credit" ? "💰" : prize.prize_type === "osrs_item" ? "⚔️" : "🎟️"}
                </div>
              )}

              <p className="font-heading font-bold text-sm text-white mb-1 leading-tight">{prize.name}</p>
              {prize.prize_type === "balance_credit" && (
                <p className="text-base font-bold text-[#E8720C]">+${Number(prize.prize_value).toFixed(2)}</p>
              )}
              {prize.prize_type === "osrs_item" && (
                <p className="text-[10px] text-[var(--text-muted)] mt-1 leading-tight">Delivered by booster</p>
              )}
              {prize.prize_type === "coupon" && prize.coupon_code && (
                <code className="text-xs font-mono text-[#E8720C] bg-[var(--bg-elevated)] px-2 py-1 rounded-lg mt-1 select-all">
                  {prize.coupon_code}
                </code>
              )}
            </div>
          ))}
        </div>

        <div className="flex justify-center mt-6 relative z-10">
          <button
            onClick={onClose}
            className="px-8 py-2.5 rounded-xl text-sm font-semibold"
            style={{ background: "linear-gradient(135deg, #E8720C, #C95E08)", color: "white" }}
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   PRELOAD HOOK
═══════════════════════════════════════════════════════ */
function usePreloadLootboxFrameAssets(frames: string[]) {
  useEffect(() => {
    const imgs: HTMLImageElement[] = [];
    frames.forEach((src) => {
      const img = new window.Image();
      img.decoding = "async";
      img.src = src;
      imgs.push(img);
    });
    return () => { imgs.length = 0; };
  }, [frames]);
}

function usePreloadLootboxAssets(tier: BoxTier, overrides?: LayerOverrides) {
  useEffect(() => {
    const sources = Object.values(getBoxImages(tier, overrides));
    const imgs: HTMLImageElement[] = [];
    sources.forEach((src) => {
      const img = new window.Image();
      img.decoding = "async";
      img.src = src;
      imgs.push(img);
    });
    return () => { imgs.length = 0; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tier]);
}

function AnimatedLootboxPreview({
  tier,
  overrides,
  alt,
  active,
}: {
  tier: BoxTier;
  overrides?: LayerOverrides;
  alt: string;
  active: boolean;
}) {
  const frames = useMemo(() => getAnimationFrames(tier, overrides), [tier, overrides]);
  const [frameIndex, setFrameIndex] = useState(0);

  usePreloadLootboxFrameAssets(frames);

  useEffect(() => {
    if (!active) {
      setFrameIndex(0);
      return;
    }

    const interval = window.setInterval(() => {
      setFrameIndex((current) => (current >= Math.min(2, frames.length - 1) ? 0 : current + 1));
    }, 160);

    return () => window.clearInterval(interval);
  }, [active, frames.length]);

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={frames[frameIndex]}
      alt={alt}
      width={150}
      height={150}
      className="object-contain drop-shadow-2xl group-hover:scale-105 transition-transform duration-500 relative z-10"
    />
  );
}

function SpriteBoxOpenAnimation({
  tier,
  overrides,
  glowColor,
  prize,
  active,
  onDone,
}: {
  tier: BoxTier;
  overrides?: LayerOverrides;
  glowColor: string;
  prize?: WonPrize | null;
  active: boolean;
  onDone: () => void;
}) {
  const frames = useMemo(() => getAnimationFrames(tier, overrides), [tier, overrides]);
  const [frameIndex, setFrameIndex] = useState(0);
  const isOpen = frameIndex >= frames.length - 1;

  usePreloadLootboxFrameAssets(frames);

  useEffect(() => {
    if (!active) return;

    setFrameIndex(0);
    const timers = Array.from({ length: frames.length }, (_, index) =>
      window.setTimeout(() => setFrameIndex(index), index * 140)
    );
    const doneTimer = window.setTimeout(onDone, Math.max(1450, frames.length * 140 + 500));

    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
      window.clearTimeout(doneTimer);
    };
  }, [active, frames.length, onDone]);

  return (
    <div className="flex justify-center my-4">
      <div
        className="relative h-[260px] w-[260px]"
        style={{ transform: "translate3d(0,0,0)" }}
      >
        <div
          className="absolute inset-2 rounded-full blur-2xl transition-all duration-500"
          style={{
            background: `radial-gradient(circle, ${glowColor} 0%, transparent 68%)`,
            opacity: isOpen ? 0.95 : 0.45,
            transform: isOpen ? "scale(1.15)" : "scale(0.88)",
          }}
        />
        <div
          className="absolute inset-0 rounded-full opacity-20 blur-3xl"
          style={{ backgroundColor: glowColor }}
        />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={frames[frameIndex]}
          alt=""
          className="relative z-10 h-full w-full object-contain drop-shadow-[0_28px_42px_rgba(0,0,0,0.55)]"
          style={{
            animation: !isOpen ? "lootbox-shudder 260ms ease-in-out" : "lootbox-glow-breathe 1.4s ease-in-out infinite",
          }}
        />
        {prize && isOpen && (
          <div
            className="absolute left-1/2 top-[42%] z-20 flex h-24 w-24 -translate-x-1/2 items-center justify-center"
            style={{ animation: "lootbox-item-emerge 650ms cubic-bezier(0.22,1,0.36,1) both" }}
          >
            {prize.image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={prize.image_url} alt={prize.name} className="h-full w-full object-contain drop-shadow-[0_0_24px_rgba(255,255,255,0.45)]" />
            ) : (
              <div className="text-5xl drop-shadow-[0_0_24px_rgba(255,255,255,0.45)]">
                {prize.prize_type === "balance_credit" ? "💰" : prize.prize_type === "osrs_item" ? "⚔️" : "🎟️"}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   BOX OPENING ANIMATION
═══════════════════════════════════════════════════════ */
type OpenStage = "idle" | "opening" | "open";

const LAYER: React.CSSProperties = {
  position: "absolute",
  inset: 0,
  width: "100%",
  height: "100%",
  objectFit: "contain" as const,
  pointerEvents: "none",
  willChange: "transform, opacity",
  backfaceVisibility: "hidden" as const,
  transform: "translate3d(0,0,0)",
};

function BoxOpenAnimation({
  tier,
  overrides,
  glowColor,
  prize,
  active,
  onDone,
}: {
  tier: BoxTier;
  overrides?: LayerOverrides;
  glowColor: string;
  prize?: WonPrize | null;
  active: boolean;
  onDone: () => void;
}) {
  const imgs = getBoxImages(tier, overrides);
  const [stage, setStage] = useState<OpenStage>("idle");
  const useSpriteAnimation = !hasLayerOverrides(overrides);

  usePreloadLootboxAssets(tier, overrides);

  useEffect(() => {
    if (!active || useSpriteAnimation) return;
    let raf1 = 0, raf2 = 0;
    setStage("idle");
    raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => setStage("opening"));
    });
    const t1 = window.setTimeout(() => setStage("open"), 980);
    const t2 = window.setTimeout(() => onDone(), 1700);
    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [active, onDone, useSpriteAnimation]);

  const isOpening = stage === "opening";
  const isOpen    = stage === "open";

  if (useSpriteAnimation) {
    return (
      <SpriteBoxOpenAnimation
        tier={tier}
        overrides={overrides}
        glowColor={glowColor}
        prize={prize}
        active={active}
        onDone={onDone}
      />
    );
  }

  return (
    <div className="flex justify-center my-4">
      <div style={{
        position: "relative", width: 220, height: 220,
        transform: "translate3d(0,0,0)", willChange: "transform",
      }}>

        {/* Soft background glow */}
        <div style={{
          position: "absolute", inset: 0, borderRadius: "9999px", pointerEvents: "none",
          background: `radial-gradient(circle, ${glowColor} 0%, transparent 68%)`,
          opacity: isOpen ? 0.9 : isOpening ? 0.65 : 0.15,
          transform: isOpen ? "scale(1.15)" : isOpening ? "scale(1.06)" : "scale(0.9)",
          transition: "opacity 550ms cubic-bezier(0.22,1,0.36,1), transform 650ms cubic-bezier(0.22,1,0.36,1)",
          filter: "blur(10px)",
        }} />

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={imgs.glow} alt="" style={{
          ...LAYER,
          opacity: isOpen ? 0.9 : isOpening ? 0.65 : 0.18,
          transform: isOpen
            ? "translate3d(0,0,0) scale(1.12)"
            : isOpening
            ? "translate3d(0,0,0) scale(1.04)"
            : "translate3d(0,0,0) scale(0.95)",
          transition: "opacity 550ms cubic-bezier(0.22,1,0.36,1), transform 650ms cubic-bezier(0.22,1,0.36,1)",
          animation: isOpen ? "lootbox-glow-breathe 1.4s ease-in-out infinite" : undefined,
        }} />

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={imgs.beam} alt="" style={{
          ...LAYER,
          opacity: isOpen ? 1 : isOpening ? 0.4 : 0,
          transform: isOpen
            ? "translate3d(0,-8px,0) scale(1)"
            : isOpening
            ? "translate3d(0,8px,0) scale(0.82)"
            : "translate3d(0,16px,0) scale(0.7)",
          transformOrigin: "bottom center",
          transition: "opacity 480ms cubic-bezier(0.22,1,0.36,1), transform 700ms cubic-bezier(0.22,1,0.36,1)",
        }} />

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={imgs.open} alt="" style={{
          ...LAYER,
          opacity: isOpen ? 1 : 0,
          transform: isOpen ? "translate3d(0,0,0) scale(1)" : "translate3d(0,4px,0) scale(0.98)",
          transition: "opacity 320ms ease-out 320ms, transform 320ms ease-out 320ms",
        }} />

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={imgs.base} alt="base" style={{
          ...LAYER,
          opacity: isOpen ? 0 : 1,
          transform: isOpening || isOpen ? "translate3d(0,0,0) scale(1.02)" : "translate3d(0,0,0) scale(1)",
          transition: "opacity 260ms ease-out 300ms, transform 700ms cubic-bezier(0.22,1,0.36,1)",
          animation: isOpening ? "lootbox-base-settle 700ms cubic-bezier(0.22,1,0.36,1)" : undefined,
        }} />

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={imgs.lid} alt="lid" style={{
          ...LAYER,
          opacity: isOpen ? 0 : 1,
          transformOrigin: "50% 68%",
          transform: isOpen
            ? "translate3d(0,-56px,0) rotate(-30deg) scale(1.02)"
            : isOpening
            ? "translate3d(0,-48px,0) rotate(-24deg) scale(1.02)"
            : "translate3d(0,0,0) rotate(0deg) scale(1)",
          transition: "transform 900ms cubic-bezier(0.16,1,0.3,1), opacity 240ms ease-out 280ms",
          animation: isOpening ? "lootbox-shudder 260ms ease-in-out 1" : undefined,
        }} />

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={imgs.particles} alt="" style={{
          ...LAYER,
          opacity: isOpening || isOpen ? 1 : 0,
          animation: isOpening ? "lootbox-particles 900ms ease-out both" : undefined,
        }} />

        {prize && isOpen && (
          <div
            style={{
              position: "absolute",
              left: "50%",
              top: "38%",
              zIndex: 20,
              width: 86,
              height: 86,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transform: "translateX(-50%)",
              animation: "lootbox-item-emerge 650ms cubic-bezier(0.22,1,0.36,1) both",
            }}
          >
            {prize.image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={prize.image_url} alt={prize.name} style={{ width: "100%", height: "100%", objectFit: "contain", filter: "drop-shadow(0 0 24px rgba(255,255,255,0.45))" }} />
            ) : (
              <div style={{ fontSize: 44, filter: "drop-shadow(0 0 24px rgba(255,255,255,0.45))" }}>
                {prize.prize_type === "balance_credit" ? "💰" : prize.prize_type === "osrs_item" ? "⚔️" : "🎟️"}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   SPIN MODAL  (single open)
═══════════════════════════════════════════════════════ */
function SpinModal({
  box, phase, result, onPhaseChange, onClose,
}: {
  box: Lootbox;
  phase: "spinning" | "opening" | "revealed";
  result: OpenResult | null;
  onPhaseChange: (p: "idle" | "spinning" | "opening" | "revealed") => void;
  onClose: () => void;
}) {
  const stripRef = useRef<HTMLDivElement>(null);
  const [sliderItems, setSliderItems] = useState<number[]>([]);

  const tier = getBoxTier(box.name);
  const imgs = getBoxImages(tier, box);
  const chestFrames = useMemo(() => getAnimationFrames(tier, box), [tier, box]);
  const spinnerChestSrc = chestFrames[0] || imgs.closed;

  useEffect(() => {
    if (!result || phase !== "spinning") return;

    const winIndex = Math.floor(SLIDER_ITEMS * 0.75);
    setSliderItems(Array.from({ length: SLIDER_ITEMS }, (_, index) => index));

    requestAnimationFrame(() => {
      if (!stripRef.current) return;
      const targetOffset =
        winIndex * (ITEM_WIDTH + ITEM_GAP) -
        stripRef.current.parentElement!.clientWidth / 2 +
        ITEM_WIDTH / 2;
      stripRef.current.style.transition = "none";
      stripRef.current.style.transform = "translate3d(0,0,0)";
      requestAnimationFrame(() => {
        if (!stripRef.current) return;
        stripRef.current.style.transition = `transform ${SPIN_DURATION}ms cubic-bezier(0.15, 0.85, 0.25, 1)`;
        stripRef.current.style.transform = `translate3d(-${targetOffset}px,0,0)`;
      });
    });

    const tick = setInterval(() => playLootboxSound("tick"), 180);
    const t1 = setTimeout(() => onPhaseChange("opening"), SPIN_DURATION + 300);
    return () => {
      clearInterval(tick);
      clearTimeout(t1);
    };
  }, [phase, result, onPhaseChange]);

  const handleBoxDone = useCallback(() => {
    onPhaseChange("revealed");
  }, [onPhaseChange]);

  const wonPrize  = result?.prize;
  const glowColor = wonPrize ? RARITY_GLOW[wonPrize.rarity] || RARITY_GLOW.common : RARITY_GLOW.common;

  useEffect(() => {
    if (phase === "opening") playLootboxSound("open", wonPrize?.rarity);
    if (phase === "revealed" && wonPrize) playLootboxSound("win", wonPrize.rarity);
  }, [phase, wonPrize]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/90"
        onClick={phase === "revealed" ? onClose : undefined}
      />

      <div className="relative w-full max-w-2xl mx-4">
        <div className="text-center mb-6 relative z-10">
          <h2 className="font-heading text-xl font-bold text-white">{box.name}</h2>
        </div>

        {/* Slider — only during spinning */}
        {phase === "spinning" && (
          <div className="relative mb-6">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-0.5 h-full bg-[#E8720C] z-20" />
            <div className="absolute top-0 left-1/2 -translate-px w-[3px] h-full z-20 blur-sm bg-[#E8720C]/60" />
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-20">
              <div className="w-0 h-0" style={{ borderLeft:"8px solid transparent", borderRight:"8px solid transparent", borderTop:"10px solid #E8720C" }} />
            </div>
            <div className="overflow-hidden rounded-2xl bg-[var(--bg-card)] border border-[var(--border-default)] py-4">
              <div ref={stripRef} className="flex will-change-transform" style={{ gap:`${ITEM_GAP}px`, paddingLeft:"12px" }}>
                {sliderItems.map((item) => (
                  <div
                    key={item}
                    className="flex-shrink-0 rounded-xl border-2 flex flex-col items-center justify-center p-2"
                    style={{
                      width: `${ITEM_WIDTH}px`,
                      height: `${ITEM_WIDTH}px`,
                      borderColor: "rgba(232, 114, 12, 0.55)",
                      background: "radial-gradient(circle, rgba(232,114,12,0.12), rgba(232,114,12,0.02), transparent)",
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={spinnerChestSrc} alt="Mystery lootbox" width={76} height={76} className="object-contain mb-1 drop-shadow-lg" draggable={false} />
                    <span className="text-[10px] font-semibold text-center leading-tight text-white/70">
                      Mystery reward
                    </span>
                  </div>
                ))}
              </div>
            </div>
            {result && (
              <div className="mt-3 flex justify-center">
                <button
                  type="button"
                  onClick={() => onPhaseChange("opening")}
                  className="rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-semibold text-white/80 hover:border-[#E8720C]/50 hover:text-[#E8720C] transition-colors"
                >
                  Skip animation
                </button>
              </div>
            )}
          </div>
        )}

        {/* Box opening animation */}
        {phase === "opening" && (
          <BoxOpenAnimation
            tier={tier}
            overrides={box}
            glowColor={glowColor}
            prize={wonPrize}
            active={phase === "opening"}
            onDone={handleBoxDone}
          />
        )}

        {/* Prize reveal */}
        {phase === "revealed" && wonPrize && (
          <div className="flex flex-col items-center" style={{ animation: "lootbox-prize-reveal 0.6s ease-out" }}>
            {(wonPrize.rarity === "rare" || wonPrize.rarity === "legendary") && (
              <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-3xl">
                {Array.from({ length: wonPrize.rarity === "legendary" ? 18 : 10 }, (_, index) => (
                  <span
                    key={index}
                    className="absolute h-1.5 w-1.5 rounded-full"
                    style={{
                      left: `${8 + ((index * 47) % 84)}%`,
                      top: `${16 + ((index * 31) % 58)}%`,
                      backgroundColor: RARITY_BORDER[wonPrize.rarity],
                      boxShadow: `0 0 14px ${RARITY_BORDER[wonPrize.rarity]}`,
                      animation: `lootbox-confetti-pop ${800 + index * 35}ms ease-out ${index * 25}ms both`,
                    }}
                  />
                ))}
              </div>
            )}
            <div className="absolute w-72 h-72 rounded-full opacity-25 blur-3xl pointer-events-none"
              style={{ backgroundColor: RARITY_BORDER[wonPrize.rarity] }} />

            <div
              className="relative p-8 rounded-3xl border-2 text-center w-full max-w-xs"
              style={{
                borderColor: RARITY_BORDER[wonPrize.rarity],
                background: `radial-gradient(ellipse at center, ${(RARITY_GLOW[wonPrize.rarity] || RARITY_GLOW.common).replace(/[\d.]+\)$/, "0.12)")}, var(--bg-card))`,
                boxShadow: `0 0 40px ${RARITY_GLOW[wonPrize.rarity]}, 0 0 80px ${(RARITY_GLOW[wonPrize.rarity] || "").replace(/[\d.]+\)$/, "0.3)")}`,
              }}
            >
              <span
                className="inline-block text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full mb-4"
                style={{
                  color: RARITY_BORDER[wonPrize.rarity],
                  backgroundColor: (RARITY_GLOW[wonPrize.rarity] || "").replace(/[\d.]+\)$/, "0.15)"),
                  border: `1px solid ${RARITY_BORDER[wonPrize.rarity]}50`,
                }}
              >
                {RARITY_LABEL[wonPrize.rarity] || wonPrize.rarity}
              </span>

              {wonPrize.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={wonPrize.image_url}
                  alt={wonPrize.name}
                  width={wonPrize.prize_type === "osrs_item" ? 100 : 80}
                  height={wonPrize.prize_type === "osrs_item" ? 100 : 80}
                  className="object-contain mx-auto mb-4"
                  style={wonPrize.prize_type === "osrs_item" ? { animation: "item-float-up 0.7s cubic-bezier(0.22,1,0.36,1) both" } : undefined}
                />
              ) : box.image_url ? (
                <Image
                  src={box.image_url}
                  alt={wonPrize.name}
                  width={80} height={80}
                  className="object-contain mx-auto mb-4"
                />
              ) : (
                <div className="text-5xl mb-4">
                  {wonPrize.prize_type === "balance_credit" ? "💰" : wonPrize.prize_type === "osrs_item" ? "⚔️" : "🎟️"}
                </div>
              )}

              <h3 className="font-heading text-xl font-bold text-white mb-2">{wonPrize.name}</h3>
              {wonPrize.prize_type === "balance_credit" && (
                <p className="text-2xl font-bold text-[#E8720C]">
                  +${Number(wonPrize.prize_value).toFixed(2)}
                </p>
              )}
              {wonPrize.prize_type === "osrs_item" && (
                <div className="mt-2 space-y-1">
                  {Number(wonPrize.prize_value) > 0 && (
                    <p className="text-lg font-bold text-[#E8720C]">~${Number(wonPrize.prize_value).toFixed(2)} value</p>
                  )}
                  <p className="text-xs text-[var(--text-secondary)] px-3 py-1.5 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-default)]">
                    This item will be delivered by a booster. Open a support ticket to claim.
                  </p>
                </div>
              )}
              {wonPrize.prize_type === "coupon" && wonPrize.coupon_code && (
                <div className="mt-2">
                  <p className="text-sm text-[var(--text-secondary)] mb-1">Your coupon code:</p>
                  <code className="inline-block px-4 py-2 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-default)] text-lg font-mono font-bold text-[#E8720C] select-all">
                    {wonPrize.coupon_code}
                  </code>
                </div>
              )}
              {wonPrize.description && (
                <p className="text-xs text-[var(--text-muted)] mt-3">{wonPrize.description}</p>
              )}
            </div>

            <button
              onClick={onClose}
              className="mt-6 px-6 py-2.5 rounded-xl text-sm font-semibold"
              style={{ background: "linear-gradient(135deg, #E8720C, #C95E08)", color: "white" }}
            >
              Continue
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
