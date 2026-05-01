import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import ReferralsAdminClient from "./referrals-admin-client";

export const metadata: Metadata = { title: "Referrals" };
export const dynamic = "force-dynamic";

type SettingRow = { key: string; value: string };
type ProfileRow = { id: string; display_name: string | null; email: string; referral_code: string | null; referred_by: string | null; created_at: string };

export default async function ReferralsAdminPage() {
  const admin = createAdminClient();

  const { data: settings } = await admin
    .from("site_settings")
    .select("key, value")
    .in("key", ["referral_reward_amount", "referral_enabled"]) as unknown as { data: SettingRow[] | null };

  const { data: profiles } = await admin
    .from("profiles")
    .select("id, display_name, email, referral_code, referred_by, created_at")
    .not("referral_code", "is", null)
    .order("created_at", { ascending: false })
    .limit(100) as unknown as { data: ProfileRow[] | null };

  const settingsMap = Object.fromEntries((settings ?? []).map((s) => [s.key, s.value]));
  const totalReferrals = (profiles ?? []).filter((p) => p.referred_by).length;

  return <ReferralsAdminClient settings={settingsMap} totalReferrals={totalReferrals} />;
}
