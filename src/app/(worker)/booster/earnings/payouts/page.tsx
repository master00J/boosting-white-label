import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import PayoutsClient from "./payouts-client";
import { Package } from "lucide-react";

export const metadata: Metadata = { title: "Payouts" };

type PayoutRow = {
  id: string;
  amount: number;
  method: string;
  status: string;
  transaction_id: string | null;
  created_at: string;
  processed_at: string | null;
};

export default async function PayoutsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirect=/booster/earnings/payouts");

  const admin = createAdminClient();

  // Fetch worker first — payouts.worker_id references workers.id, not profiles.id
  const workerResult = await admin
    .from("workers")
    .select("id, pending_balance, payout_minimum, payout_method")
    .eq("profile_id", user.id)
    .single();

  const worker = workerResult.data as { id: string; pending_balance: number; payout_minimum: number; payout_method: string | null } | null;

  if (!worker) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
          <Package className="h-8 w-8 text-primary" />
        </div>
        <h1 className="font-heading text-2xl font-semibold">No worker profile found</h1>
        <p className="text-[var(--text-muted)] max-w-sm">
          Your account doesn&apos;t have a worker profile yet. Ask an admin to create one.
        </p>
      </div>
    );
  }

  const payoutsResult = await admin
    .from("payouts")
    .select("id, amount, method, status, transaction_id, created_at, processed_at")
    .eq("worker_id", worker.id)
    .order("created_at", { ascending: false })
    .limit(20);

  return (
    <PayoutsClient
      pendingBalance={worker.pending_balance}
      payoutMinimum={worker.payout_minimum}
      payoutMethod={worker.payout_method}
      payouts={(payoutsResult.data as PayoutRow[] | null) ?? []}
    />
  );
}
