import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import Link from "next/link";
import { DollarSign, TrendingUp, Clock, ArrowRight, CheckCircle2, Package } from "lucide-react";

export const metadata: Metadata = { title: "Earnings" };

type CompletedOrder = {
  id: string;
  order_number: string;
  worker_payout: number | null;
  completed_at: string | null;
  service: { name: string } | null;
  game: { name: string } | null;
};

export default async function EarningsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirect=/booster/earnings");

  const admin = createAdminClient();

  // Fetch worker first to get worker.id (workers PK) — orders.worker_id references workers.id
  const workerResult = await admin
    .from("workers")
    .select("id, total_earned, pending_balance, commission_rate, total_orders_completed")
    .eq("profile_id", user.id)
    .single();

  const worker = workerResult.data as { id: string; total_earned: number; pending_balance: number; commission_rate: number; total_orders_completed: number } | null;

  if (!worker) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
          <Package className="h-8 w-8 text-primary" />
        </div>
        <h1 className="font-heading text-2xl font-semibold">No worker profile found</h1>
        <p className="text-[var(--text-muted)] max-w-sm">
          Your account doesn&apos;t have a worker profile yet. Ask an admin to create one.
        </p>
      </div>
    );
  }

  const ordersResult = await admin
    .from("orders")
    .select("id, order_number, worker_payout, completed_at, service:services(name), game:games(name)")
    .eq("worker_id", worker.id)
    .eq("status", "completed")
    .order("completed_at", { ascending: false })
    .limit(30);

  const orders = (ordersResult.data as CompletedOrder[] | null) ?? [];

  // Group by month
  const byMonth: Record<string, { count: number; total: number }> = {};
  for (const o of orders) {
    if (!o.completed_at) continue;
    const month = o.completed_at.slice(0, 7);
    if (!byMonth[month]) byMonth[month] = { count: 0, total: 0 };
    byMonth[month].count++;
    byMonth[month].total += o.worker_payout ?? 0;
  }
  const months = Object.entries(byMonth).sort((a, b) => b[0].localeCompare(a[0])).slice(0, 6);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-1">Booster</p>
          <h1 className="font-heading text-2xl font-semibold">Earnings</h1>
        </div>
        <Link
          href="/booster/earnings/payouts"
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          Payouts <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total earned", value: `$${worker.total_earned.toFixed(2)}`, icon: TrendingUp, color: "text-green-400" },
          { label: "Pending balance", value: `$${worker.pending_balance.toFixed(2)}`, icon: Clock, color: "text-orange-400" },
          { label: "Commission", value: `${(worker.commission_rate * 100).toFixed(0)}%`, icon: DollarSign, color: "text-primary" },
          { label: "Completed orders", value: worker.total_orders_completed, icon: CheckCircle2, color: "text-blue-400" },
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

      {/* Monthly breakdown */}
      {months.length > 0 && (
        <div className="p-5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-default)]">
          <h2 className="font-heading font-semibold text-sm mb-4">Monthly breakdown</h2>
          <div className="space-y-3">
            {months.map(([month, data]) => {
              const maxTotal = Math.max(...months.map(([, d]) => d.total));
              const pct = maxTotal > 0 ? (data.total / maxTotal) * 100 : 0;
              const [year, m] = month.split("-");
              const label = new Date(Number(year), Number(m) - 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
              return (
                <div key={month} className="flex items-center gap-3">
                  <span className="text-xs text-[var(--text-muted)] w-28 flex-shrink-0 capitalize">{label}</span>
                  <div className="flex-1 h-2 bg-[var(--bg-elevated)] rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-sm font-semibold text-green-400 w-20 text-right flex-shrink-0">
                    ${data.total.toFixed(2)}
                  </span>
                  <span className="text-xs text-[var(--text-muted)] w-12 text-right flex-shrink-0">
                    {data.count}x
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent completed orders */}
      <div className="rounded-2xl bg-[var(--bg-card)] border border-[var(--border-default)] overflow-hidden">
        <div className="px-5 py-4 border-b border-[var(--border-default)]">
          <h2 className="font-heading font-semibold text-sm">Recent completed orders</h2>
        </div>
        {orders.length === 0 ? (
          <div className="text-center py-12">
            <DollarSign className="h-10 w-10 text-[var(--text-muted)] mx-auto mb-3" />
            <p className="text-sm text-[var(--text-secondary)]">No completed orders yet</p>
          </div>
        ) : (
          <div className="divide-y divide-[var(--border-default)]">
            {orders.map((order) => (
              <div key={order.id} className="flex items-center gap-4 px-5 py-3.5">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{order.service?.name ?? "Service"}</p>
                  <p className="text-xs text-[var(--text-muted)]">
                    {order.game?.name} · #{order.order_number} · {order.completed_at ? new Date(order.completed_at).toLocaleDateString("en-US") : "—"}
                  </p>
                </div>
                <span className="text-sm font-bold text-green-400 flex-shrink-0">
                  +${(order.worker_payout ?? 0).toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
