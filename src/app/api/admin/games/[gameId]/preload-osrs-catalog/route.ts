import { NextResponse } from "next/server";
import { assertAdmin } from "@/lib/auth/assert-admin";
import { seedOsrsCatalogForGame } from "@/lib/osrs-catalog-seed";

export const dynamic = "force-dynamic";

/** POST — Idempotent preload of OSRS skills, starter quests, boss profiles (global), and GP/XP rows for this game. */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ gameId: string }> }
) {
  const ctx = await assertAdmin();
  if (!ctx.ok) return ctx.response;

  const { gameId } = await params;
  const { data: game, error } = await ctx.admin
    .from("games")
    .select("id, slug")
    .eq("id", gameId)
    .single();

  if (error || !game) {
    return NextResponse.json({ error: "Game not found" }, { status: 404 });
  }

  try {
    const summary = await seedOsrsCatalogForGame(ctx.admin, game.id, game.slug);
    return NextResponse.json({ ok: true, summary });
  } catch (e) {
    console.error("[preload-osrs-catalog]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Catalog preload failed" },
      { status: 500 }
    );
  }
}
