import { NextRequest, NextResponse } from "next/server";
import { validateCronSecret } from "@/lib/cron/auth";
import { logCronRun } from "@/lib/cron/logger";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Daily cron: clean up expired/stale data.
 * Schedule: every day at 03:00 UTC
 *
 * Tasks:
 * 1. Cancel unpaid orders older than 24 hours (status = pending_payment)
 * 2. Deactivate expired coupons that are still marked active
 * 3. Delete old cron_logs older than 90 days
 */
export async function GET(req: NextRequest) {
  if (!validateCronSecret(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  let processed = 0;
  let errors = 0;
  const details: Record<string, unknown> = {};

  // 1. Cancel stale unpaid orders (older than 24h)
  try {
    const cutoff24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: staleOrders } = await admin
      .from("orders")
      .select("id")
      .eq("status", "pending_payment")
      .lt("created_at", cutoff24h) as unknown as { data: { id: string }[] | null };

    if (staleOrders && staleOrders.length > 0) {
      const ids = staleOrders.map((o) => o.id);
      await (admin.from("orders") as unknown as {
        update: (v: unknown) => { in: (col: string, vals: string[]) => Promise<unknown> };
      }).update({ status: "cancelled", cancelled_at: new Date().toISOString() }).in("id", ids);

      details.stale_orders_cancelled = ids.length;
      processed += ids.length;
    } else {
      details.stale_orders_cancelled = 0;
    }
  } catch (err) {
    errors++;
    details.stale_orders_error = err instanceof Error ? err.message : "unknown";
  }

  // 2. Deactivate expired coupons
  try {
    const now = new Date().toISOString();
    const { data: expiredCoupons } = await admin
      .from("coupons")
      .select("id")
      .eq("is_active", true)
      .not("expires_at", "is", null)
      .lt("expires_at", now) as unknown as { data: { id: string }[] | null };

    if (expiredCoupons && expiredCoupons.length > 0) {
      const ids = expiredCoupons.map((c) => c.id);
      await (admin.from("coupons") as unknown as {
        update: (v: unknown) => { in: (col: string, vals: string[]) => Promise<unknown> };
      }).update({ is_active: false }).in("id", ids);

      details.coupons_deactivated = ids.length;
      processed += ids.length;
    } else {
      details.coupons_deactivated = 0;
    }
  } catch (err) {
    errors++;
    details.coupons_error = err instanceof Error ? err.message : "unknown";
  }

  // 3. Delete old cron logs (90 day retention)
  try {
    const cutoff90d = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
    await admin.from("cron_logs").delete().lt("ran_at", cutoff90d);
    details.cron_logs_pruned = true;
    processed++;
  } catch (err) {
    errors++;
    details.cron_logs_error = err instanceof Error ? err.message : "unknown";
  }

  await logCronRun({
    job_name: "cleanup",
    status: errors === 0 ? "success" : processed > 0 ? "partial" : "error",
    processed,
    errors,
    message: `Cleanup complete — ${processed} items processed, ${errors} errors`,
    details,
  });

  return NextResponse.json({ success: true, processed, errors, details });
}
