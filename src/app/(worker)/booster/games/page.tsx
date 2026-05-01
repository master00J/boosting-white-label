import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import WorkerGamesClient from "./worker-games-client";
import { Package } from "lucide-react";

export const metadata: Metadata = { title: "My games" };

type GameRow = {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  is_active: boolean;
};

export default async function WorkerGamesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirect=/booster/games");

  const admin = createAdminClient();

  const [workerResult, gamesResult] = await Promise.all([
    admin
      .from("workers")
      .select("id, games")
      .eq("profile_id", user.id)
      .single(),
    admin
      .from("games")
      .select("id, name, slug, logo_url, is_active")
      .eq("is_active", true)
      .order("sort_order", { ascending: true }),
  ]);

  const worker = workerResult.data as { id: string; games: string[] } | null;

  if (!worker) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
          <Package className="h-8 w-8 text-primary" />
        </div>
        <h1 className="font-heading text-2xl font-semibold">No worker profile found</h1>
        <p className="text-[var(--text-muted)] max-w-sm">
          Your account doesn&apos;t have a worker profile yet. Ask an admin to create one.
        </p>
      </div>
    );
  }

  return (
    <WorkerGamesClient
      workerId={worker.id}
      allGames={(gamesResult.data as GameRow[] | null) ?? []}
      selectedGameIds={Array.isArray(worker.games) ? (worker.games as string[]) : []}
    />
  );
}
