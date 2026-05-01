import { NextRequest, NextResponse } from "next/server";
import { capturePayPalOrder, verifyPayPalWebhook } from "@/lib/payments/paypal";
import { createAdminClient } from "@/lib/supabase/admin";
import { runPaidOrderSideEffects } from "@/lib/orders/paid-side-effects";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const headers = Object.fromEntries(req.headers.entries());

  // Verify PayPal webhook signature via PayPal's verify-webhook-signature API
  const valid = await verifyPayPalWebhook(headers, rawBody);
  if (!valid) {
    return NextResponse.json({ error: "Invalid webhook signature" }, { status: 400 });
  }

  let body: Record<string, unknown>;
  try {
    body = JSON.parse(rawBody) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const eventType = body.event_type as string | undefined;
  const admin = createAdminClient();

  try {
    switch (eventType) {
      case "CHECKOUT.ORDER.APPROVED": {
        const resource = body.resource as Record<string, unknown> | undefined;
        const paypalOrderId = resource?.id as string | undefined;
        if (!paypalOrderId) break;

        // Capture the payment
        const capture = await capturePayPalOrder(paypalOrderId);

        if (capture.status === "COMPLETED") {
          // Find order by paypal order id stored in payment_id
          const { data: orders } = await admin
            .from("orders")
            .select("id, customer_id, total")
            .eq("payment_id", paypalOrderId)
            .eq("status", "pending_payment") as unknown as {
              data: { id: string; customer_id: string | null; total: number }[] | null
            };

          if (orders && orders.length > 0) {
            const orderIds = orders.map((o) => o.id);
            await (admin
              .from("orders")
              .update({ status: "paid", payment_status: "completed" } as never)
              .in("id", orderIds) as unknown as Promise<unknown>);

            // Update total_spent
            const customerId = orders[0]?.customer_id;
            if (customerId) {
              const totalAmount = orders.reduce((sum, o) => sum + o.total, 0);
              const { data: profile } = await admin
                .from("profiles")
                .select("total_spent")
                .eq("id", customerId)
                .single() as unknown as { data: { total_spent: number } | null };

              if (profile) {
                await (admin
                  .from("profiles")
                  .update({ total_spent: profile.total_spent + totalAmount } as never)
                  .eq("id", customerId) as unknown as Promise<unknown>);
              }
            }

            // Store capture_id so refund webhooks can match on it
            if (capture.captureId) {
              await (admin
                .from("orders")
                .update({ payment_id: capture.captureId } as never)
                .in("id", orderIds) as unknown as Promise<unknown>);
            }

            await (admin.from("activity_log").insert({
              action: "payment_completed",
              target_type: "order",
              target_id: orderIds[0],
              metadata: {
                method: "paypal",
                paypal_order_id: paypalOrderId,
                capture_id: capture.captureId,
                amount: capture.amount,
              },
            } as never) as unknown as Promise<unknown>);

            for (const oid of orderIds) {
              await runPaidOrderSideEffects(admin, oid, "paypal", {
                paypal_order_id: paypalOrderId,
                capture_id: capture.captureId,
              });
            }
          }
        }
        break;
      }

      case "PAYMENT.CAPTURE.REFUNDED": {
        const resource = body.resource as Record<string, unknown> | undefined;
        const links = resource?.links as { rel: string; href: string }[] | undefined;
        const upLink = links?.find((l) => l.rel === "up");
        if (upLink) {
          // Extract order id from the link
          const parts = upLink.href.split("/");
          const captureId = parts[parts.length - 1];
          if (captureId) {
            await (admin
              .from("orders")
              .update({ status: "refunded", payment_status: "refunded" } as never)
              .eq("payment_id", captureId) as unknown as Promise<unknown>);
          }
        }
        break;
      }

      default:
        break;
    }
  } catch (err) {
    console.error("[paypal-webhook] Handler error:", err);
    return NextResponse.json({ error: "Handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
