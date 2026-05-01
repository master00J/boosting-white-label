import { NextResponse } from "next/server";
import { assertAdmin } from "@/lib/auth/assert-admin";
import { z } from "zod";

const bodySchema = z.object({
  amount: z.number().positive(),
  note: z.string().max(500).optional(),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: workerId } = await params;
  const ctx = await assertAdmin();
  if (!ctx.ok) return ctx.response;
  const { admin, userId: user_id } = ctx;

  const body = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid amount or note" }, { status: 400 });

  const { data: worker } = await admin
    .from("workers")
    .select("id")
    .eq("id", workerId)
    .single() as { data: { id: string } | null };
  if (!worker) return NextResponse.json({ error: "Worker not found" }, { status: 404 });

  const { data: payment, error } = await admin
    .from("worker_deposit_payments")
    .insert({
      worker_id: workerId,
      amount: parsed.data.amount,
      note: parsed.data.note ?? null,
      recorded_by: user_id,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(payment, { status: 201 });
}
