import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

  const admin = createAdminClient();

  const { data: worker } = await admin
    .from("workers")
    .select("id, pending_balance, payout_minimum, payout_method")
    .eq("profile_id", user.id)
    .single() as unknown as { data: { id: string; pending_balance: number; payout_minimum: number; payout_method: string | null } | null };

  if (!worker) return NextResponse.json({ error: "Worker not found" }, { status: 404 });
  if (!worker.payout_method) return NextResponse.json({ error: "No payout method configured" }, { status: 400 });
  if (worker.pending_balance < worker.payout_minimum) {
    return NextResponse.json({ error: `Minimum payout is $${worker.payout_minimum.toFixed(2)}` }, { status: 400 });
  }

  // Block duplicate: check for existing pending/processing payout
  const { data: existing } = await admin
    .from("payouts")
    .select("id")
    .eq("worker_id", worker.id)
    .in("status", ["pending", "processing"])
    .limit(1) as unknown as { data: { id: string }[] | null };

  if (existing && existing.length > 0) {
    return NextResponse.json({ error: "You already have a pending payout request." }, { status: 400 });
  }

  const amount = worker.pending_balance;

  // Deduct balance immediately so worker can't request twice
  await admin
    .from("workers")
    .update({ pending_balance: 0 } as never)
    .eq("id", worker.id);

  const { error: insertError } = await admin
    .from("payouts")
    .insert({
      worker_id: worker.id,
      amount,
      method: worker.payout_method,
      status: "pending",
    } as never) as unknown as { error: { message: string } | null };

  if (insertError) {
    // Rollback balance if insert failed
    await admin
      .from("workers")
      .update({ pending_balance: amount } as never)
      .eq("id", worker.id);
    return NextResponse.json({ error: "Failed to create payout request." }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
