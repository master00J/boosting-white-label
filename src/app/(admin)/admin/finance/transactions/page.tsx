import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import TransactionsClient from "./transactions-client";

export const metadata: Metadata = { title: "Transactions" };
export const dynamic = "force-dynamic";

type TxRow = {
  id: string;
  order_number: string;
  status: string;
  total: number;
  payment_method: string | null;
  created_at: string;
  customer: { display_name: string | null; email: string } | null;
};

export default async function TransactionsPage() {
  const admin = createAdminClient();

  const { data: transactions } = await admin
    .from("orders")
    .select("id, order_number, status, total, payment_method, created_at, customer:profiles!customer_id(display_name, email)")
    .not("status", "eq", "pending_payment")
    .order("created_at", { ascending: false })
    .limit(200) as unknown as { data: TxRow[] | null };

  return <TransactionsClient transactions={transactions ?? []} />;
}
