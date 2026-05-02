import { NextRequest, NextResponse } from "next/server";
import { assertAdminSection } from "@/lib/auth/assert-admin";
import { runPaidOrderSideEffects } from "@/lib/orders/paid-side-effects";
import { dbUpdate } from "@/lib/supabase/db-helpers";
import { z } from "zod";

const BodySchema = z.object({
  orderId: z.string().uuid(),
});

export async function POST(req: NextRequest) {
  const ctx = await assertAdminSection("orders");
  if (!ctx.ok) return ctx.response;
  const { admin } = ctx;

  const body = await req.json().catch(() => null);
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }
  const { orderId } = parsed.data;

  // Same as Stripe/balance: stay on "paid" until admin releases to "queued"
  // so multi-item orders can be split before boosters see them.
  const { data: updatedOrders, error } = await admin
    .from("orders")
    .update(dbUpdate({ gold_received: true, status: "paid", payment_status: "completed" }))
    .eq("id", orderId)
    .eq("payment_method", "gold")
    .eq("payment_status", "pending")
    .select("id") as unknown as { data: { id: string }[] | null; error: unknown };

  if (error) {
    return NextResponse.json({ error: "Failed to update order" }, { status: 500 });
  }

  if (!updatedOrders || updatedOrders.length === 0) {
    return NextResponse.json({ error: "Order is already confirmed or cannot be confirmed" }, { status: 409 });
  }

  await runPaidOrderSideEffects(admin, orderId, "gold", { confirmed_by: ctx.userId }, ctx.userId);

  return NextResponse.json({ success: true });
}
