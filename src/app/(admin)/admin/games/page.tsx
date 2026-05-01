import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import GamesClient from "./games-client";

export const metadata: Metadata = { title: "Games" };

export default async function GamesPage() {
  const supabase = createAdminClient();
  const { data: games } = await supabase
    .from("games")
    .select("*")
    .order("sort_order", { ascending: true });

  return <GamesClient initialGames={games ?? []} />;
}
