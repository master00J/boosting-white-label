import { NextRequest, NextResponse } from "next/server";
import { assertAdmin } from "@/lib/auth/assert-admin";
import { z } from "zod";

const CreatePrizeSchema = z.object({
  name: z.string().min(1).max(200),
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

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await assertAdmin();
  if (!ctx.ok) return ctx.response;

  const { id } = await params;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = ctx.admin as any;
  const { data, error } = await db
    .from("lootbox_prizes")
    .select("*")
    .eq("lootbox_id", id)
    .order("sort_order");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await assertAdmin();
  if (!ctx.ok) return ctx.response;

  const { id } = await params;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = ctx.admin as any;
  const body = await req.json().catch(() => null);
  const parsed = CreatePrizeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }

  const { data, error } = await db
    .from("lootbox_prizes")
    .insert({
      lootbox_id: id,
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      prize_type: parsed.data.prize_type ?? "balance_credit",
      prize_value: parsed.data.prize_value ?? 0,
      weight: parsed.data.weight ?? 1,
      image_url: parsed.data.image_url ?? null,
      rarity: parsed.data.rarity ?? "common",
      coupon_config: parsed.data.coupon_config ?? {},
      is_active: parsed.data.is_active ?? true,
      sort_order: parsed.data.sort_order ?? 0,
      osrs_item_id: parsed.data.osrs_item_id ?? null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
