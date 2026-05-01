"use client";

import { useState, useMemo } from "react";
import {
  Package,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  Search,
  ChevronDown,
  AlertCircle,
  Sword,
  Filter,
  MessageSquare,
  User,
  Calendar,
} from "lucide-react";
import type { ItemDelivery } from "./page";

type DeliveryStatus = "pending" | "in_progress" | "delivered" | "cancelled";

const STATUS_CONFIG: Record<
  DeliveryStatus,
  { label: string; color: string; bg: string; icon: React.ElementType }
> = {
  pending: {
    label: "Pending",
    color: "text-amber-400",
    bg: "bg-amber-500/15 border-amber-500/30",
    icon: Clock,
  },
  in_progress: {
    label: "In Progress",
    color: "text-blue-400",
    bg: "bg-blue-500/15 border-blue-500/30",
    icon: Loader2,
  },
  delivered: {
    label: "Delivered",
    color: "text-green-400",
    bg: "bg-green-500/15 border-green-500/30",
    icon: CheckCircle2,
  },
  cancelled: {
    label: "Cancelled",
    color: "text-red-400",
    bg: "bg-red-500/15 border-red-500/30",
    icon: XCircle,
  },
};

const INPUT_CLS =
  "w-full px-3 py-2 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-default)] text-sm focus:outline-none focus:border-primary/50 transition-colors";

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/* ─── Delivery Row Component ─── */
function DeliveryRow({
  delivery,
  onUpdate,
}: {
  delivery: ItemDelivery;
  onUpdate: (id: string, updates: Partial<ItemDelivery>) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notes, setNotes] = useState(delivery.delivery_notes ?? "");
  const [error, setError] = useState("");

  const snap = delivery.prize_snapshot as Record<string, unknown>;
  const itemName = (snap?.name as string) ?? "Unknown item";
  const itemImage = snap?.image_url as string | undefined;
  const itemValue = snap?.prize_value ? `~$${Number(snap.prize_value).toFixed(2)}` : null;
  const rarity = (snap?.rarity as string) ?? "common";

  const cfg = STATUS_CONFIG[delivery.delivery_status] ?? STATUS_CONFIG.pending;
  const StatusIcon = cfg.icon;

  const updateStatus = async (newStatus: DeliveryStatus) => {
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/lootbox-opens/${delivery.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ delivery_status: newStatus, delivery_notes: notes }),
      });
      if (!res.ok) throw new Error("Update failed");
      const data = await res.json();
      onUpdate(delivery.id, {
        delivery_status: data.delivery_status,
        delivery_notes: data.delivery_notes,
        delivered_at: data.delivered_at,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setSaving(false);
    }
  };

  const saveNotes = async () => {
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/lootbox-opens/${delivery.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ delivery_notes: notes }),
      });
      if (!res.ok) throw new Error("Update failed");
      const data = await res.json();
      onUpdate(delivery.id, { delivery_notes: data.delivery_notes });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-2xl bg-[var(--bg-card)] border border-[var(--border-default)] overflow-hidden">
      {/* Main row */}
      <div
        className="flex items-center gap-4 p-4 cursor-pointer hover:bg-white/[0.02] transition-colors"
        onClick={() => setExpanded((p) => !p)}
      >
        {/* Item icon */}
        <div className="w-12 h-12 rounded-xl bg-[var(--bg-elevated)] flex items-center justify-center flex-shrink-0 overflow-hidden">
          {itemImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={itemImage} alt={itemName} width={40} height={40} className="object-contain" />
          ) : (
            <Sword className="h-5 w-5 text-primary" />
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-sm truncate">{itemName}</p>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${cfg.bg} ${cfg.color} flex items-center gap-1`}
            >
              <StatusIcon className="h-3 w-3" />
              {cfg.label}
            </span>
            <span className="text-[10px] capitalize px-1.5 py-0.5 rounded-full bg-white/5 text-[var(--text-muted)]">
              {rarity}
            </span>
          </div>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            <span className="flex items-center gap-1 text-xs text-[var(--text-muted)]">
              <User className="h-3 w-3" />
              {delivery.profiles?.email ?? delivery.profile_id.slice(0, 8)}
            </span>
            <span className="text-xs text-[var(--text-muted)]">
              {delivery.lootboxes?.name ?? "Unknown box"}
            </span>
            {itemValue && (
              <span className="text-xs font-semibold text-primary">{itemValue}</span>
            )}
          </div>
        </div>

        {/* Won date + chevron */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="text-right hidden sm:block">
            <p className="text-xs text-[var(--text-muted)]">Won</p>
            <p className="text-xs font-medium">{timeAgo(delivery.created_at)}</p>
          </div>
          <ChevronDown
            className={`h-4 w-4 text-[var(--text-muted)] transition-transform ${expanded ? "rotate-180" : ""}`}
          />
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="border-t border-[var(--border-default)] p-4 bg-[var(--bg-elevated)]/40 space-y-4">
          {/* Customer & dates */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3 rounded-xl bg-[var(--bg-elevated)] space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Customer</p>
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-primary flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium">{delivery.profiles?.username ?? "—"}</p>
                  <p className="text-xs text-[var(--text-muted)]">{delivery.profiles?.email}</p>
                </div>
              </div>
            </div>
            <div className="p-3 rounded-xl bg-[var(--bg-elevated)] space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Timeline</p>
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs">
                  <Calendar className="h-3.5 w-3.5 text-[var(--text-muted)]" />
                  <span className="text-[var(--text-muted)]">Won:</span>
                  <span>{formatDate(delivery.created_at)}</span>
                </div>
                {delivery.delivered_at && (
                  <div className="flex items-center gap-2 text-xs">
                    <CheckCircle2 className="h-3.5 w-3.5 text-green-400" />
                    <span className="text-[var(--text-muted)]">Delivered:</span>
                    <span className="text-green-400">{formatDate(delivery.delivered_at)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-2">
              <MessageSquare className="inline h-3.5 w-3.5 mr-1" />
              Admin Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add delivery notes, Discord username of the booster, RS username, etc…"
              rows={3}
              className={`${INPUT_CLS} resize-none`}
            />
            <div className="flex justify-end mt-2">
              <button
                onClick={saveNotes}
                disabled={saving || notes === (delivery.delivery_notes ?? "")}
                className="px-3 py-1.5 rounded-lg bg-[var(--bg-elevated)] text-xs font-medium border border-[var(--border-default)] hover:bg-white/10 disabled:opacity-40 transition-colors"
              >
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Save notes"}
              </button>
            </div>
          </div>

          {/* Status actions */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-2">Update Status</p>
            <div className="flex flex-wrap gap-2">
              {delivery.delivery_status !== "in_progress" && delivery.delivery_status !== "delivered" && (
                <button
                  onClick={() => updateStatus("in_progress")}
                  disabled={saving}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border bg-blue-500/10 border-blue-500/30 text-blue-400 hover:bg-blue-500/20 disabled:opacity-40 transition-colors"
                >
                  <Loader2 className="h-3.5 w-3.5" /> Mark In Progress
                </button>
              )}
              {delivery.delivery_status !== "delivered" && (
                <button
                  onClick={() => updateStatus("delivered")}
                  disabled={saving}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border bg-green-500/10 border-green-500/30 text-green-400 hover:bg-green-500/20 disabled:opacity-40 transition-colors"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" /> Mark Delivered
                </button>
              )}
              {delivery.delivery_status !== "cancelled" && delivery.delivery_status !== "delivered" && (
                <button
                  onClick={() => updateStatus("cancelled")}
                  disabled={saving}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20 disabled:opacity-40 transition-colors"
                >
                  <XCircle className="h-3.5 w-3.5" /> Cancel
                </button>
              )}
              {delivery.delivery_status === "delivered" && (
                <button
                  onClick={() => updateStatus("pending")}
                  disabled={saving}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20 disabled:opacity-40 transition-colors"
                >
                  <Clock className="h-3.5 w-3.5" /> Revert to Pending
                </button>
              )}
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-xs text-red-400">
              <AlertCircle className="h-3.5 w-3.5" /> {error}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════
   Main Client Component
══════════════════════════════════════════════ */
export default function DeliveriesClient({
  initialDeliveries,
  stats,
}: {
  initialDeliveries: ItemDelivery[];
  stats: { pending: number; in_progress: number; delivered: number };
}) {
  const [deliveries, setDeliveries] = useState<ItemDelivery[]>(initialDeliveries);
  const [filterStatus, setFilterStatus] = useState<"all" | DeliveryStatus>("all");
  const [search, setSearch] = useState("");

  const handleUpdate = (id: string, updates: Partial<ItemDelivery>) => {
    setDeliveries((prev) =>
      prev.map((d) => (d.id === id ? { ...d, ...updates } : d))
    );
  };

  const filtered = useMemo(() => {
    let result = deliveries;
    if (filterStatus !== "all") {
      result = result.filter((d) => d.delivery_status === filterStatus);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((d) => {
        const snap = d.prize_snapshot as Record<string, unknown>;
        const itemName = ((snap?.name as string) ?? "").toLowerCase();
        const email = (d.profiles?.email ?? "").toLowerCase();
        const username = (d.profiles?.username ?? "").toLowerCase();
        return itemName.includes(q) || email.includes(q) || username.includes(q);
      });
    }
    return result;
  }, [deliveries, filterStatus, search]);

  const statCards = [
    {
      label: "Pending",
      value: stats.pending,
      icon: Clock,
      color: "text-amber-400",
      bg: "border-amber-500/20",
    },
    {
      label: "In Progress",
      value: stats.in_progress,
      icon: Loader2,
      color: "text-blue-400",
      bg: "border-blue-500/20",
    },
    {
      label: "Delivered",
      value: stats.delivered,
      icon: CheckCircle2,
      color: "text-green-400",
      bg: "border-green-500/20",
    },
  ];

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-1">
          Marketing · Lootboxes
        </p>
        <h1 className="font-heading text-2xl font-semibold">OSRS Item Deliveries</h1>
        <p className="text-sm text-[var(--text-muted)] mt-1">
          Track and manage in-game item prizes won from lootboxes.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {statCards.map(({ label, value, icon: Icon, color, bg }) => (
          <div
            key={label}
            className={`p-4 rounded-2xl bg-[var(--bg-card)] border ${bg}`}
          >
            <div className="flex items-center gap-2 mb-1">
              <Icon className={`h-4 w-4 ${color}`} />
              <span className="text-xs font-medium text-[var(--text-muted)]">{label}</span>
            </div>
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* How it works */}
      <div className="p-4 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border-default)]">
        <div className="flex items-start gap-3">
          <Package className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
          <div className="text-sm text-[var(--text-secondary)] space-y-1">
            <p className="font-semibold text-white text-xs uppercase tracking-wider">How delivery works</p>
            <p>When a customer wins an OSRS item from a lootbox, they&apos;re told to open a support ticket to claim it. Each won item appears here automatically with status <strong>Pending</strong>.</p>
            <p>Workflow: <strong className="text-amber-400">Pending</strong> → <strong className="text-blue-400">In Progress</strong> → <strong className="text-green-400">Delivered</strong>. Use the notes field to log the delivering booster&apos;s name, RS username, and trade confirmation.</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)]" />
          <input
            type="text"
            placeholder="Search by item name, email, or username…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={`${INPUT_CLS} pl-9`}
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-[var(--text-muted)] flex-shrink-0" />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as typeof filterStatus)}
            className={`${INPUT_CLS} w-auto`}
          >
            <option value="all">All statuses</option>
            <option value="pending">Pending</option>
            <option value="in_progress">In Progress</option>
            <option value="delivered">Delivered</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Results count */}
      {(search || filterStatus !== "all") && (
        <p className="text-xs text-[var(--text-muted)]">
          Showing {filtered.length} of {deliveries.length} deliveries
        </p>
      )}

      {/* Deliveries list */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-[var(--text-muted)]">
            <Package className="h-10 w-10 mx-auto mb-3 opacity-25" />
            <p className="text-sm font-medium">No item deliveries found</p>
            <p className="text-xs mt-1 opacity-60">
              {deliveries.length === 0
                ? "OSRS item prizes won from lootboxes will appear here."
                : "Try adjusting your search or filter."}
            </p>
          </div>
        ) : (
          filtered.map((delivery) => (
            <DeliveryRow
              key={delivery.id}
              delivery={delivery}
              onUpdate={handleUpdate}
            />
          ))
        )}
      </div>
    </div>
  );
}
