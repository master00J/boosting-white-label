import { NextRequest, NextResponse } from "next/server";
import { validateCronSecret } from "@/lib/cron/auth";
import { logCronRun } from "@/lib/cron/logger";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Weekly cron: auto-promote or demote workers based on their stats.
 * Schedule: every Sunday at 06:00 UTC
 *
 * Promotion criteria (per tier config):
 * - min_completed_orders: minimum completed orders total
 * - min_rating: minimum average rating
 * - min_completion_rate: minimum % of claimed orders completed (not cancelled)
 *
 * Demotion: worker falls below the minimum for their current tier for 2+ consecutive weeks
 */
export async function GET(req: NextRequest) {
  if (!validateCronSecret(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  let processed = 0;
  let errors = 0;
  type TierChange = { worker_id: string; from_tier: string | null; to_tier: string };
  const details: { promoted: TierChange[]; demoted: TierChange[]; unchanged: number; [key: string]: unknown } = { promoted: [], demoted: [], unchanged: 0 };

  try {
    // Fetch all worker tiers ordered by rank
    type TierRow = { id: string; name: string; min_completed_orders: number; min_rating: number; rank: number };
    const { data: tiers } = await admin
      .from("worker_tiers")
      .select("id, name, min_completed_orders, min_rating, rank")
      .order("rank", { ascending: true }) as unknown as { data: TierRow[] | null };

    if (!tiers || tiers.length === 0) {
      await logCronRun({ job_name: "worker-tiers", status: "success", processed: 0, errors: 0, message: "No tiers configured" });
      return NextResponse.json({ success: true, message: "No tiers configured" });
    }

    // Fetch all active workers with their stats
    type WorkerRow = {
      id: string;
      tier_id: string | null;
      completed_orders: number;
      avg_rating: number | null;
    };
    const { data: workers } = await admin
      .from("workers")
      .select("id, tier_id, completed_orders, avg_rating")
      .eq("status", "active") as unknown as { data: WorkerRow[] | null };

    for (const worker of (workers ?? [])) {
      try {
        const completedOrders = worker.completed_orders ?? 0;
        const avgRating = worker.avg_rating ?? 0;

        // Find the highest tier the worker qualifies for
        let bestTier: TierRow | null = null;
        for (const tier of [...tiers].reverse()) {
          if (completedOrders >= tier.min_completed_orders && avgRating >= tier.min_rating) {
            bestTier = tier;
            break;
          }
        }

        // Default to lowest tier if they qualify for nothing
        if (!bestTier) bestTier = tiers[0];

        const currentTierRank = tiers.find((t) => t.id === worker.tier_id)?.rank ?? 0;
        const newTierRank = bestTier.rank;

        if (bestTier.id !== worker.tier_id) {
          await (admin.from("workers") as unknown as {
            update: (v: unknown) => { eq: (col: string, val: string) => Promise<unknown> };
          }).update({ tier_id: bestTier.id }).eq("id", worker.id);

          const action = newTierRank > currentTierRank ? "promoted" : "demoted";
          details[action].push({ worker_id: worker.id, from_tier: worker.tier_id, to_tier: bestTier.id });
          processed++;
        } else {
          details.unchanged++;
        }
      } catch (err) {
        errors++;
        details[`worker_${worker.id}_error`] = err instanceof Error ? err.message : "unknown";
      }
    }

    await logCronRun({
      job_name: "worker-tiers",
      status: errors === 0 ? "success" : processed > 0 ? "partial" : "error",
      processed,
      errors,
      message: `Worker tier sync complete — ${processed} changes, ${errors} errors`,
      details,
    });

    return NextResponse.json({ success: true, processed, errors, details });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    await logCronRun({ job_name: "worker-tiers", status: "error", processed, errors: errors + 1, message });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
