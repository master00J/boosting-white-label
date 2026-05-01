import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ gameIds: [] });
  }

  const { data, error } = await supabase
    .from("user_favorites")
    .select("game_id")
    .eq("profile_id", user.id) as { data: { game_id: string }[] | null; error: unknown };

  if (error) {
    console.error("[favorites GET]", error);
    return NextResponse.json({ gameIds: [] });
  }

  const gameIds = (data ?? []).map((r) => r.game_id);
  return NextResponse.json({ gameIds });
}

function parseBody(body: unknown): { game_id: string } | null {
  if (body && typeof body === "object" && "game_id" in body && typeof (body as { game_id: unknown }).game_id === "string") {
    return { game_id: (body as { game_id: string }).game_id };
  }
  return null;
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = parseBody(body);
  if (!parsed?.game_id) {
    return NextResponse.json({ error: "Missing game_id" }, { status: 400 });
  }

  const { error } = await supabase
    .from("user_favorites")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .insert({ profile_id: user.id, game_id: parsed.game_id } as any);

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ ok: true, added: false });
    }
    console.error("[favorites POST]", error);
    return NextResponse.json({ error: "Failed to add favorite" }, { status: 500 });
  }
  return NextResponse.json({ ok: true, added: true });
}

export async function DELETE(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const gameId = request.nextUrl.searchParams.get("game_id") ?? parseBody(await request.json().catch(() => null))?.game_id;
  if (!gameId) {
    return NextResponse.json({ error: "Missing game_id" }, { status: 400 });
  }

  const { error } = await supabase
    .from("user_favorites")
    .delete()
    .eq("profile_id", user.id)
    .eq("game_id", gameId);

  if (error) {
    console.error("[favorites DELETE]", error);
    return NextResponse.json({ error: "Failed to remove favorite" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
