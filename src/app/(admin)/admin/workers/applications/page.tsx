import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import ApplicationsClient from "./applications-client";

export const metadata: Metadata = { title: "Worker Applications" };

export default async function ApplicationsPage() {
  const supabase = createAdminClient();

  const { data: workers } = await supabase
    .from("workers")
    .select(`
      *,
      profile:profiles(id, display_name, email, avatar_url, discord_username, created_at)
    `)
    .eq("is_verified", false)
    .eq("is_active", false)
    .order("applied_at", { ascending: false });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return <ApplicationsClient initialApplications={(workers ?? []) as any} />;
}
