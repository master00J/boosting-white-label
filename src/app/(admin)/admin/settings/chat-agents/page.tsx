import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import ChatAgentsClient from "./chat-agents-client";

export const metadata: Metadata = { title: "Chat Agents" };
export const dynamic = "force-dynamic";

type AgentRow = {
  id: string;
  profile_id: string;
  created_at: string;
  profile: { display_name: string | null; email: string; role: string } | null;
  granted_by_profile: { display_name: string | null } | null;
};

export default async function ChatAgentsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single() as { data: { role: string } | null };

  if (profile?.role !== "super_admin") redirect("/admin/dashboard");

  const { data: agents } = await admin
    .from("chat_agents")
    .select("id, profile_id, created_at, profile:profiles!profile_id(display_name, email, role), granted_by_profile:profiles!granted_by(display_name)")
    .order("created_at", { ascending: false }) as unknown as { data: AgentRow[] | null };

  // All admins that could be added
  const { data: adminProfiles } = await admin
    .from("profiles")
    .select("id, display_name, email, role")
    .in("role", ["admin", "super_admin"])
    .order("display_name") as { data: { id: string; display_name: string | null; email: string; role: string }[] | null };

  return (
    <ChatAgentsClient
      agents={agents ?? []}
      adminProfiles={adminProfiles ?? []}
    />
  );
}
