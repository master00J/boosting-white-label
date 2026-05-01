import { NextRequest, NextResponse } from "next/server";
import { assertSuperAdmin } from "@/lib/auth/assert-admin";
import { z } from "zod";

export const dynamic = "force-dynamic";

const UpdateRankSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  slug: z.string().min(1).max(50).regex(/^[a-z0-9_-]+$/).optional(),
  description: z.string().max(500).optional().nullable(),
  section_keys: z.array(z.string()).optional(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await assertSuperAdmin();
  if (!ctx.ok) return ctx.response;

  const { id } = await params;
  const { admin } = ctx;

  const { data: rank, error: fetchError } = await admin
    .from("admin_ranks")
    .select("id, name, slug, description, created_at")
    .eq("id", id)
    .single();

  if (fetchError || !rank) return NextResponse.json({ error: "Rank not found" }, { status: 404 });

  const { data: perms } = await admin
    .from("admin_rank_permissions")
    .select("section_key")
    .eq("rank_id", id) as { data: { section_key: string }[] | null };

  return NextResponse.json({ ...rank, section_keys: (perms ?? []).map((p) => p.section_key) });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await assertSuperAdmin();
  if (!ctx.ok) return ctx.response;

  const { id } = await params;
  const { admin } = ctx;
  const body = await req.json();
  const parsed = UpdateRankSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }

  const { name, slug, description, section_keys } = parsed.data;

  const updatePayload: Record<string, unknown> = {};
  if (name !== undefined) updatePayload.name = name;
  if (slug !== undefined) updatePayload.slug = slug;
  if (description !== undefined) updatePayload.description = description;

  if (Object.keys(updatePayload).length > 0) {
    const { error: updateError } = await admin.from("admin_ranks").update(updatePayload).eq("id", id);
    if (updateError) {
      if (updateError.code === "23505") return NextResponse.json({ error: "Slug already in use" }, { status: 409 });
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }
  }

  if (section_keys !== undefined) {
    await admin.from("admin_rank_permissions").delete().eq("rank_id", id);
    if (section_keys.length > 0) {
      await admin.from("admin_rank_permissions").insert(
        section_keys.map((section_key) => ({ rank_id: id, section_key }))
      );
    }
  }

  const { data: rank } = await admin
    .from("admin_ranks")
    .select("id, name, slug, description, created_at")
    .eq("id", id)
    .single();

  const { data: perms } = await admin
    .from("admin_rank_permissions")
    .select("section_key")
    .eq("rank_id", id) as { data: { section_key: string }[] | null };

  return NextResponse.json({ ...rank, section_keys: (perms ?? []).map((p) => p.section_key) });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await assertSuperAdmin();
  if (!ctx.ok) return ctx.response;

  const { id } = await params;
  const { admin } = ctx;

  const { error: deleteError } = await admin.from("admin_ranks").delete().eq("id", id);
  if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
