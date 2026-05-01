import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import AdminUsersClient from "./admin-users-client";

export const metadata: Metadata = { title: "Admin Access" };
export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const admin = createAdminClient();

  const { data: currentProfile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user?.id ?? "")
    .single<{ role: "customer" | "worker" | "admin" | "super_admin" | null }>();

  const { data: admins } = await admin
    .from("profiles")
    .select("id, email, display_name, avatar_url, role, admin_rank_id, created_at")
    .in("role", ["admin", "super_admin"])
    .order("role", { ascending: false })
    .order("created_at", { ascending: true });

  const { data: ranks } = await admin
    .from("admin_ranks")
    .select("id, name, slug, description, created_at")
    .order("name");

  const ranksWithPerms = await Promise.all(
    (ranks ?? []).map(async (r) => {
      const { data: perms } = await admin
        .from("admin_rank_permissions")
        .select("section_key")
        .eq("rank_id", r.id) as { data: { section_key: string }[] | null };
      return { ...r, section_keys: (perms ?? []).map((p) => p.section_key) };
    })
  );

  type AdminProfile = { id: string; email: string; display_name: string | null; avatar_url: string | null; role: "admin" | "super_admin" | null; admin_rank_id: string | null; created_at: string | null };
  type RankWithPerms = { id: string; name: string; slug: string; description: string | null; created_at: string | null; section_keys: string[] };

  return (
    <AdminUsersClient
      initialAdmins={(admins ?? []) as AdminProfile[]}
      initialRanks={ranksWithPerms as RankWithPerms[]}
      currentUserId={user?.id ?? null}
      isSuperAdmin={currentProfile?.role === "super_admin"}
    />
  );
}
