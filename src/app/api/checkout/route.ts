import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getRateLimitIdentifier, checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createStripeCheckoutSession } from "@/lib/payments/stripe";
import { createPayPalOrder } from "@/lib/payments/paypal";
import { validateBalancePayment, deductBalance } from "@/lib/payments/balance";
import { createWhopCheckout } from "@/lib/payments/whop";
import { createNOWPaymentsInvoice } from "@/lib/payments/nowpayments";
import { getNextOrderNumber } from "@/lib/order-number";
import { runPaidOrderSideEffects } from "@/lib/orders/paid-side-effects";
import { calculatePrice } from "@/lib/pricing-engine";
import { dbInsert, dbUpdate } from "@/lib/supabase/db-helpers";
import type { PriceMatrix, FormConfig } from "@/types/service-config";
import type { Database } from "@/types/database";
import type { CurrencyRates, GameCurrencyConfig } from "@/types/currency";

const ItemSchema = z.object({
  serviceId: z.string().uuid(),
  serviceName: z.string(),
  gameName: z.string(),
  gameId: z.string().uuid(),
  quantity: z.number().int().min(1),
  finalPrice: z.number().positive(),
  configuration: z.record(z.unknown()),
});

const CheckoutSchema = z.object({
  method: z.enum(["stripe", "paypal", "balance", "gold", "whop", "nowpayments"]),
  items: z.array(ItemSchema).min(1),
  couponCode: z.string().optional(),
  couponDiscount: z.number().min(0).optional(),
  customerNotes: z.string().max(500).optional(),
  /** Value on customer's account in in-game currency (e.g. GP); converted to USD via admin currency_rates */
  accountValueIngame: z.number().min(0).optional(),
  /** Game ID for exchange rate (currency_rates.games[gameId].gold_per_usd) */
  accountValueGameId: z.string().uuid().optional(),
});

async function creditAffiliate(
  admin: ReturnType<typeof createAdminClient>,
  affiliateId: string,
  commission: number
) {
  const { data: aff } = await admin
    .from("affiliates")
    .select("total_conversions, total_earned, pending_balance")
    .eq("id", affiliateId)
    .single() as unknown as { data: { total_conversions: number; total_earned: number; pending_balance: number } | null };

  if (aff) {
    await admin.from("affiliates").update(dbUpdate({
      total_conversions: aff.total_conversions + 1,
      total_earned: parseFloat((aff.total_earned + commission).toFixed(2)),
      pending_balance: parseFloat((aff.pending_balance + commission).toFixed(2)),
    })).eq("id", affiliateId);
  }
}

function parseCurrencyRates(value: unknown): CurrencyRates | null {
  if (!value) return null;

  if (typeof value === "string") {
    try {
      return parseCurrencyRates(JSON.parse(value) as unknown);
    } catch {
      return null;
    }
  }

  if (typeof value === "object" && value !== null) {
    const candidate = value as Partial<CurrencyRates>;
    return {
      usd_eur_rate: typeof candidate.usd_eur_rate === "number" ? candidate.usd_eur_rate : 0.92,
      games: candidate.games && typeof candidate.games === "object" ? candidate.games : {},
    };
  }

  return null;
}

export async function POST(req: NextRequest) {
  const rl = await checkRateLimit(getRateLimitIdentifier(req), RATE_LIMITS.checkout);
  if (rl) return rl;

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

    const body = await req.json() as unknown;
    const parsed = CheckoutSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
    }

    const { method, items, couponCode, couponDiscount = 0, customerNotes, accountValueIngame, accountValueGameId } = parsed.data;
    const admin = createAdminClient();

    const defaultPaymentEnabled: Record<typeof method, boolean> = {
      stripe: true,
      paypal: true,
      balance: true,
      gold: false,
      whop: false,
      nowpayments: false,
    };

    const { data: enabledRow } = await admin
      .from("site_settings")
      .select("value")
      .eq("key", `${method}_enabled`)
      .maybeSingle() as unknown as { data: { value: string } | null };

    const methodEnabled = enabledRow?.value === undefined
      ? defaultPaymentEnabled[method]
      : String(enabledRow.value) === "true";

    if (!methodEnabled) {
      return NextResponse.json({ error: "This payment method is currently disabled." }, { status: 400 });
    }

    // Load payment fees
    const { data: feeRows } = await admin
      .from("site_settings")
      .select("key, value")
      .in("key", [`fee_pct_${method}`, `fee_fixed_${method}`]) as unknown as { data: { key: string; value: string }[] | null };

    const feeMap = Object.fromEntries((feeRows ?? []).map((r) => [r.key, parseFloat(r.value) || 0]));
    const feePct = feeMap[`fee_pct_${method}`] ?? 0;
    const feeFixed = feeMap[`fee_fixed_${method}`] ?? 0;

    // Fetch profile
    const { data: profile } = await admin
      .from("profiles")
      .select("id, email, display_name, is_banned")
      .eq("id", user.id)
      .single() as unknown as { data: Database["public"]["Tables"]["profiles"]["Row"] | null };

    if (!profile || profile.is_banned) {
      return NextResponse.json({ error: "Account blocked" }, { status: 403 });
    }

    // ── SERVER-SIDE PRICE VERIFICATION ──
    // Load all referenced services in one query to recalculate prices from DB
    const serviceIds = [...new Set(items.map((i) => i.serviceId))];
    const { data: serviceRows } = await admin
      .from("services")
      .select("id, price_matrix, form_config, worker_payout_override")
      .in("id", serviceIds) as unknown as {
        data: { id: string; price_matrix: PriceMatrix | null; form_config: FormConfig | null; worker_payout_override: number | null }[] | null;
      };
    const serviceMap = new Map((serviceRows ?? []).map((s) => [s.id, s]));

    // Recalculate each item's price server-side; reject if service not found
    const verifiedItems: typeof items = [];
    let subtotal = 0;

    for (const item of items) {
      const svc = serviceMap.get(item.serviceId);
      if (!svc || !svc.price_matrix || !svc.form_config) {
        return NextResponse.json({ error: `Service not found: ${item.serviceId}` }, { status: 400 });
      }

      const breakdown = calculatePrice(
        svc.price_matrix,
        svc.form_config,
        item.configuration as import("@/lib/pricing-engine").Selections
      );
      const serverPrice = breakdown.final;

      // Always use server-calculated price — round to cents
      const verifiedPrice = Math.round(serverPrice * 100) / 100;

      verifiedItems.push({ ...item, finalPrice: verifiedPrice });
      subtotal += verifiedPrice * item.quantity;
    }

    let validatedDiscount = 0;
    let couponId: string | null = null;

    if (couponCode && couponDiscount > 0) {
      const { data: coupon } = await admin
        .from("coupons")
        .select("*")
        .eq("code", couponCode.toUpperCase())
        .eq("is_active", true)
        .single() as unknown as { data: Database["public"]["Tables"]["coupons"]["Row"] | null };

      if (coupon) {
        const now = new Date();
        const isExpired = coupon.expires_at && new Date(coupon.expires_at) < now;
        const isExhausted = coupon.max_uses && (coupon.current_uses ?? 0) >= coupon.max_uses;
        const meetsMinimum = !coupon.min_order_amount || subtotal >= coupon.min_order_amount;

        if (!isExpired && !isExhausted && meetsMinimum) {
          if (coupon.discount_type === "percentage") {
            validatedDiscount = subtotal * (coupon.discount_value / 100);
            if (coupon.max_discount) validatedDiscount = Math.min(validatedDiscount, coupon.max_discount);
          } else {
            validatedDiscount = coupon.discount_value;
          }
          couponId = coupon.id;
        }
      }
    }

    const baseTotal = Math.max(0, subtotal - validatedDiscount);
    const paymentFee = parseFloat(((baseTotal * feePct) / 100 + feeFixed).toFixed(2));
    const total = parseFloat((baseTotal + paymentFee).toFixed(2));

    // Payment provider minimums — validate BEFORE creating the order
    const PROVIDER_MINIMUMS: Partial<Record<string, number>> = {
      whop: 1.00,
      stripe: 0.50,
      paypal: 0.01,
      nowpayments: 0.50,
    };
    const providerMin = PROVIDER_MINIMUMS[method];
    if (providerMin !== undefined && total < providerMin) {
      return NextResponse.json({
        error: `The minimum order amount for ${method === "whop" ? "Whop" : method === "stripe" ? "card payments" : "PayPal"} is $${providerMin.toFixed(2)}. Your total is $${total.toFixed(2)}. Please add more services to your cart or choose a different payment method.`,
      }, { status: 400 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL
      ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

    // Gold: load currency rates
    let currencyRates: CurrencyRates | null = null;
    if (method === "gold") {
      const { data: ratesRow } = await admin
        .from("site_settings")
        .select("value")
        .eq("key", "currency_rates")
        .single() as unknown as { data: { value: unknown } | null };
      currencyRates = parseCurrencyRates(ratesRow?.value);
    }

    // Balance check
    if (method === "balance") {
      const { valid, shortfall } = await validateBalancePayment(user.id, total);
      if (!valid) {
        return NextResponse.json({
          error: `Insufficient balance. You are $${shortfall.toFixed(2)} short.`,
        }, { status: 400 });
      }
    }

    // Affiliate from cookie
    const affCode = req.cookies.get("aff")?.value ?? null;
    let affiliateId: string | null = null;
    let affiliateCommissionRate: number | null = null;

    if (affCode) {
      const { data: aff } = await admin
        .from("affiliates")
        .select("id, commission_rate, is_active")
        .eq("affiliate_code", affCode)
        .single() as unknown as { data: { id: string; commission_rate: number; is_active: boolean } | null };

      if (aff?.is_active) {
        affiliateId = aff.id;
        affiliateCommissionRate = aff.commission_rate;
      }
    }

    const affiliateCommission = affiliateId && affiliateCommissionRate
      ? parseFloat((total * affiliateCommissionRate).toFixed(2))
      : 0;

    // Worker payout: use server-verified prices and already-fetched service data
    const totalWorkerPayout = parseFloat(
      verifiedItems.reduce((payout, item) => {
        const svc = serviceMap.get(item.serviceId);
        const rate = svc?.worker_payout_override ?? 0.55;
        return payout + item.finalPrice * item.quantity * rate;
      }, 0).toFixed(2)
    );

    // Gold amount (use primary game)
    let goldAmount: number | null = null;
    const primaryItem = verifiedItems[0]!;
    if (method === "gold" && currencyRates) {
      const gameCfg = currencyRates.games[primaryItem.gameId] as GameCurrencyConfig | undefined;
      if (gameCfg?.gold_enabled && gameCfg.gold_per_usd > 0) {
        goldAmount = Math.ceil(total * gameCfg.gold_per_usd);
      }
    }

    if (method === "gold" && goldAmount === null) {
      return NextResponse.json({
        error: "In-game currency is enabled, but this cart is missing a valid Currency & Gold rate.",
      }, { status: 400 });
    }

    // Build description
    const description = verifiedItems.length === 1
      ? `${primaryItem.gameName} — ${primaryItem.serviceName}`
      : verifiedItems.map(i => i.serviceName).join(", ");

    // ── CREATE SINGLE ORDER ──────────────────────────────────────────────────
    const orderNumber = await getNextOrderNumber(admin, primaryItem.gameId, primaryItem.serviceId);

    const insertPayload: Record<string, unknown> = {
      order_number: orderNumber,
      customer_id: user.id,
      // For single-item orders keep service_id/game_id for backwards compat
      service_id: verifiedItems.length === 1 ? primaryItem.serviceId : null,
      game_id: verifiedItems.length === 1 ? primaryItem.gameId : null,
      items: verifiedItems,
      item_count: verifiedItems.length,
      status: "pending_payment",
      // configuration: primary item config (for single-item compat); multi-item uses items[]
      configuration: verifiedItems.length === 1 ? primaryItem.configuration : {},
      subtotal,
      discount_amount: validatedDiscount,
      coupon_id: couponId,
      total,
      currency: "USD",
      worker_payout: totalWorkerPayout,
      worker_commission_rate: 0.55,
      payment_method: method,
      payment_status: "pending",
      customer_notes: customerNotes ?? null,
      ip_address: req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip") ?? null,
      user_agent: req.headers.get("user-agent") ?? null,
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      affiliate_id: affiliateId,
      affiliate_commission: affiliateCommission,
    };

    if (goldAmount !== null) insertPayload.gold_amount = goldAmount;
    if (method === "gold") insertPayload.gold_received = false;

    // Account value: customer enters in-game amount; convert to USD via admin currency_rates (admin/settings/currency)
    if (accountValueIngame != null && accountValueIngame >= 0 && accountValueGameId) {
      const { data: ratesRow } = await admin
        .from("site_settings")
        .select("value")
        .eq("key", "currency_rates")
        .single() as unknown as { data: { value: unknown } | null };
      let parsed: { games?: Record<string, { gold_per_usd?: number }> } = {};
      if (ratesRow?.value != null) {
        if (typeof ratesRow.value === "string") {
          try { parsed = JSON.parse(ratesRow.value) as typeof parsed; } catch { /* ignore */ }
        } else {
          parsed = ratesRow.value as typeof parsed;
        }
      }
      const gameCfg = parsed.games?.[accountValueGameId] as { gold_per_usd?: number } | undefined;
      const goldPerUsd = gameCfg?.gold_per_usd ?? 0;
      if (goldPerUsd > 0) {
        const accountValueUsd = parseFloat((Number(accountValueIngame) / goldPerUsd).toFixed(2));
        insertPayload.account_value = accountValueUsd;
        insertPayload.account_value_ingame = accountValueIngame;
        // Vastgezet op moment van order: USD-waarde wordt opgeslagen en gelogd
        console.info("[checkout] account value fixed at order creation", {
          account_value_ingame: accountValueIngame,
          account_value_usd: accountValueUsd,
          gold_per_usd: goldPerUsd,
        });
      }
    }

    const { data: order, error: orderError } = await admin
      .from("orders")
      .insert(dbInsert(insertPayload))
      .select("id")
      .single() as { data: { id: string } | null; error: unknown };

    if (orderError || !order) {
      console.error("[checkout] order insert error:", JSON.stringify(orderError));
      return NextResponse.json({ error: "Failed to create order" }, { status: 500 });
    }

    const orderId = order.id;

    // ── PAYMENT METHODS ──────────────────────────────────────────────────────

    // Balance: immediate — status "paid"; admin must release to "queued" before boosters can claim
    if (method === "balance") {
      await deductBalance(user.id, total, orderId);
      await admin.from("orders").update(dbUpdate({ status: "paid", payment_status: "completed" })).eq("id", orderId);
      if (affiliateId && affiliateCommission > 0) await creditAffiliate(admin, affiliateId, affiliateCommission);
      await runPaidOrderSideEffects(admin, orderId, "balance", { amount: total }, user.id);
      return NextResponse.json({ method: "balance", success: true, orderId, redirectUrl: `${appUrl}/checkout/success?order=${orderId}` });
    }

    // Gold
    if (method === "gold") {
      const gameCfg = currencyRates?.games[primaryItem.gameId] as GameCurrencyConfig | undefined;
      return NextResponse.json({
        method: "gold",
        success: true,
        orderId,
        goldAmount: goldAmount ?? 0,
        goldLabel: gameCfg?.gold_currency_label ?? "GP",
        instructions: gameCfg?.gold_payment_instructions ?? "",
        redirectUrl: `${appUrl}/checkout/success?order=${orderId}&method=gold`,
      });
    }

    // Stripe
    if (method === "stripe") {
      const { sessionId, url } = await createStripeCheckoutSession({
        orderId,
        orderNumber,
        amount: Math.round(total * 100),
        currency: "USD",
        customerEmail: profile.email,
        serviceDescription: description,
        successUrl: `${appUrl}/checkout/success?order=${orderId}&session_id={CHECKOUT_SESSION_ID}`,
        cancelUrl: `${appUrl}/cart`,
        metadata: { order_ids: orderId },
      });
      await admin.from("orders").update(dbUpdate({ payment_id: sessionId })).eq("id", orderId);
      return NextResponse.json({ method: "stripe", redirectUrl: url });
    }

    // PayPal
    if (method === "paypal") {
      const { paypalOrderId, approvalUrl } = await createPayPalOrder({
        orderId,
        orderNumber,
        amount: total,
        currency: "USD",
        serviceDescription: description,
        returnUrl: `${appUrl}/checkout/success?order=${orderId}`,
        cancelUrl: `${appUrl}/cart`,
      });
      await admin.from("orders").update(dbUpdate({ payment_id: paypalOrderId })).eq("id", orderId);
      return NextResponse.json({ method: "paypal", redirectUrl: approvalUrl });
    }

    // Whop
    if (method === "whop") {
      const { purchaseUrl, planId } = await createWhopCheckout({
        orderId,
        orderIds: [orderId],
        total,
        currency: "USD",
        description,
        successUrl: `${appUrl}/checkout/success?order=${orderId}`,
        cancelUrl: `${appUrl}/cart`,
      });
      await admin.from("orders").update(dbUpdate({ payment_id: planId })).eq("id", orderId);
      return NextResponse.json({ method: "whop", redirectUrl: purchaseUrl });
    }

    // NOWPayments (crypto)
    if (method === "nowpayments") {
      const { invoiceId, invoiceUrl } = await createNOWPaymentsInvoice({
        orderId,
        total,
        description,
        successUrl: `${appUrl}/checkout/success?order=${orderId}`,
        cancelUrl: `${appUrl}/cart`,
        callbackUrl: `${appUrl}/api/webhooks/nowpayments`,
      });
      await admin.from("orders").update(dbUpdate({ payment_id: invoiceId })).eq("id", orderId);
      return NextResponse.json({ method: "nowpayments", redirectUrl: invoiceUrl });
    }

    return NextResponse.json({ error: "Invalid payment method" }, { status: 400 });
  } catch (err) {
    console.error("[checkout]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
