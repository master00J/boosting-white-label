import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import GimShopClient from "./gim-shop-client";

export const metadata: Metadata = { title: "GIM Shop" };
export const dynamic = "force-dynamic";

export default async function GimShopPage({
  params,
}: {
  params: Promise<{ gameId: string }>;
}) {
  const { gameId } = await params;
  const supabase = createAdminClient();

  const { data: game, error } = await supabase
    .from("games")
    .select("id, name, slug")
    .eq("id", gameId)
    .single() as unknown as { data: { id: string; name: string; slug: string } | null; error: unknown };

  if (error || !game) notFound();

  return <GimShopClient game={game} />;
}
