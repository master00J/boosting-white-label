"use client";

import { useState, useMemo } from "react";
import { Coins, CheckCircle2, Clock, Package, Loader2, ChevronRight, PlayCircle, ChevronDown, GitBranch, Filter, X } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { formatUSD, formatGold } from "@/lib/format";

interface Order {
  id: string;
  order_number: string;
  status: string;
  payment_method: string | null;
  payment_status: string;
  gold_amount: number | null;
  gold_received: boolean | null;
  total: number;
  currency: string;
  created_at: string;
  customer: { id: string; display_name: string | null; email: string } | null;
  service: { name: string } | null;
  game: { name: string } | null;
  items: Array<{ serviceName: string; gameName: string; quantity: number; finalPrice: number }> | null;
  item_count: number | null;
  parent_order_id: string | null;
}

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

const STATUS_LABELS: Record<string, string> = {
  pending_payment: "Pending payment",
  paid: "Awaiting release",
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

function ServiceCell({ order }: { order: Order }) {
  return (
    <td className="px-4 py-3">
      <p className="text-sm truncate max-w-[120px]">
        {order.items && order.items.length > 1
          ? `${order.items.length} services`
          : order.service?.name ?? order.items?.[0]?.serviceName ?? "—"}
      </p>
      <p className="text-[10px] text-[var(--text-muted)]">
        {order.items && order.items.length > 1
          ? order.items.map(i => i.gameName).filter((v, i, a) => a.indexOf(v) === i).join(", ")
          : order.game?.name ?? order.items?.[0]?.gameName ?? ""}
      </p>
    </td>
  );
}

function PaymentCell({ order }: { order: Order }) {
  const isGoldPending = order.payment_method === "gold" && !order.gold_received;
  const isGoldReceived = order.payment_method === "gold" && order.gold_received;
  return (
    <td className="px-4 py-3">
      <div className="flex items-center gap-1.5">
        {order.payment_method === "gold" ? (
          <>
            <Coins className="h-3.5 w-3.5 text-amber-400" />
            <span className="text-amber-400 font-medium text-xs">Gold</span>
            {isGoldPending && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-400/10 border border-amber-400/20 text-amber-400">Pending</span>}
            {isGoldReceived && <CheckCircle2 className="h-3.5 w-3.5 text-green-400" />}
          </>
        ) : (
          <span className="capitalize text-xs text-[var(--text-muted)]">{order.payment_method ?? "—"}</span>
        )}
      </div>
      {order.gold_amount && <p className="text-[10px] text-[var(--text-muted)] mt-0.5">{formatGold(order.gold_amount)}</p>}
    </td>
  );
}

interface RowProps {
  order: Order;
  indent: boolean;
  confirmingId: string | null;
  releasingId: string | null;
  onRelease: (e: React.MouseEvent, id: string) => void;
  onConfirmGold: (e: React.MouseEvent, id: string) => void;
  isLast?: boolean;
}

function OrderRow({ order, indent, confirmingId, releasingId, onRelease, onConfirmGold, isLast }: RowProps) {
  const isGoldPending = order.payment_method === "gold" && !order.gold_received;
  return (
    <tr
      onClick={() => window.location.href = `/admin/orders/${order.id}`}
      className={cn(
        "hover:bg-white/[0.06] transition-colors group cursor-pointer",
        isGoldPending && "bg-amber-400/[0.03]",
        indent && "bg-[var(--bg-elevated)]/40"
      )}
    >
      <td className="px-4 py-3">
        {indent ? (
          <div className="flex items-center gap-2">
            <div className={cn(
              "flex-shrink-0 w-px self-stretch bg-[var(--border-default)] ml-3",
              isLast && "h-1/2 self-start"
            )} />
            <div className="w-3 h-px bg-[var(--border-default)] flex-shrink-0" />
            <div>
              <p className="font-mono font-medium text-xs text-primary">{order.order_number}</p>
              <p className="text-[10px] text-[var(--text-muted)] mt-0.5">{order.id.slice(0, 8)}…</p>
            </div>
          </div>
        ) : (
          <>
            <p className="font-mono font-medium text-xs text-primary">{order.order_number}</p>
            <p className="text-[10px] text-[var(--text-muted)] mt-0.5">{order.id.slice(0, 8)}…</p>
          </>
        )}
      </td>
      <td className="px-4 py-3">
        {indent ? (
          <p className="text-[10px] text-[var(--text-muted)]">↳ sub-order</p>
        ) : (
          <>
            <p className="text-sm font-medium truncate max-w-[140px]">{order.customer?.display_name ?? "—"}</p>
            <p className="text-[10px] text-[var(--text-muted)] truncate max-w-[140px]">{order.customer?.email ?? ""}</p>
          </>
        )}
      </td>
      <ServiceCell order={order} />
      <td className="px-4 py-3">
        <span className={cn(
          "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border",
          STATUS_COLORS[order.status] ?? "text-[var(--text-muted)] bg-[var(--bg-elevated)] border-[var(--border-default)]"
        )}>
          {STATUS_LABELS[order.status] ?? order.status.replace(/_/g, " ")}
        </span>
      </td>
      <PaymentCell order={order} />
      <td className="px-4 py-3 font-medium text-sm">{formatUSD(order.total)}</td>
      <td className="px-4 py-3 text-[var(--text-muted)] text-xs whitespace-nowrap">
        <div className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {new Date(order.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
          {" "}{new Date(order.created_at).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          {order.status === "paid" && (
            <button onClick={(e) => onRelease(e, order.id)} disabled={releasingId === order.id}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-green-400/10 border border-green-400/20 text-green-400 text-xs font-medium hover:bg-green-400/20 transition-colors disabled:opacity-50 whitespace-nowrap">
              {releasingId === order.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <PlayCircle className="h-3 w-3" />}
              Release
            </button>
          )}
          {isGoldPending && (
            <button onClick={(e) => onConfirmGold(e, order.id)} disabled={confirmingId === order.id}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-400/10 border border-amber-400/20 text-amber-400 text-xs font-medium hover:bg-amber-400/20 transition-colors disabled:opacity-50 whitespace-nowrap">
              {confirmingId === order.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
              Mark received
            </button>
          )}
          <ChevronRight className="h-4 w-4 text-[var(--text-muted)] group-hover:text-[var(--text-primary)] transition-colors" />
        </div>
      </td>
    </tr>
  );
}

interface GroupRowsProps {
  parent: Order;
  subOrders: Order[];
  isCollapsed: boolean;
  onToggle: (id: string, e: React.MouseEvent) => void;
  confirmingId: string | null;
  releasingId: string | null;
  onRelease: (e: React.MouseEvent, id: string) => void;
  onConfirmGold: (e: React.MouseEvent, id: string) => void;
}

function OrderGroupRows({ parent, subOrders, isCollapsed, onToggle, confirmingId, releasingId, onRelease, onConfirmGold }: GroupRowsProps) {
  const children = subOrders;
  return (
    <>
      {/* Parent row */}
      <tr
        onClick={() => window.location.href = `/admin/orders/${parent.id}`}
        className="hover:bg-white/[0.06] transition-colors group cursor-pointer border-b border-[var(--border-default)]"
      >
        <td className="px-4 py-3">
          <p className="font-mono font-medium text-xs text-primary">{parent.order_number}</p>
          <p className="text-[10px] text-[var(--text-muted)] mt-0.5">{parent.id.slice(0, 8)}…</p>
        </td>
        <td className="px-4 py-3">
          <p className="text-sm font-medium truncate max-w-[140px]">{parent.customer?.display_name ?? "—"}</p>
          <p className="text-[10px] text-[var(--text-muted)] truncate max-w-[140px]">{parent.customer?.email ?? ""}</p>
        </td>
        <ServiceCell order={parent} />
        <td className="px-4 py-3">
          <span className={cn(
            "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border",
            STATUS_COLORS[parent.status] ?? "text-[var(--text-muted)] bg-[var(--bg-elevated)] border-[var(--border-default)]"
          )}>
            {STATUS_LABELS[parent.status] ?? parent.status.replace(/_/g, " ")}
          </span>
        </td>
        <PaymentCell order={parent} />
        <td className="px-4 py-3 font-medium text-sm">{formatUSD(parent.total)}</td>
        <td className="px-4 py-3 text-[var(--text-muted)] text-xs whitespace-nowrap">
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {new Date(parent.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            {" "}{new Date(parent.created_at).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
          </div>
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            {children.length > 0 && (
              <button
                onClick={(e) => onToggle(parent.id, e)}
                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-sky-400/10 border border-sky-400/20 text-sky-400 text-xs font-medium hover:bg-sky-400/20 transition-colors whitespace-nowrap"
              >
                <GitBranch className="h-3 w-3" />
                {children.length} sub
                <ChevronDown className={cn("h-3 w-3 transition-transform", isCollapsed && "-rotate-90")} />
              </button>
            )}
            <ChevronRight className="h-4 w-4 text-[var(--text-muted)] group-hover:text-[var(--text-primary)] transition-colors" />
          </div>
        </td>
      </tr>
      {/* Sub-order rows */}
      {!isCollapsed && children.map((child, idx) => (
        <OrderRow
          key={child.id}
          order={child}
          indent={true}
          isLast={idx === children.length - 1}
          confirmingId={confirmingId}
          releasingId={releasingId}
          onRelease={onRelease}
          onConfirmGold={onConfirmGold}
        />
      ))}
    </>
  );
}

// Build grouped structure: split parents with their sub-orders nested.
// allOrders is the full unfiltered list (to always find sub-orders),
// filteredOrders is what determines which rows to show.
function buildOrderGroups(filteredOrders: Order[], allOrders: Order[]): Array<{ parent: Order; children: Order[] } | { parent: null; order: Order }> {
  // Build children map from ALL orders so sub-orders are never lost
  const childrenMap = new Map<string, Order[]>();
  for (const o of allOrders) {
    if (o.parent_order_id) {
      const arr = childrenMap.get(o.parent_order_id) ?? [];
      arr.push(o);
      childrenMap.set(o.parent_order_id, arr);
    }
  }

  const result: Array<{ parent: Order; children: Order[] } | { parent: null; order: Order }> = [];
  for (const o of filteredOrders) {
    if (o.parent_order_id) continue; // sub-orders are rendered inside their parent
    if (o.status === "split") {
      result.push({ parent: o, children: childrenMap.get(o.id) ?? [] });
    } else {
      result.push({ parent: null, order: o });
    }
  }
  return result;
}

function getOrderGame(o: Order): string {
  if (o.game?.name) return o.game.name;
  if (o.items && o.items.length > 0) {
    const names = [...new Set(o.items.map(i => i.gameName).filter(Boolean))];
    if (names.length > 0) return names[0];
  }
  return "";
}

export default function OrdersAdminClient({ initialOrders }: { initialOrders: Order[] }) {
  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [releasingId, setReleasingId] = useState<string | null>(null);
  const [quickFilter, setQuickFilter] = useState<"all" | "gold_pending" | "paid_pending">("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [gameFilter, setGameFilter] = useState<string>("all");
  // Split groups collapsed by default
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(() => {
    const s = new Set<string>();
    for (const o of initialOrders) { if (o.status === "split") s.add(o.id); }
    return s;
  });

  const goldPendingCount = orders.filter((o) => o.payment_method === "gold" && !o.gold_received).length;
  const paidPendingCount = orders.filter((o) => o.status === "paid").length;

  // Unique games across all orders
  const allGames = useMemo(() => {
    const names = new Set<string>();
    for (const o of orders) {
      const g = getOrderGame(o);
      if (g) names.add(g);
    }
    return [...names].sort();
  }, [orders]);

  // All statuses present
  const allStatuses = useMemo(() => {
    const s = new Set<string>();
    for (const o of orders) s.add(o.status);
    return [...s].sort();
  }, [orders]);

  const filteredOrders = useMemo(() => {
    let list = orders;
    // Quick filter tabs
    if (quickFilter === "gold_pending") list = list.filter((o) => o.payment_method === "gold" && !o.gold_received);
    else if (quickFilter === "paid_pending") list = list.filter((o) => o.status === "paid");
    // Status dropdown
    if (statusFilter !== "all") list = list.filter((o) => o.status === statusFilter);
    // Game dropdown
    if (gameFilter !== "all") list = list.filter((o) => getOrderGame(o) === gameFilter);
    return list;
  }, [orders, quickFilter, statusFilter, gameFilter]);

  const activeFilterCount = (statusFilter !== "all" ? 1 : 0) + (gameFilter !== "all" ? 1 : 0);

  const toggleGroup = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else { next.add(id); }
      return next;
    });
  };

  const releaseOrder = async (e: React.MouseEvent, orderId: string) => {
    e.stopPropagation();
    setReleasingId(orderId);
    try {
      const res = await fetch("/api/admin/orders/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, status: "queued" }),
      });
      if (res.ok) {
        setOrders((prev) => prev.map((o) =>
          o.id === orderId ? { ...o, status: "queued" } : o
        ));
      }
    } finally {
      setReleasingId(null);
    }
  };

  const confirmGold = async (e: React.MouseEvent, orderId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setConfirmingId(orderId);
    try {
      const res = await fetch("/api/admin/orders/confirm-gold", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId }),
      });
      if (res.ok) {
        setOrders((prev) => prev.map((o) =>
          o.id === orderId
            ? { ...o, gold_received: true, status: "queued", payment_status: "completed" }
            : o
        ));
      }
    } finally {
      setConfirmingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-1">Admin</p>
          <h1 className="font-heading text-2xl font-semibold">Orders</h1>
        </div>
        {goldPendingCount > 0 && (
          <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-400/10 border border-amber-400/20 text-amber-400 text-sm font-medium">
            <Coins className="h-4 w-4" />
            {goldPendingCount} awaiting gold
          </span>
        )}
      </div>

      {/* Quick filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {[
          { id: "all" as const, label: "All orders" },
          { id: "paid_pending" as const, label: `Awaiting release${paidPendingCount > 0 ? ` (${paidPendingCount})` : ""}` },
          { id: "gold_pending" as const, label: `Awaiting gold${goldPendingCount > 0 ? ` (${goldPendingCount})` : ""}` },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setQuickFilter(tab.id)}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
              quickFilter === tab.id
                ? "bg-primary text-white"
                : "bg-[var(--bg-card)] border border-[var(--border-default)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Advanced filters row */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
          <Filter className="h-3.5 w-3.5" />
          <span className="font-medium">Filter</span>
        </div>

        {/* Status dropdown */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-1.5 rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-primary transition-colors cursor-pointer"
        >
          <option value="all">All statuses</option>
          {allStatuses.map((s) => (
            <option key={s} value={s}>{STATUS_LABELS[s] ?? s.replace(/_/g, " ")}</option>
          ))}
        </select>

        {/* Game dropdown */}
        <select
          value={gameFilter}
          onChange={(e) => setGameFilter(e.target.value)}
          className="px-3 py-1.5 rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-primary transition-colors cursor-pointer"
        >
          <option value="all">All games</option>
          {allGames.map((g) => (
            <option key={g} value={g}>{g}</option>
          ))}
        </select>

        {/* Clear filters */}
        {activeFilterCount > 0 && (
          <button
            onClick={() => { setStatusFilter("all"); setGameFilter("all"); }}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-red-400/10 border border-red-400/20 text-red-400 text-xs font-medium hover:bg-red-400/20 transition-colors"
          >
            <X className="h-3 w-3" />
            Clear ({activeFilterCount})
          </button>
        )}

        <span className="ml-auto text-xs text-[var(--text-muted)]">
          {filteredOrders.filter(o => !o.parent_order_id).length} orders
        </span>
      </div>

      {/* Orders table */}
      <div className="rounded-2xl bg-[var(--bg-card)] border border-[var(--border-default)] overflow-hidden">
        {filteredOrders.length === 0 ? (
          <div className="p-12 text-center text-[var(--text-muted)]">
            <Package className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p>No orders match the current filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border-default)]">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Order</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Customer</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Service</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Payment</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Total</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Date</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {buildOrderGroups(filteredOrders, orders).map((entry) => {
                  if ("order" in entry) {
                    return <OrderRow key={entry.order.id} order={entry.order} indent={false}
                      confirmingId={confirmingId} releasingId={releasingId}
                      onRelease={releaseOrder} onConfirmGold={confirmGold} />;
                  }
                  const { parent, children } = entry;
                  const isCollapsed = collapsedGroups.has(parent.id);
                  return (
                    <OrderGroupRows
                      key={parent.id}
                      parent={parent}
                      subOrders={children}
                      isCollapsed={isCollapsed}
                      onToggle={toggleGroup}
                      confirmingId={confirmingId}
                      releasingId={releasingId}
                      onRelease={releaseOrder}
                      onConfirmGold={confirmGold}
                    />
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <p className="text-xs text-[var(--text-muted)]">Showing last 100 orders. Refresh the page to see new orders.</p>
    </div>
  );
}
