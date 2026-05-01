import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import PayoutsAdminClient from "./payouts-admin-client";

export const metadata: Metadata = { title: "Payouts" };
export const dynamic = "force-dynamic";

type PayoutRow = {
  id: string;
  amount: number;
  method: string;
  status: string;
  notes: string | null;
  transaction_id: string | null;
  created_at: string;
  processed_at: string | null;
  worker: {
    payout_details_encrypted: string | null;
    profile: { display_name: string | null; email: string } | null;
  } | null;
};

export default async function AdminPayoutsPage() {
  const admin = createAdminClient();

  const { data: payouts } = await admin
    .from("payouts")
    .select("id, amount, method, status, notes, transaction_id, created_at, processed_at, worker:workers(payout_details_encrypted, profile:profiles(display_name, email))")
    .order("created_at", { ascending: false })
    .limit(200) as unknown as { data: PayoutRow[] | null };

  return <PayoutsAdminClient payouts={payouts ?? []} />;
}
