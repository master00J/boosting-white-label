import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  Package, CheckCircle2, Star, DollarSign,
  ArrowRight, TrendingUp, Zap,
} from "lucide-react";

export const metadata: Metadata = { title: "Dashboard" };

type WorkerRow = {
  id: string;
  tier_id: string | null;
  is_active: boolean;
  total_earned: number;
  pending_balance: number;
  total_orders_completed: number;
  average_rating: number;
  total_ratings: number;
  current_active_orders: number;
  max_active_orders: number;
  commission_rate: number;
};

type TierRow = {
  id: string;
  name: string;
  color: string;
  icon: string;
  min_completed_orders: number;
  min_rating: number;
};

type ActiveOrder = {
  id: string;
  order_number: string;
  status: string;
  progress: number;
  created_at: string;
  service: { name: string } | null;
  game: { name: string } | null;
};

const STATUS_COLOR: Record<string, string> = {
  claimed: "text-blue-400 bg-blue-400/10 border-blue-400/20",
  in_progress: "text-primary bg-primary/10 border-primary/20",
  paused: "text-orange-400 bg-orange-400/10 border-orange-400/20",
};

const STATUS_LABEL: Record<string, string> = {
  claimed: "Claimed",
  in_progress: "In progress",
  paused: "Paused",
};

export default async function WorkerDashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirect=/booster/dashboard");

  const admin = createAdminClient();
  const workerResult = await admin
    .from("workers")
    .select("id, tier_id, is_active, total_earned, pending_balance, total_orders_completed, average_rating, total_ratings, current_active_orders, max_active_orders, commission_rate")
    .eq("profile_id", user.id)
    .single();

  const worker = workerResult.data as WorkerRow | null;
  // No worker record yet — show empty state instead of redirecting
  if (!worker) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
          <Package className="h-8 w-8 text-primary" />
        </div>
        <h1 className="font-heading text-2xl font-semibold">No worker profile found</h1>
        <p className="text-[var(--text-muted)] max-w-sm">
          Your account doesn&apos;t have a worker profile yet. Ask an admin to create one, or apply via the application form.
        </p>
      </div>
    );
  }

  const activeOrdersResult = await admin
    .from("orders")
    .select("id, order_number, status, progress, created_at, service:services(name), game:games(name)")
    .eq("worker_id", worker.id)
    .in("status", ["claimed", "in_progress", "paused"])
    .order("created_at", { ascending: false })
    .limit(5);

  let tier: TierRow | null = null;
  let nextTier: TierRow | null = null;

  if (worker.tier_id) {
    const { data: tierData } = await supabase
      .from("worker_tiers")
      .select("id, name, color, icon, min_completed_orders, min_rating")
      .eq("id", worker.tier_id)
      .single();
    tier = tierData as TierRow | null;

    const { data: tiers } = await supabase
      .from("worker_tiers")
      .select("id, name, color, icon, min_completed_orders, min_rating")
      .order("sort_order", { ascending: true });

    if (tiers && tier) {
      const idx = (tiers as TierRow[]).findIndex((t) => t.id === tier!.id);
      nextTier = (tiers as TierRow[])[idx + 1] ?? null;
    }
  }

  const activeOrders = (activeOrdersResult.data as ActiveOrder[] | null) ?? [];

  const ordersForNextTier = nextTier
    ? Math.max(0, nextTier.min_completed_orders - worker.total_orders_completed)
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-1">Booster Dashboard</p>
          <h1 className="font-heading text-2xl font-semibold">Overview</h1>
        </div>
        {tier && (
          <div
            className="flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-semibold"
            style={{ color: tier.color, borderColor: `${tier.color}40`, backgroundColor: `${tier.color}15` }}
          >
            <span>{tier.icon}</span>
            <span>{tier.name}</span>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Active orders", value: worker.current_active_orders, sub: `/ ${worker.max_active_orders} max`, icon: Zap, color: "text-primary" },
          { label: "Completed orders", value: worker.total_orders_completed, sub: "total", icon: CheckCircle2, color: "text-green-400" },
          { label: "Average rating", value: worker.average_rating.toFixed(1), sub: `${worker.total_ratings} reviews`, icon: Star, color: "text-orange-400" },
          { label: "Pending balance", value: `$${worker.pending_balance.toFixed(2)}`, sub: "awaiting payout", icon: DollarSign, color: "text-blue-400" },
        ].map((stat) => (
          <div key={stat.label} className="p-4 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-default)]">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-[var(--text-muted)]">{stat.label}</p>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </div>
            <p className={`font-heading text-2xl font-bold ${stat.color}`}>{stat.value}</p>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">{stat.sub}</p>
          </div>
        ))}
      </div>

      {/* Tier progress */}
      {nextTier && (
        <div className="p-5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-default)]">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-heading font-semibold text-sm">Tier progress</h2>
            <div
              className="text-xs px-2 py-0.5 rounded-full border font-medium"
              style={{ color: nextTier.color, borderColor: `${nextTier.color}40`, backgroundColor: `${nextTier.color}15` }}
            >
              {nextTier.icon} {nextTier.name}
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-[var(--text-muted)]">
              <span>Completed orders</span>
              <span>{worker.total_orders_completed} / {nextTier.min_completed_orders}</span>
            </div>
            <div className="h-2 bg-[var(--bg-elevated)] rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-primary to-primary/70 rounded-full transition-all"
                style={{ width: `${Math.min(100, (worker.total_orders_completed / nextTier.min_completed_orders) * 100)}%` }}
              />
            </div>
            <p className="text-xs text-[var(--text-muted)]">
              <span className="font-semibold text-primary">{ordersForNextTier} more orders</span> needed for {nextTier.name}
            </p>
          </div>
        </div>
      )}

      {/* Earnings summary */}
      <div className="p-5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-default)]">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-heading font-semibold text-sm">Earnings</h2>
          <Link href="/booster/earnings" className="text-xs text-primary hover:underline flex items-center gap-1">
            Details <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-[var(--text-muted)] mb-1">Total earned</p>
            <p className="font-heading text-xl font-bold text-green-400">${worker.total_earned.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-xs text-[var(--text-muted)] mb-1">Commission</p>
            <p className="font-heading text-xl font-bold text-primary">{(worker.commission_rate * 100).toFixed(0)}%</p>
          </div>
        </div>
      </div>

      {/* Active orders */}
      <div className="p-5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-default)]">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-heading font-semibold text-sm">Active orders</h2>
          <Link href="/booster/orders/active" className="text-xs text-primary hover:underline flex items-center gap-1">
            View all <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        {activeOrders.length === 0 ? (
          <div className="text-center py-8">
            <Package className="h-8 w-8 text-[var(--text-muted)] mx-auto mb-2" />
            <p className="text-sm text-[var(--text-secondary)]">No active orders</p>
            <Link href="/booster/orders" className="inline-flex items-center gap-1 mt-3 text-xs text-primary hover:underline">
              View available orders <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {activeOrders.map((order) => (
              <Link
                key={order.id}
                href={`/booster/orders/${order.id}`}
                className="flex items-center gap-4 p-3 rounded-xl hover:bg-white/5 transition-colors group"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{order.service?.name ?? "Service"}</p>
                  <p className="text-xs text-[var(--text-muted)]">{order.game?.name} · #{order.order_number}</p>
                  {order.progress > 0 && (
                    <div className="mt-1.5 flex items-center gap-2">
                      <div className="h-1 bg-[var(--bg-elevated)] rounded-full overflow-hidden w-24">
                        <div className="h-full bg-primary rounded-full" style={{ width: `${order.progress}%` }} />
                      </div>
                      <span className="text-xs text-[var(--text-muted)]">{order.progress}%</span>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${STATUS_COLOR[order.status] ?? ""}`}>
                    {STATUS_LABEL[order.status] ?? order.status}
                  </span>
                  <ArrowRight className="h-3.5 w-3.5 text-[var(--text-muted)] group-hover:text-primary transition-colors" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {[
          { href: "/booster/orders", label: "Available orders", icon: Package, color: "text-primary" },
          { href: "/booster/earnings", label: "Earnings", icon: TrendingUp, color: "text-green-400" },
          { href: "/booster/earnings/payouts", label: "Payouts", icon: DollarSign, color: "text-orange-400" },
        ].map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex items-center gap-3 p-4 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-default)] hover:border-primary/30 transition-colors group"
          >
            <item.icon className={`h-5 w-5 ${item.color}`} />
            <span className="text-sm font-medium">{item.label}</span>
            <ArrowRight className="h-3.5 w-3.5 text-[var(--text-muted)] group-hover:text-primary ml-auto transition-colors" />
          </Link>
        ))}
      </div>
    </div>
  );
}
