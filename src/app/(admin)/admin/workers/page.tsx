import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import WorkersClient from "./workers-client";

export const metadata: Metadata = { title: "Workers" };

export default async function WorkersPage() {
  const supabase = createAdminClient();

  const [{ data: workers }, { data: tiers }] = await Promise.all([
    supabase
      .from("workers")
      .select(`
        *,
        profile:profiles(id, display_name, email, avatar_url, is_banned),
        tier:worker_tiers(id, name, color, icon)
      `)
      .order("created_at", { ascending: false }),
    supabase.from("worker_tiers").select("*").order("sort_order"),
  ]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return <WorkersClient initialWorkers={(workers ?? []) as any} tiers={tiers ?? []} />;
}
