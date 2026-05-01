"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Clock3,
  Crown,
  Loader2,
  Medal,
  RotateCcw,
  ScrollText,
  Sparkles,
  Swords,
  Trophy,
  Volume2,
  VolumeX,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";

type FighterSide = "player" | "opponent";

type DuelEvent = {
  id: number;
  round: number;
  attacker: FighterSide;
  defender: FighterSide;
  hit: boolean;
  damage: number;
  playerHp: number;
  opponentHp: number;
  message: string;
};

type DuelResult = {
  winner: FighterSide;
  fighters: Record<FighterSide, {
    name: string;
    attack: number;
    defence: number;
    strength: number;
    maxHit: number;
  }>;
  events: DuelEvent[];
};

type DuelPhase = "idle" | "countdown" | "running" | "finished";

type TimelineStep = {
  name: "windup" | "slash" | "impact" | "recover" | "finish";
  offset: number;
};

type DuelStats = {
  rounds: number;
  playerDamage: number;
  opponentDamage: number;
  totalDamage: number;
  playerHits: number;
  opponentHits: number;
  playerSwings: number;
  opponentSwings: number;
  biggestHit: number;
  playerAccuracy: number;
  opponentAccuracy: number;
};

type DuelHistoryItem = {
  id: string;
  winner: FighterSide;
  rounds: number;
  biggestHit: number;
  totalDamage: number;
};

type SpriteMeta = {
  footOffset: number;
  hitbox: { x: number; y: number; width: number; height: number };
  impactPointClass: string;
};

const ARENA_BG_URL = "/images/duel-arena-background.png";

const FRAME = {
  idle: 0,
  ready: 1,
  walk: 2,
  walkAlt: 3,
  attackWindup: 4,
  attackSlash: 5,
  attackThrust: 6,
  attackRecover: 7,
  run: 8,
  hurt: 9,
  heavyHurt: 10,
  cheer: 11,
  stance: 12,
  dizzy: 13,
  kneel: 14,
  down: 15,
} as const;

const PER_EVENT_MS = 1150;
const IMPACT_MS = 430;
const COUNTDOWN_STEP_MS = 780;
const COUNTDOWN_STEPS = ["3", "2", "1", "Fight!"] as const;
const TIMELINE_STEPS: TimelineStep[] = [
  { name: "windup", offset: 0 },
  { name: "slash", offset: 200 },
  { name: "impact", offset: IMPACT_MS },
  { name: "recover", offset: 710 },
  { name: "finish", offset: 980 },
];
const HISTORY_STORAGE_KEY = "duel-arena-history";
const SPRITE_META: Record<FighterSide, SpriteMeta> = {
  player: {
    footOffset: 2,
    hitbox: { x: 0.28, y: 0.34, width: 0.16, height: 0.42 },
    impactPointClass: "left-[28%]",
  },
  opponent: {
    footOffset: 2,
    hitbox: { x: 0.72, y: 0.34, width: 0.16, height: 0.42 },
    impactPointClass: "left-[72%]",
  },
};

function getSpriteMeta(side: FighterSide, frame: number): SpriteMeta {
  const base = SPRITE_META[side];
  const lowPoseOffset = frame === FRAME.down || frame === FRAME.kneel ? 1 : base.footOffset;
  return { ...base, footOffset: lowPoseOffset };
}

function frameUrl(side: FighterSide, frame: number) {
  return `/images/duel-arena/${side}-${frame.toString().padStart(2, "0")}.png`;
}

function playDuelSound(kind: "countdown" | "start" | "hit" | "miss" | "win", enabled = true, volume = 1) {
  if (!enabled || volume <= 0) return;
  try {
    const AudioContextCtor = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextCtor) return;
    const ctx = new AudioContextCtor();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = kind === "miss" ? "triangle" : "sawtooth";
    const base = kind === "win" ? 660 : kind === "hit" ? 220 : kind === "start" || kind === "countdown" ? 440 : 180;
    osc.frequency.setValueAtTime(base, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(kind === "win" ? 990 : Math.max(90, base * 0.55), ctx.currentTime + 0.18);
    gain.gain.setValueAtTime((kind === "miss" ? 0.07 : 0.12) * volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.28);
    osc.start();
    osc.stop(ctx.currentTime + 0.3);
  } catch {
    // Some browsers block AudioContext until user interaction; the game still works visually.
  }
}

function hpColor(hp: number) {
  if (hp > 60) return "bg-green-500";
  if (hp > 28) return "bg-yellow-400";
  return "bg-red-500";
}

function accuracyPercent(hits: number, swings: number) {
  if (swings === 0) return 0;
  return Math.round((hits / swings) * 100);
}

function getDuelStats(duel: DuelResult | null): DuelStats | null {
  if (!duel) return null;

  const playerEvents = duel.events.filter((event) => event.attacker === "player");
  const opponentEvents = duel.events.filter((event) => event.attacker === "opponent");
  const playerHits = playerEvents.filter((event) => event.hit && event.damage > 0).length;
  const opponentHits = opponentEvents.filter((event) => event.hit && event.damage > 0).length;
  const playerDamage = playerEvents.reduce((total, event) => total + event.damage, 0);
  const opponentDamage = opponentEvents.reduce((total, event) => total + event.damage, 0);
  const biggestHit = duel.events.reduce((max, event) => Math.max(max, event.damage), 0);
  const lastEvent = duel.events.at(-1);

  return {
    rounds: lastEvent?.round ?? duel.events.length,
    playerDamage,
    opponentDamage,
    totalDamage: playerDamage + opponentDamage,
    playerHits,
    opponentHits,
    playerSwings: playerEvents.length,
    opponentSwings: opponentEvents.length,
    biggestHit,
    playerAccuracy: accuracyPercent(playerHits, playerEvents.length),
    opponentAccuracy: accuracyPercent(opponentHits, opponentEvents.length),
  };
}

function getAchievements(duel: DuelResult | null, stats: DuelStats | null) {
  const locked = [
    {
      title: "Won with 1 HP",
      description: "Survive the arena with a single hitpoint.",
      unlocked: false,
    },
    {
      title: "Hit over 40",
      description: "Land a massive whip hit.",
      unlocked: false,
    },
    {
      title: "Perfect duel",
      description: "Win without taking damage.",
      unlocked: false,
    },
    {
      title: "Comeback win",
      description: "Win after dropping to 20 HP or lower.",
      unlocked: false,
    },
  ];

  if (!duel || !stats) return locked;
  const lastEvent = duel.events.at(-1);
  const playerWon = duel.winner === "player";
  const playerLowestHp = Math.min(99, ...duel.events.map((event) => event.playerHp));

  return [
    {
      title: "Won with 1 HP",
      description: "Survive the arena with a single hitpoint.",
      unlocked: playerWon && (lastEvent?.playerHp ?? 99) <= 1,
    },
    {
      title: "Hit over 40",
      description: "Land a massive whip hit.",
      unlocked: stats.biggestHit >= 40,
    },
    {
      title: "Perfect duel",
      description: "Win without taking damage.",
      unlocked: playerWon && stats.opponentDamage === 0,
    },
    {
      title: "Comeback win",
      description: "Win after dropping to 20 HP or lower.",
      unlocked: playerWon && playerLowestHp <= 20,
    },
  ];
}

function preloadImage(src: string) {
  return new Promise<void>((resolve) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = () => resolve();
    img.src = src;
  });
}

function hitSplatClass(event: DuelEvent) {
  if (!event.hit) return "border-zinc-300/70 bg-zinc-900/90 text-zinc-100 shadow-zinc-950/60";
  if (event.damage >= 30) return "border-sky-200/80 bg-sky-500/90 text-white shadow-sky-500/35";
  return "border-red-200/80 bg-red-600/90 text-white shadow-red-500/35";
}

const PRELOAD_FRAMES: number[] = Object.values(FRAME);

function SpriteFighter({
  side,
  frame,
  isAttacking,
  isHurt,
  isWinner,
  isDown,
  eventKey,
}: {
  side: FighterSide;
  frame: number;
  isAttacking: boolean;
  isHurt: boolean;
  isWinner: boolean;
  isDown: boolean;
  eventKey: string;
}) {
  const spriteMeta = getSpriteMeta(side, frame);

  return (
    <div
      className={cn(
        // Anchor sprite to the arena floor; frames are bottom-aligned so the visible feet/body touch the floor.
        "absolute -bottom-1 flex h-56 items-end sm:-bottom-2 sm:h-72 md:-bottom-2 md:h-80",
        side === "player"
          ? "left-[18%] sm:left-[22%] md:left-[24%]"
          : "right-[18%] sm:right-[22%] md:right-[24%]"
      )}
    >
      {/* Hidden preloader so frame swaps are instant */}
      <div className="hidden">
        {PRELOAD_FRAMES.map((f) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={`${side}-pre-${f}`} src={frameUrl(side, f)} alt="" />
        ))}
      </div>
      <div
        key={eventKey}
        className={cn(
          "relative flex h-full items-end",
          !isAttacking && !isHurt && !isWinner && !isDown && "duel-fighter-idle",
          isAttacking && (side === "player" ? "duel-lunge-right" : "duel-lunge-left"),
          isHurt && (side === "player" ? "duel-knockback-left" : "duel-knockback-right"),
          isWinner && "duel-fighter-victory",
          isDown && "scale-95 opacity-80"
        )}
      >
        {/* Soft ground shadow under the feet to anchor the fighter visually. */}
        <div
          className="pointer-events-none absolute inset-x-2 h-3 rounded-full bg-black/55 blur-md"
          style={{ bottom: spriteMeta.footOffset }}
        />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={frameUrl(side, frame)}
          alt={`${side} fighter sprite`}
          className="relative block h-full w-auto select-none drop-shadow-[0_14px_14px_rgba(0,0,0,0.55)]"
          draggable={false}
        />
      </div>
    </div>
  );
}

function HpBar({ name, hp, align = "left" }: { name: string; hp: number; align?: "left" | "right" }) {
  return (
    <div className={cn("rounded-2xl border border-white/10 bg-black/45 p-2.5 backdrop-blur sm:p-3", align === "right" && "text-right")}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="font-heading text-sm font-semibold text-white">{name}</span>
        <span className="font-mono text-xs text-zinc-300">{hp}/99 HP</span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-zinc-900 ring-1 ring-white/10 sm:h-3">
        <div className={cn("h-full rounded-full transition-all duration-500", hpColor(hp))} style={{ width: `${Math.max(0, hp)}%` }} />
      </div>
    </div>
  );
}

export default function DuelArenaClient() {
  const [phase, setPhase] = useState<DuelPhase>("idle");
  const [result, setResult] = useState<DuelResult | null>(null);
  const [currentEvent, setCurrentEvent] = useState<DuelEvent | null>(null);
  const [playerHp, setPlayerHp] = useState(99);
  const [opponentHp, setOpponentHp] = useState(99);
  const [shownEvents, setShownEvents] = useState<DuelEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [playerFrame, setPlayerFrame] = useState<number>(FRAME.ready);
  const [opponentFrame, setOpponentFrame] = useState<number>(FRAME.ready);
  const [activeAttack, setActiveAttack] = useState<FighterSide | null>(null);
  const [activeHurt, setActiveHurt] = useState<FighterSide | null>(null);
  const [activeSplat, setActiveSplat] = useState<DuelEvent | null>(null);
  const [activeTrail, setActiveTrail] = useState<DuelEvent | null>(null);
  const [shakeEventId, setShakeEventId] = useState<number | null>(null);
  const [countdownText, setCountdownText] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [volume, setVolume] = useState(0.75);
  const [assetsReady, setAssetsReady] = useState(false);
  const [duelHistory, setDuelHistory] = useState<DuelHistoryItem[]>([]);
  const timersRef = useRef<number[]>([]);
  const playedImpactIdsRef = useRef<Set<number>>(new Set());
  const playedWinRef = useRef(false);

  const duelStats = useMemo(() => getDuelStats(result), [result]);
  const achievements = useMemo(() => getAchievements(result, duelStats), [result, duelStats]);
  const unlockedAchievements = achievements.filter((achievement) => achievement.unlocked);

  const clearTimers = useCallback(() => {
    timersRef.current.forEach((timer) => window.clearTimeout(timer));
    timersRef.current = [];
  }, []);

  const resetArena = useCallback(() => {
    clearTimers();
    setPhase("idle");
    setResult(null);
    setCurrentEvent(null);
    setPlayerHp(99);
    setOpponentHp(99);
    setShownEvents([]);
    setPlayerFrame(FRAME.ready);
    setOpponentFrame(FRAME.ready);
    setActiveAttack(null);
    setActiveHurt(null);
    setActiveSplat(null);
    setActiveTrail(null);
    setShakeEventId(null);
    setCountdownText(null);
    playedImpactIdsRef.current.clear();
    playedWinRef.current = false;
  }, [clearTimers]);

  const runTimeline = useCallback((duel: DuelResult) => {
    clearTimers();
    setPhase("countdown");
    setShownEvents([]);
    setPlayerHp(99);
    setOpponentHp(99);
    setPlayerFrame(FRAME.ready);
    setOpponentFrame(FRAME.ready);
    setActiveAttack(null);
    setActiveHurt(null);
    setActiveSplat(null);
    setActiveTrail(null);
    setShakeEventId(null);
    setCountdownText(COUNTDOWN_STEPS[0]);
    playedImpactIdsRef.current.clear();
    playedWinRef.current = false;

    const schedule = (fn: () => void, delay: number) => {
      timersRef.current.push(window.setTimeout(fn, delay));
    };

    const setFrameForSide = (side: FighterSide, frame: number) => {
      if (side === "player") setPlayerFrame(frame);
      else setOpponentFrame(frame);
    };

    COUNTDOWN_STEPS.forEach((step, index) => {
      schedule(() => {
        setCountdownText(step);
        playDuelSound(index === COUNTDOWN_STEPS.length - 1 ? "start" : "countdown", soundEnabled, volume);
      }, index * COUNTDOWN_STEP_MS);
    });

    const timelineStart = COUNTDOWN_STEPS.length * COUNTDOWN_STEP_MS + 160;
    schedule(() => {
      setPhase("running");
      setCountdownText(null);
    }, timelineStart);

    duel.events.forEach((event, index) => {
      const start = timelineStart + index * PER_EVENT_MS;
      const heavyHit = event.hit && event.damage > 25;
      const previousEvent = index > 0 ? duel.events[index - 1] : null;
      const basePlayerFrame = previousEvent && previousEvent.playerHp <= 24 ? FRAME.dizzy : FRAME.idle;
      const baseOpponentFrame = previousEvent && previousEvent.opponentHp <= 24 ? FRAME.dizzy : FRAME.idle;

      schedule(() => {
        setCurrentEvent(event);
        setActiveAttack(event.attacker);
        setActiveHurt(null);
        setActiveSplat(null);
        setActiveTrail(null);
        setShakeEventId(null);
        setPlayerFrame(basePlayerFrame);
        setOpponentFrame(baseOpponentFrame);
        setFrameForSide(event.attacker, FRAME.attackWindup);
      }, start + TIMELINE_STEPS[0].offset);

      schedule(() => {
        setFrameForSide(event.attacker, FRAME.attackSlash);
        setActiveTrail(event);
      }, start + TIMELINE_STEPS[1].offset);

      schedule(() => setFrameForSide(event.attacker, FRAME.attackThrust), start + TIMELINE_STEPS[2].offset);

      schedule(() => {
        setActiveSplat(event);
        setActiveTrail(null);
        setActiveHurt(event.hit ? event.defender : null);
        setFrameForSide(
          event.defender,
          event.hit ? (heavyHit ? FRAME.heavyHurt : FRAME.hurt) : FRAME.attackRecover
        );
        setPlayerHp(event.playerHp);
        setOpponentHp(event.opponentHp);
        setShownEvents((prev) => [event, ...prev].slice(0, 8));
        setShakeEventId(heavyHit ? event.id : null);
        if (!playedImpactIdsRef.current.has(event.id)) {
          playedImpactIdsRef.current.add(event.id);
          playDuelSound(event.hit ? "hit" : "miss", soundEnabled, volume);
        }
      }, start + TIMELINE_STEPS[2].offset + 30);

      schedule(() => {
        setFrameForSide(event.attacker, FRAME.attackRecover);
        setFrameForSide(event.defender, event.hit ? FRAME.stance : FRAME.ready);
      }, start + TIMELINE_STEPS[3].offset);

      schedule(() => {
        setActiveAttack(null);
        setActiveHurt(null);
        setActiveSplat(null);
        setActiveTrail(null);
        setShakeEventId(null);
        setPlayerFrame(event.playerHp <= 24 ? FRAME.dizzy : FRAME.idle);
        setOpponentFrame(event.opponentHp <= 24 ? FRAME.dizzy : FRAME.idle);
      }, start + TIMELINE_STEPS[4].offset);
    });

    schedule(() => {
      const lastEvent = duel.events.at(-1);
      if (lastEvent) {
        setPlayerHp(lastEvent.playerHp);
        setOpponentHp(lastEvent.opponentHp);
      }
      setActiveAttack(null);
      setActiveHurt(null);
      setActiveSplat(null);
      setActiveTrail(null);
      setShakeEventId(null);
      setPhase("finished");
      setPlayerFrame(duel.winner === "player" ? FRAME.cheer : FRAME.down);
      setOpponentFrame(duel.winner === "opponent" ? FRAME.cheer : FRAME.down);
      const stats = getDuelStats(duel);
      if (stats) {
        setDuelHistory((previous) => {
          const next = [
            {
              id: `${Date.now()}-${duel.events.length}`,
              winner: duel.winner,
              rounds: stats.rounds,
              biggestHit: stats.biggestHit,
              totalDamage: stats.totalDamage,
            },
            ...previous,
          ].slice(0, 5);
          window.localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(next));
          return next;
        });
      }
      if (!playedWinRef.current) {
        playedWinRef.current = true;
        playDuelSound("win", soundEnabled, volume);
      }
    }, timelineStart + duel.events.length * PER_EVENT_MS + 120);
  }, [clearTimers, soundEnabled, volume]);

  useEffect(() => () => clearTimers(), [clearTimers]);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(HISTORY_STORAGE_KEY);
      if (stored) setDuelHistory(JSON.parse(stored) as DuelHistoryItem[]);
    } catch {
      setDuelHistory([]);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    const sources = [
      ARENA_BG_URL,
      ...(["player", "opponent"] as const).flatMap((side) => PRELOAD_FRAMES.map((frame) => frameUrl(side, frame))),
    ];

    Promise.all(sources.map(preloadImage)).then(() => {
      if (mounted) setAssetsReady(true);
    });

    return () => {
      mounted = false;
    };
  }, []);

  const startDuel = async () => {
    if (loading || phase === "countdown" || phase === "running") return;
    setLoading(true);
    resetArena();
    try {
      const res = await fetch("/api/duel-arena/simulate", { method: "POST" });
      if (!res.ok) throw new Error("Failed to simulate duel.");
      const duel = await res.json() as DuelResult;
      setResult(duel);
      runTimeline(duel);
    } finally {
      setLoading(false);
    }
  };

  const winnerText = result?.winner === "player" ? "You won the duel" : "Arena rival wins";
  const finalEvent = result?.events.at(-1);
  const winnerHp = result?.winner === "player" ? finalEvent?.playerHp : finalEvent?.opponentHp;

  return (
    <div className="min-h-[calc(100vh-5rem)] overflow-hidden bg-[#080503]">
      <style jsx global>{`
        @keyframes duelTorch {
          0%, 100% { opacity: 0.55; transform: scaleY(1); }
          50% { opacity: 0.95; transform: scaleY(1.15); }
        }
        @keyframes duelGlow {
          0%, 100% { opacity: 0.35; transform: translateY(0); }
          50% { opacity: 0.7; transform: translateY(-6px); }
        }
        @keyframes duelFog {
          0%, 100% { opacity: 0.18; transform: translateX(-3%) translateY(0); }
          50% { opacity: 0.32; transform: translateX(3%) translateY(-5px); }
        }
        @keyframes duelSparks {
          0% { opacity: 0; transform: translateY(20px) scale(0.9); }
          20% { opacity: 0.8; }
          100% { opacity: 0; transform: translateY(-90px) scale(1.15); }
        }
        @keyframes duelCountdown {
          0% { opacity: 0; transform: translate(-50%, -50%) scale(0.35); filter: blur(8px); }
          35% { opacity: 1; transform: translate(-50%, -50%) scale(1.16); filter: blur(0); }
          100% { opacity: 0; transform: translate(-50%, -58%) scale(0.98); }
        }
        @keyframes duelLungeRight {
          0% { transform: translateX(0) scale(1); }
          18% { transform: translateX(-8px) scale(0.98); }
          45% { transform: translateX(34px) scale(1.04); }
          100% { transform: translateX(0) scale(1); }
        }
        @keyframes duelLungeLeft {
          0% { transform: translateX(0) scale(1); }
          18% { transform: translateX(8px) scale(0.98); }
          45% { transform: translateX(-34px) scale(1.04); }
          100% { transform: translateX(0) scale(1); }
        }
        @keyframes duelKnockbackRight {
          0%, 100% { transform: translateX(0) rotate(0); filter: none; }
          18% { transform: translateX(18px) rotate(3deg); filter: brightness(1.55) drop-shadow(0 0 16px rgba(239, 68, 68, 0.85)); }
          55% { transform: translateX(6px) rotate(1deg); }
        }
        @keyframes duelKnockbackLeft {
          0%, 100% { transform: translateX(0) rotate(0); filter: none; }
          18% { transform: translateX(-18px) rotate(-3deg); filter: brightness(1.55) drop-shadow(0 0 16px rgba(239, 68, 68, 0.85)); }
          55% { transform: translateX(-6px) rotate(-1deg); }
        }
        @keyframes duelIdleBreath {
          0%, 100% { transform: translateY(0) scale(1); }
          50% { transform: translateY(-2px) scale(1.015); }
        }
        @keyframes hitSplat {
          0% { transform: translate(-50%, 28%) scale(0.2) rotate(-10deg); opacity: 0; }
          18% { transform: translate(-50%, -10%) scale(1.35); opacity: 1; }
          45% { transform: translate(-50%, -10%) scale(1); opacity: 1; }
          100% { transform: translate(-50%, -68%) scale(0.9); opacity: 0; }
        }
        @keyframes whipTrail {
          0% { opacity: 0; transform: translateY(6px) scaleX(0.25); filter: blur(3px); }
          25% { opacity: 0.95; transform: translateY(0) scaleX(1); filter: blur(0); }
          100% { opacity: 0; transform: translateY(-4px) scaleX(1.08); filter: blur(5px); }
        }
        @keyframes arenaShake {
          0%, 100% { transform: translate(0); }
          18% { transform: translate(-7px, 3px); }
          38% { transform: translate(7px, -5px); }
          58% { transform: translate(-5px, 4px); }
          78% { transform: translate(5px, 2px); }
        }
        @keyframes arenaImpactZoom {
          0%, 100% { transform: scale(1); }
          35% { transform: scale(1.035); }
        }
        @keyframes duelVictory {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
        .duel-lunge-right { animation: duelLungeRight 0.88s ease-out; }
        .duel-lunge-left { animation: duelLungeLeft 0.88s ease-out; }
        .duel-knockback-right { animation: duelKnockbackRight 0.62s ease-out; }
        .duel-knockback-left { animation: duelKnockbackLeft 0.62s ease-out; }
        .duel-fighter-idle { animation: duelIdleBreath 2.6s ease-in-out infinite; }
        .duel-fighter-victory { animation: duelVictory 1.2s ease-in-out infinite; }
        .duel-hit-splat { animation: hitSplat 0.95s ease-out forwards; }
        .duel-whip-trail { animation: whipTrail 0.62s ease-out forwards; }
        .duel-countdown { animation: duelCountdown 0.78s ease-out forwards; }
        .duel-shake { animation: arenaShake 0.42s ease-out; }
        .duel-impact-zoom { animation: arenaImpactZoom 0.52s ease-out; }
      `}</style>

      <section className="relative mx-auto flex max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 lg:py-12">
        <div className="absolute inset-0 -z-0 bg-[radial-gradient(circle_at_top,_rgba(232,114,12,0.24),_transparent_34%),radial-gradient(circle_at_20%_70%,_rgba(125,38,12,0.28),_transparent_28%),linear-gradient(180deg,_rgba(8,5,3,0.2),_#080503)]" />

        <div className="relative z-10 grid gap-4 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
          <div>
            <p className="mb-2 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.22em] text-primary">
              <Swords className="h-3.5 w-3.5" />
              Duel Arena Simulator
            </p>
            <h1 className="font-heading text-4xl font-bold text-white sm:text-6xl">
              Whip Duel <span className="text-primary">Showdown</span>
            </h1>
          </div>

          <div className="rounded-2xl border border-primary/20 bg-black/30 p-4 backdrop-blur">
            <div className="flex items-center gap-2 text-sm font-semibold text-white">
              <Zap className="h-4 w-4 text-primary" />
              Arcade mode
            </div>
            <p className="mt-2 text-xs leading-5 text-zinc-400">
              No staking or wagering. This is a visual mini-game for engagement, rewards, and leaderboard features later.
            </p>
          </div>
        </div>

        <div className="relative z-10 overflow-hidden rounded-[2rem] border border-primary/20 bg-[#120905] shadow-2xl shadow-black/50">
          <div
            className="absolute inset-0 bg-cover bg-center opacity-95"
            style={{ backgroundImage: `url(${ARENA_BG_URL})` }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/25 via-black/10 to-black/55" />
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,_transparent_28%,_rgba(0,0,0,0.5)_88%)]" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-[radial-gradient(ellipse_at_center,_rgba(255,128,38,0.16),_transparent_65%)] opacity-70" />
          <div className="pointer-events-none absolute inset-x-8 bottom-10 h-24 rounded-full bg-zinc-200/10 blur-3xl" style={{ animation: "duelFog 7s ease-in-out infinite" }} />
          <div className="pointer-events-none absolute bottom-16 left-[10%] h-20 w-1 rounded-full bg-primary/40 blur-sm" style={{ animation: "duelSparks 3.2s ease-in-out infinite" }} />
          <div className="pointer-events-none absolute bottom-20 right-[12%] h-16 w-1 rounded-full bg-orange-300/40 blur-sm" style={{ animation: "duelSparks 3.6s ease-in-out 0.8s infinite" }} />
          <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-[#080503]/85 to-transparent" />
          <div className="absolute bottom-10 left-1/2 h-16 w-[70%] -translate-x-1/2 rounded-full bg-primary/20 blur-3xl" style={{ animation: "duelGlow 2.4s infinite" }} />

          <div className="relative grid gap-4 p-4 sm:p-6">
            <div className="grid gap-3 md:grid-cols-2">
              <HpBar name="You" hp={playerHp} />
              <HpBar name="Arena rival" hp={opponentHp} align="right" />
            </div>

            <div
              key={shakeEventId ?? "steady"}
              className={cn(
                "relative min-h-[360px] overflow-visible rounded-[1.5rem] border border-white/10 bg-black/15 pb-0 pt-20 md:min-h-[430px]",
                shakeEventId !== null && "duel-shake duel-impact-zoom"
              )}
            >
              <div className="absolute left-1/2 top-8 flex -translate-x-1/2 items-center gap-2 rounded-full border border-white/10 bg-black/35 px-4 py-2 text-xs font-semibold text-zinc-300 backdrop-blur">
                <Crown className="h-3.5 w-3.5 text-yellow-300" />
                {phase === "finished" && result ? winnerText : phase === "countdown" ? "Get ready" : phase === "running" ? `Round ${currentEvent?.round ?? 1}` : "Ready to duel"}
              </div>

              {countdownText && (
                <div
                  key={countdownText}
                  className="duel-countdown pointer-events-none absolute left-1/2 top-1/2 z-30 font-heading text-6xl font-black uppercase tracking-[0.12em] text-white drop-shadow-[0_0_22px_rgba(232,114,12,0.85)] sm:text-7xl"
                >
                  {countdownText}
                </div>
              )}

              {activeTrail && phase === "running" && (
                <div
                  key={`trail-${activeTrail.id}-${activeTrail.attacker}`}
                  className={cn(
                    "duel-whip-trail pointer-events-none absolute top-[55%] z-10 h-3 origin-left rounded-full bg-gradient-to-r from-transparent via-cyan-300 to-cyan-100 shadow-[0_0_18px_rgba(103,232,249,0.75)]",
                    activeTrail.attacker === "player"
                      ? "left-[35%] w-[28%]"
                      : "left-[37%] w-[28%] origin-right rotate-180"
                  )}
                />
              )}

              {activeSplat && phase === "running" && (
                <div
                  key={activeSplat.id}
                  className={cn(
                    "duel-hit-splat pointer-events-none absolute top-[34%] z-20 flex h-16 min-w-16 -translate-x-1/2 items-center justify-center rounded-full border-2 px-4 font-heading text-3xl font-black shadow-2xl ring-4 ring-black/45",
                    SPRITE_META[activeSplat.defender].impactPointClass,
                    hitSplatClass(activeSplat)
                  )}
                >
                  {activeSplat.hit ? activeSplat.damage : "MISS"}
                </div>
              )}

              <SpriteFighter
                side="player"
                frame={playerFrame}
                isAttacking={activeAttack === "player"}
                isHurt={activeHurt === "player"}
                isWinner={phase === "finished" && result?.winner === "player"}
                isDown={playerHp <= 0}
                eventKey={`${currentEvent?.id ?? "idle"}-${activeAttack === "player" ? "attack" : activeHurt === "player" ? "hurt" : "idle"}`}
              />

              <SpriteFighter
                side="opponent"
                frame={opponentFrame}
                isAttacking={activeAttack === "opponent"}
                isHurt={activeHurt === "opponent"}
                isWinner={phase === "finished" && result?.winner === "opponent"}
                isDown={opponentHp <= 0}
                eventKey={`${currentEvent?.id ?? "idle"}-${activeAttack === "opponent" ? "attack" : activeHurt === "opponent" ? "hurt" : "idle"}`}
              />

              {phase === "finished" && result && duelStats && (
                <div className="absolute inset-x-4 top-20 z-40 mx-auto max-w-xl rounded-3xl border border-primary/35 bg-black/70 p-5 text-center shadow-2xl shadow-primary/15 backdrop-blur-md">
                  <p className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/15 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.22em] text-primary">
                    <Crown className="h-3.5 w-3.5" />
                    Duel complete
                  </p>
                  <h2 className="mt-3 font-heading text-3xl font-black text-white sm:text-4xl">{winnerText}</h2>
                  <div className="mt-4 grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                      <p className="text-zinc-500">Rounds</p>
                      <p className="mt-1 font-heading text-xl text-white">{duelStats.rounds}</p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                      <p className="text-zinc-500">Total damage</p>
                      <p className="mt-1 font-heading text-xl text-white">{duelStats.totalDamage}</p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                      <p className="text-zinc-500">Biggest hit</p>
                      <p className="mt-1 font-heading text-xl text-primary">{duelStats.biggestHit}</p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                      <p className="text-zinc-500">Winner HP</p>
                      <p className="mt-1 font-heading text-xl text-white">{winnerHp ?? 0}</p>
                    </div>
                  </div>
                  {unlockedAchievements.length > 0 && (
                    <div className="mt-4 flex flex-wrap justify-center gap-2">
                      {unlockedAchievements.map((achievement) => (
                        <span key={achievement.title} className="inline-flex items-center gap-1 rounded-full border border-yellow-300/30 bg-yellow-300/10 px-3 py-1 text-xs font-semibold text-yellow-200">
                          <Medal className="h-3.5 w-3.5" />
                          {achievement.title}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="sticky bottom-3 z-30 mx-auto flex w-fit flex-wrap items-center justify-center gap-3 rounded-2xl border border-white/10 bg-black/45 p-2 shadow-2xl shadow-black/40 backdrop-blur md:static md:bg-transparent md:p-0 md:shadow-none md:backdrop-blur-0">
              <button
                type="button"
                onClick={startDuel}
                disabled={loading || phase === "countdown" || phase === "running" || !assetsReady}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-white shadow-lg shadow-primary/20 transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Swords className="h-4 w-4" />}
                {!assetsReady ? "Loading assets" : phase === "countdown" ? "Fight starting" : phase === "running" ? "Duel in progress" : "Start whip duel"}
              </button>
              <button
                type="button"
                onClick={resetArena}
                className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-zinc-200 transition hover:border-primary/40 hover:text-primary"
              >
                <RotateCcw className="h-4 w-4" />
                Reset
              </button>
              <button
                type="button"
                onClick={() => setSoundEnabled((value) => !value)}
                className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-zinc-200 transition hover:border-primary/40 hover:text-primary"
                aria-pressed={soundEnabled}
              >
                {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                Sound
              </button>
              <label className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-zinc-300">
                Vol
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={volume}
                  onChange={(event) => setVolume(Number(event.target.value))}
                  className="w-20 accent-primary"
                  aria-label="Duel volume"
                />
              </label>
            </div>
          </div>
        </div>

        <div className="relative z-10 grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <div className="mb-4 flex items-center gap-2 font-heading text-lg font-semibold text-white">
              <Trophy className="h-5 w-5 text-primary" />
              Duel stats
            </div>
            {result && duelStats ? (
              <div className="space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                    <p className="text-zinc-500">You accuracy</p>
                    <p className="mt-1 font-heading text-xl text-white">{duelStats.playerAccuracy}%</p>
                    <p className="text-zinc-500">{duelStats.playerHits}/{duelStats.playerSwings} hits</p>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                    <p className="text-zinc-500">Rival accuracy</p>
                    <p className="mt-1 font-heading text-xl text-white">{duelStats.opponentAccuracy}%</p>
                    <p className="text-zinc-500">{duelStats.opponentHits}/{duelStats.opponentSwings} hits</p>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                    <p className="text-zinc-500">You damage</p>
                    <p className="mt-1 font-heading text-xl text-primary">{duelStats.playerDamage}</p>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                    <p className="text-zinc-500">Rival damage</p>
                    <p className="mt-1 font-heading text-xl text-red-300">{duelStats.opponentDamage}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                {(["player", "opponent"] as const).map((side) => (
                  <div key={side} className="rounded-xl border border-white/10 bg-black/20 p-3">
                    <p className="mb-2 font-semibold text-white">{result.fighters[side].name}</p>
                    <p className="text-zinc-400">Attack: {result.fighters[side].attack}</p>
                    <p className="text-zinc-400">Strength: {result.fighters[side].strength}</p>
                    <p className="text-zinc-400">Defence: {result.fighters[side].defence}</p>
                    <p className="text-primary">Max hit: {result.fighters[side].maxHit}</p>
                  </div>
                ))}
                </div>
              </div>
            ) : (
              <p className="text-sm leading-6 text-zinc-400">
                Start a duel to roll both fighters&apos; stats and generate the combat timeline.
              </p>
            )}
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <div className="mb-4 flex items-center gap-2 font-heading text-lg font-semibold text-white">
              <ScrollText className="h-5 w-5 text-primary" />
              Battle log
            </div>
            <div className="space-y-2">
              {shownEvents.length > 0 ? shownEvents.map((event) => (
                <div key={event.id} className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm">
                  <span className={event.hit ? "text-zinc-200" : "text-zinc-500"}>{event.message}</span>
                  <span className="shrink-0 rounded-full bg-white/5 px-2 py-0.5 text-[10px] font-semibold text-zinc-500">
                    R{event.round}
                  </span>
                </div>
              )) : (
                <p className="text-sm text-zinc-500">The battle log will appear here during the duel.</p>
              )}
            </div>
          </div>
        </div>

        <div className="relative z-10 grid gap-5 lg:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <div className="mb-4 flex items-center gap-2 font-heading text-lg font-semibold text-white">
              <Medal className="h-5 w-5 text-yellow-300" />
              Achievements
            </div>
            <div className="space-y-2">
              {achievements.map((achievement) => (
                <div
                  key={achievement.title}
                  className={cn(
                    "rounded-xl border px-3 py-2 text-sm",
                    achievement.unlocked
                      ? "border-yellow-300/30 bg-yellow-300/10 text-yellow-100"
                      : "border-white/10 bg-black/20 text-zinc-500"
                  )}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-semibold">{achievement.title}</span>
                    <span className="text-[10px] uppercase tracking-[0.18em]">{achievement.unlocked ? "Unlocked" : "Locked"}</span>
                  </div>
                  <p className="mt-1 text-xs opacity-75">{achievement.description}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <div className="mb-4 flex items-center gap-2 font-heading text-lg font-semibold text-white">
              <Clock3 className="h-5 w-5 text-primary" />
              Duel history
            </div>
            <div className="space-y-2">
              {duelHistory.length > 0 ? duelHistory.map((item, index) => (
                <div key={item.id} className="grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-xs">
                  <span className="font-mono text-zinc-500">#{index + 1}</span>
                  <span className="font-semibold text-white">{item.winner === "player" ? "You won" : "Rival won"}</span>
                  <span className="text-right text-zinc-400">R{item.rounds} · max {item.biggestHit}</span>
                </div>
              )) : (
                <p className="text-sm text-zinc-500">Your last 5 duels will appear here.</p>
              )}
            </div>
          </div>

          <div className="space-y-5">
            <div className="rounded-2xl border border-primary/20 bg-primary/10 p-5">
              <div className="mb-2 flex items-center gap-2 font-heading text-lg font-semibold text-white">
                <Trophy className="h-5 w-5 text-primary" />
                Leaderboard preview
              </div>
              <p className="text-sm leading-6 text-zinc-300">
                Coming next: most wins, biggest hit and longest duel leaderboards. This stays arcade-only with no staking or wagering.
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <div className="mb-2 flex items-center gap-2 font-heading text-lg font-semibold text-white">
                <Sparkles className="h-5 w-5 text-yellow-300" />
                Daily duel reward
              </div>
              <p className="text-sm leading-6 text-zinc-400">
                Preview card for a future daily cosmetic/points reward. No gambling mechanics, no wager, no paid roll.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
