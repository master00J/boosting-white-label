"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Package, Search, ChevronRight } from "lucide-react";

type OrderRow = {
  id: string;
  order_number: string;
  status: string;
  total: number;
  progress: number;
  payment_method: string | null;
  created_at: string;
  items: Array<{ serviceName: string; gameName: string }> | null;
  item_count: number | null;
  service: { name: string } | null;
  game: { name: string; logo_url: string | null } | null;
};

const STATUS_LABEL: Record<string, string> = {
  pending_payment: "Awaiting payment",
  paid: "Queued",
  queued: "In queue",
  claimed: "Booster assigned",
  in_progress: "In progress",
  paused: "Paused",
  completed: "Completed",
  cancelled: "Cancelled",
  refunded: "Refunded",
  disputed: "Disputed",
  split: "In progress",
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
  split: "text-primary bg-primary/10 border-primary/20",
};

const FILTERS = [
  { key: "all", label: "All" },
  { key: "active", label: "Active" },
  { key: "completed", label: "Completed" },
  { key: "cancelled", label: "Cancelled" },
];

const ACTIVE_STATUSES = ["queued", "claimed", "in_progress", "paused", "paid"];

function formatName(name: string): string {
  return name.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function OrdersClient({ initialOrders }: { initialOrders: OrderRow[] }) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");

  const filtered = useMemo(() => {
    return initialOrders.filter((o) => {
      const matchSearch =
        !search ||
        o.order_number.toLowerCase().includes(search.toLowerCase()) ||
        (o.service?.name ?? o.items?.[0]?.serviceName ?? "").toLowerCase().includes(search.toLowerCase()) ||
        (o.game?.name ?? o.items?.[0]?.gameName ?? "").toLowerCase().includes(search.toLowerCase());

      const matchFilter =
        filter === "all" ||
        (filter === "active" && ACTIVE_STATUSES.includes(o.status)) ||
        (filter === "completed" && o.status === "completed") ||
        (filter === "cancelled" && ["cancelled", "refunded"].includes(o.status));

      return matchSearch && matchFilter;
    });
  }, [initialOrders, search, filter]);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-1">My account</p>
        <h1 className="font-heading text-2xl font-semibold">Orders</h1>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)]" />
          <input
            type="text"
            placeholder="Search by order number, service or game..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-[var(--bg-card)] border border-[var(--border-default)] text-sm placeholder:text-[var(--text-muted)] focus:outline-none focus:border-primary/50 transition-colors"
          />
        </div>
        <div className="flex gap-1 p-1 rounded-xl bg-[var(--bg-card)] border border-[var(--border-default)]">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                filter === f.key
                  ? "bg-primary text-white"
                  : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="rounded-2xl bg-[var(--bg-card)] border border-[var(--border-default)] overflow-hidden">
        {filtered.length === 0 ? (
          <div className="text-center py-16">
            <Package className="h-10 w-10 text-[var(--text-muted)] mx-auto mb-3" />
            <p className="text-sm font-medium text-[var(--text-secondary)]">No orders found</p>
          </div>
        ) : (
          <div className="divide-y divide-[var(--border-default)]">
            {filtered.map((order) => (
              <Link
                key={order.id}
                href={`/orders/${order.id}`}
                className="flex items-center gap-4 p-4 hover:bg-white/5 transition-colors group"
              >
                <div className="w-10 h-10 rounded-xl bg-[var(--bg-elevated)] flex items-center justify-center flex-shrink-0 text-lg">
                  🎮
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {order.items && order.items.length > 1
                      ? `${order.items.length} services`
                      : order.service?.name ?? formatName(order.items?.[0]?.serviceName ?? "Service")}
                  </p>
                  <p className="text-xs text-[var(--text-muted)]">
                    {order.items && order.items.length > 1
                      ? order.items.map(i => formatName(i.gameName)).filter((v, i, a) => a.indexOf(v) === i).join(", ")
                      : (order.game?.name ?? formatName(order.items?.[0]?.gameName ?? ""))}
                    {" · "}#{order.order_number} · {new Date(order.created_at).toLocaleDateString("en-GB")}
                  </p>
                  {ACTIVE_STATUSES.includes(order.status) && order.progress > 0 && (
                    <div className="mt-1.5 flex items-center gap-2">
                      <div className="h-1 bg-[var(--bg-elevated)] rounded-full overflow-hidden w-24">
                        <div className="h-full bg-primary rounded-full" style={{ width: `${order.progress}%` }} />
                      </div>
                      <span className="text-xs text-[var(--text-muted)]">{order.progress}%</span>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${STATUS_COLOR[order.status] ?? ""}`}>
                    {STATUS_LABEL[order.status] ?? order.status}
                  </span>
                  <span className="text-sm font-semibold">\${order.total.toFixed(2)}</span>
                  <ChevronRight className="h-4 w-4 text-[var(--text-muted)] group-hover:text-primary transition-colors" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
