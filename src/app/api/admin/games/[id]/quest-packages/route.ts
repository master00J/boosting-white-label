import { NextRequest, NextResponse } from "next/server";
import { assertAdmin } from "@/lib/auth/assert-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { z } from "zod";

export const dynamic = "force-dynamic";

function questPackagesTable(admin: ReturnType<typeof createAdminClient>) {
  return (admin as unknown as { from: (table: string) => ReturnType<ReturnType<typeof createAdminClient>["from"]> }).from("quest_packages");
}

const CreateSchema = z.object({
  name: z.string().min(1).max(200),
  slug: z.string().min(1).max(100),
  description: z.string().max(2000).nullable().optional(),
  base_price: z.number().nonnegative(),
  sort_order: z.number().int().optional(),
  is_active: z.boolean().optional(),
  quest_ids: z.array(z.string().min(1)).min(1),
});

type PackageRow = {
  id: string;
  game_id: string;
  name: string;
  slug: string;
  description: string | null;
  base_price: number;
  sort_order: number;
  is_active: boolean;
  quest_ids: string[] | null;
  created_at: string;
  updated_at: string;
};

// GET /api/admin/games/[id]/quest-packages — list packages for game
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await assertAdmin();
    if (!ctx.ok) return ctx.response;

    const { id: gameId } = await params;
    const admin = ctx.admin;

    const { data: packages, error: pErr } = await questPackagesTable(admin)
      .select("id, game_id, name, slug, description, base_price, sort_order, is_active, quest_ids, created_at, updated_at")
      .eq("game_id", gameId)
      .order("sort_order", { ascending: true }) as { data: PackageRow[] | null; error: { message: string } | null };

    if (pErr) return NextResponse.json({ error: pErr.message }, { status: 500 });

    const result = (packages ?? []).map((p) => ({
      ...p,
      quest_ids: p.quest_ids ?? [],
    }));

    return NextResponse.json(result);
  } catch (e) {
    console.error("[quest-packages GET]", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/admin/games/[id]/quest-packages — create package
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
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const admin = ctx.admin;
    const { name, slug, description, base_price, sort_order, is_active, quest_ids } = parsed.data;

    const { data: pkg, error: insertErr } = await questPackagesTable(admin)
      .insert({
        game_id: gameId,
        name,
        slug,
        description: description ?? null,
        base_price,
        sort_order: sort_order ?? 0,
        is_active: is_active ?? true,
        quest_ids,
      })
      .select("id")
      .single() as { data: { id: string } | null; error: { message: string } | null };

    if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 });
    if (!pkg) return NextResponse.json({ error: "Insert failed" }, { status: 500 });

    return NextResponse.json({ id: pkg.id, name, slug, quest_ids });
  } catch (e) {
    console.error("[quest-packages POST]", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
