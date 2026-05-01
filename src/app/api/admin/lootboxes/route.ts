import { NextResponse } from "next/server";
import { assertAdmin } from "@/lib/auth/assert-admin";

export async function GET() {
  const ctx = await assertAdmin();
  if (!ctx.ok) return ctx.response;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = ctx.admin as any;
  const { data, error } = await db
    .from("lootboxes")
    .select("*, lootbox_prizes(*)")
    .order("sort_order");

  if (error) return NextResponse.json({ error: "Database query failed" }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: Request) {
  const ctx = await assertAdmin();
  if (!ctx.ok) return ctx.response;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = ctx.admin as any;
  const body = await req.json();
  const { data, error } = await db
    .from("lootboxes")
    .insert({
      name: body.name,
      description: body.description || null,
      image_url: body.image_url || null,
      cost_points: body.cost_points || 100,
      is_active: body.is_active ?? true,
      sort_order: body.sort_order || 0,
      layer_closed:    body.layer_closed    || null,
      layer_base:      body.layer_base      || null,
      layer_lid:       body.layer_lid       || null,
      layer_open:      body.layer_open      || null,
      layer_glow:      body.layer_glow      || null,
      layer_particles: body.layer_particles || null,
      layer_beam:      body.layer_beam      || null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
