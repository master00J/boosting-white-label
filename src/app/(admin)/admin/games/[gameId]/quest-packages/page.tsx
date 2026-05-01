import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/types/database";
import QuestPackagesClient from "./quest-packages-client";

type GameRow = Database["public"]["Tables"]["games"]["Row"];

export const metadata: Metadata = { title: "Quest packages" };
export const dynamic = "force-dynamic";

export default async function QuestPackagesPage({
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
    .single() as unknown as { data: GameRow | null; error: unknown };

  if (error || !game) notFound();

  return <QuestPackagesClient game={game} />;
}
