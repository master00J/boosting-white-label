import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import WalletClient from "./wallet-client";

export const metadata: Metadata = { title: "Wallet" };

type Transaction = {
  id: string;
  order_number: string;
  status: string;
  total: number;
  payment_method: string | null;
  created_at: string;
  service: { name: string } | null;
};

export type UserCoupon = {
  id: string;
  code: string;
  description: string | null;
  discount_type: string;
  discount_value: number;
  expires_at: string | null;
  current_uses: number;
  max_uses: number | null;
  is_active: boolean;
  created_at: string;
};

export default async function WalletPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirect=/dashboard/wallet");

  const [profileResult, transactionsResult, couponsResult] = await Promise.all([
    supabase
      .from("profiles")
      .select("balance, total_spent")
      .eq("id", user.id)
      .single(),
    supabase
      .from("orders")
      .select("id, order_number, status, total, payment_method, created_at, service:services(name)")
      .eq("customer_id", user.id)
      .in("payment_status", ["completed", "refunded"])
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("coupons")
      .select("id, code, description, discount_type, discount_value, expires_at, current_uses, max_uses, is_active, created_at")
      .eq("profile_id", user.id)
      .order("created_at", { ascending: false }),
  ]);

  if (profileResult.error) throw profileResult.error;

  const profile = profileResult.data as { balance: number; total_spent: number } | null;

  return (
    <WalletClient
      balance={profile?.balance ?? 0}
      totalSpent={profile?.total_spent ?? 0}
      transactions={(transactionsResult.data as Transaction[] | null) ?? []}
      coupons={(couponsResult.data as UserCoupon[] | null) ?? []}
    />
  );
}
