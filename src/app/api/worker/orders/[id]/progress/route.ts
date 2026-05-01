import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { z } from "zod";

const schema = z.object({
  progress: z.number().min(0).max(100).optional(),
  progress_current: z.number().int().min(0).optional(),
  progress_notes: z.string().optional(),
});

type OrderRow = {
  id: string;
  worker_id: string | null;
  status: string;
  configuration: Record<string, unknown>;
};

/** Derive the goal value from order configuration (same logic as getProgressContext on client) */
function deriveGoal(config: Record<string, unknown>): number | null {
  if ("boss" in config && "kills" in config) {
    return Number(config.kills);
  }
  if ("route_segments" in config) {
    const segments = config.route_segments as { to_level: number }[] | undefined;
    return segments?.at(-1)?.to_level ?? null;
  }
  if ("end_level" in config) {
    return Number(config.end_level);
  }
  return null;
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const admin = createAdminClient();

  const { data: order } = await admin
    .from("orders")
    .select("id, worker_id, status, configuration")
    .eq("id", id)
    .single() as unknown as { data: OrderRow | null };

  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

  // Resolve worker.id — orders.worker_id references workers.id, not profiles.id
  const { data: workerRow } = await admin
    .from("workers")
    .select("id")
    .eq("profile_id", user.id)
    .single() as unknown as { data: { id: string } | null };

  if (!workerRow || order.worker_id !== workerRow.id) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  if (!["claimed", "in_progress", "paused"].includes(order.status)) {
    return NextResponse.json({ error: "Order cannot be updated" }, { status: 400 });
  }

  // Determine progress percentage
  let progressPct: number;
  const { progress, progress_current, progress_notes } = parsed.data;

  if (progress_current !== undefined) {
    // Calculate percentage from current value and goal
    const goal = deriveGoal(order.configuration);
    if (goal && goal > 0) {
      progressPct = Math.min(100, Math.round((progress_current / goal) * 100));
    } else {
      progressPct = progress ?? 0;
    }
  } else {
    progressPct = progress ?? 0;
  }

  await admin
    .from("orders")
    .update({
      progress: progressPct,
      progress_current: progress_current ?? null,
      progress_notes: progress_notes ?? null,
    } as never)
    .eq("id", id) as unknown as Promise<unknown>;

  return NextResponse.json({ success: true, progress: progressPct });
}
