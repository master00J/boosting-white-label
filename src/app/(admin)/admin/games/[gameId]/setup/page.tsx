import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import SetupClient from "./setup-client";

export const metadata: Metadata = { title: "Game Setup — Skills" };
export const dynamic = "force-dynamic";

export default async function GameSetupPage({
  params,
}: {
  params: Promise<{ gameId: string }>;
}) {
  const { gameId } = await params;
  const supabase = createAdminClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;
  const [gameRes, skillsRes] = await Promise.all([
    db.from("games").select("id, name, slug").eq("id", gameId).single(),
    db.from("game_skills").select("*").eq("game_id", gameId).order("sort_order"),
  ]);

  if (!gameRes.data) notFound();

  return (
    <SetupClient
      game={gameRes.data}
      initialSkills={skillsRes.data ?? []}
    />
  );
}
