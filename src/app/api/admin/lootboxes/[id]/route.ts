import { NextRequest, NextResponse } from "next/server";
import { assertAdmin } from "@/lib/auth/assert-admin";
import { z } from "zod";

const PatchSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  slug: z.string().min(1).max(100).optional(),
  description: z.string().max(2000).nullable().optional(),
  image_url: z.string().max(500).nullable().optional(),
  cost_points: z.number().int().positive().optional(),
  is_active: z.boolean().optional(),
  price: z.number().nonnegative().optional(),
  sort_order: z.number().int().optional(),
  game_id: z.string().uuid().optional(),
  max_opens_per_user: z.number().int().positive().nullable().optional(),
  layer_closed: z.string().max(8000).nullable().optional(),
  layer_base: z.string().max(8000).nullable().optional(),
  layer_lid: z.string().max(8000).nullable().optional(),
  layer_open: z.string().max(8000).nullable().optional(),
  layer_glow: z.string().max(8000).nullable().optional(),
  layer_particles: z.string().max(8000).nullable().optional(),
  layer_beam: z.string().max(8000).nullable().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await assertAdmin();
  if (!ctx.ok) return ctx.response;

  const { id } = await params;
  const body = await req.json().catch(() => null);
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = ctx.admin as any;
  const { data, error } = await db
    .from("lootboxes")
    .update(parsed.data)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await assertAdmin();
  if (!ctx.ok) return ctx.response;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = ctx.admin as any;
  const { id } = await params;
  const { error } = await db.from("lootboxes").delete().eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
