import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import AdminChatClient from "./chat-client";

export const metadata: Metadata = { title: "Live Chat" };
export const dynamic = "force-dynamic";

export default async function AdminChatPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("role, display_name")
    .eq("id", user.id)
    .single() as { data: { role: string; display_name: string | null } | null };

  if (!profile || !["admin", "super_admin"].includes(profile.role)) redirect("/admin/dashboard");

  // Check chat access for non-super_admin
  if (profile.role === "admin") {
    const { data: agentRow } = await admin
      .from("chat_agents")
      .select("id")
      .eq("profile_id", user.id)
      .single();
    if (!agentRow) redirect("/admin/dashboard");
  }

  return <AdminChatClient agentName={profile.display_name ?? "Agent"} agentId={user.id} />;
}
