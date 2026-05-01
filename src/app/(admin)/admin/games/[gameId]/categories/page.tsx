import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import CategoriesClient from "./categories-client";

export const metadata: Metadata = { title: "Categories" };
export const dynamic = "force-dynamic";

export default async function GameCategoriesPage({
  params,
}: {
  params: Promise<{ gameId: string }>;
}) {
  const { gameId } = await params;
  const supabase = createAdminClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;
  const [gameRes, categoriesRes] = await Promise.all([
    supabase.from("games").select("id, name, slug").eq("id", gameId).single(),
    db.from("service_categories").select("*").eq("game_id", gameId).order("sort_order"),
  ]);

  if (!gameRes.data) notFound();

  return (
    <CategoriesClient
      game={gameRes.data as { id: string; name: string; slug: string }}
      initialCategories={categoriesRes.data ?? []}
    />
  );
}
