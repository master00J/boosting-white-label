import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import AvailableOrdersClient from "./available-orders-client";
import { Package } from "lucide-react";

export const metadata: Metadata = { title: "Available orders" };

type AvailableOrder = {
  id: string;
  order_number: string;
  status: string;
  total: number;
  worker_payout: number | null;
  configuration: Record<string, unknown>;
  created_at: string;
  items: Array<{ serviceName: string; gameName: string; quantity: number; finalPrice: number; serviceId?: string }> | null;
  item_count: number | null;
  parent_order_id: string | null;
  service: { name: string; estimated_hours: number | null } | null;
  game: { name: string; logo_url: string | null } | null;
  required_tier_name: string | null;
  required_tier_sort_order: number | null;
  /** Customer-stated value on account (USD); booster needs available deposit >= this to claim */
  account_value: number | null;
};

export default async function AvailableOrdersPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirect=/booster/orders");

  const admin = createAdminClient();

  const { data: workerData } = await admin
    .from("workers")
    .select("id, tier_id, games, current_active_orders, max_active_orders, is_active, deposit_paid")
    .eq("profile_id", user.id)
    .single();

  if (!workerData) {
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

  const worker = workerData as {
    id: string;
    tier_id: string | null;
    games: string[];
    current_active_orders: number;
    max_active_orders: number;
    is_active: boolean;
    deposit_paid: number | null;
  };

  type RawOrder = {
    id: string;
    order_number: string;
    status: string;
    total: number;
    worker_payout: number | null;
    configuration: Record<string, unknown>;
    created_at: string;
    items: Array<{ serviceName: string; gameName: string; quantity: number; finalPrice: number; serviceId?: string }> | null;
    item_count: number | null;
    service_id: string | null;
    account_value: number | null;
    service: { name: string; estimated_hours: number | null } | null;
    game: { name: string; logo_url: string | null } | null;
  };

  const { data: rawOrders, error: ordersError } = await admin
    .from("orders")
    .select("id, order_number, status, total, worker_payout, configuration, created_at, items, item_count, service_id, account_value, service:services(name, estimated_hours), game:games(name, logo_url)")
    .eq("status", "queued")
    .is("worker_id", null)
    .order("created_at", { ascending: true })
    .limit(50) as unknown as { data: RawOrder[] | null; error: unknown };

  if (ordersError) {
    console.error("[booster/orders] query error:", ordersError);
  }

  const orders = rawOrders ?? [];

  // Worker's available deposit (deposit_paid minus sum of account_value on active orders)
  let workerAvailableDeposit = Number(worker.deposit_paid) || 0;
  const { data: activeForDeposit } = await admin
    .from("orders")
    .select("account_value")
    .eq("worker_id", worker.id)
    .in("status", ["claimed", "in_progress", "paused"]) as unknown as { data: Array<{ account_value: number | null }> | null };
  workerAvailableDeposit -= (activeForDeposit ?? []).reduce((s, o) => s + (Number(o.account_value) || 0), 0);

  // Worker's tier sort_order (no tier = 0)
  let workerTierSortOrder = 0;
  if (worker.tier_id) {
    const { data: wt } = await admin
      .from("worker_tiers")
      .select("sort_order")
      .eq("id", worker.tier_id)
      .single() as unknown as { data: { sort_order: number | null } | null };
    workerTierSortOrder = wt?.sort_order ?? 0;
  }

  // Per order: required tier (highest min_worker_tier among services in the order)
  const orderIds = orders.map((o) => o.id);
  const requiredTierByOrderId: Record<string, { name: string; sort_order: number } | null> = {};
  if (orderIds.length > 0) {
    for (const o of orders) {
      const serviceIds: string[] = [];
      if (o.items && Array.isArray(o.items) && o.items.length > 0) {
        for (const it of o.items) {
          if (it.serviceId && !serviceIds.includes(it.serviceId)) serviceIds.push(it.serviceId);
        }
      }
      if (serviceIds.length === 0 && o.service_id) serviceIds.push(o.service_id);

      if (serviceIds.length === 0) {
        requiredTierByOrderId[o.id] = null;
        continue;
      }
      const { data: services } = await admin
        .from("services")
        .select("min_worker_tier_id")
        .in("id", serviceIds) as unknown as { data: Array<{ min_worker_tier_id: string | null }> | null };
      const tierIds = (services ?? []).map((s) => s.min_worker_tier_id).filter(Boolean) as string[];
      if (tierIds.length === 0) {
        requiredTierByOrderId[o.id] = null;
        continue;
      }
      const { data: tiers } = await admin
        .from("worker_tiers")
        .select("id, name, sort_order")
        .in("id", tierIds) as unknown as { data: Array<{ id: string; name: string; sort_order: number | null }> | null };
      const withOrder = (tiers ?? []).map((t) => ({ ...t, sort_order: t.sort_order ?? 0 }));
      const strictest = withOrder.length > 0 ? withOrder.reduce((a, b) => (a.sort_order >= b.sort_order ? a : b)) : null;
      requiredTierByOrderId[o.id] = strictest ? { name: strictest.name, sort_order: strictest.sort_order } : null;
    }
  }

  // Fetch parent_order_id separately (graceful if column doesn't exist yet)
  let parentMap: Record<string, string | null> = {};
  if (orders.length > 0) {
    try {
      const { data: splitData } = await admin
        .from("orders")
        .select("id, parent_order_id")
        .in("id", orderIds) as unknown as { data: Array<{ id: string; parent_order_id: string | null }> | null };
      if (splitData) {
        parentMap = Object.fromEntries(splitData.map((r) => [r.id, r.parent_order_id]));
      }
    } catch {
      // Column doesn't exist yet
    }
  }

  const ordersWithParent: AvailableOrder[] = orders.map((o) => {
    const req = requiredTierByOrderId[o.id];
    return {
      ...o,
      parent_order_id: parentMap[o.id] ?? null,
      required_tier_name: req?.name ?? null,
      required_tier_sort_order: req?.sort_order ?? null,
      account_value: o.account_value != null ? Number(o.account_value) : null,
    };
  });

  return (
    <AvailableOrdersClient
      orders={ordersWithParent as unknown as AvailableOrder[]}
      _workerId={worker.id}
      canClaim={worker.is_active && worker.current_active_orders < worker.max_active_orders}
      currentActive={worker.current_active_orders}
      maxActive={worker.max_active_orders}
      workerTierSortOrder={workerTierSortOrder}
      workerAvailableDeposit={workerAvailableDeposit}
    />
  );
}
