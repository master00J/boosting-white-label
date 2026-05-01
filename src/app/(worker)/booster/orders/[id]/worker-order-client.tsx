"use client";

import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Send, Loader2, Play, Pause, CheckCircle2,
  AlertTriangle, TrendingUp, Swords, MessageCircle, Activity,
  Image as ImageIcon, Scroll, ChevronDown, ChevronUp,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import UserAvatar from "@/components/shared/user-avatar";
import RuneLiteToken from "./runelite-token";
import { BoosterCredentialsViaLinkNotice } from "@/components/credentials/share-via-onetime-link";
import VpnLocationPicker from "./vpn-location-picker";
import type { ConfigMeta } from "./page";

// ─── Types ───────────────────────────────────────────────────────────────────

function formatName(s: string) {
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

type ItemProgressEntry = {
  index: number;
  serviceName: string;
  type: "level" | "kills" | "quest" | "percent";
  skillId?: string;
  startLevel?: number;
  goal?: number;
  current?: number;
  bossId?: string;
  questIds?: string[];
  completedQuestIds?: string[];
  completed: boolean;
};

type OrderItem = {
  serviceId: string;
  serviceName: string;
  gameName: string;
  gameId: string;
  quantity: number;
  finalPrice: number;
  configuration: Record<string, unknown>;
};

type OrderDetail = {
  id: string;
  order_number: string;
  status: string;
  total: number;
  worker_payout: number | null;
  progress: number;
  progress_current: number | null;
  progress_notes: string | null;
  item_progress: ItemProgressEntry[] | null;
  configuration: Record<string, unknown>;
  items: OrderItem[] | null;
  item_count: number | null;
  customer_notes: string | null;
  created_at: string;
  claimed_at: string | null;
  estimated_completion: string | null;
  worker_id: string | null;
  track_token: string;
  vpn_country_code: string | null;
  service: { name: string; description: string | null; estimated_hours: number | null } | null;
  game: { name: string; logo_url: string | null } | null;
};

type Message = {
  id: string;
  content: string;
  is_system: boolean;
  created_at: string;
  sender_id: string | null;
  sender: { display_name: string | null; avatar_url: string | null; role: string } | null;
};

type RouteSegment = { from_level: number; to_level: number; method_id?: string };

// ─── Init helper (mirrors the server-side initItemProgress) ──────────────────

function getQuestIdsFromConfig(config: Record<string, unknown>): string[] {
  const ids: string[] = [];
  if (typeof config.item === "string" && config.item) ids.push(config.item);
  if (Array.isArray(config.quests)) ids.push(...(config.quests as string[]));
  return ids;
}

function initItemProgressClient(order: OrderDetail): ItemProgressEntry[] {
  if (order.item_progress && order.item_progress.length > 0) return order.item_progress;

  const entries: { index: number; serviceName: string; config: Record<string, unknown> }[] = [];
  if (order.items && order.items.length > 0) {
    order.items.forEach((item, i) => entries.push({ index: i, serviceName: item.serviceName, config: item.configuration ?? {} }));
  } else {
    entries.push({ index: 0, serviceName: order.service?.name ?? "Service", config: order.configuration });
  }

  return entries.map(({ index, serviceName, config }) => {
    if ("boss" in config && "kills" in config) {
      return { index, serviceName, type: "kills" as const, bossId: String(config.boss), goal: Number(config.kills), current: 0, completed: false };
    }
    if ("route_segments" in config || "end_level" in config) {
      const segs = config.route_segments as { from_level: number; to_level: number }[] | undefined;
      const goal = segs?.at(-1)?.to_level ?? Number(config.end_level) ?? 99;
      const startLevel = segs?.[0]?.from_level ?? (config.start_level ? Number(config.start_level) : 1);
      const skillId = typeof config.skill === "string" ? config.skill : "skill";
      return { index, serviceName, type: "level" as const, skillId, startLevel, goal, current: startLevel, completed: false };
    }
    const questIds = getQuestIdsFromConfig(config);
    if (questIds.length > 0) {
      return { index, serviceName, type: "quest" as const, questIds, completedQuestIds: [], completed: false };
    }
    return { index, serviceName, type: "percent" as const, current: 0, completed: false };
  });
}

// ─── Sidebar config renderer (unchanged) ─────────────────────────────────────

function renderStatsAndMods(cfg: Record<string, unknown>, configMeta?: ConfigMeta) {
  const elements: React.ReactNode[] = [];
  const statEntries = Object.entries(cfg).filter(([k]) => k.startsWith("stat_"));
  if (statEntries.length > 0) {
    elements.push(
      <div key="stats" className="space-y-1">
        <span className="text-[var(--text-muted)]">Account stats</span>
        <div className="rounded-lg border border-[var(--border-default)] overflow-hidden">
          {statEntries.map(([k, v], i) => {
            const statId = k.replace(/^stat_/, "");
            const label = configMeta?.stats[statId] ?? formatName(statId);
            return (
              <div key={k} className={`flex justify-between px-3 py-1.5 ${i > 0 ? "border-t border-[var(--border-default)]" : ""}`}>
                <span className="text-[var(--text-muted)]">{label}</span>
                <span className="font-semibold text-primary">{String(v)}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }
  const modEntries = Object.entries(cfg).filter(([k]) => {
    if (k.startsWith("stat_") || k.startsWith("route_") || k.startsWith("quest_mod_") || ["boss", "kills", "item", "quests", "quantity", "skill", "start_level", "end_level", "_mod_labels", "package_id"].includes(k)) return false;
    if (k.startsWith("boss_mod_")) return true;
    if (configMeta?.modifiers[k]) return true;
    return false;
  });
  if (modEntries.length > 0) {
    elements.push(
      <div key="mods" className="space-y-1">
        <span className="text-[var(--text-muted)]">Upcharges</span>
        <div className="rounded-lg border border-[var(--border-default)] overflow-hidden">
          {modEntries.map(([k, v], i) => {
            const meta = configMeta?.modifiers[k];
            const label = meta?.label ?? formatName(k.replace(/^boss_mod_/, ""));
            let display = "";
            if (typeof v === "boolean") display = v ? "Yes" : "No";
            else if (Array.isArray(v)) display = (v as string[]).map((val) => meta?.options[val] ?? formatName(val)).join(", ");
            else display = meta?.options[String(v)] ?? formatName(String(v));
            return (
              <div key={k} className={`flex justify-between px-3 py-1.5 ${i > 0 ? "border-t border-[var(--border-default)]" : ""}`}>
                <span className="text-[var(--text-muted)]">{label}</span>
                <span className="font-semibold">{display}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }
  // Quest upcharges (per_item_stat_based) — rendered from stored _mod_labels
  const questModLabels = cfg._mod_labels as Record<string, string> | undefined;
  if (questModLabels && Object.keys(questModLabels).length > 0) {
    const labels = Object.values(questModLabels);
    elements.push(
      <div key="quest-mods" className="space-y-1">
        <span className="text-[var(--text-muted)]">Upcharges</span>
        <div className="rounded-lg border border-[var(--border-default)] overflow-hidden">
          {labels.map((label, i) => (
            <div key={i} className={`px-3 py-1.5 font-semibold ${i > 0 ? "border-t border-[var(--border-default)]" : ""}`}>
              {label}
            </div>
          ))}
        </div>
      </div>
    );
  }
  return elements.length > 0 ? <>{elements}</> : null;
}

function renderSingleConfig(cfg: Record<string, unknown>, methodNames: Record<string, string>, configMeta?: ConfigMeta) {
  const hasBoss = "boss" in cfg;
  const questIds = !hasBoss ? getQuestIdsFromConfig(cfg) : [];
  const elements: React.ReactNode[] = [];
  if (questIds.length > 0) {
    elements.push(
      <div key="quests" className="space-y-1">
        <span className="text-[var(--text-muted)] text-xs">Quest{questIds.length > 1 ? "s" : ""}</span>
        {questIds.map((qid, i) => (
          <div key={i} className="px-2 py-1.5 rounded bg-[var(--bg-elevated)] text-xs font-medium">
            {methodNames[qid] ?? formatName(qid)}
          </div>
        ))}
      </div>
    );
  }
  if (hasBoss) {
    const rawBoss = cfg.boss as string | undefined;
    const bossName = rawBoss ? (methodNames[rawBoss] ?? formatName(rawBoss)) : "—";
    elements.push(
      <div key="boss" className="flex justify-between text-sm"><span className="text-[var(--text-muted)]">Boss</span><span className="font-medium">{bossName}</span></div>
    );
    if (cfg.kills != null) {
      elements.push(
        <div key="kills" className="flex justify-between text-sm"><span className="text-[var(--text-muted)]">Kills</span><span className="font-medium">{String(cfg.kills)}</span></div>
      );
    }
  }
  const rawSegs = cfg.route_segments;
  if (!hasBoss && Array.isArray(rawSegs) && rawSegs.length > 0) {
    const segments = rawSegs as Record<string, unknown>[];
    elements.push(
      <div key="route" className="space-y-1">
        <span className="text-[var(--text-muted)] text-xs">Route</span>
        {segments.map((seg, i) => (
          <div key={i} className="flex justify-between px-2 py-1 rounded bg-[var(--bg-elevated)] text-xs">
            <span className="font-semibold">{String(seg.from_level)} → {String(seg.to_level)}</span>
            <span className="text-[var(--text-muted)]">{methodNames[String(seg.method_id)] ?? String(seg.method_id ?? "").replace(/_/g, " ")}</span>
          </div>
        ))}
      </div>
    );
  }
  const statEntries = Object.entries(cfg).filter(([k]) => k.startsWith("stat_"));
  if (statEntries.length > 0) {
    elements.push(
      <div key="stats" className="space-y-1">
        <span className="text-[var(--text-muted)] text-xs">Account stats</span>
        <div className="rounded-lg border border-[var(--border-default)] overflow-hidden">
          {statEntries.map(([k, v], i) => {
            const statId = k.replace(/^stat_/, "");
            const label = configMeta?.stats[statId] ?? formatName(statId);
            return (
              <div key={k} className={`flex justify-between px-3 py-1.5 text-xs ${i > 0 ? "border-t border-[var(--border-default)]" : ""}`}>
                <span className="text-[var(--text-muted)]">{label}</span>
                <span className="font-semibold text-primary">{String(v)}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }
  const modEntries = Object.entries(cfg).filter(([k]) => {
    if (k.startsWith("stat_") || k.startsWith("route_") || k.startsWith("quest_mod_") || ["boss", "kills", "item", "quests", "quantity", "skill", "start_level", "end_level", "_mod_labels", "package_id"].includes(k)) return false;
    if (k.startsWith("boss_mod_")) return true;
    if (configMeta?.modifiers[k]) return true;
    return false;
  });
  if (modEntries.length > 0) {
    elements.push(
      <div key="mods" className="space-y-1">
        <span className="text-[var(--text-muted)] text-xs">Upcharges</span>
        <div className="rounded-lg border border-[var(--border-default)] overflow-hidden">
          {modEntries.map(([k, v], i) => {
            const meta = configMeta?.modifiers[k];
            const label = meta?.label ?? formatName(k.replace(/^boss_mod_/, ""));
            let display = "";
            if (typeof v === "boolean") display = v ? "Yes" : "No";
            else if (Array.isArray(v)) display = (v as string[]).map((val) => meta?.options[val] ?? formatName(val)).join(", ");
            else display = meta?.options[String(v)] ?? formatName(String(v));
            return (
              <div key={k} className={`flex justify-between px-3 py-1.5 text-xs ${i > 0 ? "border-t border-[var(--border-default)]" : ""}`}>
                <span className="text-[var(--text-muted)]">{label}</span>
                <span className="font-semibold">{display}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }
  // Quest upcharges (per_item_stat_based) — rendered from stored _mod_labels
  const questModLabels = cfg._mod_labels as Record<string, string> | undefined;
  if (questModLabels && Object.keys(questModLabels).length > 0) {
    const labels = Object.values(questModLabels);
    elements.push(
      <div key="quest-mods" className="space-y-1">
        <span className="text-[var(--text-muted)] text-xs">Upcharges</span>
        <div className="rounded-lg border border-[var(--border-default)] overflow-hidden">
          {labels.map((label, i) => (
            <div key={i} className={`px-3 py-1.5 text-xs font-semibold ${i > 0 ? "border-t border-[var(--border-default)]" : ""}`}>
              {label}
            </div>
          ))}
        </div>
      </div>
    );
  }
  return elements.length > 0 ? <>{elements}</> : null;
}

// ─── Per-item progress card ───────────────────────────────────────────────────

function ItemProgressCard({
  entry,
  orderItem,
  methodNames,
  orderId,
  onUpdate,
}: {
  entry: ItemProgressEntry;
  orderItem?: OrderItem;
  methodNames: Record<string, string>;
  orderId: string;
  onUpdate: (updated: ItemProgressEntry) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [inputVal, setInputVal] = useState<number>(entry.current ?? entry.startLevel ?? 0);
  const [saving, setSaving] = useState(false);
  const [localCompleted, setLocalCompleted] = useState<Record<string, boolean>>(() => {
    const map: Record<string, boolean> = {};
    for (const qid of entry.questIds ?? []) map[qid] = (entry.completedQuestIds ?? []).includes(qid);
    return map;
  });

  // Sync if entry changes from realtime
  useEffect(() => {
    setInputVal(entry.current ?? entry.startLevel ?? 0);
    const map: Record<string, boolean> = {};
    for (const qid of entry.questIds ?? []) map[qid] = (entry.completedQuestIds ?? []).includes(qid);
    setLocalCompleted(map);
  }, [entry]);

  const save = useCallback(async (overrideCompleted?: Record<string, boolean>) => {
    setSaving(true);
    try {
      const body: Record<string, unknown> = { index: entry.index };
      if (entry.type === "quest") {
        const doneIds = Object.entries(overrideCompleted ?? localCompleted)
          .filter(([, v]) => v)
          .map(([k]) => k);
        body.completedQuestIds = doneIds;
      } else {
        body.current = inputVal;
      }
      const res = await fetch(`/api/worker/orders/${orderId}/item-progress`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        const data = await res.json() as { item_progress: ItemProgressEntry[] };
        const updated = data.item_progress?.find((e) => e.index === entry.index);
        if (updated) onUpdate(updated);
        setEditing(false);
      }
    } finally {
      setSaving(false);
    }
  }, [entry, inputVal, localCompleted, orderId, onUpdate]);

  const toggleQuest = useCallback(async (qid: string) => {
    const next = { ...localCompleted, [qid]: !localCompleted[qid] };
    setLocalCompleted(next);
    await save(next);
  }, [localCompleted, save]);

  const completedCount = entry.completedQuestIds?.length ?? 0;
  const itemConfig = orderItem?.configuration ?? {};
  // expanded state for quest card — must be at top level (no conditional hooks)
  const [expanded, setExpanded] = useState(true);
  const segments = Array.isArray(itemConfig.route_segments) ? itemConfig.route_segments as RouteSegment[] : null;

  // ── Level card ────────────────────────────────────────────────────────────
  if (entry.type === "level") {
    const start = entry.startLevel ?? 1;
    const goal = entry.goal ?? 99;
    const current = entry.current ?? start;
    const pct = Math.min(100, Math.round(((current - start) / Math.max(1, goal - start)) * 100));
    const remaining = Math.max(0, goal - current);
    const skillLabel = entry.skillId ? formatName(entry.skillId) : "Skill";

    return (
      <div className={`rounded-xl border overflow-hidden ${entry.completed ? "border-green-500/30 bg-green-500/5" : "border-[var(--border-default)] bg-[var(--bg-card)]"}`}>
        <div className="px-4 py-3 flex items-center justify-between border-b border-[var(--border-default)] bg-[var(--bg-elevated)]">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-3.5 w-3.5 text-primary" />
            <span className="font-semibold text-sm">{entry.serviceName}</span>
          </div>
          <div className="flex items-center gap-2">
            {entry.completed && <CheckCircle2 className="h-4 w-4 text-green-400" />}
            <span className="text-xs font-bold text-primary">{pct}%</span>
          </div>
        </div>

        <div className="px-4 py-3 space-y-3">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div><p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider mb-0.5">Start</p><p className="text-lg font-bold text-[var(--text-muted)]">{start}</p></div>
            <div><p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider mb-0.5">Current</p><p className="text-lg font-bold text-primary">{current}</p></div>
            <div><p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider mb-0.5">Goal</p><p className="text-lg font-bold text-green-400">{goal}</p></div>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-[10px] text-[var(--text-muted)]">
              <span>{skillLabel}</span>
              {!entry.completed && <span className="text-orange-400 font-medium">{remaining} levels left</span>}
              {entry.completed && <span className="text-green-400 font-medium">Done!</span>}
            </div>
            <div className="h-2 bg-[var(--bg-elevated)] rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all duration-500 ${entry.completed ? "bg-green-400" : "bg-gradient-to-r from-primary to-primary/60"}`} style={{ width: `${pct}%` }} />
            </div>
          </div>

          {/* Route segments */}
          {segments && segments.length > 1 && (
            <div className="rounded-lg border border-[var(--border-default)] overflow-hidden divide-y divide-[var(--border-default)]">
              {segments.map((seg, i) => {
                const segDone = current >= seg.to_level;
                const segActive = !segDone && current >= seg.from_level;
                const segPct = segDone ? 100 : segActive ? Math.round(((current - seg.from_level) / (seg.to_level - seg.from_level)) * 100) : 0;
                const methodLabel = seg.method_id ? (methodNames[seg.method_id] ?? seg.method_id.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())) : null;
                return (
                  <div key={i} className={`px-3 py-2 flex items-center gap-2.5 ${segDone ? "bg-green-400/5" : segActive ? "bg-primary/5" : ""}`}>
                    <div className="flex-shrink-0">
                      {segDone ? <CheckCircle2 className="h-3 w-3 text-green-400" /> : <div className={`h-3 w-3 rounded-full border-2 ${segActive ? "border-primary" : "border-[var(--border-default)]"}`} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <span className="text-[10px] font-semibold">{seg.from_level} → {seg.to_level}</span>
                        {methodLabel && <span className="text-[9px] text-[var(--text-muted)] truncate">{methodLabel}</span>}
                        <span className={`text-[9px] font-medium flex-shrink-0 ${segDone ? "text-green-400" : segActive ? "text-primary" : "text-[var(--text-muted)]"}`}>
                          {segDone ? "Done" : segActive ? `${segPct}%` : "Soon"}
                        </span>
                      </div>
                      <div className="h-1 bg-[var(--bg-elevated)] rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all duration-500 ${segDone ? "bg-green-400" : "bg-primary"}`} style={{ width: `${segPct}%` }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Manual update */}
          {!entry.completed && (
            <div className="pt-1">
              {editing ? (
                <div className="flex items-center gap-2">
                  <input
                    type="number" min={start} max={goal} value={inputVal}
                    onChange={(e) => setInputVal(Math.min(goal, Math.max(start, Number(e.target.value))))}
                    className="w-20 px-2 py-1.5 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-default)] text-sm font-bold text-center focus:outline-none focus:border-primary/50"
                  />
                  <span className="text-xs text-[var(--text-muted)]">/ {goal} level</span>
                  <button onClick={() => save()} disabled={saving} className="ml-auto flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-medium disabled:opacity-40">
                    {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : null} Save
                  </button>
                  <button onClick={() => setEditing(false)} className="px-2 py-1.5 rounded-lg text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)]">Cancel</button>
                </div>
              ) : (
                <button onClick={() => setEditing(true)} className="text-xs text-primary hover:underline">Update level manually</button>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Kills card ────────────────────────────────────────────────────────────
  if (entry.type === "kills") {
    const goal = entry.goal ?? 0;
    const current = entry.current ?? 0;
    const pct = goal > 0 ? Math.min(100, Math.round((current / goal) * 100)) : 0;
    const remaining = Math.max(0, goal - current);
    const bossLabel = entry.bossId ? (methodNames[entry.bossId] ?? formatName(entry.bossId)) : "Boss";

    return (
      <div className={`rounded-xl border overflow-hidden ${entry.completed ? "border-green-500/30 bg-green-500/5" : "border-[var(--border-default)] bg-[var(--bg-card)]"}`}>
        <div className="px-4 py-3 flex items-center justify-between border-b border-[var(--border-default)] bg-[var(--bg-elevated)]">
          <div className="flex items-center gap-2">
            <Swords className="h-3.5 w-3.5 text-primary" />
            <span className="font-semibold text-sm">{entry.serviceName}</span>
          </div>
          <div className="flex items-center gap-2">
            {entry.completed && <CheckCircle2 className="h-4 w-4 text-green-400" />}
            <span className="text-xs font-bold text-primary">{pct}%</span>
          </div>
        </div>
        <div className="px-4 py-3 space-y-3">
          <p className="text-xs text-[var(--text-muted)]">{bossLabel}</p>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div><p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider mb-0.5">Current</p><p className="text-lg font-bold text-primary">{current}</p></div>
            <div><p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider mb-0.5">Target</p><p className="text-lg font-bold">{goal}</p></div>
            <div><p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider mb-0.5">Left</p><p className={`text-lg font-bold ${remaining === 0 ? "text-green-400" : "text-orange-400"}`}>{remaining}</p></div>
          </div>
          <div className="h-2 bg-[var(--bg-elevated)] rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all duration-500 ${entry.completed ? "bg-green-400" : "bg-gradient-to-r from-primary to-primary/60"}`} style={{ width: `${pct}%` }} />
          </div>
          {!entry.completed && (
            <div className="pt-1">
              {editing ? (
                <div className="flex items-center gap-2">
                  <input
                    type="number" min={0} max={goal} value={inputVal}
                    onChange={(e) => setInputVal(Math.min(goal, Math.max(0, Number(e.target.value))))}
                    className="w-20 px-2 py-1.5 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-default)] text-sm font-bold text-center focus:outline-none focus:border-primary/50"
                  />
                  <span className="text-xs text-[var(--text-muted)]">/ {goal} kills</span>
                  <button onClick={() => save()} disabled={saving} className="ml-auto flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-medium disabled:opacity-40">
                    {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : null} Save
                  </button>
                  <button onClick={() => setEditing(false)} className="px-2 py-1.5 rounded-lg text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)]">Cancel</button>
                </div>
              ) : (
                <button onClick={() => setEditing(true)} className="text-xs text-primary hover:underline">Update kills manually</button>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Quest card ─────────────────────────────────────────────────────────────
  if (entry.type === "quest") {
    const questIds = entry.questIds ?? [];
    const pct = questIds.length > 0 ? Math.min(100, Math.round((completedCount / questIds.length) * 100)) : 0;

    return (
      <div className={`rounded-xl border overflow-hidden ${entry.completed ? "border-green-500/30 bg-green-500/5" : "border-[var(--border-default)] bg-[var(--bg-card)]"}`}>
        <div className="px-4 py-3 flex items-center justify-between border-b border-[var(--border-default)] bg-[var(--bg-elevated)]">
          <div className="flex items-center gap-2">
            <Scroll className="h-3.5 w-3.5 text-primary" />
            <span className="font-semibold text-sm">{entry.serviceName}</span>
          </div>
          <div className="flex items-center gap-2">
            {entry.completed && <CheckCircle2 className="h-4 w-4 text-green-400" />}
            <span className="text-xs text-[var(--text-muted)]">{completedCount}/{questIds.length}</span>
            <span className="text-xs font-bold text-primary">{pct}%</span>
            <button onClick={() => setExpanded((e) => !e)} className="p-1 rounded hover:bg-white/5 text-[var(--text-muted)]">
              {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>
        <div className="px-4 pt-2 pb-1">
          <div className="h-1.5 bg-[var(--bg-elevated)] rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all duration-500 ${entry.completed ? "bg-green-400" : "bg-gradient-to-r from-primary to-primary/60"}`} style={{ width: `${pct}%` }} />
          </div>
        </div>
        {expanded && (
          <div className="px-4 pb-3 pt-2 space-y-1.5">
            {questIds.map((qid) => {
              const done = localCompleted[qid] ?? false;
              const label = methodNames[qid] ?? formatName(qid);
              return (
                <button
                  key={qid}
                  onClick={() => toggleQuest(qid)}
                  disabled={saving}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left text-xs transition-colors ${done ? "bg-green-500/10 border border-green-500/20" : "bg-[var(--bg-elevated)] border border-[var(--border-default)] hover:border-primary/30"}`}
                >
                  <div className={`h-4 w-4 rounded flex-shrink-0 flex items-center justify-center border ${done ? "bg-green-500 border-green-500" : "border-[var(--border-default)]"}`}>
                    {done && <CheckCircle2 className="h-2.5 w-2.5 text-white" />}
                  </div>
                  <span className={done ? "text-green-400 line-through" : ""}>{label}</span>
                  {saving && <Loader2 className="h-3 w-3 animate-spin ml-auto text-[var(--text-muted)]" />}
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ── Percent (fallback) card ────────────────────────────────────────────────
  const current = entry.current ?? 0;
  return (
    <div className={`rounded-xl border overflow-hidden ${entry.completed ? "border-green-500/30 bg-green-500/5" : "border-[var(--border-default)] bg-[var(--bg-card)]"}`}>
      <div className="px-4 py-3 flex items-center justify-between border-b border-[var(--border-default)] bg-[var(--bg-elevated)]">
        <div className="flex items-center gap-2">
          <Activity className="h-3.5 w-3.5 text-primary" />
          <span className="font-semibold text-sm">{entry.serviceName}</span>
        </div>
        <div className="flex items-center gap-2">
          {entry.completed && <CheckCircle2 className="h-4 w-4 text-green-400" />}
          <span className="text-xs font-bold text-primary">{current}%</span>
        </div>
      </div>
      <div className="px-4 py-3 space-y-2">
        <div className="h-2 bg-[var(--bg-elevated)] rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all duration-500 ${entry.completed ? "bg-green-400" : "bg-gradient-to-r from-primary to-primary/60"}`} style={{ width: `${current}%` }} />
        </div>
        {!entry.completed && (
          <div className="pt-1">
            {editing ? (
              <div className="flex items-center gap-2">
                <input
                  type="number" min={0} max={100} value={inputVal}
                  onChange={(e) => setInputVal(Math.min(100, Math.max(0, Number(e.target.value))))}
                  className="w-20 px-2 py-1.5 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-default)] text-sm font-bold text-center focus:outline-none focus:border-primary/50"
                />
                <span className="text-xs text-[var(--text-muted)]">/ 100 %</span>
                <button onClick={() => save()} disabled={saving} className="ml-auto flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-medium disabled:opacity-40">
                  {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : null} Save
                </button>
                <button onClick={() => setEditing(false)} className="px-2 py-1.5 rounded-lg text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)]">Cancel</button>
              </div>
            ) : (
              <button onClick={() => setEditing(true)} className="text-xs text-primary hover:underline">Update manually</button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Status actions ───────────────────────────────────────────────────────────

const STATUS_ACTIONS: Record<string, { label: string; next: string; icon: React.ElementType; color: string }[]> = {
  claimed: [{ label: "Start order", next: "in_progress", icon: Play, color: "bg-primary hover:bg-primary/90" }],
  in_progress: [
    { label: "Pause", next: "paused", icon: Pause, color: "bg-orange-500 hover:bg-orange-500/90" },
    { label: "Complete", next: "completed", icon: CheckCircle2, color: "bg-green-500 hover:bg-green-500/90" },
  ],
  paused: [{ label: "Resume", next: "in_progress", icon: Play, color: "bg-primary hover:bg-primary/90" }],
};

// ─── Main component ───────────────────────────────────────────────────────────

export default function WorkerOrderClient({
  order: initialOrder,
  initialMessages,
  userId,
  isAssigned,
  methodNames = {},
  configMeta,
}: {
  order: OrderDetail;
  initialMessages: Message[];
  userId: string;
  isAssigned: boolean;
  methodNames?: Record<string, string>;
  configMeta?: ConfigMeta;
}) {
  const [order, setOrder] = useState(initialOrder);
  const [itemProgress, setItemProgress] = useState<ItemProgressEntry[]>(() => initItemProgressClient(initialOrder));
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [activeTab, setActiveTab] = useState<"chat" | "updates">("chat");
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [statusError, setStatusError] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const updatesEndRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const supabase = createClient();

  const chatMessages = useMemo(() => messages.filter((m) => !m.is_system), [messages]);
  const systemMessages = useMemo(() => messages.filter((m) => m.is_system), [messages]);

  const overallProgress = useMemo(() => {
    if (itemProgress.length === 0) return order.progress;
    const sum = itemProgress.reduce((acc, item) => {
      if (item.completed) return acc + 100;
      if (item.type === "level" && item.goal != null && item.startLevel != null && item.current != null) {
        return acc + Math.min(100, Math.round(((item.current - item.startLevel) / Math.max(1, item.goal - item.startLevel)) * 100));
      }
      if (item.type === "kills" && item.goal != null && item.current != null) {
        return acc + Math.min(100, Math.round((item.current / item.goal) * 100));
      }
      if (item.type === "quest" && item.questIds && item.completedQuestIds) {
        return acc + Math.min(100, Math.round((item.completedQuestIds.length / Math.max(1, item.questIds.length)) * 100));
      }
      if (item.type === "percent" && item.current != null) return acc + item.current;
      return acc;
    }, 0);
    return Math.round(sum / itemProgress.length);
  }, [itemProgress, order.progress]);

  // Scroll messages
  useEffect(() => {
    if (activeTab === "chat") messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    else updatesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, activeTab]);

  // Realtime: new messages
  useEffect(() => {
    const channel = supabase
      .channel(`worker-order-messages-${order.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "order_messages", filter: `order_id=eq.${order.id}` }, async (payload) => {
        const newMsg = payload.new as Message;
        const { data: sender } = await supabase.from("profiles").select("display_name, avatar_url, role").eq("id", newMsg.sender_id ?? "").single();
        setMessages((prev) => [...prev, { ...newMsg, sender: sender ?? null }]);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [order.id, supabase]);

  // Realtime: live progress updates from RuneLite
  useEffect(() => {
    const channel = supabase
      .channel(`worker-order-progress-${order.id}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "orders", filter: `id=eq.${order.id}` }, (payload) => {
        const updated = payload.new as Partial<OrderDetail> & { item_progress?: ItemProgressEntry[] };
        if (updated.item_progress && updated.item_progress.length > 0) {
          setItemProgress(updated.item_progress);
        }
        if (updated.progress !== undefined) {
          setOrder((prev) => ({ ...prev, progress: updated.progress! }));
        }
        if (updated.status !== undefined) {
          setOrder((prev) => ({ ...prev, status: updated.status! }));
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [order.id, supabase]);

  const sendMessage = async () => {
    if (!newMessage.trim() || sending) return;
    setSending(true);
    try {
      const res = await fetch(`/api/orders/${order.id}/messages`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content: newMessage.trim() }) });
      if (res.ok) setNewMessage("");
    } finally { setSending(false); }
  };

  const updateStatus = async (newStatus: string) => {
    setUpdatingStatus(true);
    setStatusError("");
    try {
      const res = await fetch(`/api/worker/orders/${order.id}/status`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: newStatus }) });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setStatusError(data.error ?? "Status update failed.");
        return;
      }
      setOrder((prev) => ({ ...prev, status: newStatus }));
      if (newStatus === "completed") router.push("/booster/orders/history");
    } finally { setUpdatingStatus(false); }
  };

  const handleItemUpdate = useCallback((updated: ItemProgressEntry) => {
    setItemProgress((prev) => prev.map((e) => e.index === updated.index ? updated : e));
  }, []);

  const actions = isAssigned ? (STATUS_ACTIONS[order.status] ?? []) : [];
  const isActive = ["claimed", "in_progress", "paused"].includes(order.status);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/booster/orders/active" className="p-2 rounded-lg hover:bg-white/5 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <p className="text-xs font-semibold text-primary uppercase tracking-wider">Order #{order.order_number}</p>
          <h1 className="font-heading text-xl font-semibold">
            {order.items && order.items.length > 1
              ? `${order.items.length} services`
              : order.service?.name ?? order.items?.[0]?.serviceName ?? "Service"}
          </h1>
        </div>
        <div className="ml-auto flex items-center gap-3">
          {isActive && (
            <div className="flex items-center gap-1.5">
              <div className="h-1.5 bg-[var(--bg-elevated)] rounded-full overflow-hidden w-16">
                <div className="h-full bg-gradient-to-r from-primary to-primary/60 rounded-full transition-all duration-500" style={{ width: `${overallProgress}%` }} />
              </div>
              <span className="text-xs font-bold text-primary">{overallProgress}%</span>
            </div>
          )}
          <span className="text-sm font-bold text-green-400">${(order.worker_payout ?? 0).toFixed(2)}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-5">

          {/* Status actions */}
          {isActive && actions.length > 0 && (
            <div className="p-5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-default)]">
              <h2 className="font-heading font-semibold text-sm mb-3">Update status</h2>
              {statusError && (
                <div className="flex items-center gap-2 text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2 mb-3">
                  <AlertTriangle className="h-4 w-4 flex-shrink-0" />{statusError}
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                {actions.map((action) => (
                  <button key={action.next} onClick={() => updateStatus(action.next)} disabled={updatingStatus}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-colors ${action.color}`}>
                    {updatingStatus ? <Loader2 className="h-4 w-4 animate-spin" /> : <action.icon className="h-4 w-4" />}
                    {action.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Per-item progress cards */}
          {isActive && itemProgress.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="font-heading font-semibold text-sm">Progress overview</h2>
                <div className="flex items-center gap-1.5 text-[10px] text-[var(--text-muted)]">
                  <span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" /><span className="relative inline-flex rounded-full h-2 w-2 bg-primary" /></span>
                  Live via RuneLite
                </div>
              </div>
              {itemProgress.map((entry) => {
                const orderItem = order.items?.find((_, i) => i === entry.index);
                return (
                  <ItemProgressCard
                    key={entry.index}
                    entry={entry}
                    orderItem={orderItem}
                    methodNames={methodNames}
                    orderId={order.id}
                    onUpdate={handleItemUpdate}
                  />
                );
              })}
            </div>
          )}

          {/* Messages / RuneLite updates */}
          <div className="rounded-2xl bg-[var(--bg-card)] border border-[var(--border-default)] overflow-hidden flex flex-col" style={{ minHeight: 480 }}>
            <div className="flex border-b border-[var(--border-default)]">
              <button onClick={() => setActiveTab("chat")}
                className={`flex items-center gap-2 px-5 py-3 text-sm font-medium transition-colors border-b-2 -mb-px ${activeTab === "chat" ? "border-primary text-[var(--text-primary)]" : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]"}`}>
                <MessageCircle className="h-3.5 w-3.5" />
                Chat
                {chatMessages.length > 0 && <span className="text-[10px] bg-[var(--bg-elevated)] px-1.5 py-0.5 rounded-full">{chatMessages.length}</span>}
              </button>
              <button onClick={() => setActiveTab("updates")}
                className={`flex items-center gap-2 px-5 py-3 text-sm font-medium transition-colors border-b-2 -mb-px ${activeTab === "updates" ? "border-primary text-[var(--text-primary)]" : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]"}`}>
                <Activity className="h-3.5 w-3.5" />
                RuneLite updates
                {systemMessages.length > 0 && <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${activeTab === "updates" ? "bg-[var(--bg-elevated)]" : "bg-primary/20 text-primary"}`}>{systemMessages.length}</span>}
              </button>
            </div>

            {activeTab === "chat" && (
              <>
                <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ minHeight: 360, maxHeight: 480 }}>
                  {chatMessages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full py-12 gap-3">
                      <MessageCircle className="h-8 w-8 text-[var(--text-muted)] opacity-40" />
                      <p className="text-sm text-[var(--text-muted)]">No messages yet.</p>
                    </div>
                  ) : chatMessages.map((msg) => {
                    const isMe = msg.sender_id === userId;
                    return (
                      <div key={msg.id} className={`flex gap-2.5 ${isMe ? "flex-row-reverse" : ""}`}>
                        <UserAvatar src={msg.sender?.avatar_url} name={msg.sender?.display_name} size={30} />
                        <div className={`max-w-[72%] flex flex-col gap-0.5 ${isMe ? "items-end" : "items-start"}`}>
                          <span className="text-[10px] text-[var(--text-muted)] px-1">{msg.sender?.display_name ?? (isMe ? "You" : "Customer")}</span>
                          <div className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${isMe ? "bg-primary text-white rounded-tr-sm" : "bg-[var(--bg-elevated)] rounded-tl-sm"}`}>{msg.content}</div>
                          <span className="text-[10px] text-[var(--text-muted)] px-1">{new Date(msg.created_at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}</span>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
                <div className="p-3 border-t border-[var(--border-default)] flex gap-2 bg-[var(--bg-elevated)]/30">
                  <textarea rows={1} value={newMessage} onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                    placeholder="Message the customer..."
                    className="flex-1 resize-none px-3.5 py-2.5 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-default)] text-sm placeholder:text-[var(--text-muted)] focus:outline-none focus:border-primary/50 transition-colors" />
                  <button onClick={sendMessage} disabled={!newMessage.trim() || sending}
                    className="p-2.5 rounded-xl bg-primary text-white hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex-shrink-0">
                    {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </button>
                </div>
              </>
            )}

            {activeTab === "updates" && (
              <div className="flex-1 overflow-y-auto" style={{ minHeight: 360, maxHeight: 520 }}>
                {systemMessages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full py-12 gap-3">
                    <Activity className="h-8 w-8 text-[var(--text-muted)] opacity-40" />
                    <p className="text-sm text-[var(--text-muted)]">No RuneLite updates yet.</p>
                    <p className="text-xs text-[var(--text-muted)] opacity-60">Set up the webhook to start tracking.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-[var(--border-subtle)]">
                    {systemMessages.map((msg) => {
                      const lines = msg.content.split("\n");
                      const imgLine = lines.find((l) => /^!\[.*?\]\(https?:\/\//.test(l));
                      const imgUrl = imgLine?.match(/\(([^)]+)\)/)?.[1];
                      const textLines = lines.filter((l) => !/^!\[.*?\]\(https?:\/\//.test(l));
                      const time = new Date(msg.created_at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
                      const date = new Date(msg.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
                      return (
                        <div key={msg.id} className="px-4 py-3.5 hover:bg-white/[0.02] transition-colors">
                          <div className="flex items-start gap-3">
                            <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center mt-0.5">
                              {imgUrl ? <ImageIcon className="h-3.5 w-3.5 text-primary" /> : <Activity className="h-3.5 w-3.5 text-primary" />}
                            </div>
                            <div className="flex-1 min-w-0 space-y-1.5">
                              <span className="text-[10px] text-[var(--text-muted)]">{date} · {time}</span>
                              <div className="space-y-0.5">
                                {textLines.map((line, i) => {
                                  if (!line.trim()) return null;
                                  const parts = line.split(/\*\*(.+?)\*\*/g);
                                  return (
                                    <p key={i} className="text-xs text-[var(--text-secondary)] leading-relaxed">
                                      {parts.map((part, j) => j % 2 === 1 ? <strong key={j} className="text-[var(--text-primary)] font-semibold">{part}</strong> : part)}
                                    </p>
                                  );
                                })}
                              </div>
                              {imgUrl && (
                                <a href={imgUrl} target="_blank" rel="noopener noreferrer" className="block mt-2">
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img src={imgUrl} alt="RuneLite screenshot" width={400} height={256} className="rounded-xl border border-[var(--border-default)] max-w-full max-h-64 object-cover hover:opacity-90 transition-opacity cursor-pointer" />
                                </a>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={updatesEndRef} />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <div className="p-5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-default)] space-y-4">
            <h2 className="font-heading font-semibold text-sm">Order info</h2>
            <div className="space-y-2.5 text-sm">
              {order.items && order.items.length > 1 ? (
                <div className="space-y-2">
                  <span className="text-[var(--text-muted)] text-xs">Services ({order.items.length})</span>
                  {order.items.map((item, i) => {
                    const cfg = (item.configuration ?? {}) as Record<string, unknown>;
                    const hasBoss = "boss" in cfg;
                    const rawBoss = cfg.boss as string | undefined;
                    const bossName = hasBoss && rawBoss ? (methodNames[rawBoss] ?? rawBoss.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())) : null;
                    const questIds = !hasBoss ? getQuestIdsFromConfig(cfg) : [];
                    const rawSegs = cfg.route_segments;
                    const segments = (!hasBoss && Array.isArray(rawSegs) && rawSegs.length > 0) ? rawSegs as Record<string, unknown>[] : null;
                    return (
                      <div key={i} className="rounded-xl border border-[var(--border-default)] overflow-hidden">
                        <div className="px-3 py-2 bg-[var(--bg-elevated)] border-b border-[var(--border-default)] flex items-center justify-between">
                          <p className="font-semibold text-xs">{item.serviceName.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}</p>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-[var(--text-muted)]">× {item.quantity}</span>
                            <span className="text-xs font-medium text-green-400">${(item.finalPrice * item.quantity).toFixed(2)}</span>
                          </div>
                        </div>
                        <div className="px-3 py-2 space-y-1.5 text-xs">
                          {questIds.length > 0 && (
                            <div className="space-y-1">
                              <span className="text-[var(--text-muted)]">Quest{questIds.length > 1 ? "s" : ""}</span>
                              {questIds.map((qid, qi) => <div key={qi} className="px-2 py-1 rounded bg-[var(--bg-elevated)] font-medium">{methodNames[qid] ?? formatName(qid)}</div>)}
                            </div>
                          )}
                          {bossName && <div className="flex justify-between"><span className="text-[var(--text-muted)]">Boss</span><span className="font-medium">{bossName}</span></div>}
                          {hasBoss && cfg.kills != null && <div className="flex justify-between"><span className="text-[var(--text-muted)]">Kills</span><span className="font-medium">{String(cfg.kills)}</span></div>}
                          {segments && (
                            <div className="space-y-1">
                              <span className="text-[var(--text-muted)]">Route</span>
                              {segments.map((seg, si) => (
                                <div key={si} className="flex justify-between px-2 py-1 rounded bg-[var(--bg-elevated)]">
                                  <span className="font-semibold">{String(seg.from_level)} → {String(seg.to_level)}</span>
                                  <span className="text-[var(--text-muted)]">{methodNames[String(seg.method_id)] ?? String(seg.method_id ?? "").replace(/_/g, " ")}</span>
                                </div>
                              ))}
                            </div>
                          )}
                          {renderStatsAndMods(cfg, configMeta)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <>
                  <div className="flex justify-between"><span className="text-[var(--text-muted)]">Game</span><span className="font-medium">{order.game?.name ?? order.items?.[0]?.gameName ?? "—"}</span></div>
                  <div className="flex justify-between"><span className="text-[var(--text-muted)]">Service</span><span className="font-medium">{order.service?.name ?? order.items?.[0]?.serviceName ?? "—"}</span></div>
                  {order.service?.estimated_hours && <div className="flex justify-between"><span className="text-[var(--text-muted)]">Estimated time</span><span className="font-medium">~{order.service.estimated_hours}h</span></div>}
                  {renderSingleConfig(order.configuration, methodNames, configMeta)}
                </>
              )}
              <div className="flex justify-between"><span className="text-[var(--text-muted)]">Placed on</span><span className="font-medium">{new Date(order.created_at).toLocaleDateString("en-GB")}</span></div>
            </div>
            <div className="pt-3 border-t border-[var(--border-default)]">
              <div className="flex justify-between font-bold"><span>Your payout</span><span className="text-green-400">${(order.worker_payout ?? 0).toFixed(2)}</span></div>
            </div>
          </div>

          {order.customer_notes && (
            <div className="p-4 rounded-xl bg-orange-400/10 border border-orange-400/20">
              <p className="text-xs font-semibold text-orange-400 mb-1">Customer note</p>
              <p className="text-sm text-[var(--text-secondary)]">{order.customer_notes}</p>
            </div>
          )}

          {isActive && (
            <div className="p-4 rounded-xl bg-[var(--bg-card)] border border-[var(--border-default)] space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">VPN Location</p>
              <p className="text-[11px] text-muted-foreground">Select the country your VPN is connected to for this order.</p>
              <VpnLocationPicker orderId={order.id} initialCountryCode={order.vpn_country_code} />
            </div>
          )}

          <BoosterCredentialsViaLinkNotice />

          {isActive && order.track_token && (
            <RuneLiteToken trackToken={order.track_token} orderId={order.id} />
          )}
        </div>
      </div>
    </div>
  );
}
