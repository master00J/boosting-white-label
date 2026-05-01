"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Coins, CheckCircle2, Loader2, User, Package,
  MessageSquare, Settings2, Save, Shield, Scissors, X, AlertTriangle,
  Plus, Minus, GripVertical,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { formatUSD, formatGold } from "@/lib/format";
import type { AdminOrderDetail, AdminMessage } from "./page";

const STATUS_OPTIONS = [
  "pending_payment", "paid", "queued", "claimed", "in_progress",
  "paused", "completed", "cancelled", "refunded", "disputed", "split",
];

const STATUS_LABELS: Record<string, string> = {
  pending_payment: "Pending payment",
  paid: "Paid (awaiting release)",
  queued: "Queued",
  claimed: "Claimed",
  in_progress: "In progress",
  paused: "Paused",
  completed: "Completed",
  cancelled: "Cancelled",
  refunded: "Refunded",
  disputed: "Disputed",
  split: "Split",
};

const STATUS_COLORS: Record<string, string> = {
  pending_payment: "text-amber-400 bg-amber-400/10 border-amber-400/20",
  paid: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
  queued: "text-blue-400 bg-blue-400/10 border-blue-400/20",
  claimed: "text-purple-400 bg-purple-400/10 border-purple-400/20",
  in_progress: "text-primary bg-primary/10 border-primary/20",
  paused: "text-orange-400 bg-orange-400/10 border-orange-400/20",
  completed: "text-green-400 bg-green-400/10 border-green-400/20",
  cancelled: "text-red-400 bg-red-400/10 border-red-400/20",
  refunded: "text-zinc-400 bg-zinc-400/10 border-zinc-400/20",
  disputed: "text-red-400 bg-red-400/10 border-red-400/20",
  split: "text-sky-400 bg-sky-400/10 border-sky-400/20",
};

function formatName(name: string): string {
  return name.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

// Extract quest IDs from config — supports { item: "id" } and { quests: ["id",...] }
function getQuestIds(cfg: Record<string, unknown>): string[] {
  const ids: string[] = [];
  if (typeof cfg.item === "string" && cfg.item) ids.push(cfg.item);
  if (Array.isArray(cfg.quests)) ids.push(...(cfg.quests as string[]));
  return ids;
}

// Check if config is a quest order
function isQuestConfig(cfg: Record<string, unknown>): boolean {
  return (typeof cfg.item === "string" && cfg.item !== "") ||
    (Array.isArray(cfg.quests) && (cfg.quests as string[]).length > 0);
}

export default function AdminOrderDetailClient({
  order: initialOrder,
  messages,
  nameMap,
}: {
  order: AdminOrderDetail;
  messages: AdminMessage[];
  nameMap: Record<string, string>;
}) {
  const router = useRouter();
  const [order, setOrder] = useState(initialOrder);
  const [confirmingGold, setConfirmingGold] = useState(false);
  const [savingStatus, setSavingStatus] = useState(false);
  const [savingNotes, setSavingNotes] = useState(false);
  const [adminNotes, setAdminNotes] = useState(order.admin_notes ?? "");
  const [selectedStatus, setSelectedStatus] = useState(order.status);
  const [showSplitModal, setShowSplitModal] = useState(false);
  const [splitting, setSplitting] = useState(false);
  const [splitError, setSplitError] = useState<string | null>(null);
  // groups: array of arrays of item indices — each group becomes one sub-order
  const [groups, setGroups] = useState<number[][]>(() =>
    (order.items ?? []).map((_, i) => [i])
  );

  const confirmGold = async () => {
    setConfirmingGold(true);
    try {
      const res = await fetch("/api/admin/orders/confirm-gold", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: order.id }),
      });
      if (res.ok) {
        setOrder((o) => ({ ...o, gold_received: true, status: "queued", payment_status: "completed" }));
        setSelectedStatus("queued");
      }
    } finally {
      setConfirmingGold(false);
    }
  };

  const saveStatus = async () => {
    setSavingStatus(true);
    try {
      await fetch("/api/admin/orders/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: order.id, status: selectedStatus }),
      });
      setOrder((o) => ({ ...o, status: selectedStatus }));
    } finally {
      setSavingStatus(false);
    }
  };

  const saveNotes = async () => {
    setSavingNotes(true);
    try {
      await fetch("/api/admin/orders/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: order.id, admin_notes: adminNotes }),
      });
      setOrder((o) => ({ ...o, admin_notes: adminNotes }));
    } finally {
      setSavingNotes(false);
    }
  };

  const splitOrder = async () => {
    setSplitting(true);
    setSplitError(null);
    try {
      const res = await fetch("/api/admin/orders/split", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: order.id, groups }),
      });
      const json = await res.json() as { ok?: boolean; error?: string };
      if (!res.ok) {
        setSplitError(json.error ?? "Failed to split order");
        return;
      }
      setShowSplitModal(false);
      router.push("/admin/orders");
    } finally {
      setSplitting(false);
    }
  };

  // Move item at itemIdx from its current group into groupIdx
  const moveToGroup = (itemIdx: number, targetGroupIdx: number) => {
    setGroups(prev => {
      const next = prev.map(g => g.filter(i => i !== itemIdx));
      next[targetGroupIdx] = [...next[targetGroupIdx], itemIdx];
      return next.filter(g => g.length > 0);
    });
  };

  // Split an item out into its own new group
  const splitOut = (itemIdx: number) => {
    setGroups(prev => {
      const next = prev.map(g => g.filter(i => i !== itemIdx));
      return [...next.filter(g => g.length > 0), [itemIdx]];
    });
  };

  // Merge all items in groupIdx into the previous group
  const mergeWithPrev = (groupIdx: number) => {
    if (groupIdx === 0) return;
    setGroups(prev => {
      const next = [...prev];
      next[groupIdx - 1] = [...next[groupIdx - 1], ...next[groupIdx]];
      next.splice(groupIdx, 1);
      return next;
    });
  };

  const openSplitModal = () => {
    setGroups((order.items ?? []).map((_, i) => [i]));
    setSplitError(null);
    setShowSplitModal(true);
  };

  const groupTotal = (grp: number[]) =>
    grp.reduce((sum, i) => sum + (order.items![i].finalPrice * order.items![i].quantity), 0);

  const canSplit =
    !order.is_split &&
    !order.parent_order_id &&
    order.items != null &&
    order.items.length > 1 &&
    ["queued", "paid"].includes(order.status);

  const hasBoss = "boss" in order.configuration;

  const cleanConfigKey = (key: string) =>
    key.replace(/^stat_/, "").replace(/^boss_mod_/, "").replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());

  const resolveConfigValue = (key: string, value: unknown): string => {
    if (key === "boss" && nameMap[String(value)]) return nameMap[String(value)];
    if (Array.isArray(value)) return value.join(", ");
    if (typeof value === "object" && value !== null) return JSON.stringify(value);
    return String(value);
  };

  return (
    <div className="space-y-6">
      {/* Split / group modal */}
      {showSplitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl bg-[var(--bg-card)] border border-[var(--border-default)] shadow-2xl flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="flex items-start justify-between gap-3 p-6 pb-4 border-b border-[var(--border-default)]">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-amber-400/10 border border-amber-400/20">
                  <Scissors className="h-5 w-5 text-amber-400" />
                </div>
                <div>
                  <h2 className="font-heading font-semibold">Split order into groups</h2>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5">
                    {groups.length} sub-order{groups.length !== 1 ? "s" : ""} will be created
                  </p>
                </div>
              </div>
              <button onClick={() => setShowSplitModal(false)} className="p-1.5 rounded-lg hover:bg-white/5 text-[var(--text-muted)] transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Groups */}
            <div className="overflow-y-auto flex-1 p-6 space-y-3">
              {groups.map((grp, gi) => (
                <div key={gi} className="rounded-xl border border-[var(--border-default)] overflow-hidden">
                  {/* Group header */}
                  <div className="flex items-center justify-between px-3 py-2 bg-[var(--bg-elevated)] border-b border-[var(--border-default)]">
                    <span className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                      Sub-order {gi + 1}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-primary">{formatUSD(groupTotal(grp))}</span>
                      {gi > 0 && (
                        <button
                          onClick={() => mergeWithPrev(gi)}
                          title="Merge with previous group"
                          className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-blue-400/10 border border-blue-400/20 text-blue-400 hover:bg-blue-400/20 transition-colors"
                        >
                          <Minus className="h-3 w-3" />
                          Merge up
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Items in this group */}
                  <div className="divide-y divide-[var(--border-subtle)]">
                    {grp.map((itemIdx) => {
                      const item = order.items![itemIdx];
                      const cfg = (item.configuration ?? {}) as Record<string, unknown>;
                      const itemHasBoss = "boss" in cfg;
                      const rawBoss = cfg.boss as string | undefined;
                      const bossName: string | null = itemHasBoss && rawBoss ? (nameMap[rawBoss] ?? formatName(rawBoss)) : null;
                      const questIds = !itemHasBoss ? getQuestIds(cfg) : [];
                      const quests: string[] | null = questIds.length > 0 ? questIds : null;
                      const rawSegs = cfg.route_segments;
                      const segments: Record<string, unknown>[] | null = (!itemHasBoss && Array.isArray(rawSegs) && rawSegs.length > 0)
                        ? rawSegs as Record<string, unknown>[]
                        : null;
                      return (
                        <div key={itemIdx} className="p-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-2 min-w-0">
                              <GripVertical className="h-4 w-4 text-[var(--text-muted)] mt-0.5 flex-shrink-0" />
                              <div className="min-w-0">
                                <p className="text-sm font-medium">{formatName(item.serviceName)}</p>
                                <p className="text-xs text-[var(--text-muted)]">{formatName(item.gameName)} × {item.quantity}</p>
                                {/* Config details */}
                                {bossName && (
                                  <p className="text-xs text-[var(--text-muted)] mt-0.5">Boss: <span className="text-[var(--text-secondary)]">{bossName}</span>{cfg.quantity != null ? ` · ${String(cfg.quantity)} kills` : ""}</p>
                                )}
                                {quests && quests.length > 0 && (
                                  <p className="text-xs text-[var(--text-muted)] mt-0.5">
                                    Quests: <span className="text-[var(--text-secondary)]">{quests.map(q => nameMap[q] ?? formatName(q)).join(", ")}</span>
                                  </p>
                                )}
                                {segments && segments.length > 0 && (
                                  <p className="text-xs text-[var(--text-muted)] mt-0.5">
                                    Levels: <span className="text-[var(--text-secondary)]">{segments.map(s => `${String(s.from_level)}→${String(s.to_level)}`).join(", ")}</span>
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <span className="text-sm font-semibold text-primary">{formatUSD(item.finalPrice * item.quantity)}</span>
                              {/* Move to other group buttons */}
                              {groups.length > 1 && grp.length > 1 && (
                                <button
                                  onClick={() => splitOut(itemIdx)}
                                  title="Split into own sub-order"
                                  className="p-1 rounded hover:bg-white/5 text-[var(--text-muted)] hover:text-amber-400 transition-colors"
                                >
                                  <Plus className="h-3.5 w-3.5" />
                                </button>
                              )}
                              {groups.length > 1 && grp.length === 1 && groups.length > 1 && (
                                <div className="flex gap-1">
                                  {groups.map((_, ti) => ti !== gi && (
                                    <button
                                      key={ti}
                                      onClick={() => moveToGroup(itemIdx, ti)}
                                      title={`Move to sub-order ${ti + 1}`}
                                      className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--bg-elevated)] border border-[var(--border-default)] hover:border-primary/50 hover:text-primary transition-colors"
                                    >
                                      → {ti + 1}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}

              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-400/5 border border-amber-400/20">
                <AlertTriangle className="h-4 w-4 text-amber-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-400/80">
                  The original order will be marked as <strong>split</strong>. Each sub-order can be claimed separately by workers.
                </p>
              </div>

              {splitError && (
                <p className="text-xs text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">{splitError}</p>
              )}
            </div>

            {/* Footer */}
            <div className="flex gap-3 p-6 pt-4 border-t border-[var(--border-default)]">
              <button
                onClick={() => setShowSplitModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-[var(--border-default)] text-sm font-medium hover:bg-white/5 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={splitOrder}
                disabled={splitting || groups.length < 2}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-amber-400 text-black text-sm font-semibold hover:bg-amber-300 disabled:opacity-50 transition-colors"
              >
                {splitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Scissors className="h-4 w-4" />}
                Create {groups.length} sub-orders
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/admin/orders" className="p-2 rounded-lg hover:bg-white/5 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex-1">
          <p className="text-xs font-semibold text-primary uppercase tracking-wider">Order #{order.order_number}</p>
          <h1 className="font-heading text-xl font-semibold">
            {order.items && order.items.length > 1
              ? `${order.items.length} services`
              : order.service?.name ?? formatName(order.items?.[0]?.serviceName ?? "Order")}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {canSplit && (
            <button
              onClick={openSplitModal}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-400/10 border border-amber-400/20 text-amber-400 text-xs font-medium hover:bg-amber-400/20 transition-colors"
            >
              <Scissors className="h-3.5 w-3.5" />
              Split order
            </button>
          )}
          {order.is_split && (
            <span className="text-xs px-2.5 py-1 rounded-full border bg-zinc-400/10 border-zinc-400/20 text-zinc-400 font-medium">
              Split
            </span>
          )}
          {order.parent_order_id && (
            <Link
              href={`/admin/orders/${order.parent_order_id}`}
              className="text-xs px-2.5 py-1 rounded-full border bg-blue-400/10 border-blue-400/20 text-blue-400 font-medium hover:bg-blue-400/20 transition-colors"
            >
              Part of split order →
            </Link>
          )}
          <span className={cn("text-xs px-2.5 py-1 rounded-full border font-medium", STATUS_COLORS[order.status] ?? "")}>
            {STATUS_LABELS[order.status] ?? order.status.replace(/_/g, " ")}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: details */}
        <div className="lg:col-span-2 space-y-5">

          {/* Gold payment action */}
          {order.payment_method === "gold" && !order.gold_received && (
            <div className="p-4 rounded-2xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Coins className="h-5 w-5 text-amber-400 flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-amber-400">Awaiting gold payment</p>
                  {order.gold_amount && (
                    <p className="text-xs text-amber-400/70">{formatGold(order.gold_amount)} required</p>
                  )}
                </div>
              </div>
              <button
                onClick={confirmGold}
                disabled={confirmingGold}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-amber-400 text-black text-sm font-semibold hover:bg-amber-300 disabled:opacity-50 transition-colors"
              >
                {confirmingGold ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                Mark gold received
              </button>
            </div>
          )}
          {order.payment_method === "gold" && order.gold_received && (
            <div className="p-4 rounded-2xl bg-green-400/10 border border-green-400/20 flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-400" />
              <p className="text-sm font-medium text-green-400">Gold received — order activated</p>
            </div>
          )}

          {/* Order configuration */}
          <div className="p-5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-default)] space-y-4">
            <h2 className="font-heading font-semibold text-sm flex items-center gap-2">
              <Package className="h-4 w-4 text-primary" />
              Order configuration
            </h2>

            {/* Multi-item: show config per item */}
            {order.items && order.items.length > 1 ? (
              <div className="space-y-4">
                {order.items.map((item, idx) => {
                  const cfg = (item.configuration ?? {}) as Record<string, unknown>;
                  const itemHasBoss = "boss" in cfg;
                  const itemIsQuest = isQuestConfig(cfg);
                  return (
                    <div key={idx} className="rounded-xl border border-[var(--border-default)] overflow-hidden">
                      <div className="px-3 py-2 bg-[var(--bg-elevated)] border-b border-[var(--border-default)] flex items-center justify-between">
                        <span className="text-xs font-semibold">{formatName(item.serviceName)}</span>
                        <span className="text-xs text-[var(--text-muted)]">{formatName(item.gameName)} × {item.quantity}</span>
                      </div>
                      <div className="p-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                        {/* Quest items: show quest name(s) prominently */}
                        {itemIsQuest && (
                          <div className="col-span-2 space-y-1">
                            <span className="text-[var(--text-muted)] text-xs">Quest{getQuestIds(cfg).length > 1 ? "s" : ""}</span>
                            <div className="space-y-1">
                              {getQuestIds(cfg).map((qid, qi) => (
                                <div key={qi} className="px-2 py-1.5 rounded bg-[var(--bg-elevated)] text-xs font-medium">
                                  {nameMap[qid] ?? formatName(qid)}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {Object.entries(cfg).length === 0 ? (
                          <p className="col-span-2 text-xs text-[var(--text-muted)]">No configuration details</p>
                        ) : Object.entries(cfg).map(([key, value]) => {
                          if (value === null || value === undefined || value === "") return null;
                          // Skip quest keys — already rendered above
                          if (itemIsQuest && (key === "item" || key === "quests")) return null;
                          if (itemHasBoss && ["start_level", "end_level", "quantity", "route_segments", "skill"].includes(key)) return null;

                          if (key === "route_segments" && Array.isArray(value) && value.length > 0) {
                            const segments = value as Record<string, unknown>[];
                            return (
                              <div key={key} className="col-span-2 space-y-1">
                                <span className="text-[var(--text-muted)] text-xs">Route Segments</span>
                                <div className="rounded-lg border border-[var(--border-default)] overflow-hidden">
                                  <table className="w-full text-xs">
                                    <thead>
                                      <tr className="bg-[var(--bg-elevated)] border-b border-[var(--border-default)]">
                                        <th className="text-left px-3 py-1.5 text-[var(--text-muted)] font-medium">Levels</th>
                                        <th className="text-left px-3 py-1.5 text-[var(--text-muted)] font-medium">Method</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {segments.map((seg, i) => (
                                        <tr key={i} className={i < segments.length - 1 ? "border-b border-[var(--border-default)]" : ""}>
                                          <td className="px-3 py-1.5 font-semibold">{String(seg.from_level)} → {String(seg.to_level)}</td>
                                          <td className="px-3 py-1.5 text-[var(--text-muted)]">
                                            {nameMap[String(seg.method_id)] ?? String(seg.method_id ?? "—").replace(/_\d{10,}$/, "").replace(/_/g, " ")}
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            );
                          }

                          if (key === "quests" && Array.isArray(value) && value.length > 0) {
                            return (
                              <div key={key} className="col-span-2 space-y-1">
                                <span className="text-[var(--text-muted)] text-xs">Quests ({value.length})</span>
                                <div className="space-y-1">
                                  {(value as string[]).map((q, i) => (
                                    <div key={i} className="px-2 py-1 rounded bg-[var(--bg-elevated)] text-xs">
                                      {nameMap[q] ?? formatName(q)}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          }

                          return (
                            <div key={key} className="flex justify-between gap-2">
                              <span className="text-[var(--text-muted)] text-xs">{cleanConfigKey(key)}</span>
                              <span className="font-medium text-right text-xs">{resolveConfigValue(key, value)}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* Single item: original layout */
              <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                {Object.entries(order.configuration).map(([key, value]) => {
                  if (value === null || value === undefined || value === "") return null;
                  if (hasBoss && ["start_level", "end_level", "quantity", "route_segments", "skill"].includes(key)) return null;

                  if (key === "route_segments" && Array.isArray(value) && value.length > 0) {
                    const segments = value as Record<string, unknown>[];
                    return (
                      <div key={key} className="col-span-2 space-y-1">
                        <span className="text-[var(--text-muted)] text-xs">Route Segments</span>
                        <div className="rounded-lg border border-[var(--border-default)] overflow-hidden">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="bg-[var(--bg-elevated)] border-b border-[var(--border-default)]">
                                <th className="text-left px-3 py-1.5 text-[var(--text-muted)] font-medium">Levels</th>
                                <th className="text-left px-3 py-1.5 text-[var(--text-muted)] font-medium">Method</th>
                              </tr>
                            </thead>
                            <tbody>
                              {segments.map((seg, i) => (
                                <tr key={i} className={i < segments.length - 1 ? "border-b border-[var(--border-default)]" : ""}>
                                  <td className="px-3 py-1.5 font-semibold">{String(seg.from_level)} → {String(seg.to_level)}</td>
                                  <td className="px-3 py-1.5 text-[var(--text-muted)]">
                                    {nameMap[String(seg.method_id)] ?? String(seg.method_id ?? "—").replace(/_\d{10,}$/, "").replace(/_/g, " ")}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    );
                  }

                  if (key === "quests" && Array.isArray(value) && value.length > 0) {
                    return (
                      <div key={key} className="col-span-2 space-y-1">
                        <span className="text-[var(--text-muted)] text-xs">Quests ({value.length})</span>
                        <div className="space-y-1">
                          {(value as string[]).map((q, i) => (
                            <div key={i} className="px-2 py-1 rounded bg-[var(--bg-elevated)] text-xs">
                              {nameMap[q] ?? formatName(q)}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div key={key} className="flex justify-between gap-2">
                      <span className="text-[var(--text-muted)]">{cleanConfigKey(key)}</span>
                      <span className="font-medium text-right">{resolveConfigValue(key, value)}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Messages */}
          <div className="p-5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-default)] space-y-3">
            <h2 className="font-heading font-semibold text-sm flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-primary" />
              Messages ({messages.length})
            </h2>
            {messages.length === 0 ? (
              <p className="text-xs text-[var(--text-muted)] py-4 text-center">No messages yet.</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {messages.map((msg) => (
                  <div key={msg.id} className={cn(
                    "px-3 py-2 rounded-lg text-sm",
                    msg.is_system
                      ? "bg-[var(--bg-elevated)] text-[var(--text-muted)] text-xs text-center"
                      : "bg-[var(--bg-elevated)]"
                  )}>
                    {!msg.is_system && (
                      <p className="text-[10px] text-[var(--text-muted)] mb-0.5 font-medium">
                        {msg.sender?.display_name ?? "Unknown"} · {msg.sender?.role}
                      </p>
                    )}
                    <p>{msg.content}</p>
                    <p className="text-[10px] text-[var(--text-muted)] mt-0.5">
                      {new Date(msg.created_at).toLocaleString("en-GB")}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Admin notes */}
          <div className="p-5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-default)] space-y-3">
            <h2 className="font-heading font-semibold text-sm flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" />
              Admin notes (internal)
            </h2>
            <textarea
              rows={3}
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              placeholder="Internal notes, not visible to customer..."
              className="w-full px-3 py-2 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-default)] text-sm focus:outline-none focus:border-primary/50 transition-colors resize-none"
            />
            <button
              onClick={saveNotes}
              disabled={savingNotes}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {savingNotes ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
              Save notes
            </button>
          </div>
        </div>

        {/* Right: info + actions */}
        <div className="space-y-4">
          {/* Order info */}
          <div className="p-5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-default)] space-y-4">
            <h2 className="font-heading font-semibold text-sm">Order info</h2>
            <div className="space-y-2.5 text-sm">
              {/* Multi-item list */}
              {order.items && order.items.length > 1 ? (
                <div className="space-y-2">
                  <span className="text-[var(--text-muted)] text-xs">Services ({order.items.length})</span>
                  {order.items.map((item, i) => {
                    const cfg = (item.configuration ?? {}) as Record<string, unknown>;
                    const itemHasBoss = "boss" in cfg;
                    const rawBoss = cfg.boss as string | undefined;
                    const bossName: string | null = itemHasBoss && rawBoss ? (nameMap[rawBoss] ?? formatName(rawBoss)) : null;
                    const questIds = !itemHasBoss ? getQuestIds(cfg) : [];
                    const quests: string[] | null = questIds.length > 0 ? questIds : null;
                    const rawSegments = cfg.route_segments;
                    const segments: Record<string, unknown>[] | null = (!itemHasBoss && Array.isArray(rawSegments) && rawSegments.length > 0)
                      ? (rawSegments as Record<string, unknown>[])
                      : null;
                    const rawQty = cfg.quantity;
                    return (
                      <div key={i} className="rounded-lg border border-[var(--border-default)] overflow-hidden">
                        <div className="flex justify-between items-center gap-2 px-2.5 py-2 bg-[var(--bg-elevated)]">
                          <div className="min-w-0">
                            <p className="font-medium text-xs truncate">{formatName(item.serviceName)}</p>
                            <p className="text-[10px] text-[var(--text-muted)]">{formatName(item.gameName)} × {item.quantity}</p>
                          </div>
                          <span className="text-xs font-semibold text-primary flex-shrink-0">{formatUSD(item.finalPrice * item.quantity)}</span>
                        </div>
                        {/* Config details */}
                        {bossName && (
                          <div className="px-2.5 py-1.5 text-xs flex justify-between border-t border-[var(--border-default)]">
                            <span className="text-[var(--text-muted)]">Boss</span>
                            <span className="font-medium">{bossName}</span>
                          </div>
                        )}
                        {bossName && rawQty != null && (
                          <div className="px-2.5 py-1.5 text-xs flex justify-between border-t border-[var(--border-default)]">
                            <span className="text-[var(--text-muted)]">Kills</span>
                            <span className="font-medium">{String(rawQty)}</span>
                          </div>
                        )}
                        {quests && quests.length > 0 && (
                          <div className="px-2.5 py-1.5 border-t border-[var(--border-default)]">
                            <p className="text-[10px] text-[var(--text-muted)] mb-1">Quest{quests.length > 1 ? "s" : ""}</p>
                            <div className="space-y-0.5">
                              {quests.map((q, qi) => (
                                <p key={qi} className="text-xs font-medium">{nameMap[q] ?? formatName(q)}</p>
                              ))}
                            </div>
                          </div>
                        )}
                        {segments && segments.length > 0 && (
                          <div className="px-2.5 py-1.5 border-t border-[var(--border-default)]">
                            <p className="text-[10px] text-[var(--text-muted)] mb-1">Levels</p>
                            {segments.map((seg, si) => (
                              <p key={si} className="text-xs">
                                {String(seg.from_level)} → {String(seg.to_level)}{" "}
                                <span className="text-[var(--text-muted)]">
                                  ({nameMap[String(seg.method_id)] ?? String(seg.method_id ?? "").replace(/_/g, " ")})
                                </span>
                              </p>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <>
                  <div className="flex justify-between gap-2">
                    <span className="text-[var(--text-muted)]">Game</span>
                    <span className="font-medium">{order.game?.name ?? formatName(order.items?.[0]?.gameName ?? "—")}</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-[var(--text-muted)]">Service</span>
                    <span className="font-medium">{order.service?.name ?? formatName(order.items?.[0]?.serviceName ?? "—")}</span>
                  </div>
                </>
              )}
              {([
                ["Payment", order.payment_method ?? "—"],
                ["Currency", order.currency],
                ["Created", new Date(order.created_at).toLocaleString("en-GB")],
                ...(order.started_at ? [["Started", new Date(order.started_at).toLocaleString("en-GB")]] : []),
                ...(order.completed_at ? [["Completed", new Date(order.completed_at).toLocaleString("en-GB")]] : []),
                ...(order.expires_at ? [["Expires", new Date(order.expires_at).toLocaleString("en-GB")]] : []),
              ] as [string, string][]).map(([label, value]) => (
                <div key={label} className="flex justify-between gap-2">
                  <span className="text-[var(--text-muted)]">{label}</span>
                  <span className="font-medium text-right capitalize">{value}</span>
                </div>
              ))}
            </div>
            <div className="pt-3 border-t border-[var(--border-default)] space-y-1.5 text-sm">
              {order.discount_amount > 0 && (
                <div className="flex justify-between text-green-400">
                  <span>Discount</span><span>-{formatUSD(order.discount_amount)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold">
                <span>Total</span>
                <span className="text-primary">{formatUSD(order.total)}</span>
              </div>
              {order.worker_payout && (
                <div className="flex justify-between text-[var(--text-muted)] text-xs">
                  <span>Worker payout</span>
                  <span>{formatUSD(order.worker_payout)} ({Math.round((order.worker_commission_rate ?? 0) * 100)}%)</span>
                </div>
              )}
            </div>
          </div>

          {/* Customer */}
          <div className="p-5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-default)] space-y-3">
            <h2 className="font-heading font-semibold text-sm flex items-center gap-2">
              <User className="h-4 w-4 text-primary" />
              Customer
            </h2>
            {order.customer ? (
              <div className="space-y-1">
                <p className="font-medium">{order.customer.display_name ?? "—"}</p>
                <p className="text-xs text-[var(--text-muted)]">{order.customer.email}</p>
                <Link
                  href={`/admin/customers/${order.customer.id}`}
                  className="text-xs text-primary hover:underline"
                >
                  View customer →
                </Link>
              </div>
            ) : (
              <p className="text-sm text-[var(--text-muted)]">No customer info</p>
            )}
          </div>

          {/* Release to queue — shown when order is paid but not yet queued */}
          {order.status === "paid" && (
            <div className="p-5 rounded-2xl bg-green-400/10 border border-green-400/20 space-y-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-400" />
                <h2 className="font-heading font-semibold text-sm text-green-400">
                  {order.parent_order_id ? "Sub-order ready" : "Payment confirmed"}
                </h2>
              </div>
              <p className="text-xs text-green-400/70">
                {order.parent_order_id
                  ? "Release this sub-order when a booster is available to work on it. Other sub-orders can be released separately."
                  : "Review the order details, optionally split it, then release it to the queue so boosters can claim it."}
              </p>
              <button
                disabled={savingStatus}
                onClick={async () => {
                  setSavingStatus(true);
                  try {
                    await fetch("/api/admin/orders/update", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ orderId: order.id, status: "queued" }),
                    });
                    setOrder((o) => ({ ...o, status: "queued" }));
                    setSelectedStatus("queued");
                  } finally {
                    setSavingStatus(false);
                  }
                }}
                className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-lg bg-green-400 text-black text-sm font-semibold hover:bg-green-300 disabled:opacity-50 transition-colors"
              >
                {savingStatus ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Release to queue
              </button>
            </div>
          )}

          {/* Status management */}
          <div className="p-5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-default)] space-y-3">
            <h2 className="font-heading font-semibold text-sm flex items-center gap-2">
              <Settings2 className="h-4 w-4 text-primary" />
              Manage status
            </h2>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-[var(--border-default)] bg-[var(--bg-elevated)] text-sm focus:outline-none focus:border-primary transition-colors"
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>{STATUS_LABELS[s] ?? s.replace(/_/g, " ")}</option>
              ))}
            </select>
            <button
              onClick={saveStatus}
              disabled={savingStatus || selectedStatus === order.status}
              className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {savingStatus ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Update status
            </button>
          </div>

          {/* Worker */}
          {order.worker && (
            <div className="p-5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-default)] space-y-2">
              <h2 className="font-heading font-semibold text-sm">Assigned booster</h2>
              <p className="font-medium text-sm">{order.worker.profile?.display_name ?? "—"}</p>
              <p className="text-xs text-[var(--text-muted)]">{order.worker.profile?.email}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
