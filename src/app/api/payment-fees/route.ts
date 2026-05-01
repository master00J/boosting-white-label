import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export type PaymentFees = {
  stripe: { pct: number; fixed: number };
  paypal: { pct: number; fixed: number };
  balance: { pct: number; fixed: number };
  gold: { pct: number; fixed: number };
  whop: { pct: number; fixed: number };
  nowpayments: { pct: number; fixed: number };
};

export async function GET() {
  const admin = createAdminClient();
  const { data } = await admin
    .from("site_settings")
    .select("key, value")
    .in("key", [
      "fee_pct_stripe", "fee_fixed_stripe",
      "fee_pct_paypal", "fee_fixed_paypal",
      "fee_pct_balance", "fee_fixed_balance",
      "fee_pct_gold", "fee_fixed_gold",
      "fee_pct_whop", "fee_fixed_whop",
      "fee_pct_nowpayments", "fee_fixed_nowpayments",
    ]) as unknown as { data: { key: string; value: string }[] | null };

  const map = Object.fromEntries((data ?? []).map((r) => [r.key, parseFloat(r.value) || 0]));

  const fees: PaymentFees = {
    stripe:       { pct: map.fee_pct_stripe       ?? 0, fixed: map.fee_fixed_stripe       ?? 0 },
    paypal:       { pct: map.fee_pct_paypal       ?? 0, fixed: map.fee_fixed_paypal       ?? 0 },
    balance:      { pct: map.fee_pct_balance      ?? 0, fixed: map.fee_fixed_balance      ?? 0 },
    gold:         { pct: map.fee_pct_gold         ?? 0, fixed: map.fee_fixed_gold         ?? 0 },
    whop:         { pct: map.fee_pct_whop         ?? 0, fixed: map.fee_fixed_whop         ?? 0 },
    nowpayments:  { pct: map.fee_pct_nowpayments  ?? 0, fixed: map.fee_fixed_nowpayments  ?? 0 },
  };

  return NextResponse.json(fees);
}
