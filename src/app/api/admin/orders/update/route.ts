import { NextResponse } from "next/server";
import { assertAdminSection } from "@/lib/auth/assert-admin";
import { notifyOrderCompleted } from "@/lib/notify";
import { dbUpdate, insertActivityLog } from "@/lib/supabase/db-helpers";
import { z } from "zod";

const BodySchema = z.object({
  orderId: z.string().uuid(),
  status: z.string().min(1).max(50).optional(),
  admin_notes: z.string().max(5000).nullable().optional(),
});

type OrderRow = {
  id: string;
  status: string;
  total: number;
  worker_id: string | null;
};

type WorkerRow = {
  id: string;
  pending_balance: number;
  total_earned: number;
  total_orders_completed: number;
  current_active_orders: number;
  commission_rate: number;
};

export async function POST(req: Request) {
  const ctx = await assertAdminSection("orders");
  if (!ctx.ok) return ctx.response;
  const { admin } = ctx;

  const body = await req.json().catch(() => null);
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }
  const { orderId, status, admin_notes } = parsed.data;

  const update: Record<string, unknown> = {};
  if (status !== undefined) update.status = status;
  if (admin_notes !== undefined) update.admin_notes = admin_notes;

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  // If marking as completed, credit the assigned worker's balance
  if (status === "completed") {
    const { data: order } = await admin
      .from("orders")
      .select("id, status, total, worker_id")
      .eq("id", orderId)
      .single() as unknown as { data: OrderRow | null };

    if (order && order.worker_id && order.status !== "completed") {
      const { data: worker } = await admin
        .from("workers")
        .select("id, pending_balance, total_earned, total_orders_completed, current_active_orders, commission_rate")
        .eq("id", order.worker_id)
        .single() as unknown as { data: WorkerRow | null };

      if (worker) {
        // commission_rate is stored as a decimal (e.g. 0.70 = 70%), not a percentage
        const commission = order.total * worker.commission_rate;
        await admin
          .from("workers")
          .update(dbUpdate({
            pending_balance: worker.pending_balance + commission,
            total_earned: worker.total_earned + commission,
            total_orders_completed: worker.total_orders_completed + 1,
            current_active_orders: Math.max(0, worker.current_active_orders - 1),
          }))
          .eq("id", worker.id);
      }
    }
  }

  await admin.from("orders").update(dbUpdate(update)).eq("id", orderId);

  await insertActivityLog(admin, {
    actor_id: ctx.userId,
    action: "admin_order_update",
    target_type: "order",
    target_id: orderId,
    metadata: { fields: Object.keys(update), status: status ?? null },
  });

  // Notify customer when admin marks order completed
  if (status === "completed") {
    notifyOrderCompleted(orderId).catch(console.error);
  }

  return NextResponse.json({ ok: true });
}
