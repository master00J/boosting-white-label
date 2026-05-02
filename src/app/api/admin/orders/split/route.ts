import { NextResponse } from "next/server";
import { assertAdmin } from "@/lib/auth/assert-admin";
import { getNextOrderNumber } from "@/lib/order-number";
import { z } from "zod";

const BodySchema = z.object({
  orderId: z.string().uuid(),
  groups: z.array(z.array(z.number().int().min(0))).optional(),
});

interface OrderItem {
  serviceId: string;
  serviceName: string;
  gameName: string;
  gameId: string;
  quantity: number;
  finalPrice: number;
  configuration: Record<string, unknown>;
}

interface ParentOrder {
  id: string;
  order_number: string;
  customer_id: string | null;
  items: OrderItem[] | null;
  item_count: number | null;
  total: number;
  subtotal: number;
  currency: string;
  payment_method: string | null;
  payment_id: string | null;
  payment_status: string;
  worker_commission_rate: number | null;
  affiliate_id: string | null;
  affiliate_commission: number | null;
  coupon_id: string | null;
  customer_notes: string | null;
  ip_address: string | null;
  user_agent: string | null;
}

export async function POST(req: Request) {
  const authCtx = await assertAdmin();
  if (!authCtx.ok) return authCtx.response;
  const { admin, userId: user_id } = authCtx;

  const body = await req.json().catch(() => null);
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }
  const { orderId, groups } = parsed.data;

  // Fetch the parent order (without is_split — may not exist in deployed DB)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: parentOrder, error: fetchError } = await (admin as any)
    .from("orders")
    .select(`
      id, order_number, customer_id, items, item_count, total, subtotal,
      currency, payment_method, payment_id, payment_status,
      worker_commission_rate, affiliate_id, affiliate_commission,
      coupon_id, customer_notes, ip_address, user_agent, status
    `)
    .eq("id", orderId)
    .single() as { data: ParentOrder & { status: string } | null; error: unknown };

  if (fetchError || !parentOrder) {
    console.error("[split] fetch error:", fetchError, "orderId:", orderId);
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  // Check is_split separately (column may not exist in older deployments)
  let isSplit = false;
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: splitCheck } = await (admin as any)
      .from("orders")
      .select("is_split")
      .eq("id", orderId)
      .single() as { data: { is_split: boolean } | null };
    isSplit = splitCheck?.is_split ?? false;
  } catch { /* column doesn't exist yet */ }

  if (isSplit) {
    return NextResponse.json({ error: "Order has already been split" }, { status: 400 });
  }

  if (!parentOrder.items || parentOrder.items.length < 2) {
    return NextResponse.json({ error: "Order must have at least 2 items to split" }, { status: 400 });
  }

  if (!["queued", "paid"].includes(parentOrder.status)) {
    return NextResponse.json({ error: "Only paid or queued orders can be split" }, { status: 400 });
  }

  const items = parentOrder.items;
  const totalItemPrice = items.reduce((sum, item) => sum + item.finalPrice * item.quantity, 0);
  const commissionRate = parentOrder.worker_commission_rate ?? 0.55;

  // Use provided groups or default to one group per item
  const resolvedGroups: number[][] = (groups && groups.length >= 2)
    ? groups
    : items.map((_, i) => [i]);

  if (resolvedGroups.length < 2) {
    return NextResponse.json({ error: "Need at least 2 groups to split" }, { status: 400 });
  }

  // Build sub-order inserts — one per group (order numbers fetched sequentially so each gets next sequence)
  const subOrders: Array<Record<string, unknown>> = [];
  for (const grp of resolvedGroups) {
    const groupItems = grp.map((i) => items[i]).filter(Boolean);
    const groupTotal = parseFloat(groupItems.reduce((s, it) => s + it.finalPrice * it.quantity, 0).toFixed(2));
    const proportion = totalItemPrice > 0 ? groupTotal / totalItemPrice : 1 / resolvedGroups.length;
    const workerPayout = parseFloat((groupTotal * commissionRate).toFixed(2));
    const primaryItem = groupItems[0];
    const isSingleItem = groupItems.length === 1;
    const gameId = primaryItem?.gameId ?? "";
    const serviceId = primaryItem?.serviceId ?? "";
    const orderNumber =
      gameId && serviceId
        ? await getNextOrderNumber(admin, gameId, serviceId)
        : `BST-GME-SVC-${Date.now().toString(36).toUpperCase()}-${subOrders.length}`;

    subOrders.push({
      order_number: orderNumber,
      customer_id: parentOrder.customer_id,
      parent_order_id: parentOrder.id,
      service_id: isSingleItem ? primaryItem?.serviceId : null,
      game_id: isSingleItem ? primaryItem?.gameId : null,
      items: groupItems,
      item_count: groupItems.length,
      status: "paid",
      configuration: isSingleItem ? primaryItem?.configuration : {},
      subtotal: groupTotal,
      discount_amount: 0,
      total: groupTotal,
      currency: parentOrder.currency ?? "USD",
      worker_payout: workerPayout,
      worker_commission_rate: commissionRate,
      payment_method: parentOrder.payment_method,
      payment_id: parentOrder.payment_id,
      payment_status: parentOrder.payment_status,
      affiliate_id: parentOrder.affiliate_id,
      affiliate_commission: parentOrder.affiliate_commission
        ? parseFloat((parentOrder.affiliate_commission * proportion).toFixed(2))
        : 0,
      coupon_id: null,
      customer_notes: parentOrder.customer_notes,
      ip_address: parentOrder.ip_address,
      user_agent: parentOrder.user_agent,
      expires_at: null,
    });
  }

  // Insert all sub-orders
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: created, error: insertError } = await (admin as any)
    .from("orders")
    .insert(subOrders)
    .select("id, order_number") as { data: { id: string; order_number: string }[] | null; error: unknown };

  if (insertError || !created) {
    console.error("[split] insert error:", insertError);
    return NextResponse.json({ error: "Failed to create sub-orders" }, { status: 500 });
  }

  // Mark parent as split (try with is_split first, fall back without it)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: updateErr } = await (admin as any)
    .from("orders")
    .update({ status: "split", is_split: true })
    .eq("id", orderId) as { error: unknown };

  if (updateErr) {
    // Fallback: is_split column may not exist yet
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (admin as any)
      .from("orders")
      .update({ status: "split" })
      .eq("id", orderId);
  }

  // Log activity
  await (admin.from("activity_log").insert({
    action: "order_split",
    target_type: "order",
    target_id: orderId,
    metadata: {
      sub_order_ids: created.map((o) => o.id),
      sub_order_numbers: created.map((o) => o.order_number),
      split_by: user_id,
    },
  } as never) as unknown as Promise<unknown>);

  return NextResponse.json({
    ok: true,
    subOrders: created,
  });
}
