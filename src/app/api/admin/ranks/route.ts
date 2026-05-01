import { NextRequest, NextResponse } from "next/server";
import { assertSuperAdmin } from "@/lib/auth/assert-admin";
import { z } from "zod";

export const dynamic = "force-dynamic";

const CreateRankSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(50).regex(/^[a-z0-9_-]+$/),
  description: z.string().max(500).optional(),
  section_keys: z.array(z.string()).optional(),
});

export async function GET() {
  const ctx = await assertSuperAdmin();
  if (!ctx.ok) return ctx.response;
  const { admin } = ctx;

  const { data: ranks, error: fetchError } = await admin
    .from("admin_ranks")
    .select("id, name, slug, description, created_at")
    .order("name");

  if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 });

  const withPerms = await Promise.all(
    (ranks ?? []).map(async (r) => {
      const { data: perms } = await admin
        .from("admin_rank_permissions")
        .select("section_key")
        .eq("rank_id", r.id) as { data: { section_key: string }[] | null };
      return { ...r, section_keys: (perms ?? []).map((p) => p.section_key) };
    })
  );

  return NextResponse.json(withPerms);
}

export async function POST(req: NextRequest) {
  const ctx = await assertSuperAdmin();
  if (!ctx.ok) return ctx.response;
  const { admin } = ctx;

  const body = await req.json();
  const parsed = CreateRankSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }

  const { name, slug, description, section_keys } = parsed.data;

  const { data: rank, error: insertError } = await admin
    .from("admin_ranks")
    .insert({ name, slug, description: description ?? null })
    .select("id, name, slug, description, created_at")
    .single();

  if (insertError) {
    if (insertError.code === "23505") return NextResponse.json({ error: "Slug already in use" }, { status: 409 });
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  if (section_keys && section_keys.length > 0) {
    await admin.from("admin_rank_permissions").insert(
      section_keys.map((section_key) => ({ rank_id: rank.id, section_key }))
    );
  }

  const { data: perms } = await admin
    .from("admin_rank_permissions")
    .select("section_key")
    .eq("rank_id", rank.id) as { data: { section_key: string }[] | null };

  return NextResponse.json({ ...rank, section_keys: (perms ?? []).map((p) => p.section_key) });
}
