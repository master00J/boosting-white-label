import { NextRequest, NextResponse } from "next/server";
import { verifyWhopWebhook } from "@/lib/payments/whop";
import { createAdminClient } from "@/lib/supabase/admin";
import { runPaidOrderSideEffects } from "@/lib/orders/paid-side-effects";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const headers = Object.fromEntries(req.headers.entries());

  const event = await verifyWhopWebhook(body, headers);

  if (!event) {
    console.error("[whop-webhook] verification failed, raw body preview:", body.slice(0, 500));
    return NextResponse.json({ error: "Invalid webhook" }, { status: 400 });
  }

  console.log("[whop-webhook] received event:", event.type);

  const admin = createAdminClient();

  // Idempotency: skip if this webhook-id was already processed
  const webhookId = headers["webhook-id"];
  if (webhookId) {
    const { data: existing } = await (admin as unknown as { from: (t: string) => { select: (s: string) => { eq: (k: string, v: string) => { maybeSingle: () => Promise<{ data: unknown }> } } } })
      .from("processed_webhooks")
      .select("webhook_id")
      .eq("webhook_id", webhookId)
      .maybeSingle();
    if (existing) {
      console.log("[whop-webhook] duplicate webhook-id, skipping:", webhookId);
      return NextResponse.json({ received: true });
    }
  }

  try {
    switch (event.type) {
      case "payment.succeeded":
      case "payment_succeeded": {
        const payment = event.data as {
          id: string;
          metadata?: { order_id?: string; order_ids?: string };
          checkout_configuration?: { metadata?: { order_id?: string; order_ids?: string } };
          final_amount?: number;
        };

        const paymentId = payment.id;

        // Whop can nest metadata on the payment itself OR on the checkout_configuration
        const meta = payment.metadata ?? payment.checkout_configuration?.metadata ?? {};
        const orderIds = meta.order_ids
          ? meta.order_ids.split(",").filter(Boolean)
          : meta.order_id
          ? [meta.order_id]
          : [];

        if (orderIds.length === 0) {
          console.error("[whop-webhook] payment_succeeded missing order_ids in metadata", payment);
          break;
        }

        // Fetch order data for affiliate + customer stats
        const primaryOrderId = orderIds[0]!;
        const { data: orderData } = await admin
          .from("orders")
          .select("affiliate_id, affiliate_commission, customer_id, total")
          .eq("id", primaryOrderId)
          .single() as unknown as {
            data: {
              affiliate_id: string | null;
              affiliate_commission: number;
              customer_id: string | null;
              total: number;
            } | null;
          };

        // Use atomic RPC to update orders + affiliate + customer in one transaction
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const rpcResult = await (admin as any).rpc("process_payment", {
          p_order_ids:    orderIds,
          p_payment_id:   paymentId,
          p_affiliate_id: orderData?.affiliate_id ?? null,
          p_commission:   orderData?.affiliate_commission ?? 0,
          p_customer_id:  orderData?.customer_id ?? null,
          p_total_spent:  orderData?.total ?? 0,
        });
        if (rpcResult?.error) {
          console.error("[whop-webhook] process_payment RPC error:", rpcResult.error);
        }

        await (admin.from("activity_log").insert({
          action: "payment_completed",
          target_type: "order",
          target_id: primaryOrderId,
          metadata: { method: "whop", whop_payment_id: paymentId, order_ids: orderIds },
        } as never) as unknown as Promise<unknown>);

        console.log("[whop-webhook] payment_succeeded processed:", { orderIds, paymentId });

        for (const oid of orderIds) {
          await runPaidOrderSideEffects(admin, oid, "whop", {
            whop_payment_id: paymentId,
            webhook_id: webhookId ?? null,
          });
        }

        // Store webhook-id for idempotency
        if (webhookId) {
          await (admin.from("processed_webhooks").insert({
            webhook_id: webhookId,
            provider: "whop",
            event_type: event.type,
          } as never) as unknown as Promise<unknown>);
        }
        break;
      }

      case "payment.failed":
      case "payment_failed": {
        const payment = event.data as { metadata?: { order_id?: string; order_ids?: string } };
        const orderIds = payment.metadata?.order_ids
          ? payment.metadata.order_ids.split(",").filter(Boolean)
          : payment.metadata?.order_id ? [payment.metadata.order_id] : [];
        if (orderIds.length > 0) {
          await (admin
            .from("orders")
            .update({ payment_status: "failed" } as never)
            .in("id", orderIds) as unknown as Promise<unknown>);
        }
        break;
      }

      case "refund.created":
      case "refund_created": {
        const payment = event.data as { metadata?: { order_id?: string; order_ids?: string } };
        const orderIds = payment.metadata?.order_ids
          ? payment.metadata.order_ids.split(",").filter(Boolean)
          : payment.metadata?.order_id ? [payment.metadata.order_id] : [];
        if (orderIds.length > 0) {
          await (admin
            .from("orders")
            .update({ status: "refunded", payment_status: "refunded" } as never)
            .in("id", orderIds) as unknown as Promise<unknown>);
        }
        break;
      }

      default:
        console.log("[whop-webhook] unhandled event type:", event.type);
        break;
    }
  } catch (err) {
    console.error("[whop-webhook] handler error:", err);
    return NextResponse.json({ error: "Handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
