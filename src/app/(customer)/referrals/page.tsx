import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import ReferralsClient from "./referrals-client";

export const metadata: Metadata = { title: "Referrals" };

type ReferredUser = {
  id: string;
  display_name: string | null;
  created_at: string;
  total_spent: number;
};

export default async function ReferralsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirect=/dashboard/referrals");

  const [profileResult, referredsResult, settingsResult] = await Promise.all([
    supabase.from("profiles").select("referral_code, balance").eq("id", user.id).single(),
    supabase.from("profiles").select("id, display_name, created_at, total_spent").eq("referred_by", user.id).order("created_at", { ascending: false }),
    supabase.from("site_settings").select("key, value").in("key", ["referral_enabled", "referral_reward_type", "referral_reward_amount", "referral_reward_referred"]),
  ]);

  if (profileResult.error) throw profileResult.error;

  type SettingRow = { key: string; value: string };
  const settingsMap = Object.fromEntries(((settingsResult.data as SettingRow[] | null) ?? []).map((s) => [s.key, s.value]));

  return (
    <ReferralsClient
      referralCode={(profileResult.data as { referral_code: string | null; balance: number } | null)?.referral_code ?? null}
      referrals={(referredsResult.data as ReferredUser[] | null) ?? []}
      rewardType={(settingsMap.referral_reward_type as "percentage" | "fixed") ?? "percentage"}
      rewardAmount={parseFloat(settingsMap.referral_reward_amount ?? "5")}
    />
  );
}
