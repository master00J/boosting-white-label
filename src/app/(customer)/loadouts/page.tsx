import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import LoadoutsClient from "./loadouts-client";

export const metadata: Metadata = { title: "Account Loadouts" };
export const dynamic = "force-dynamic";

export default async function LoadoutsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirect=/loadouts");

  let loadouts: { id: string; name: string; stats: Record<string, number>; equipment?: Record<string, unknown>; prayers?: Record<string, unknown>; special_weapons?: string[]; account_type?: string; sort_order: number }[] = [];
  let activeLoadoutId: string | null = null;
  let loadError: string | null = null;

  const { data: loadoutsData, error: loadoutsError } = await supabase
    .from("account_loadouts")
    .select("id, name, stats, equipment, prayers, special_weapons, account_type, sort_order")
    .eq("profile_id", user.id)
    .order("sort_order", { ascending: true });

  if (loadoutsError) loadError = loadoutsError.message;
  else loadouts = (loadoutsData ?? []) as typeof loadouts;

  const { data: profile } = await supabase
    .from("profiles")
    .select("active_loadout_id")
    .eq("id", user.id)
    .single();
  activeLoadoutId = (profile as { active_loadout_id: string | null } | null)?.active_loadout_id ?? null;

  return (
    <LoadoutsClient
      initialLoadouts={loadouts}
      activeLoadoutId={activeLoadoutId}
      loadError={loadError}
    />
  );
}
