import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, ArrowRight } from "lucide-react";

export const metadata: Metadata = { title: "Order history" };

type HistoryOrder = {
  id: string;
  order_number: string;
  status: string;
  worker_payout: number | null;
  completed_at: string | null;
  created_at: string;
  service: { name: string } | null;
  game: { name: string } | null;
};

export default async function OrderHistoryPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirect=/booster/orders/history");

  const admin = createAdminClient();

  // Resolve worker.id (workers PK) from profile_id — orders.worker_id references workers.id
  const { data: workerRow } = await admin
    .from("workers")
    .select("id")
    .eq("profile_id", user.id)
    .single() as unknown as { data: { id: string } | null };

  const { data: orders, error } = await admin
    .from("orders")
    .select("id, order_number, status, worker_payout, completed_at, created_at, service:services(name), game:games(name)")
    .eq("worker_id", workerRow?.id ?? "")
    .in("status", ["completed", "cancelled", "refunded"])
    .order("completed_at", { ascending: false })
    .limit(100);

  if (error) throw error;

  const typedOrders = (orders as HistoryOrder[] | null) ?? [];
  const completed = typedOrders.filter((o) => o.status === "completed");
  const totalEarned = completed.reduce((sum, o) => sum + (o.worker_payout ?? 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-1">Orders</p>
          <h1 className="font-heading text-2xl font-semibold">Order history</h1>
        </div>
        <div className="text-right">
          <p className="text-xs text-[var(--text-muted)]">Total earned</p>
          <p className="font-heading font-bold text-green-400">${totalEarned.toFixed(2)}</p>
        </div>
      </div>

      {typedOrders.length === 0 ? (
        <div className="text-center py-20 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-default)]">
          <CheckCircle2 className="h-12 w-12 text-[var(--text-muted)] mx-auto mb-3" />
          <p className="font-medium text-[var(--text-secondary)]">No completed orders yet</p>
        </div>
      ) : (
        <div className="rounded-2xl bg-[var(--bg-card)] border border-[var(--border-default)] overflow-hidden">
          <div className="divide-y divide-[var(--border-default)]">
            {typedOrders.map((order) => (
              <Link
                key={order.id}
                href={`/booster/orders/${order.id}`}
                className="flex items-center gap-4 px-5 py-3.5 hover:bg-white/5 transition-colors group"
              >
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${order.status === "completed" ? "bg-green-400" : "bg-red-400"}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{order.service?.name ?? "Service"}</p>
                  <p className="text-xs text-[var(--text-muted)]">
                    {order.game?.name} · #{order.order_number} · {new Date(order.completed_at ?? order.created_at).toLocaleDateString("en-US")}
                  </p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <div className="text-right">
                    <p className={`text-sm font-bold ${order.status === "completed" ? "text-green-400" : "text-[var(--text-muted)]"}`}>
                      {order.status === "completed" ? `+$${(order.worker_payout ?? 0).toFixed(2)}` : "—"}
                    </p>
                    <p className="text-xs text-[var(--text-muted)] capitalize">{order.status}</p>
                  </div>
                  <ArrowRight className="h-3.5 w-3.5 text-[var(--text-muted)] group-hover:text-primary transition-colors" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
