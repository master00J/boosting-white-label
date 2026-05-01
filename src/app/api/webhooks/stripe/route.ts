import { NextRequest, NextResponse } from "next/server";
import { verifyStripeWebhook } from "@/lib/payments/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { runPaidOrderSideEffects } from "@/lib/orders/paid-side-effects";
import type Stripe from "stripe";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const payload = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = await verifyStripeWebhook(payload, signature);
  } catch (err) {
    console.error("[stripe-webhook] Signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const admin = createAdminClient();

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const orderIds = (session.metadata?.order_ids ?? "").split(",").filter(Boolean);
        const paymentIntentId = typeof session.payment_intent === "string"
          ? session.payment_intent
          : session.payment_intent?.id ?? null;

        if (orderIds.length > 0) {
          // Idempotency: only update orders still in pending_payment status
          const { data: updatedOrders } = await (admin
            .from("orders")
            .update({ status: "paid", payment_status: "completed", payment_id: paymentIntentId } as never)
            .in("id", orderIds)
            .eq("status", "pending_payment")
            .select("id") as unknown as Promise<{ data: { id: string }[] | null }>);

          // If no orders were updated, this event was already processed — skip side effects
          if (!updatedOrders || updatedOrders.length === 0) {
            console.info("[stripe-webhook] Duplicate event or already processed, skipping:", event.id);
            break;
          }

          const amount = (session.amount_total ?? 0) / 100;

          // Update total_spent for customer
          if (session.customer_email) {
            const { data: profile } = await admin
              .from("profiles")
              .select("id, total_spent")
              .eq("email", session.customer_email)
              .single() as unknown as { data: { id: string; total_spent: number } | null };

            if (profile) {
              await (admin
                .from("profiles")
                .update({ total_spent: profile.total_spent + amount } as never)
                .eq("id", profile.id) as unknown as Promise<unknown>);
            }
          }

          // Credit affiliate if order has one
          const { data: orderData } = await admin
            .from("orders")
            .select("affiliate_id, affiliate_commission")
            .eq("id", orderIds[0]!)
            .single() as unknown as { data: { affiliate_id: string | null; affiliate_commission: number } | null };

          if (orderData?.affiliate_id && orderData.affiliate_commission > 0) {
            const { data: aff } = await admin
              .from("affiliates")
              .select("total_conversions, total_earned, pending_balance")
              .eq("id", orderData.affiliate_id)
              .single() as unknown as { data: { total_conversions: number; total_earned: number; pending_balance: number } | null };

            if (aff) {
              await (admin.from("affiliates").update({
                total_conversions: aff.total_conversions + 1,
                total_earned: parseFloat((aff.total_earned + orderData.affiliate_commission).toFixed(2)),
                pending_balance: parseFloat((aff.pending_balance + orderData.affiliate_commission).toFixed(2)),
              } as never).eq("id", orderData.affiliate_id) as unknown as Promise<unknown>);
            }
          }

          await (admin.from("activity_log").insert({
            action: "payment_completed",
            target_type: "order",
            target_id: orderIds[0],
            metadata: {
              method: "stripe",
              payment_intent_id: paymentIntentId,
              amount,
              order_ids: orderIds,
            },
          } as never) as unknown as Promise<unknown>);

          // Send confirmation email + in-app notification for each order
          for (const oid of orderIds) {
            await runPaidOrderSideEffects(admin, oid, "stripe", {
              payment_intent_id: paymentIntentId,
              stripe_event_id: event.id,
            });
          }
        }
        break;
      }

      case "checkout.session.expired": {
        const session = event.data.object as Stripe.Checkout.Session;
        const orderIds = (session.metadata?.order_ids ?? "").split(",").filter(Boolean);
        if (orderIds.length > 0) {
          await (admin
            .from("orders")
            .update({ status: "cancelled", payment_status: "failed" } as never)
            .in("id", orderIds)
            .eq("status", "pending_payment") as unknown as Promise<unknown>);
        }
        break;
      }

      case "charge.refunded": {
        const charge = event.data.object as Stripe.Charge;
        const paymentIntentId = typeof charge.payment_intent === "string"
          ? charge.payment_intent
          : charge.payment_intent?.id;

        if (paymentIntentId) {
          await (admin
            .from("orders")
            .update({ status: "refunded", payment_status: "refunded" } as never)
            .eq("payment_id", paymentIntentId) as unknown as Promise<unknown>);
        }
        break;
      }

      default:
        break;
    }
  } catch (err) {
    console.error("[stripe-webhook] Handler error:", err);
    return NextResponse.json({ error: "Handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
