import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/types/database";
import type { GameSkill, GameMethod } from "../../../setup/setup-client";
import ServicesClient from "./services-client";

type GameRow = Database["public"]["Tables"]["games"]["Row"];
type ServiceRow = Database["public"]["Tables"]["services"]["Row"];

export const metadata: Metadata = { title: "Services" };
export const dynamic = "force-dynamic";

export default async function CategoryServicesPage({
  params,
}: {
  params: Promise<{ gameId: string; categoryId: string }>;
}) {
  const { gameId, categoryId } = await params;
  const supabase = createAdminClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;
  const [gameRes, categoryRes, servicesRes, skillsRes, methodsRes] = await Promise.all([
    supabase.from("games").select("*").eq("id", gameId).single() as unknown as Promise<{ data: GameRow | null; error: unknown }>,
    db.from("service_categories").select("*").eq("id", categoryId).single(),
    supabase.from("services").select("*").eq("game_id", gameId).eq("category_id", categoryId).order("sort_order") as unknown as Promise<{ data: ServiceRow[] | null; error: unknown }>,
    db.from("game_skills").select("*").eq("game_id", gameId).order("sort_order"),
    db.from("game_service_methods").select("*").eq("game_id", gameId).order("sort_order"),
  ]);

  if (!gameRes.data || !categoryRes.data) notFound();

  return (
    <ServicesClient
      game={gameRes.data}
      category={categoryRes.data}
      initialServices={servicesRes.data ?? []}
      gameSkills={(skillsRes.data ?? []) as GameSkill[]}
      gameMethods={(methodsRes.data ?? []) as GameMethod[]}
    />
  );
}
