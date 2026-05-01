import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { notifyOrderCompleted } from "@/lib/notify";
import { insertActivityLog } from "@/lib/supabase/db-helpers";
import { z } from "zod";

const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  claimed: ["in_progress"],
  in_progress: ["paused", "completed"],
  paused: ["in_progress"],
};

const schema = z.object({
  status: z.enum(["in_progress", "paused", "completed"]),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Ongeldige status" }, { status: 400 });

  const admin = createAdminClient();

  const { data: order } = await admin
    .from("orders")
    .select("id, worker_id, status, worker_payout")
    .eq("id", id)
    .single() as unknown as { data: { id: string; worker_id: string | null; status: string; worker_payout: number | null } | null };

  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

  // Resolve worker.id — orders.worker_id references workers.id, not profiles.id
  const { data: workerRow } = await admin
    .from("workers")
    .select("id")
    .eq("profile_id", user.id)
    .single() as unknown as { data: { id: string } | null };

  if (!workerRow || order.worker_id !== workerRow.id) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const allowed = ALLOWED_TRANSITIONS[order.status] ?? [];
  if (!allowed.includes(parsed.data.status)) {
    return NextResponse.json({ error: `Cannot transition from ${order.status} to ${parsed.data.status}` }, { status: 400 });
  }

  const updateData: Record<string, unknown> = { status: parsed.data.status };

  if (parsed.data.status === "in_progress" && order.status === "claimed") {
    updateData.started_at = new Date().toISOString();
  }

  if (parsed.data.status === "completed") {
    updateData.completed_at = new Date().toISOString();
    updateData.progress = 100;

    // Credit worker earnings
    const { data: worker } = await admin
      .from("workers")
      .select("id, display_name, total_earned, pending_balance, total_orders_completed, current_active_orders")
      .eq("profile_id", user.id)
      .single() as unknown as { data: { id: string; display_name: string | null; total_earned: number; pending_balance: number; total_orders_completed: number; current_active_orders: number } | null };

    if (worker) {
      const payout = order.worker_payout ?? 0;
      await admin
        .from("workers")
        .update({
          total_earned: worker.total_earned + payout,
          pending_balance: worker.pending_balance + payout,
          total_orders_completed: worker.total_orders_completed + 1,
          current_active_orders: Math.max(0, worker.current_active_orders - 1),
        } as never)
        .eq("id", worker.id) as unknown as Promise<unknown>;
    }

    // System message
    await admin
      .from("order_messages")
      .insert({
        order_id: id,
        content: "Your order has been completed! Thank you for your trust in BoostPlatform.",
        is_system: true,
      } as never) as unknown as Promise<unknown>;

    // Email + in-app notification to customer
    notifyOrderCompleted(id, worker?.display_name ?? undefined).catch(console.error);

    await insertActivityLog(admin, {
      actor_id: user.id,
      action: "worker_completed_order",
      target_type: "order",
      target_id: id,
      metadata: {
        worker_id: workerRow.id,
        payout: order.worker_payout ?? 0,
        source: "web",
      },
    });
  }

  await admin
    .from("orders")
    .update(updateData as never)
    .eq("id", id) as unknown as Promise<unknown>;

  return NextResponse.json({ success: true });
}
