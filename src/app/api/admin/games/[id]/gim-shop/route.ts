import { NextRequest, NextResponse } from "next/server";
import { assertAdmin } from "@/lib/auth/assert-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { z } from "zod";

export const dynamic = "force-dynamic";

const db = (admin: ReturnType<typeof createAdminClient>) =>
  admin as unknown as { from: (t: string) => ReturnType<ReturnType<typeof createAdminClient>["from"]> };

const CreateSchema = z.object({
  name: z.string().min(1).max(200),
  slug: z.string().min(1).max(100),
  description: z.string().max(2000).nullable().optional(),
  is_active: z.boolean().optional(),
});

// GET /api/admin/games/[id]/gim-shop — list shops for game
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await assertAdmin();
    if (!ctx.ok) return ctx.response;

    const { id: gameId } = await params;

    const { data, error } = await db(ctx.admin)
      .from("gim_shops")
      .select("id, game_id, name, slug, description, is_active, created_at, updated_at")
      .eq("game_id", gameId)
      .order("created_at", { ascending: true }) as { data: unknown[] | null; error: { message: string } | null };

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data ?? []);
  } catch (e) {
    console.error("[gim-shop GET]", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/admin/games/[id]/gim-shop — create shop for game
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await assertAdmin();
    if (!ctx.ok) return ctx.response;

    const { id: gameId } = await params;
    const parsed = CreateSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
    }

    const { name, slug, description, is_active } = parsed.data;

    const { data, error } = await db(ctx.admin)
      .from("gim_shops")
      .insert({ game_id: gameId, name, slug, description: description ?? null, is_active: is_active ?? true })
      .select("id, name, slug")
      .single() as { data: { id: string; name: string; slug: string } | null; error: { message: string } | null };

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } catch (e) {
    console.error("[gim-shop POST]", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
