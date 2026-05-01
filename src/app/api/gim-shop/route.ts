import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

// GET /api/gim-shop — list all active shops (public)
export async function GET() {
  try {
    const admin = createAdminClient();

    const { data, error } = await (admin as unknown as { from: (t: string) => ReturnType<ReturnType<typeof createAdminClient>["from"]> })
      .from("gim_shops")
      .select("id, game_id, name, slug, description")
      .eq("is_active", true)
      .order("created_at", { ascending: true }) as { data: unknown[] | null; error: { message: string } | null };

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data ?? []);
  } catch (e) {
    console.error("[gim-shop list GET]", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
