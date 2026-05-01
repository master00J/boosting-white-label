import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

function questPackagesTable(admin: ReturnType<typeof createAdminClient>) {
  return (admin as unknown as { from: (table: string) => ReturnType<ReturnType<typeof createAdminClient>["from"]> }).from("quest_packages");
}
function questPackageQuestsTable(admin: ReturnType<typeof createAdminClient>) {
  return (admin as unknown as { from: (table: string) => ReturnType<ReturnType<typeof createAdminClient>["from"]> }).from("quest_package_quests");
}

type PackageRow = {
  id: string;
  game_id: string;
  name: string;
  slug: string;
  description: string | null;
  base_price: number;
  sort_order: number;
  is_active: boolean;
};

type LinkRow = { package_id: string; quest_id: string; sort_order: number };

/**
 * GET /api/quest-packages?game_id=xxx
 * Returns active quest packages for the game (for storefront).
 * Optional: ids=id1,id2 to filter to specific package IDs (e.g. from service price_matrix.package_ids).
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const gameId = searchParams.get("game_id");
  const idsParam = searchParams.get("ids"); // comma-separated package IDs

  if (!gameId) return NextResponse.json({ error: "game_id required" }, { status: 400 });

  const admin = createAdminClient();

  let query = questPackagesTable(admin)
    .select("id, game_id, name, slug, description, base_price, sort_order, is_active")
    .eq("game_id", gameId)
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (idsParam) {
    const ids = idsParam.split(",").map((s) => s.trim()).filter(Boolean);
    if (ids.length > 0) {
      query = query.in("id", ids) as typeof query;
    }
  }

  const { data: packages, error: pErr } = await query as { data: PackageRow[] | null; error: { message: string } | null };

  if (pErr) return NextResponse.json({ error: pErr.message }, { status: 500 });
  if (!packages?.length) return NextResponse.json([]);

  const packageIds = packages.map((p) => p.id);
  const { data: links, error: lErr } = await questPackageQuestsTable(admin)
    .select("package_id, quest_id, sort_order")
    .in("package_id", packageIds) as { data: LinkRow[] | null; error: { message: string } | null };

  if (lErr) return NextResponse.json({ error: lErr.message }, { status: 500 });

  const questIdsByPackage: Record<string, string[]> = {};
  for (const link of links ?? []) {
    if (!questIdsByPackage[link.package_id]) questIdsByPackage[link.package_id] = [];
    questIdsByPackage[link.package_id].push(link.quest_id);
  }

  const result = packages.map((p) => ({
    id: p.id,
    label: p.name,
    slug: p.slug,
    description: p.description ?? undefined,
    base_price: Number(p.base_price),
    quest_ids: questIdsByPackage[p.id] ?? [],
  }));

  return NextResponse.json(result);
}
