import { NextRequest, NextResponse } from "next/server";
import { validateCronSecret } from "@/lib/cron/auth";
import { logCronRun } from "@/lib/cron/logger";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Weekly cron: process automatic payouts for workers with unpaid earnings.
 * Schedule: every Monday at 08:00 UTC
 *
 * Logic:
 * 1. Find all completed orders that haven't been paid out yet (paid_out_at IS NULL)
 *    and have a worker_payout > 0
 * 2. Group by worker_id
 * 3. For each worker: create a payout record, mark orders as paid_out_at = now()
 * 4. Idempotent: skip workers that already have a pending/processing payout
 */
export async function GET(req: NextRequest) {
  if (!validateCronSecret(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  let processed = 0;
  let errors = 0;
  const details: Record<string, unknown> = {};

  try {
    // Fetch all unpaid completed orders with worker payouts
    type OrderRow = { id: string; worker_id: string; worker_payout: number; order_number: string };
    const { data: orders, error: ordersErr } = await admin
      .from("orders")
      .select("id, worker_id, worker_payout, order_number")
      .eq("status", "completed")
      .is("paid_out_at", null)
      .not("worker_id", "is", null)
      .gt("worker_payout", 0) as unknown as { data: OrderRow[] | null; error: unknown };

    if (ordersErr) throw new Error("Failed to fetch orders");

    const allOrders = orders ?? [];

    // Group by worker
    const byWorker = allOrders.reduce<Record<string, OrderRow[]>>((acc, o) => {
      if (!acc[o.worker_id]) acc[o.worker_id] = [];
      acc[o.worker_id].push(o);
      return acc;
    }, {});

    details.workers_found = Object.keys(byWorker).length;
    details.orders_found = allOrders.length;

    for (const [workerId, workerOrders] of Object.entries(byWorker)) {
      try {
        // Check if worker already has a pending payout (idempotency guard)
        const { data: existing } = await admin
          .from("payouts")
          .select("id")
          .eq("worker_id", workerId)
          .in("status", ["pending", "processing"])
          .limit(1) as unknown as { data: { id: string }[] | null };

        if (existing && existing.length > 0) {
          details[`worker_${workerId}_skipped`] = "already has pending payout";
          continue;
        }

        // Get worker payout method
        const { data: worker } = await admin
          .from("workers")
          .select("payout_method, payout_details")
          .eq("id", workerId)
          .single() as unknown as { data: { payout_method: string | null; payout_details: unknown } | null };

        const totalAmount = workerOrders.reduce((s, o) => s + o.worker_payout, 0);
        const orderIds = workerOrders.map((o) => o.id);

        // Create payout record
        type PayoutRow = { id: string };
        const { data: payout } = await (admin.from("payouts") as unknown as {
          insert: (v: unknown) => { select: (s: string) => { single: () => Promise<{ data: PayoutRow | null }> } };
        }).insert({
          worker_id: workerId,
          amount: Math.round(totalAmount * 100) / 100,
          method: worker?.payout_method ?? "manual",
          status: "pending",
          notes: `Auto-payout voor ${orderIds.length} order(s)`,
        }).select("id").single();

        if (!payout) throw new Error("Failed to create payout");

        // Mark orders as paid out
        await (admin.from("orders") as unknown as {
          update: (v: unknown) => { in: (col: string, vals: string[]) => Promise<unknown> };
        }).update({
          paid_out_at: new Date().toISOString(),
          payout_id: payout.id,
        }).in("id", orderIds);

        processed++;
        details[`worker_${workerId}`] = { amount: totalAmount, orders: orderIds.length };
      } catch (err) {
        errors++;
        details[`worker_${workerId}_error`] = err instanceof Error ? err.message : "unknown";
      }
    }

    await logCronRun({
      job_name: "payouts",
      status: errors === 0 ? "success" : processed > 0 ? "partial" : "error",
      processed,
      errors,
      message: `Processed ${processed} worker payouts, ${errors} errors`,
      details,
    });

    return NextResponse.json({ success: true, processed, errors, details });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    await logCronRun({ job_name: "payouts", status: "error", processed, errors: errors + 1, message });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
