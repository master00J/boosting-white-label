"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import Link from "next/link";
import { ArrowLeft, Send, Star, CheckCircle2, Clock, Loader2, Coins, GitBranch, ChevronDown, TrendingUp, Swords, MessageCircle, Activity, Image as ImageIcon } from "lucide-react";
import { CustomerShareCredentialsViaLink } from "@/components/credentials/share-via-onetime-link";
import { createClient } from "@/lib/supabase/client";
import UserAvatar from "@/components/shared/user-avatar";
import { formatUSD } from "@/lib/format";

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
  subtotal: number;
  discount_amount: number;
  tax_amount: number;
  progress: number;
  progress_current: number | null;
  progress_notes: string | null;
  payment_method: string | null;
  payment_status: string | null;
  gold_amount: number | null;
  gold_received: boolean | null;
  configuration: Record<string, unknown>;
  items: OrderItem[] | null;
  item_count: number | null;
  customer_notes: string | null;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  estimated_completion: string | null;
  loyalty_points_earned: number;
  customer_id: string | null;
  service: { name: string; description: string | null } | null;
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

type SubOrder = {
  id: string;
  order_number: string;
  status: string;
  progress: number;
  progress_notes: string | null;
  configuration: Record<string, unknown> | null;
  items: Array<{ serviceId: string; serviceName: string; gameName: string; quantity: number; finalPrice: number; configuration: Record<string, unknown> }> | null;
  service: { name: string } | null;
};

const STATUS_LABEL: Record<string, string> = {
  pending_payment: "Awaiting payment",
  paid: "Queued",          // customer-friendly: awaiting release = just "queued"
  queued: "In queue",
  claimed: "Booster assigned",
  in_progress: "In progress",
  paused: "Paused",
  completed: "Completed",
  cancelled: "Cancelled",
  refunded: "Refunded",
  disputed: "Disputed",
  split: "In progress",    // split parent = sub-orders are being worked on
};

const STATUS_COLOR: Record<string, string> = {
  pending_payment: "text-orange-400 bg-orange-400/10 border-orange-400/20",
  paid: "text-blue-400 bg-blue-400/10 border-blue-400/20",
  queued: "text-orange-400 bg-orange-400/10 border-orange-400/20",
  claimed: "text-blue-400 bg-blue-400/10 border-blue-400/20",
  in_progress: "text-primary bg-primary/10 border-primary/20",
  paused: "text-orange-400 bg-orange-400/10 border-orange-400/20",
  completed: "text-green-400 bg-green-400/10 border-green-400/20",
  cancelled: "text-red-400 bg-red-400/10 border-red-400/20",
  refunded: "text-zinc-400 bg-zinc-400/10 border-zinc-400/20",
  disputed: "text-red-400 bg-red-400/10 border-red-400/20",
};


type RouteSegment = { from_level: number; to_level: number; method_id?: string };

type ProgressContext = {
  type: "kills" | "level" | "percent";
  goal: number;
  startLevel: number;
  unit: string;
  label: string;
  skillName: string | null;
  bossName: string | null;
  segments: RouteSegment[] | null;
};

function getProgressContext(config: Record<string, unknown>, methodNames: Record<string, string>): ProgressContext {
  if ("boss" in config && "kills" in config) {
    const bossId = String(config.boss);
    const bossName = methodNames[bossId] ?? bossId.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
    return { type: "kills", goal: Number(config.kills), startLevel: 0, unit: "kills", label: `${bossName} kills`, skillName: null, bossName, segments: null };
  }
  if ("route_segments" in config) {
    const segs = config.route_segments as RouteSegment[] | undefined;
    const goal = segs?.at(-1)?.to_level ?? 99;
    const start = segs?.[0]?.from_level ?? 1;
    const skill = config.skill ? String(config.skill).replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()) : "Skill";
    return { type: "level", goal, startLevel: start, unit: "level", label: `${skill} level`, skillName: skill, bossName: null, segments: segs ?? null };
  }
  if ("end_level" in config) {
    const skill = config.skill ? String(config.skill).replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()) : "Skill";
    const start = config.start_level ? Number(config.start_level) : 1;
    return { type: "level", goal: Number(config.end_level), startLevel: start, unit: "level", label: `${skill} level`, skillName: skill, bossName: null, segments: null };
  }
  return { type: "percent", goal: 100, startLevel: 0, unit: "%", label: "Progress", skillName: null, bossName: null, segments: null };
}

function CustomerProgressOverview({
  ctx,
  progressCurrent,
  progressPct,
  progressNotes,
  estimatedCompletion,
  methodNames,
  isDone,
}: {
  ctx: ProgressContext;
  progressCurrent: number | null;
  progressPct: number;
  progressNotes: string | null;
  estimatedCompletion: string | null;
  methodNames: Record<string, string>;
  isDone: boolean;
}) {
  const barColor = isDone
    ? "bg-green-400"
    : "bg-gradient-to-r from-primary to-primary/60";

  if (ctx.type === "kills" && ctx.bossName) {
    const current = isDone ? ctx.goal : (progressCurrent ?? 0);
    const remaining = Math.max(0, ctx.goal - current);
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-[var(--border-default)] overflow-hidden">
          <div className="px-4 py-3 bg-[var(--bg-elevated)] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Swords className="h-3.5 w-3.5 text-primary" />
              <span className="font-semibold text-sm">{ctx.bossName}</span>
            </div>
            <span className="text-xs text-[var(--text-muted)]">Boss kills</span>
          </div>
          <div className="px-4 py-3 grid grid-cols-3 gap-3 text-center border-b border-[var(--border-default)]">
            <div>
              <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider mb-1">Current</p>
              <p className="text-xl font-bold text-primary">{current}</p>
            </div>
            <div>
              <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider mb-1">Target</p>
              <p className="text-xl font-bold">{ctx.goal}</p>
            </div>
            <div>
              <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider mb-1">Remaining</p>
              <p className="text-xl font-bold text-orange-400">{isDone ? 0 : remaining}</p>
            </div>
          </div>
          <div className="px-4 pb-3 pt-2">
            <div className="h-2.5 bg-[var(--bg-elevated)] rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all duration-500 ${barColor}`} style={{ width: `${progressPct}%` }} />
            </div>
          </div>
        </div>
        {progressNotes && <p className="text-xs text-[var(--text-muted)] italic px-1">{progressNotes}</p>}
        {estimatedCompletion && !isDone && (
          <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
            <Clock className="h-3.5 w-3.5" />
            Estimated completion: {new Date(estimatedCompletion).toLocaleDateString("en-US")}
          </div>
        )}
      </div>
    );
  }

  if (ctx.type === "level" && ctx.skillName) {
    const current = isDone ? ctx.goal : (progressCurrent ?? ctx.startLevel);
    const remaining = Math.max(0, ctx.goal - current);
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-[var(--border-default)] overflow-hidden">
          <div className="px-4 py-3 bg-[var(--bg-elevated)] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-3.5 w-3.5 text-primary" />
              <span className="font-semibold text-sm">{ctx.skillName}</span>
            </div>
            <span className="text-xs text-[var(--text-muted)]">Skill training</span>
          </div>
          <div className="px-4 py-3 grid grid-cols-3 gap-3 text-center border-b border-[var(--border-default)]">
            <div>
              <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider mb-1">Start</p>
              <p className="text-xl font-bold text-[var(--text-muted)]">{ctx.startLevel}</p>
            </div>
            <div>
              <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider mb-1">Current</p>
              <p className="text-xl font-bold text-primary">{current}</p>
            </div>
            <div>
              <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider mb-1">Target</p>
              <p className="text-xl font-bold text-green-400">{ctx.goal}</p>
            </div>
          </div>
          <div className="px-4 py-3 space-y-2">
            <div className="flex justify-between text-xs text-[var(--text-muted)]">
              <span>{ctx.startLevel}</span>
              <span className="text-orange-400 font-medium">{isDone ? "Done!" : `${remaining} levels remaining`}</span>
              <span>{ctx.goal}</span>
            </div>
            <div className="h-2.5 bg-[var(--bg-elevated)] rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all duration-500 ${barColor}`} style={{ width: `${progressPct}%` }} />
            </div>
          </div>
        </div>

        {/* Route segments */}
        {ctx.segments && ctx.segments.length > 1 && (
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">Route breakdown</p>
            <div className="rounded-xl border border-[var(--border-default)] overflow-hidden divide-y divide-[var(--border-default)]">
              {ctx.segments.map((seg, i) => {
                const segDone = isDone || current >= seg.to_level;
                const segActive = !segDone && current >= seg.from_level;
                const segPct = segDone ? 100 : segActive
                  ? Math.round(((current - seg.from_level) / Math.max(1, seg.to_level - seg.from_level)) * 100)
                  : 0;
                const methodLabel = seg.method_id
                  ? (methodNames[seg.method_id] ?? seg.method_id.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()))
                  : null;
                return (
                  <div key={i} className={`px-3 py-2.5 flex items-center gap-3 ${segDone ? "bg-green-400/5" : segActive ? "bg-primary/5" : ""}`}>
                    <div className="flex-shrink-0">
                      {segDone
                        ? <CheckCircle2 className="h-3.5 w-3.5 text-green-400" />
                        : <div className={`h-3.5 w-3.5 rounded-full border-2 ${segActive ? "border-primary" : "border-[var(--border-default)]"}`} />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-xs font-semibold">{seg.from_level} → {seg.to_level}</span>
                        {methodLabel && <span className="text-[10px] text-[var(--text-muted)] truncate">{methodLabel}</span>}
                        <span className={`text-[10px] font-medium flex-shrink-0 ${segDone ? "text-green-400" : segActive ? "text-primary" : "text-[var(--text-muted)]"}`}>
                          {segDone ? "Done" : segActive ? `${segPct}%` : "Upcoming"}
                        </span>
                      </div>
                      <div className="h-1 bg-[var(--bg-elevated)] rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${segDone ? "bg-green-400" : "bg-primary"}`}
                          style={{ width: `${segPct}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {progressNotes && <p className="text-xs text-[var(--text-muted)] italic px-1">{progressNotes}</p>}
        {estimatedCompletion && !isDone && (
          <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
            <Clock className="h-3.5 w-3.5" />
            Estimated completion: {new Date(estimatedCompletion).toLocaleDateString("en-US")}
          </div>
        )}
      </div>
    );
  }

  // Fallback: simple percentage
  return (
    <div className="space-y-3">
      <div className="h-2.5 bg-[var(--bg-elevated)] rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ${barColor}`} style={{ width: `${progressPct}%` }} />
      </div>
      {progressNotes && <p className="text-xs text-[var(--text-muted)] italic">{progressNotes}</p>}
      {estimatedCompletion && !isDone && (
        <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
          <Clock className="h-3.5 w-3.5" />
          Estimated completion: {new Date(estimatedCompletion).toLocaleDateString("en-US")}
        </div>
      )}
    </div>
  );
}

function formatName(name: string): string {
  return name.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}


const SUB_STATUS_COLOR: Record<string, string> = {
  paid: "text-zinc-400 bg-zinc-400/10 border-zinc-400/20",
  queued: "text-orange-400 bg-orange-400/10 border-orange-400/20",
  claimed: "text-blue-400 bg-blue-400/10 border-blue-400/20",
  in_progress: "text-primary bg-primary/10 border-primary/20",
  paused: "text-orange-400 bg-orange-400/10 border-orange-400/20",
  completed: "text-green-400 bg-green-400/10 border-green-400/20",
  cancelled: "text-red-400 bg-red-400/10 border-red-400/20",
};

function getQuestIds(cfg: Record<string, unknown>): string[] {
  const ids: string[] = [];
  if (typeof cfg.item === "string" && cfg.item) ids.push(cfg.item);
  if (Array.isArray(cfg.quests)) ids.push(...(cfg.quests as string[]));
  return ids;
}

function renderItemConfig(
  cfg: Record<string, unknown>,
  methodNames: Record<string, string>,
  modifierMeta: Record<string, { label: string; options: Record<string, string> }>
) {
  const hasBoss = "boss" in cfg;
  const questIds = !hasBoss ? getQuestIds(cfg) : [];
  const rows: React.ReactNode[] = [];

  // Quests
  if (questIds.length > 0) {
    rows.push(
      <div key="quests" className="px-2.5 py-1.5 border-t border-[var(--border-default)]">
        <p className="text-[10px] text-[var(--text-muted)] mb-1">Quest{questIds.length > 1 ? "s" : ""}</p>
        {questIds.map((qid, i) => (
          <p key={i} className="text-xs font-medium">{methodNames[qid] ?? formatName(qid)}</p>
        ))}
      </div>
    );
  }

  // Boss + kills
  if (hasBoss) {
    const rawBoss = cfg.boss as string | undefined;
    const bossName = rawBoss ? (methodNames[rawBoss] ?? formatName(rawBoss)) : "—";
    rows.push(
      <div key="boss" className="px-2.5 py-1.5 text-xs flex justify-between border-t border-[var(--border-default)]">
        <span className="text-[var(--text-muted)]">Boss</span>
        <span className="font-medium">{bossName}</span>
      </div>
    );
    if (cfg.kills != null) {
      rows.push(
        <div key="kills" className="px-2.5 py-1.5 text-xs flex justify-between border-t border-[var(--border-default)]">
          <span className="text-[var(--text-muted)]">Kills</span>
          <span className="font-medium">{String(cfg.kills)}</span>
        </div>
      );
    }
  }

  // Route segments
  const rawSegs = cfg.route_segments;
  if (!hasBoss && Array.isArray(rawSegs) && rawSegs.length > 0) {
    const segs = rawSegs as Record<string, unknown>[];
    rows.push(
      <div key="route" className="px-2.5 py-1.5 border-t border-[var(--border-default)]">
        <p className="text-[10px] text-[var(--text-muted)] mb-1">Levels</p>
        {segs.map((seg, si) => (
          <p key={si} className="text-xs">
            {String(seg.from_level)} → {String(seg.to_level)}{" "}
            <span className="text-[var(--text-muted)]">
              ({methodNames[String(seg.method_id)] ?? String(seg.method_id ?? "").replace(/_/g, " ")})
            </span>
          </p>
        ))}
      </div>
    );
  }

  // Account stats (stat_*)
  const statEntries = Object.entries(cfg).filter(([k]) => k.startsWith("stat_"));
  if (statEntries.length > 0) {
    rows.push(
      <div key="stats" className="px-2.5 py-1.5 border-t border-[var(--border-default)]">
        <p className="text-[10px] text-[var(--text-muted)] mb-1">Account stats</p>
        {statEntries.map(([k, v]) => (
          <div key={k} className="flex justify-between text-xs">
            <span className="text-[var(--text-muted)]">{formatName(k.replace(/^stat_/, ""))}</span>
            <span className="font-medium">{String(v)}</span>
          </div>
        ))}
      </div>
    );
  }

  // Modifier fields
  const modEntries = Object.entries(cfg).filter(([k]) => {
    if (k.startsWith("stat_") || ["boss", "kills", "item", "quests", "quantity", "skill", "start_level", "end_level", "route_segments"].includes(k)) return false;
    if (k.startsWith("boss_mod_")) return true;
    if (modifierMeta[k]) return true;
    return false;
  });

  if (modEntries.length > 0) {
    rows.push(
      <div key="mods" className="px-2.5 py-1.5 border-t border-[var(--border-default)]">
        <p className="text-[10px] text-[var(--text-muted)] mb-1">Upcharges</p>
        {modEntries.map(([k, v]) => {
          const meta = modifierMeta[k];
          const label = meta?.label ?? formatName(k.replace(/^boss_mod_/, ""));
          let display = "";
          if (typeof v === "boolean") display = v ? "Yes" : "No";
          else if (Array.isArray(v)) display = (v as string[]).map(val => meta?.options[val] ?? formatName(val)).join(", ");
          else display = meta?.options[String(v)] ?? formatName(String(v));
          return (
            <div key={k} className="flex justify-between text-xs">
              <span className="text-[var(--text-muted)]">{label}</span>
              <span className="font-medium">{display}</span>
            </div>
          );
        })}
      </div>
    );
  }

  return rows;
}

export default function OrderDetailClient({
  order,
  initialMessages,
  existingReview,
  userId,
  methodNames = {},
  modifierMeta = {},
  subOrders = [],
}: {
  order: OrderDetail;
  initialMessages: Message[];
  existingReview: { id: string; rating: number; comment: string | null } | null;
  userId: string;
  methodNames?: Record<string, string>;
  modifierMeta?: Record<string, { label: string; options: Record<string, string> }>;
  subOrders?: SubOrder[];
}) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [expandedSubOrders, setExpandedSubOrders] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<"chat" | "updates">("chat");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const updatesEndRef = useRef<HTMLDivElement>(null);

  // Split messages: system (RuneLite updates) vs human chat
  const chatMessages = useMemo(() => messages.filter(m => !m.is_system), [messages]);
  const systemMessages = useMemo(() => messages.filter(m => m.is_system), [messages]);
  const unreadUpdates = useMemo(() => systemMessages.length, [systemMessages]);

  const toggleSubOrder = (id: string) => {
    setExpandedSubOrders(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const supabase = createClient();

  useEffect(() => {
    if (activeTab === "chat") {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    } else {
      updatesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, activeTab]);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel(`order-messages-${order.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "order_messages", filter: `order_id=eq.${order.id}` },
        async (payload) => {
          const newMsg = payload.new as Message;
          // Fetch sender info
          const { data: sender } = await supabase
            .from("profiles")
            .select("display_name, avatar_url, role")
            .eq("id", newMsg.sender_id ?? "")
            .single();
          setMessages((prev) => [...prev, { ...newMsg, sender: sender ?? null }]);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [order.id, supabase]);

  const sendMessage = async () => {
    if (!newMessage.trim() || sending) return;
    setSending(true);
    try {
      const res = await fetch(`/api/orders/${order.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newMessage.trim() }),
      });
      if (res.ok) setNewMessage("");
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const isCompleted = order.status === "completed";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/orders"
          className="p-2 rounded-lg hover:bg-white/5 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <p className="text-xs font-semibold text-primary uppercase tracking-wider">Order #{order.order_number}</p>
          <h1 className="font-heading text-xl font-semibold">
            {order.items && order.items.length > 1
              ? `${order.items.length} services`
              : order.service?.name ?? formatName(order.items?.[0]?.serviceName ?? "Service")}
          </h1>
        </div>
        <span className={`ml-auto text-xs px-2.5 py-1 rounded-full border ${STATUS_COLOR[order.status] ?? ""}`}>
          {STATUS_LABEL[order.status] ?? order.status}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column */}
        <div className="lg:col-span-2 space-y-5">
          {/* Progress */}
          {["queued", "claimed", "in_progress", "paused", "completed"].includes(order.status) && (() => {
            const cfg = order.items && order.items.length > 0 && Object.keys(order.configuration).length === 0
              ? (order.items[0]?.configuration ?? order.configuration)
              : order.configuration;
            const ctx = getProgressContext(cfg as Record<string, unknown>, methodNames);
            const isDone = order.status === "completed";
            const progressPct = isDone ? 100
              : ctx.type === "level" && ctx.startLevel < ctx.goal
              ? Math.min(100, Math.round((((order.progress_current ?? ctx.startLevel) - ctx.startLevel) / Math.max(1, ctx.goal - ctx.startLevel)) * 100))
              : order.progress;
            return (
              <div className="p-5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-default)]">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-heading font-semibold text-sm">Progress</h2>
                  <span className={`text-sm font-bold ${isDone ? "text-green-400" : "text-primary"}`}>{isDone ? "Completed ✓" : `${order.progress}%`}</span>
                </div>
                <CustomerProgressOverview
                  ctx={ctx}
                  progressCurrent={order.progress_current}
                  progressPct={progressPct}
                  progressNotes={order.progress_notes}
                  estimatedCompletion={order.estimated_completion}
                  methodNames={methodNames}
                  isDone={isDone}
                />
              </div>
            );
          })()}

          {/* Sub-orders (split orders) */}
          {subOrders.length > 0 && (
            <div className="p-5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-default)] space-y-3">
              <div className="flex items-center gap-2">
                <GitBranch className="h-4 w-4 text-primary" />
                <h2 className="font-heading font-semibold text-sm">Order parts ({subOrders.length})</h2>
              </div>
              <p className="text-xs text-[var(--text-muted)]">
                Your order has been split into separate parts. Each part is handled by a dedicated booster.
              </p>
              <div className="space-y-2">
                {subOrders.map((sub, idx) => {
                  const subLabel = sub.service?.name
                    ?? sub.items?.[0]?.serviceName?.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())
                    ?? `Part ${idx + 1}`;
                  const subGame = sub.items?.[0]?.gameName ?? "";
                  const statusLabel = STATUS_LABEL[sub.status] ?? sub.status.replace(/_/g, " ");
                  const statusColor = SUB_STATUS_COLOR[sub.status] ?? "text-zinc-400 bg-zinc-400/10 border-zinc-400/20";
                  const isActive = ["claimed", "in_progress", "paused"].includes(sub.status);
                  const isDone = sub.status === "completed";
                  const isExpanded = expandedSubOrders.has(sub.id);
                  const isMultiItem = (sub.items?.length ?? 0) > 1;
                  const hasConfig = isMultiItem
                    ? sub.items!.some(it => Object.keys(it.configuration ?? {}).length > 0)
                    : Object.keys(sub.items?.[0]?.configuration ?? sub.configuration ?? {}).length > 0;

                  return (
                    <div key={sub.id} className={`rounded-xl border overflow-hidden ${isDone ? "border-green-400/20 bg-green-400/5" : "border-[var(--border-default)]"}`}>
                      {/* Header row — always visible */}
                      <button
                        onClick={() => hasConfig && toggleSubOrder(sub.id)}
                        className={`w-full px-4 py-3 flex items-center justify-between gap-3 text-left ${hasConfig ? "hover:bg-white/[0.02] transition-colors" : ""}`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold truncate">{subLabel}</span>
                            {subGame && <span className="text-xs text-[var(--text-muted)]">{subGame}</span>}
                          </div>
                          <p className="text-[10px] text-[var(--text-muted)] font-mono mt-0.5">{sub.order_number}</p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${statusColor}`}>
                            {isDone && <CheckCircle2 className="h-3 w-3 mr-1" />}
                            {statusLabel}
                          </span>
                          {hasConfig && (
                            <ChevronDown className={`h-3.5 w-3.5 text-[var(--text-muted)] transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`} />
                          )}
                        </div>
                      </button>

                      {/* Progress bar — shown when active/done */}
                      {(isActive || isDone) && (
                        <div className="px-4 pb-3 space-y-1.5">
                          <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
                            <span>Progress</span>
                            <span className="font-semibold text-primary">{sub.progress}%</span>
                          </div>
                          <div className="h-1.5 bg-[var(--bg-elevated)] rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${isDone ? "bg-green-400" : "bg-gradient-to-r from-primary to-primary/70"}`}
                              style={{ width: `${sub.progress}%` }}
                            />
                          </div>
                          {sub.progress_notes && (
                            <p className="text-xs text-[var(--text-muted)] italic">{sub.progress_notes}</p>
                          )}
                        </div>
                      )}

                      {/* Expandable config details */}
                      {isExpanded && hasConfig && (
                        <div className="border-t border-[var(--border-default)]">
                          {isMultiItem ? (
                            sub.items!.map((item, ii) => (
                              <div key={ii} className={ii > 0 ? "border-t border-[var(--border-default)]" : ""}>
                                <div className="px-3 py-2 bg-[var(--bg-elevated)] flex items-center justify-between">
                                  <span className="text-xs font-semibold">{formatName(item.serviceName)}</span>
                                  <span className="text-xs text-[var(--text-muted)]">{formatName(item.gameName)}</span>
                                </div>
                                {renderItemConfig((item.configuration ?? {}) as Record<string, unknown>, methodNames, modifierMeta)}
                              </div>
                            ))
                          ) : (
                            renderItemConfig(
                              (sub.items?.[0]?.configuration ?? sub.configuration ?? {}) as Record<string, unknown>,
                              methodNames,
                              modifierMeta
                            )
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Share credentials via one-time link (e.g. 1ty.me) — above messages so customer pastes link there */}
          {["claimed", "in_progress", "paused", "completed"].includes(order.status) && (
            <CustomerShareCredentialsViaLink />
          )}

          {/* Chat + Updates tabbed */}
          <div className="rounded-2xl bg-[var(--bg-card)] border border-[var(--border-default)] overflow-hidden flex flex-col" style={{ minHeight: 480 }}>
            {/* Tab bar */}
            <div className="flex border-b border-[var(--border-default)]">
              <button
                onClick={() => setActiveTab("chat")}
                className={`flex items-center gap-2 px-5 py-3 text-sm font-medium transition-colors border-b-2 -mb-px ${
                  activeTab === "chat"
                    ? "border-primary text-[var(--text-primary)]"
                    : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                }`}
              >
                <MessageCircle className="h-3.5 w-3.5" />
                Chat
                {chatMessages.length > 0 && (
                  <span className="text-[10px] bg-[var(--bg-elevated)] px-1.5 py-0.5 rounded-full">{chatMessages.length}</span>
                )}
              </button>
              <button
                onClick={() => setActiveTab("updates")}
                className={`flex items-center gap-2 px-5 py-3 text-sm font-medium transition-colors border-b-2 -mb-px ${
                  activeTab === "updates"
                    ? "border-primary text-[var(--text-primary)]"
                    : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                }`}
              >
                <Activity className="h-3.5 w-3.5" />
                Updates
                {unreadUpdates > 0 && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${activeTab === "updates" ? "bg-[var(--bg-elevated)]" : "bg-primary/20 text-primary"}`}>
                    {unreadUpdates}
                  </span>
                )}
              </button>
            </div>

            {/* Chat tab */}
            {activeTab === "chat" && (
              <>
                <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ minHeight: 360, maxHeight: 480 }}>
                  {chatMessages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full py-12 gap-3">
                      <MessageCircle className="h-8 w-8 text-[var(--text-muted)] opacity-40" />
                      <p className="text-sm text-[var(--text-muted)]">No messages yet.</p>
                      <p className="text-xs text-[var(--text-muted)] opacity-60">Send a message to your booster.</p>
                    </div>
                  ) : (
                    chatMessages.map((msg) => {
                      const isMe = msg.sender_id === userId;
                      return (
                        <div key={msg.id} className={`flex gap-2.5 ${isMe ? "flex-row-reverse" : ""}`}>
                          <UserAvatar src={msg.sender?.avatar_url} name={msg.sender?.display_name} size={30} />
                          <div className={`max-w-[72%] flex flex-col gap-0.5 ${isMe ? "items-end" : "items-start"}`}>
                            <span className="text-[10px] text-[var(--text-muted)] px-1">
                              {msg.sender?.display_name ?? (isMe ? "You" : "Booster")}
                            </span>
                            <div className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
                              isMe
                                ? "bg-primary text-white rounded-tr-sm"
                                : "bg-[var(--bg-elevated)] rounded-tl-sm"
                            }`}>
                              {msg.content}
                            </div>
                            <span className="text-[10px] text-[var(--text-muted)] px-1">
                              {new Date(msg.created_at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>
                <div className="p-3 border-t border-[var(--border-default)] flex gap-2 bg-[var(--bg-elevated)]/30">
                  <textarea
                    rows={1}
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Message your booster..."
                    className="flex-1 resize-none px-3.5 py-2.5 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-default)] text-sm placeholder:text-[var(--text-muted)] focus:outline-none focus:border-primary/50 transition-colors"
                  />
                  <button
                    onClick={sendMessage}
                    disabled={!newMessage.trim() || sending}
                    className="p-2.5 rounded-xl bg-primary text-white hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex-shrink-0"
                  >
                    {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </button>
                </div>
              </>
            )}

            {/* Updates tab */}
            {activeTab === "updates" && (
              <div className="flex-1 overflow-y-auto" style={{ minHeight: 360, maxHeight: 520 }}>
                {systemMessages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full py-12 gap-3">
                    <Activity className="h-8 w-8 text-[var(--text-muted)] opacity-40" />
                    <p className="text-sm text-[var(--text-muted)]">No updates yet.</p>
                    <p className="text-xs text-[var(--text-muted)] opacity-60">RuneLite progress updates will appear here.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-[var(--border-subtle)]">
                    {systemMessages.map((msg) => {
                      const lines = msg.content.split("\n");
                      const imgLine = lines.find(l => /^!\[.*?\]\(https?:\/\//.test(l));
                      const imgUrl = imgLine?.match(/\(([^)]+)\)/)?.[1];
                      const textLines = lines.filter(l => !/^!\[.*?\]\(https?:\/\//.test(l));
                      const time = new Date(msg.created_at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
                      const date = new Date(msg.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
                      return (
                        <div key={msg.id} className="px-4 py-3.5 hover:bg-white/[0.02] transition-colors">
                          <div className="flex items-start gap-3">
                            <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center mt-0.5">
                              {imgUrl
                                ? <ImageIcon className="h-3.5 w-3.5 text-primary" />
                                : <Activity className="h-3.5 w-3.5 text-primary" />
                              }
                            </div>
                            <div className="flex-1 min-w-0 space-y-1.5">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-[10px] text-[var(--text-muted)]">{date} · {time}</span>
                              </div>
                              {/* Text content with bold support */}
                              <div className="space-y-0.5">
                                {textLines.map((line, i) => {
                                  if (!line.trim()) return null;
                                  const parts = line.split(/\*\*(.+?)\*\*/g);
                                  return (
                                    <p key={i} className="text-xs text-[var(--text-secondary)] leading-relaxed">
                                      {parts.map((part, j) =>
                                        j % 2 === 1
                                          ? <strong key={j} className="text-[var(--text-primary)] font-semibold">{part}</strong>
                                          : part
                                      )}
                                    </p>
                                  );
                                })}
                              </div>
                              {/* Screenshot */}
                              {imgUrl && (
                                <a href={imgUrl} target="_blank" rel="noopener noreferrer" className="block mt-2">
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img
                                    src={imgUrl}
                                    alt="RuneLite screenshot"
                                    width={400}
                                    height={256}
                                    className="rounded-xl border border-[var(--border-default)] max-w-full max-h-64 object-cover hover:opacity-90 transition-opacity cursor-pointer"
                                  />
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

          {/* Review prompt */}
          {isCompleted && (
            <div className="p-5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-default)]">
              {existingReview ? (
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-400 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium">Your review</p>
                    <div className="flex items-center gap-1 mt-0.5">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className={`h-3.5 w-3.5 ${i < existingReview.rating ? "fill-orange-400 text-orange-400" : "text-[var(--text-muted)]"}`} />
                      ))}
                    </div>
                    {existingReview.comment && (
                      <p className="text-xs text-[var(--text-muted)] mt-1">{existingReview.comment}</p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">How was your experience?</p>
                    <p className="text-xs text-[var(--text-muted)] mt-0.5">Leave a review for this order.</p>
                  </div>
                  <Link
                    href={`/orders/${order.id}/review`}
                    className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors"
                  >
                    Write a review
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right column — order info */}
        <div className="space-y-4">
          <div className="p-5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-default)] space-y-4">
            <h2 className="font-heading font-semibold text-sm">Order info</h2>
            <div className="space-y-2.5 text-sm">
              {/* Items with full config */}
              {order.items && order.items.length > 1 ? (
                <div className="space-y-2">
                  <span className="text-[var(--text-muted)] text-xs">Services ({order.items.length})</span>
                  {order.items.map((item, i) => {
                    const cfg = (item.configuration ?? {}) as Record<string, unknown>;
                    return (
                      <div key={i} className="rounded-lg border border-[var(--border-default)] overflow-hidden">
                        <div className="flex justify-between items-center gap-2 px-2.5 py-2 bg-[var(--bg-elevated)]">
                          <div className="min-w-0">
                            <p className="font-medium text-xs truncate">{formatName(item.serviceName)}</p>
                            <p className="text-[10px] text-[var(--text-muted)]">{formatName(item.gameName)} × {item.quantity}</p>
                          </div>
                          <span className="text-xs font-semibold text-primary flex-shrink-0">{formatUSD(item.finalPrice * item.quantity)}</span>
                        </div>
                        {renderItemConfig(cfg, methodNames, modifierMeta)}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <>
                  <div className="flex justify-between">
                    <span className="text-[var(--text-muted)]">Game</span>
                    <span className="font-medium">{order.game?.name ?? formatName(order.items?.[0]?.gameName ?? "—")}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--text-muted)]">Service</span>
                    <span className="font-medium">{order.service?.name ?? formatName(order.items?.[0]?.serviceName ?? "—")}</span>
                  </div>
                  {/* Single item config */}
                  {order.items?.[0] && (
                    <div className="rounded-lg border border-[var(--border-default)] overflow-hidden">
                      {renderItemConfig((order.items[0].configuration ?? {}) as Record<string, unknown>, methodNames, modifierMeta)}
                    </div>
                  )}
                </>
              )}
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">Payment method</span>
                <span className="font-medium capitalize">{order.payment_method ?? "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">Placed on</span>
                <span className="font-medium">{new Date(order.created_at).toLocaleDateString("en-GB")}</span>
              </div>
              {order.started_at && (
                <div className="flex justify-between">
                  <span className="text-[var(--text-muted)]">Started on</span>
                  <span className="font-medium">{new Date(order.started_at).toLocaleDateString("en-GB")}</span>
                </div>
              )}
              {order.completed_at && (
                <div className="flex justify-between">
                  <span className="text-[var(--text-muted)]">Completed on</span>
                  <span className="font-medium">{new Date(order.completed_at).toLocaleDateString("en-GB")}</span>
                </div>
              )}
            </div>
            <div className="pt-3 border-t border-[var(--border-default)] space-y-2 text-sm">
              {order.discount_amount > 0 && (
                <div className="flex justify-between text-green-400">
                  <span>Discount</span>
                  <span>-{formatUSD(order.discount_amount)}</span>
                </div>
              )}
              {order.tax_amount > 0 && (
                <div className="flex justify-between text-[var(--text-muted)]">
                  <span>VAT</span>
                  <span>{formatUSD(order.tax_amount)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-base">
                <span>Total</span>
                <span className="text-primary">{formatUSD(order.total)}</span>
              </div>
            </div>

            {/* Gold payment status */}
            {order.payment_method === "gold" && order.gold_amount && (
              <div className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border ${order.gold_received ? "bg-green-400/10 border-green-400/20" : "bg-orange-400/10 border-orange-400/20"}`}>
                <Coins className={`h-4 w-4 flex-shrink-0 ${order.gold_received ? "text-green-400" : "text-orange-400"}`} />
                <div>
                  <p className={`text-xs font-medium ${order.gold_received ? "text-green-400" : "text-orange-400"}`}>
                    {order.gold_received ? "Gold received ✓" : "Awaiting gold payment"}
                  </p>
                  <p className="text-xs text-[var(--text-muted)]">
                    {order.gold_amount.toLocaleString("en-US")} GP
                  </p>
                </div>
              </div>
            )}
            {order.loyalty_points_earned > 0 && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-orange-400/10 border border-orange-400/20">
                <Star className="h-4 w-4 text-orange-400" />
                <p className="text-xs text-orange-400 font-medium">+{order.loyalty_points_earned} loyalty points earned</p>
              </div>
            )}
          </div>

          {/* Order details / configuration */}
          {(() => {
            const isMulti = order.items && order.items.length > 1;
            const items = order.items ?? [];
            if (items.length === 0) return null;
            return (
              <div className="p-5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-default)] space-y-3">
                <h2 className="font-heading font-semibold text-sm">Order details</h2>
                {isMulti ? (
                  <div className="space-y-3">
                    {items.map((item, idx) => (
                      <div key={idx} className="rounded-xl border border-[var(--border-default)] overflow-hidden">
                        <div className="px-3 py-2 bg-[var(--bg-elevated)] border-b border-[var(--border-default)] flex items-center justify-between">
                          <span className="text-xs font-semibold">{formatName(item.serviceName)}</span>
                          <span className="text-xs text-[var(--text-muted)]">{formatName(item.gameName)}</span>
                        </div>
                        {renderItemConfig((item.configuration ?? {}) as Record<string, unknown>, methodNames, modifierMeta)}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-xl border border-[var(--border-default)] overflow-hidden">
                    {renderItemConfig((items[0]?.configuration ?? {}) as Record<string, unknown>, methodNames, modifierMeta)}
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
}
