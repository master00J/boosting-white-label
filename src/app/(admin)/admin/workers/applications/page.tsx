import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import ApplicationsClient from "./applications-client";

export const metadata: Metadata = { title: "Worker Applications" };

export default async function ApplicationsPage() {
  const supabase = createAdminClient();

  // Pending applications: not verified yet and actually submitted via /apply (has application text).
  // Do not require is_active = false: DB default for is_active is TRUE and some inserts may not override it.
  const { data: workers } = await supabase
    .from("workers")
    .select(`
      *,
      profile:profiles(id, display_name, email, avatar_url, discord_username, created_at)
    `)
    .eq("is_verified", false)
    .not("application_text", "is", null)
    .neq("application_text", "")
    .order("applied_at", { ascending: false });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return <ApplicationsClient initialApplications={(workers ?? []) as any} />;
}
