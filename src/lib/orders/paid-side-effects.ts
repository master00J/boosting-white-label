import { notifyOrderConfirmed } from "@/lib/notify";
import { dbUpdate, insertActivityLog, type AdminClient } from "@/lib/supabase/db-helpers";

type PaidSideEffectSource = "balance" | "stripe" | "paypal" | "whop" | "nowpayments" | "gold";

type PaidOrderRow = {
  id: string;
  coupon_id: string | null;
};

export async function runPaidOrderSideEffects(
  admin: AdminClient,
  orderId: string,
  source: PaidSideEffectSource,
  metadata: Record<string, unknown> = {},
  actorId?: string | null,
) {
  const { data: order } = await admin
    .from("orders")
    .select("id, coupon_id")
    .eq("id", orderId)
    .single() as unknown as { data: PaidOrderRow | null };

  if (!order) return;

  if (order.coupon_id) {
    const { data: coupon } = await admin
      .from("coupons")
      .select("current_uses")
      .eq("id", order.coupon_id)
      .single() as unknown as { data: { current_uses: number | null } | null };

    await admin
      .from("coupons")
      .update(dbUpdate({ current_uses: (coupon?.current_uses ?? 0) + 1 }))
      .eq("id", order.coupon_id);
  }

  await insertActivityLog(admin, {
    actor_id: actorId ?? null,
    action: "order_paid_side_effects",
    target_type: "order",
    target_id: orderId,
    metadata: {
      source,
      coupon_id: order.coupon_id,
      ...metadata,
    },
  });

  notifyOrderConfirmed(orderId).catch(console.error);
}
