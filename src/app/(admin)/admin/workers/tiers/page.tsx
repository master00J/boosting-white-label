import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import WorkerTiersClient from "./worker-tiers-client";

export const metadata: Metadata = { title: "Worker Tiers" };

export default async function WorkerTiersPage() {
  const supabase = createAdminClient();
  const { data: tiers } = await supabase
    .from("worker_tiers")
    .select("*")
    .order("sort_order", { ascending: true });

  return <WorkerTiersClient initialTiers={tiers ?? []} />;
}
