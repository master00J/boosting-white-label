import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import CouponsClient from "./coupons-client";

export const metadata: Metadata = { title: "Coupons" };
export const dynamic = "force-dynamic";

type CouponRow = {
  id: string;
  code: string;
  discount_type: string;
  discount_value: number;
  min_order_amount: number | null;
  max_uses: number | null;
  used_count: number;
  is_active: boolean;
  expires_at: string | null;
  created_at: string;
};

export default async function CouponsPage() {
  const admin = createAdminClient();
  const { data: coupons } = await admin
    .from("coupons")
    .select("id, code, discount_type, discount_value, min_order_amount, max_uses, used_count, is_active, expires_at, created_at")
    .order("created_at", { ascending: false }) as unknown as { data: CouponRow[] | null };

  return <CouponsClient coupons={coupons ?? []} />;
}
