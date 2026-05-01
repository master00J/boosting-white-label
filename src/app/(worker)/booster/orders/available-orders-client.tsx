"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Package, Clock, DollarSign, Loader2, AlertCircle, GitBranch } from "lucide-react";

type AvailableOrder = {
  id: string;
  order_number: string;
  status: string;
  total: number;
  worker_payout: number | null;
  configuration: Record<string, unknown>;
  created_at: string;
  items: Array<{ serviceName: string; gameName: string; quantity: number; finalPrice: number }> | null;
  item_count: number | null;
  parent_order_id: string | null;
  service: { name: string; estimated_hours: number | null } | null;
  game: { name: string; logo_url: string | null } | null;
  required_tier_name: string | null;
  required_tier_sort_order: number | null;
  account_value: number | null;
};

function formatName(name: string): string {
  return name.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function AvailableOrdersClient({
  orders,
  _workerId,
  canClaim,
  currentActive,
  maxActive,
  workerTierSortOrder = 0,
  workerAvailableDeposit = 0,
}: {
  orders: AvailableOrder[];
  _workerId: string;
  canClaim: boolean;
  currentActive: number;
  maxActive: number;
  workerTierSortOrder?: number;
  workerAvailableDeposit?: number;
}) {
  const [claiming, setClaiming] = useState<string | null>(null);
  const [error, setError] = useState("");
  const router = useRouter();

  const canClaimOrder = (order: AvailableOrder) => {
    if (!canClaim) return false;
    if (order.required_tier_sort_order != null && workerTierSortOrder < order.required_tier_sort_order) return false;
    const orderVal = order.account_value ?? 0;
    if (orderVal > 0 && workerAvailableDeposit < orderVal) return false;
    return true;
  };

  const claimOrder = async (orderId: string) => {
    const order = orders.find((o) => o.id === orderId);
    if (!order || !canClaimOrder(order) || claiming) return;
    setClaiming(orderId);
    setError("");
    try {
      const res = await fetch(`/api/worker/orders/${orderId}/claim`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Claim failed. Please try again.");
        return;
      }
      router.push(`/booster/orders/${orderId}`);
      router.refresh();
    } finally {
      setClaiming(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-1">Orders</p>
          <h1 className="font-heading text-2xl font-semibold">Available orders</h1>
        </div>
        <div className="text-right">
          <p className="text-xs text-[var(--text-muted)]">Active slots</p>
          <p className="text-sm font-bold">
            <span className={currentActive >= maxActive ? "text-red-400" : "text-primary"}>{currentActive}</span>
            <span className="text-[var(--text-muted)]"> / {maxActive}</span>
          </p>
        </div>
      </div>

      {!canClaim && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-orange-400/10 border border-orange-400/20">
          <AlertCircle className="h-5 w-5 text-orange-400 flex-shrink-0" />
          <p className="text-sm text-orange-400">
            You have reached the maximum number of active orders ({maxActive}). Complete an order to claim new ones.
          </p>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-red-400/10 border border-red-400/20">
          <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0" />
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {orders.length === 0 ? (
        <div className="text-center py-20 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-default)]">
          <Package className="h-12 w-12 text-[var(--text-muted)] mx-auto mb-3" />
          <p className="font-medium text-[var(--text-secondary)]">No available orders</p>
          <p className="text-sm text-[var(--text-muted)] mt-1">There are currently no orders in the queue.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <div
              key={order.id}
              className="relative p-5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-default)] hover:border-primary/30 transition-colors group"
            >
              {/* Clickable overlay covering the whole card except the claim button */}
              <Link
                href={`/booster/orders/${order.id}`}
                className="absolute inset-0 rounded-2xl"
                aria-label={`View order #${order.order_number}`}
              />
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                      #{order.order_number}
                    </span>
                    {order.parent_order_id && (
                      <span className="flex items-center gap-1 text-xs text-blue-400 bg-blue-400/10 border border-blue-400/20 px-2 py-0.5 rounded-full">
                        <GitBranch className="h-3 w-3" />
                        Split order
                      </span>
                    )}
                    <span className="text-xs text-[var(--text-muted)]">
                      {new Date(order.created_at).toLocaleDateString("en-US")}
                    </span>
                  </div>
                  <h3 className="font-medium">
                    {order.items && order.items.length > 1
                      ? `${order.items.length} services`
                      : order.service?.name ?? formatName(order.items?.[0]?.serviceName ?? "Service")}
                  </h3>
                  <p className="text-sm text-[var(--text-muted)]">
                    {order.items && order.items.length > 1
                      ? order.items.map(i => formatName(i.gameName)).filter((v, i, a) => a.indexOf(v) === i).join(", ")
                      : order.game?.name ?? formatName(order.items?.[0]?.gameName ?? "")}
                  </p>

                  {/* Config details */}
                  {(() => {
                    const cfg = order.configuration as Record<string, unknown>;
                    const modLabels = cfg._mod_labels as Record<string, string> | undefined;
                    // Build meaningful config tags: skip technical keys, show readable values
                    const visibleEntries = Object.entries(cfg).filter(([k]) =>
                      !k.startsWith("quest_mod_") &&
                      !k.startsWith("stat_") &&
                      !k.startsWith("route_") &&
                      k !== "_mod_labels"
                    ).slice(0, 3);
                    const upchargeLabels = modLabels ? Object.values(modLabels) : [];
                    if (visibleEntries.length === 0 && upchargeLabels.length === 0) return null;
                    return (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {visibleEntries.map(([key, val]) => {
                          const displayVal = Array.isArray(val)
                            ? (val as string[]).map(v => formatName(String(v))).join(", ")
                            : formatName(String(val));
                          return (
                            <span key={key} className="text-xs px-2 py-0.5 rounded-md bg-[var(--bg-elevated)] text-[var(--text-muted)]">
                              {formatName(key)}: <span className="text-[var(--text-secondary)]">{displayVal}</span>
                            </span>
                          );
                        })}
                        {upchargeLabels.slice(0, 3).map((label, i) => (
                          <span key={`upcharge-${i}`} className="text-xs px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            +{label}
                          </span>
                        ))}
                        {upchargeLabels.length > 3 && (
                          <span className="text-xs px-2 py-0.5 rounded-md bg-[var(--bg-elevated)] text-[var(--text-muted)]">
                            +{upchargeLabels.length - 3} more
                          </span>
                        )}
                      </div>
                    );
                  })()}
                </div>

                <div className="relative z-10 flex flex-col items-end gap-2 flex-shrink-0">
                  <div className="text-right">
                    <div className="flex items-center gap-1 text-green-400">
                      <DollarSign className="h-3.5 w-3.5" />
                      <span className="font-heading font-bold text-lg">
                        {(order.worker_payout ?? order.total * 0.7).toFixed(2)}
                      </span>
                    </div>
                    <p className="text-xs text-[var(--text-muted)]">your payout</p>
                  </div>

                  {order.service?.estimated_hours && (
                    <div className="flex items-center gap-1 text-xs text-[var(--text-muted)]">
                      <Clock className="h-3 w-3" />
                      ~{order.service.estimated_hours}h
                    </div>
                  )}

                  {order.account_value != null && order.account_value > 0 && (
                    <p className="text-xs text-[var(--text-muted)]">
                      Account value: ${order.account_value.toFixed(0)}
                    </p>
                  )}
                  {order.required_tier_name && !canClaimOrder(order) && (workerTierSortOrder < (order.required_tier_sort_order ?? 0)) && (
                    <p className="text-xs text-amber-400" title="Your rank is too low for this order">
                      Requires: {order.required_tier_name}
                    </p>
                  )}
                  {order.account_value != null && order.account_value > 0 && workerAvailableDeposit < order.account_value && (
                    <p className="text-xs text-amber-400" title="Your available deposit is too low">
                      Requires deposit ≥ ${order.account_value.toFixed(0)}
                    </p>
                  )}

                  <button
                    onClick={() => claimOrder(order.id)}
                    disabled={!canClaimOrder(order) || claiming === order.id}
                    className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5"
                  >
                    {claiming === order.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : null}
                    Claim
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
