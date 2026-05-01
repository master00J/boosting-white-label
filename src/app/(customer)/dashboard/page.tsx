import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";
import Link from "next/link";
import { Package, Clock, CheckCircle2, ArrowRight, Zap } from "lucide-react";

export const metadata: Metadata = { title: "Dashboard" };

type OrderRow = {
  id: string;
  order_number: string;
  status: string;
  total: number;
  progress: number;
  created_at: string;
  service: { name: string } | null;
  game: { name: string; logo_url: string | null } | null;
};

const STATUS_LABEL: Record<string, string> = {
  pending_payment: "Awaiting payment",
  paid: "Paid",
  queued: "In queue",
  claimed: "Claimed",
  in_progress: "In progress",
  paused: "Paused",
  completed: "Completed",
  cancelled: "Cancelled",
  refunded: "Refunded",
  disputed: "Disputed",
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

export default async function CustomerDashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirect=/dashboard");

  const [ordersSettled, profileSettled] = await Promise.allSettled([
    supabase
      .from("orders")
      .select("id, order_number, status, total, progress, created_at, service:services(name), game:games(name, logo_url)")
      .eq("customer_id", user.id)
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("profiles")
      .select("display_name, balance, total_spent")
      .eq("id", user.id)
      .single(),
  ]);

  const ordersResult = ordersSettled.status === "fulfilled" ? ordersSettled.value : null;
  const profileResult = profileSettled.status === "fulfilled" ? profileSettled.value : null;

  const orders: OrderRow[] = (ordersResult?.error ? null : ordersResult?.data) ?? [];
  const profile = (profileResult?.error
    ? null
    : profileResult?.data ?? null) as unknown as { display_name: string | null; balance: number; total_spent: number } | null;

  const activeOrders = orders.filter((o) => ["queued", "claimed", "in_progress", "paused"].includes(o.status));
  const completedOrders = orders.filter((o) => o.status === "completed");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-1">Dashboard</p>
        <h1 className="font-heading text-2xl font-semibold">
          Welcome back{profile?.display_name ? `, ${profile.display_name}` : ""}!
        </h1>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Active orders", value: activeOrders.length, icon: Zap, color: "text-primary" },
          { label: "Completed orders", value: completedOrders.length, icon: CheckCircle2, color: "text-green-400" },
          { label: "Total spent", value: `\$${(profile?.total_spent ?? 0).toFixed(2)}`, icon: Package, color: "text-orange-400" },
          { label: "Balance", value: `\$${(profile?.balance ?? 0).toFixed(2)}`, icon: Clock, color: "text-blue-400" },
        ].map((stat) => (
          <div key={stat.label} className="p-4 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-default)]">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-[var(--text-muted)]">{stat.label}</p>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </div>
            <p className={`font-heading text-2xl font-bold ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Active orders */}
      {activeOrders.length > 0 && (
        <div className="p-5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-default)]">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-heading font-semibold">Active orders</h2>
            <Link href="/orders" className="text-xs text-primary hover:underline flex items-center gap-1">
              All orders <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="space-y-3">
            {activeOrders.map((order) => (
              <Link
                key={order.id}
                href={`/orders/${order.id}`}
                className="flex items-center gap-4 p-3 rounded-xl hover:bg-white/5 transition-colors group"
              >
                <div className="w-10 h-10 rounded-lg bg-[var(--bg-elevated)] flex items-center justify-center flex-shrink-0 text-lg">
                  🎮
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{order.service?.name ?? "Service"}</p>
                  <p className="text-xs text-[var(--text-muted)]">{order.game?.name} · #{order.order_number}</p>
                  {order.progress > 0 && (
                    <div className="mt-1.5 h-1 bg-[var(--bg-elevated)] rounded-full overflow-hidden w-32">
                      <div
                        className="h-full bg-primary rounded-full transition-all"
                        style={{ width: `${order.progress}%` }}
                      />
                    </div>
                  )}
                </div>
                <div className="text-right flex-shrink-0">
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${STATUS_COLOR[order.status] ?? ""}`}>
                    {STATUS_LABEL[order.status] ?? order.status}
                  </span>
                  <p className="text-xs text-[var(--text-muted)] mt-1">{order.progress}%</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Recent orders */}
      <div className="p-5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-default)]">
        <div className="flex items-center justify-between mb-4">
            <h2 className="font-heading font-semibold">Recent orders</h2>
          <Link href="/orders" className="text-xs text-primary hover:underline flex items-center gap-1">
            All orders <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        {orders.length === 0 ? (
          <div className="text-center py-10">
            <Package className="h-10 w-10 text-[var(--text-muted)] mx-auto mb-3" />
            <p className="text-sm font-medium text-[var(--text-secondary)]">No orders yet</p>
            <p className="text-xs text-[var(--text-muted)] mt-1">Choose a game and order your first service.</p>
            <Link
              href="/games"
              className="inline-flex items-center gap-1.5 mt-4 px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              Browse games <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {orders.map((order) => (
              <Link
                key={order.id}
                href={`/orders/${order.id}`}
                className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{order.service?.name ?? "Service"}</p>
                  <p className="text-xs text-[var(--text-muted)]">
                    #{order.order_number} · {new Date(order.created_at).toLocaleDateString("en-GB")}
                  </p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full border flex-shrink-0 ${STATUS_COLOR[order.status] ?? ""}`}>
                  {STATUS_LABEL[order.status] ?? order.status}
                </span>
                <span className="text-sm font-semibold text-[var(--text-secondary)] flex-shrink-0">
                  \${order.total.toFixed(2)}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
