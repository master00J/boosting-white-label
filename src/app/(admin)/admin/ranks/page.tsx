import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import RanksClient from "./ranks-client";

export const metadata: Metadata = { title: "Admin Ranks" };
export const dynamic = "force-dynamic";

export default async function RanksPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single() as { data: { role: string | null } | null };

  if (profile?.role !== "super_admin") {
    redirect("/admin/dashboard");
  }

  const { data: ranks } = await admin
    .from("admin_ranks")
    .select("id, name, slug, description, created_at")
    .order("name");

  const withPerms = await Promise.all(
    (ranks ?? []).map(async (r) => {
      const { data: perms } = await admin
        .from("admin_rank_permissions")
        .select("section_key")
        .eq("rank_id", r.id) as { data: { section_key: string }[] | null };
      return { ...r, section_keys: (perms ?? []).map((p) => p.section_key) };
    })
  );

  return <RanksClient initialRanks={withPerms} />;
}
