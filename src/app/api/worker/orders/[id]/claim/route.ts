import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { dbUpdate, insertActivityLog } from "@/lib/supabase/db-helpers";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();

  // Fetch worker with tier, deposit and commission_rate
  const { data: worker } = await admin
    .from("workers")
    .select("id, is_active, current_active_orders, max_active_orders, tier_id, deposit_paid, commission_rate")
    .eq("profile_id", user.id)
    .single() as unknown as { data: { id: string; is_active: boolean; current_active_orders: number; max_active_orders: number; tier_id: string | null; deposit_paid: number | null; commission_rate: number } | null };

  if (!worker) return NextResponse.json({ error: "No worker account found" }, { status: 403 });
  if (!worker.is_active) return NextResponse.json({ error: "Your account is not active" }, { status: 403 });
  if (worker.current_active_orders >= worker.max_active_orders) {
    return NextResponse.json({ error: "Maximum number of active orders reached" }, { status: 400 });
  }

  // Fetch order with items (for multi-item), service_id (legacy), account_value
  const { data: order } = await admin
    .from("orders")
    .select("id, status, worker_id, service_id, total, items, account_value")
    .eq("id", id)
    .single() as unknown as {
      data: {
        id: string;
        status: string;
        worker_id: string | null;
        service_id: string | null;
        total: number;
        items: Array<{ serviceId?: string }> | null;
        account_value: number | null;
      } | null;
    };

  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
  if (order.status !== "queued") return NextResponse.json({ error: "Order is no longer available" }, { status: 400 });
  if (order.worker_id) return NextResponse.json({ error: "Order has already been claimed" }, { status: 400 });

  // Collect service IDs: from items or legacy service_id
  const serviceIds: string[] = [];
  if (order.items && Array.isArray(order.items) && order.items.length > 0) {
    for (const it of order.items) {
      if (it.serviceId && !serviceIds.includes(it.serviceId)) serviceIds.push(it.serviceId);
    }
  }
  if (serviceIds.length === 0 && order.service_id) serviceIds.push(order.service_id);

  // Required tier: highest sort_order among min_worker_tier of all services (higher = stricter)
  let requiredSortOrder: number | null = null;
  if (serviceIds.length > 0) {
    const { data: services } = await admin
      .from("services")
      .select("min_worker_tier_id")
      .in("id", serviceIds) as unknown as { data: Array<{ min_worker_tier_id: string | null }> | null };
    const tierIds = (services ?? []).map((s) => s.min_worker_tier_id).filter(Boolean) as string[];
    if (tierIds.length > 0) {
      const { data: tiers } = await admin
        .from("worker_tiers")
        .select("sort_order")
        .in("id", tierIds) as unknown as { data: Array<{ sort_order: number | null }> | null };
      const orders = (tiers ?? []).map((t) => t.sort_order ?? 0);
      if (orders.length > 0) requiredSortOrder = Math.max(...orders);
    }
  }

  // Worker's tier sort_order (no tier = 0, so cannot claim if required > 0)
  let workerSortOrder: number = 0;
  if (worker.tier_id) {
    const { data: wt } = await admin
      .from("worker_tiers")
      .select("sort_order")
      .eq("id", worker.tier_id)
      .single() as unknown as { data: { sort_order: number | null } | null };
    workerSortOrder = wt?.sort_order ?? 0;
  }

  if (requiredSortOrder != null && workerSortOrder < requiredSortOrder) {
    return NextResponse.json(
      { error: "This order requires a higher booster rank. Your current rank does not qualify." },
      { status: 403 }
    );
  }

  // Deposit check: booster can only claim if available deposit >= order account value
  const orderAccountValue = Number(order.account_value) || 0;
  if (orderAccountValue > 0) {
    const depositPaid = Number(worker.deposit_paid) || 0;
    const { data: activeOrders } = await admin
      .from("orders")
      .select("account_value")
      .eq("worker_id", worker.id)
      .in("status", ["claimed", "in_progress", "paused"]) as unknown as { data: Array<{ account_value: number | null }> | null };
    const held = (activeOrders ?? []).reduce((sum, o) => sum + (Number(o.account_value) || 0), 0);
    const availableDeposit = depositPaid - held;
    if (availableDeposit < orderAccountValue) {
      return NextResponse.json(
        { error: "Insufficient deposit. This order requires a higher available deposit than you have." },
        { status: 403 }
      );
    }
  }

  // Calculate payout using the worker's actual commission_rate (stored as decimal, e.g. 0.70 = 70%)
  const commissionRate = worker.commission_rate ?? 0.70;
  const workerPayout = order.total * commissionRate;

  // Claim the order — use worker.id (workers table PK), not user.id (profiles PK)
  const { data: claimedOrders } = await admin
    .from("orders")
    .update(dbUpdate({
      worker_id: worker.id,
      status: "claimed",
      claimed_at: new Date().toISOString(),
      worker_payout: workerPayout,
      worker_commission_rate: commissionRate,
    }))
    .eq("id", id)
    .eq("status", "queued")
    .is("worker_id", null)
    .select("id") as unknown as { data: { id: string }[] | null };

  if (!claimedOrders || claimedOrders.length === 0) {
    return NextResponse.json({ error: "Order has already been claimed" }, { status: 409 });
  }

  // Increment worker active orders
  await admin
    .from("workers")
    .update(dbUpdate({ current_active_orders: worker.current_active_orders + 1 }))
    .eq("id", worker.id) as unknown as Promise<unknown>;

  // System message
  await admin
    .from("order_messages")
    .insert({
      order_id: id,
      content: "A booster has claimed your order and will get started on it.",
      is_system: true,
    } as never) as unknown as Promise<unknown>;

  await insertActivityLog(admin, {
    actor_id: user.id,
    action: "worker_claimed_order",
    target_type: "order",
    target_id: id,
    metadata: {
      worker_id: worker.id,
      payout: workerPayout,
      commission_rate: commissionRate,
      source: "web",
    },
  });

  return NextResponse.json({ success: true });
}
