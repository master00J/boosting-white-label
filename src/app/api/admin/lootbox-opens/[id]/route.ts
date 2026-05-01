import { NextRequest, NextResponse } from "next/server";
import { assertAdmin } from "@/lib/auth/assert-admin";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await assertAdmin();
  if (!ctx.ok) return ctx.response;

  const { id } = await params;
  const body = await req.json();

  const allowed = ["delivery_status", "delivery_notes"];
  const updates: Record<string, unknown> = {};

  for (const key of allowed) {
    if (key in body) updates[key] = body[key];
  }

  if (!Object.keys(updates).length) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  // Auto-set delivered_at and delivered_by when marking as delivered
  if (updates.delivery_status === "delivered") {
    updates.delivered_at = new Date().toISOString();
    updates.delivered_by = ctx.userId;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = ctx.admin as any;
  const { data, error } = await db
    .from("lootbox_opens")
    .update(updates)
    .eq("id", id)
    .select(
      `id, delivery_status, delivery_notes, delivered_at, delivered_by,
       prize_snapshot, created_at, profile_id,
       profiles:profile_id ( email, username ),
       lootboxes:lootbox_id ( name )`
    )
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
