import { NextRequest, NextResponse } from "next/server";
import { assertAdmin } from "@/lib/auth/assert-admin";
import { z } from "zod";

const PatchPrizeSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).nullable().optional(),
  prize_type: z.string().min(1).max(100).optional(),
  prize_value: z.number().nonnegative().optional(),
  weight: z.number().positive().optional(),
  image_url: z.string().max(500).nullable().optional(),
  rarity: z.string().min(1).max(50).optional(),
  coupon_config: z.record(z.unknown()).optional(),
  is_active: z.boolean().optional(),
  sort_order: z.number().int().optional(),
  osrs_item_id: z.string().max(50).nullable().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; prizeId: string }> }
) {
  const ctx = await assertAdmin();
  if (!ctx.ok) return ctx.response;

  const { prizeId } = await params;
  const body = await req.json().catch(() => null);
  const parsed = PatchPrizeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = ctx.admin as any;
  const { data, error } = await db
    .from("lootbox_prizes")
    .update(parsed.data)
    .eq("id", prizeId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; prizeId: string }> }
) {
  const ctx = await assertAdmin();
  if (!ctx.ok) return ctx.response;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = ctx.admin as any;
  const { prizeId } = await params;
  const { error } = await db.from("lootbox_prizes").delete().eq("id", prizeId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
