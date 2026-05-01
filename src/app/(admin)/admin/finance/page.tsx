import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import FinanceClient from "./finance-client";

export const metadata: Metadata = { title: "Finance" };
export const dynamic = "force-dynamic";

type OrderRow = { total: number; worker_payout: number | null; status: string; created_at: string };
type PayoutRow = { amount: number; status: string; created_at: string };

export default async function FinancePage() {
  const admin = createAdminClient();

  const { data: orders } = await admin
    .from("orders")
    .select("total, worker_payout, status, created_at")
    .not("status", "in", '("pending_payment","cancelled")')
    .order("created_at", { ascending: false })
    .limit(500) as unknown as { data: OrderRow[] | null };

  const { data: payouts } = await admin
    .from("payouts")
    .select("amount, status, created_at")
    .order("created_at", { ascending: false })
    .limit(200) as unknown as { data: PayoutRow[] | null };

  const allOrders = orders ?? [];
  const allPayouts = payouts ?? [];

  // Monthly revenue for last 6 months
  const now = new Date();
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    return { label: d.toLocaleDateString("nl-NL", { month: "short" }), year: d.getFullYear(), month: d.getMonth() };
  });

  const monthlyData = months.map(({ label, year, month }) => {
    const monthOrders = allOrders.filter((o) => {
      const d = new Date(o.created_at);
      return d.getFullYear() === year && d.getMonth() === month;
    });
    const revenue = monthOrders.reduce((s, o) => s + o.total, 0);
    const payoutCost = monthOrders.reduce((s, o) => s + (o.worker_payout ?? 0), 0);
    return { label, revenue, payoutCost, margin: revenue - payoutCost };
  });

  const totalRevenue = allOrders.reduce((s, o) => s + o.total, 0);
  const totalPayoutCost = allOrders.reduce((s, o) => s + (o.worker_payout ?? 0), 0);
  const pendingPayouts = allPayouts.filter((p) => p.status === "pending").reduce((s, p) => s + p.amount, 0);
  const completedOrders = allOrders.filter((o) => o.status === "completed").length;

  return (
    <FinanceClient
      monthlyData={monthlyData}
      stats={{ totalRevenue, totalPayoutCost, pendingPayouts, completedOrders }}
    />
  );
}
