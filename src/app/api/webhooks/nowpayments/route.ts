import { NextRequest, NextResponse } from "next/server";
import { verifyNOWPaymentsWebhook } from "@/lib/payments/nowpayments";
import { createAdminClient } from "@/lib/supabase/admin";
import { runPaidOrderSideEffects } from "@/lib/orders/paid-side-effects";

export const runtime = "nodejs";

// NOWPayments payment statuses that mean payment is complete
const FINISHED_STATUSES = new Set(["finished", "confirmed"]);
const FAILED_STATUSES = new Set(["failed", "expired"]);
const REFUNDED_STATUSES = new Set(["refunded"]);

interface NOWPaymentsIPN {
  payment_id: string | number;
  payment_status: string;
  order_id: string; // our orderId
  price_amount: number;
  price_currency: string;
  pay_currency?: string;
  actually_paid?: number;
}

export async function POST(req: NextRequest) {
  const payload = await req.text();
  const signature = req.headers.get("x-nowpayments-sig") ?? "";

  // Verify signature
  const valid = await verifyNOWPaymentsWebhook(payload, signature);
  if (!valid) {
    console.error("[nowpayments-webhook] Invalid signature");
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  let ipn: NOWPaymentsIPN;
  try {
    ipn = JSON.parse(payload) as NOWPaymentsIPN;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { order_id: orderId, payment_status: status, payment_id, price_amount, pay_currency, actually_paid } = ipn;

  if (!orderId) {
    return NextResponse.json({ error: "Missing order_id" }, { status: 400 });
  }

  const admin = createAdminClient();

  try {
    if (FINISHED_STATUSES.has(status)) {
      // Verify paid amount matches order total (tolerance: 1% for crypto fluctuation)
      const { data: orderCheck } = await admin
        .from("orders")
        .select("total")
        .eq("id", orderId)
        .eq("status", "pending_payment")
        .single() as unknown as { data: { total: number } | null };

      if (!orderCheck) {
        console.warn(`[nowpayments-webhook] Order ${orderId} not found or not pending`);
        return NextResponse.json({ received: true });
      }

      if (price_amount > 0 && Math.abs(price_amount - orderCheck.total) / orderCheck.total > 0.01) {
        console.error(`[nowpayments-webhook] Amount mismatch for ${orderId}: expected ${orderCheck.total}, got ${price_amount}`);
        return NextResponse.json({ error: "Amount mismatch" }, { status: 400 });
      }

      await (admin
        .from("orders")
        .update({
          status: "paid",
          payment_status: "completed",
        } as never)
        .eq("id", orderId)
        .eq("status", "pending_payment") as unknown as Promise<unknown>);

      // Update customer total_spent
      const { data: order } = await admin
        .from("orders")
        .select("customer_id, total, affiliate_id, affiliate_commission")
        .eq("id", orderId)
        .single() as unknown as { data: { customer_id: string; total: number; affiliate_id: string | null; affiliate_commission: number } | null };

      if (order) {
        const { data: profile } = await admin
          .from("profiles")
          .select("total_spent")
          .eq("id", order.customer_id)
          .single() as unknown as { data: { total_spent: number } | null };

        if (profile) {
          await (admin
            .from("profiles")
            .update({ total_spent: profile.total_spent + order.total } as never)
            .eq("id", order.customer_id) as unknown as Promise<unknown>);
        }

        // Credit affiliate
        if (order.affiliate_id && order.affiliate_commission > 0) {
          const { data: aff } = await admin
            .from("affiliates")
            .select("total_conversions, total_earned, pending_balance")
            .eq("id", order.affiliate_id)
            .single() as unknown as { data: { total_conversions: number; total_earned: number; pending_balance: number } | null };

          if (aff) {
            await (admin.from("affiliates").update({
              total_conversions: aff.total_conversions + 1,
              total_earned: parseFloat((aff.total_earned + order.affiliate_commission).toFixed(2)),
              pending_balance: parseFloat((aff.pending_balance + order.affiliate_commission).toFixed(2)),
            } as never).eq("id", order.affiliate_id) as unknown as Promise<unknown>);
          }
        }
      }

      await (admin.from("activity_log").insert({
        action: "payment_completed",
        target_type: "order",
        target_id: orderId,
        metadata: {
          method: "nowpayments",
          payment_id: String(payment_id),
          amount: price_amount,
          pay_currency: pay_currency ?? "unknown",
          actually_paid: actually_paid ?? null,
        },
      } as never) as unknown as Promise<unknown>);

      console.info(`[nowpayments-webhook] Order ${orderId} marked as paid (${pay_currency})`);
      await runPaidOrderSideEffects(admin, orderId, "nowpayments", {
        payment_id: String(payment_id),
        amount: price_amount,
        pay_currency: pay_currency ?? "unknown",
      });

    } else if (FAILED_STATUSES.has(status)) {
      await (admin
        .from("orders")
        .update({ status: "cancelled", payment_status: "failed" } as never)
        .eq("id", orderId)
        .eq("status", "pending_payment") as unknown as Promise<unknown>);

      console.info(`[nowpayments-webhook] Order ${orderId} marked as cancelled (status: ${status})`);

    } else if (REFUNDED_STATUSES.has(status)) {
      await (admin
        .from("orders")
        .update({ status: "refunded", payment_status: "refunded" } as never)
        .eq("id", orderId) as unknown as Promise<unknown>);

      console.info(`[nowpayments-webhook] Order ${orderId} marked as refunded`);
    } else {
      // waiting, confirming, partially_paid, sending — just log, no action needed
      console.info(`[nowpayments-webhook] Order ${orderId} status update: ${status}`);
    }
  } catch (err) {
    console.error("[nowpayments-webhook] Handler error:", err);
    return NextResponse.json({ error: "Handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
