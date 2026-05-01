import type { Metadata } from "next";
import Link from "next/link";
import { AlertCircle, CheckCircle2, Clock, Package, ShieldCheck } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatUSD } from "@/lib/format";
import { cn } from "@/lib/utils/cn";

export const metadata: Metadata = { title: "Track order" };
export const dynamic = "force-dynamic";

type TrackSearchParams = Promise<{ token?: string }>;

type OrderItem = {
  serviceName?: string | null;
  gameName?: string | null;
  quantity?: number | null;
  finalPrice?: number | null;
};

function statusLabel(status: string | null) {
  switch (status) {
    case "pending_payment": return "Awaiting payment";
    case "paid": return "Payment confirmed";
    case "queued": return "Waiting for booster";
    case "claimed": return "Booster assigned";
    case "in_progress": return "In progress";
    case "paused": return "Paused";
    case "completed": return "Completed";
    case "cancelled": return "Cancelled";
    case "refunded": return "Refunded";
    default: return "Order received";
  }
}

function stepState(orderStatus: string | null, step: "paid" | "queued" | "claimed" | "in_progress" | "completed") {
  const order = ["pending_payment", "paid", "queued", "claimed", "in_progress", "completed"];
  const current = order.indexOf(orderStatus ?? "pending_payment");
  const target = order.indexOf(step);
  return current >= target || orderStatus === "completed";
}

export default async function TrackOrderPage({ searchParams }: { searchParams: TrackSearchParams }) {
  const { token } = await searchParams;

  if (!token) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-20 text-center">
        <AlertCircle className="mx-auto mb-4 h-12 w-12 text-orange-400" />
        <h1 className="font-heading text-3xl font-bold text-white">Tracking token required</h1>
        <p className="mt-3 text-zinc-400">Open the tracking link from your order confirmation to view live order progress.</p>
        <Link href="/orders" className="mt-6 inline-flex rounded-xl bg-primary px-5 py-3 font-semibold text-white">
          View my orders
        </Link>
      </main>
    );
  }

  const admin = createAdminClient();
  const { data: order } = await admin
    .from("orders")
    .select("id, order_number, status, total, progress, progress_notes, payment_method, payment_status, items, created_at, started_at, completed_at, service:services(name), game:games(name)")
    .eq("track_token", token)
    .single() as unknown as {
      data: {
        id: string;
        order_number: string;
        status: string | null;
        total: number;
        progress: number | null;
        progress_notes: string | null;
        payment_method: string | null;
        payment_status: string | null;
        items: unknown;
        created_at: string | null;
        started_at: string | null;
        completed_at: string | null;
        service: { name: string | null } | null;
        game: { name: string | null } | null;
      } | null;
    };

  if (!order) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-20 text-center">
        <AlertCircle className="mx-auto mb-4 h-12 w-12 text-red-400" />
        <h1 className="font-heading text-3xl font-bold text-white">Order not found</h1>
        <p className="mt-3 text-zinc-400">This tracking link is invalid or has expired.</p>
      </main>
    );
  }

  const items = Array.isArray(order.items) ? order.items as OrderItem[] : [];
  const title = items.length > 1
    ? `${items.length} services`
    : items[0]?.serviceName ?? order.service?.name ?? "Boosting service";
  const game = items[0]?.gameName ?? order.game?.name ?? "Boosting";
  const steps = [
    ["paid", "Payment received"],
    ["queued", "Queued for booster"],
    ["claimed", "Booster assigned"],
    ["in_progress", "Work started"],
    ["completed", "Completed"],
  ] as const;

  return (
    <main className="mx-auto max-w-4xl px-4 py-12 sm:py-16">
      <div className="rounded-[2rem] border border-primary/20 bg-[#100804] p-6 shadow-2xl shadow-black/40 sm:p-8">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="mb-2 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-primary">
              <ShieldCheck className="h-3.5 w-3.5" />
              Secure order tracking
            </p>
            <h1 className="font-heading text-3xl font-bold text-white sm:text-4xl">Order #{order.order_number}</h1>
            <p className="mt-2 text-zinc-400">{game} - {title}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/30 p-4 text-left sm:text-right">
            <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Status</p>
            <p className="mt-1 text-lg font-bold text-primary">{statusLabel(order.status)}</p>
            <p className="text-sm text-zinc-400">{formatUSD(order.total)}</p>
          </div>
        </div>

        <div className="mb-8 rounded-2xl border border-white/10 bg-black/25 p-4">
          <div className="mb-2 flex items-center justify-between gap-3 text-sm">
            <span className="font-semibold text-white">Progress</span>
            <span className="font-mono text-zinc-400">{Math.max(0, Math.min(100, order.progress ?? 0))}%</span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-zinc-900 ring-1 ring-white/10">
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${Math.max(0, Math.min(100, order.progress ?? 0))}%` }} />
          </div>
          {order.progress_notes && <p className="mt-3 text-sm text-zinc-400">{order.progress_notes}</p>}
        </div>

        <div className="grid gap-3 sm:grid-cols-5">
          {steps.map(([step, label]) => {
            const active = stepState(order.status, step);
            return (
              <div key={step} className={cn("rounded-2xl border p-3 text-sm", active ? "border-primary/30 bg-primary/10 text-white" : "border-white/10 bg-black/20 text-zinc-500")}>
                {active ? <CheckCircle2 className="mb-2 h-5 w-5 text-primary" /> : <Clock className="mb-2 h-5 w-5" />}
                <p className="font-semibold">{label}</p>
              </div>
            );
          })}
        </div>

        {items.length > 0 && (
          <div className="mt-8 rounded-2xl border border-white/10 bg-black/20 p-4">
            <div className="mb-3 flex items-center gap-2 font-semibold text-white">
              <Package className="h-4 w-4 text-primary" />
              Order items
            </div>
            <div className="space-y-2">
              {items.map((item, index) => (
                <div key={`${item.serviceName}-${index}`} className="flex items-center justify-between gap-3 rounded-xl bg-white/[0.03] px-3 py-2 text-sm">
                  <span className="text-zinc-200">{item.serviceName ?? "Service"} x{item.quantity ?? 1}</span>
                  <span className="font-semibold text-primary">{formatUSD(item.finalPrice ?? 0)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
