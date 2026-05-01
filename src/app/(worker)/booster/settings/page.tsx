import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import WorkerSettingsClient from "./worker-settings-client";

export const metadata: Metadata = { title: "Settings" };

type WorkerProfile = {
  display_name: string | null;
  avatar_url: string | null;
  email: string;
};

type WorkerData = {
  id: string;
  payout_method: string | null;
  payout_details_encrypted: string | null;
  payout_minimum: number;
  commission_rate: number;
  bio: string | null;
  show_on_boosters_page: boolean;
  deposit_paid: number | null;
  profile_photo_url: string | null;
};

export default async function WorkerSettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirect=/booster/settings");

  const admin = createAdminClient();

  const [profileResult, workerResult] = await Promise.all([
    admin
      .from("profiles")
      .select("display_name, avatar_url, email")
      .eq("id", user.id)
      .single(),
    admin
      .from("workers")
      .select("id, payout_method, payout_details_encrypted, payout_minimum, commission_rate, bio, show_on_boosters_page, deposit_paid, profile_photo_url")
      .eq("profile_id", user.id)
      .single(),
  ]);

  return (
    <WorkerSettingsClient
      profile={profileResult.data as WorkerProfile | null}
      worker={workerResult.data as WorkerData | null}
      _userId={user.id}
    />
  );
}
