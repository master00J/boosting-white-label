import { NextResponse } from "next/server";
import { assertAdmin } from "@/lib/auth/assert-admin";
import { z } from "zod";

export const dynamic = "force-dynamic";

const PatchSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  slug: z.string().min(1).max(100).optional(),
  description: z.string().max(2000).nullable().optional(),
  is_active: z.boolean().optional(),
  image_url: z.string().max(500).nullable().optional(),
  banner_url: z.string().max(500).nullable().optional(),
  icon_url: z.string().max(500).nullable().optional(),
  sort_order: z.number().int().optional(),
  color: z.string().max(50).nullable().optional(),
  category: z.string().max(100).nullable().optional(),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await assertAdmin();
  if (!ctx.ok) return ctx.response;

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }

  const { data, error } = await ctx.admin.from("games").update(parsed.data).eq("id", id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await assertAdmin();
  if (!ctx.ok) return ctx.response;

  const { id } = await params;
  const { error } = await ctx.admin.from("games").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
