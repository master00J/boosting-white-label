import { NextRequest, NextResponse } from "next/server";
import { assertAdmin } from "@/lib/auth/assert-admin";
import { z } from "zod";

export const dynamic = "force-dynamic";

const PatchSchema = z.object({
  status: z.enum(["pending", "processing", "completed", "failed"]),
  transaction_id: z.string().optional(),
});

type PayoutRow = {
  id: string;
  worker_id: string;
  amount: number;
  status: string;
};

type WorkerRow = {
  id: string;
  pending_balance: number;
};

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await assertAdmin();
  if (!ctx.ok) return ctx.response;

  const { id } = await params;
  const { admin, userId } = ctx;

  const parsed = PatchSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", details: parsed.error.flatten() }, { status: 400 });
  }

  const { status, transaction_id } = parsed.data;

  // If marking as failed, refund the balance back to the worker
  if (status === "failed") {
    const { data: payout } = await admin
      .from("payouts")
      .select("id, worker_id, amount, status")
      .eq("id", id)
      .single() as unknown as { data: PayoutRow | null };

    if (payout && payout.status !== "completed" && payout.status !== "failed") {
      const { data: worker } = await admin
        .from("workers")
        .select("id, pending_balance")
        .eq("id", payout.worker_id)
        .single() as unknown as { data: WorkerRow | null };

      if (worker) {
        await admin
          .from("workers")
          .update({ pending_balance: worker.pending_balance + payout.amount } as never)
          .eq("id", worker.id);
      }
    }
  }

  const updatePayload: Record<string, unknown> = {
    status,
    processed_at: new Date().toISOString(),
    processed_by: userId,
  };
  if (transaction_id !== undefined) updatePayload.transaction_id = transaction_id;

  const { error } = await admin
    .from("payouts")
    .update(updatePayload)
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
