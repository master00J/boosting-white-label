import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ItemProgressEntry } from "@/app/api/webhooks/runelite/route";
import { calcOverallProgress } from "@/app/api/webhooks/runelite/route";

/**
 * PATCH /api/worker/orders/[id]/item-progress
 * Manually update the progress for one item in the order.
 *
 * Body: { index: number, current?: number, completedQuestIds?: string[], completed?: boolean }
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({})) as {
    index?: number;
    current?: number;
    completedQuestIds?: string[];
    completed?: boolean;
  };

  if (body.index === undefined || body.index === null) {
    return NextResponse.json({ error: "index is required" }, { status: 400 });
  }

  const admin = createAdminClient();

  // Verify this worker is assigned to the order
  const { data: workerRow } = await admin
    .from("workers")
    .select("id")
    .eq("profile_id", user.id)
    .single() as unknown as { data: { id: string } | null };

  const { data: order } = await admin
    .from("orders")
    .select("id, status, worker_id, items, configuration, item_progress")
    .eq("id", id)
    .single() as unknown as {
      data: {
        id: string;
        status: string;
        worker_id: string | null;
        items: unknown[] | null;
        configuration: Record<string, unknown>;
        item_progress: ItemProgressEntry[] | null;
      } | null;
    };

  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

  // Allow admins; workers must be assigned
  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single() as unknown as { data: { role: string } | null };

  const isAdmin = profile?.role === "super_admin" || profile?.role === "admin";
  const isAssigned = !!workerRow && order.worker_id === workerRow.id;
  if (!isAdmin && !isAssigned) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  if (!["claimed", "in_progress", "paused"].includes(order.status)) {
    return NextResponse.json({ error: "Order is not active" }, { status: 400 });
  }

  const itemProgress: ItemProgressEntry[] = order.item_progress && order.item_progress.length > 0
    ? [...order.item_progress]
    : [];

  const entry = itemProgress.find((e) => e.index === body.index);
  if (!entry) return NextResponse.json({ error: "Item index not found" }, { status: 404 });

  // Apply updates
  if (body.current !== undefined) {
    entry.current = body.current;
  }
  if (body.completedQuestIds !== undefined) {
    entry.completedQuestIds = body.completedQuestIds;
    entry.completed = entry.questIds != null && body.completedQuestIds.length >= entry.questIds.length;
  }
  if (body.completed !== undefined) {
    entry.completed = body.completed;
  }

  // Auto-set completed for level/kills when current reaches goal
  if (!body.completed) {
    if (entry.type === "level" && entry.current != null && entry.goal != null) {
      entry.completed = entry.current >= entry.goal;
    }
    if (entry.type === "kills" && entry.current != null && entry.goal != null) {
      entry.completed = entry.current >= entry.goal;
    }
  }

  const overall = calcOverallProgress(itemProgress);

  const { error } = await admin
    .from("orders")
    .update({ item_progress: itemProgress, progress: overall } as never)
    .eq("id", id) as unknown as { error: unknown };

  if (error) return NextResponse.json({ error: "Update failed" }, { status: 500 });

  return NextResponse.json({ success: true, item_progress: itemProgress, progress: overall });
}
