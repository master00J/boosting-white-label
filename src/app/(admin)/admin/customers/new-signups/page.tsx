import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import NewSignupsClient from "./new-signups-client";

export const metadata: Metadata = { title: "New Signups" };
export const dynamic = "force-dynamic";

export default async function NewSignupsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const admin = createAdminClient();

  const { data: currentProfile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user?.id ?? "")
    .single<{ role: "customer" | "worker" | "admin" | "super_admin" | null }>();

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data: signups } = await admin
    .from("profiles")
    .select("id, email, display_name, avatar_url, discord_id, discord_username, role, created_at")
    .eq("role", "customer")
    .gte("created_at", thirtyDaysAgo.toISOString())
    .order("created_at", { ascending: false });

  return (
    <NewSignupsClient
      initialSignups={signups ?? []}
      isSuperAdmin={currentProfile?.role === "super_admin"}
    />
  );
}
