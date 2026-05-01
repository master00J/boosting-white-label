import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Package, ArrowRight } from "lucide-react";

export const metadata: Metadata = { title: "Active orders" };

type ActiveOrder = {
  id: string;
  order_number: string;
  status: string;
  progress: number;
  worker_payout: number | null;
  created_at: string;
  claimed_at: string | null;
  estimated_completion: string | null;
  service: { name: string } | null;
  game: { name: string } | null;
};

const STATUS_LABEL: Record<string, string> = {
  claimed: "Claimed",
  in_progress: "In progress",
  paused: "Paused",
};

const STATUS_COLOR: Record<string, string> = {
  claimed: "text-blue-400 bg-blue-400/10 border-blue-400/20",
  in_progress: "text-primary bg-primary/10 border-primary/20",
  paused: "text-orange-400 bg-orange-400/10 border-orange-400/20",
};

export default async function ActiveOrdersPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirect=/booster/orders/active");

  const admin = createAdminClient();

  // Resolve worker.id (workers PK) from profile_id — orders.worker_id references workers.id
  const { data: workerRow } = await admin
    .from("workers")
    .select("id")
    .eq("profile_id", user.id)
    .single() as unknown as { data: { id: string } | null };

  const { data: orders, error } = await admin
    .from("orders")
    .select("id, order_number, status, progress, worker_payout, created_at, claimed_at, estimated_completion, service:services(name), game:games(name)")
    .eq("worker_id", workerRow?.id ?? "")
    .in("status", ["claimed", "in_progress", "paused"])
    .order("claimed_at", { ascending: false });

  if (error) throw error;

  const typedOrders = (orders as ActiveOrder[] | null) ?? [];

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-1">Orders</p>
        <h1 className="font-heading text-2xl font-semibold">Active orders</h1>
      </div>

      {typedOrders.length === 0 ? (
        <div className="text-center py-20 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-default)]">
          <Package className="h-12 w-12 text-[var(--text-muted)] mx-auto mb-3" />
          <p className="font-medium text-[var(--text-secondary)]">No active orders</p>
          <Link href="/booster/orders" className="inline-flex items-center gap-1 mt-3 text-sm text-primary hover:underline">
            View available orders <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {typedOrders.map((order) => (
            <Link
              key={order.id}
              href={`/booster/orders/${order.id}`}
              className="block p-5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-default)] hover:border-primary/30 transition-colors group"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                      #{order.order_number}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${STATUS_COLOR[order.status] ?? ""}`}>
                      {STATUS_LABEL[order.status] ?? order.status}
                    </span>
                  </div>
                  <h3 className="font-medium">{order.service?.name ?? "Service"}</h3>
                  <p className="text-sm text-[var(--text-muted)]">{order.game?.name}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <div className="h-1.5 bg-[var(--bg-elevated)] rounded-full overflow-hidden w-32">
                      <div className="h-full bg-primary rounded-full" style={{ width: `${order.progress}%` }} />
                    </div>
                    <span className="text-xs text-[var(--text-muted)]">{order.progress}%</span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <span className="font-heading font-bold text-green-400">
                    ${(order.worker_payout ?? 0).toFixed(2)}
                  </span>
                  {order.estimated_completion && (
                    <span className="text-xs text-[var(--text-muted)]">
                      Deadline: {new Date(order.estimated_completion).toLocaleDateString("en-US")}
                    </span>
                  )}
                  <ArrowRight className="h-4 w-4 text-[var(--text-muted)] group-hover:text-primary transition-colors mt-1" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
