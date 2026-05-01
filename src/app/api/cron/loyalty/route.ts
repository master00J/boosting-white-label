import { NextRequest, NextResponse } from "next/server";
import { validateCronSecret } from "@/lib/cron/auth";
import { logCronRun } from "@/lib/cron/logger";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Monthly cron: expire loyalty points older than 12 months and
 * recalculate each customer's loyalty tier based on current points.
 * Schedule: 1st of every month at 04:00 UTC
 *
 * Logic:
 * 1. Expire points transactions older than 12 months (mark as expired)
 * 2. Recalculate total active points per customer
 * 3. Update customer loyalty_tier_id based on current points
 */
export async function GET(req: NextRequest) {
  if (!validateCronSecret(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  let processed = 0;
  let errors = 0;
  const details: Record<string, unknown> = {};

  // 1. Expire old points (12 month TTL)
  try {
    const cutoff12m = new Date();
    cutoff12m.setMonth(cutoff12m.getMonth() - 12);

    const { data: expiredPoints } = await admin
      .from("loyalty_transactions")
      .select("id")
      .eq("type", "earn")
      .eq("expired", false)
      .lt("created_at", cutoff12m.toISOString()) as unknown as { data: { id: string }[] | null };

    if (expiredPoints && expiredPoints.length > 0) {
      const ids = expiredPoints.map((p) => p.id);
      await (admin.from("loyalty_transactions") as unknown as {
        update: (v: unknown) => { in: (col: string, vals: string[]) => Promise<unknown> };
      }).update({ expired: true, expired_at: new Date().toISOString() }).in("id", ids);

      details.points_expired = ids.length;
      processed += ids.length;
    } else {
      details.points_expired = 0;
    }
  } catch (err) {
    errors++;
    details.expire_error = err instanceof Error ? err.message : "unknown";
  }

  // 2. Recalculate tiers for all customers
  try {
    // Fetch all loyalty tiers ordered by min_points desc
    type TierRow = { id: string; min_points: number };
    const { data: tiers } = await admin
      .from("loyalty_tiers")
      .select("id, min_points")
      .order("min_points", { ascending: false }) as unknown as { data: TierRow[] | null };

    if (!tiers || tiers.length === 0) {
      details.tier_recalc = "no tiers configured";
    } else {
      // Get all customers with their active point totals
      type PointRow = { customer_id: string; total: number };
      const { data: pointTotals } = await admin
        .from("loyalty_transactions")
        .select("customer_id, total:points.sum()")
        .eq("expired", false) as unknown as { data: PointRow[] | null };

      let tierUpdates = 0;
      for (const row of (pointTotals ?? [])) {
        try {
          const points = row.total ?? 0;
          const tier = tiers.find((t) => points >= t.min_points);
          if (tier) {
            await (admin.from("profiles") as unknown as {
              update: (v: unknown) => { eq: (col: string, val: string) => Promise<unknown> };
            }).update({ loyalty_tier_id: tier.id, loyalty_points: points }).eq("id", row.customer_id);
            tierUpdates++;
          }
        } catch {
          errors++;
        }
      }

      details.tier_updates = tierUpdates;
      processed += tierUpdates;
    }
  } catch (err) {
    errors++;
    details.tier_error = err instanceof Error ? err.message : "unknown";
  }

  await logCronRun({
    job_name: "loyalty",
    status: errors === 0 ? "success" : processed > 0 ? "partial" : "error",
    processed,
    errors,
    message: `Loyalty cron complete — ${processed} updates, ${errors} errors`,
    details,
  });

  return NextResponse.json({ success: true, processed, errors, details });
}
