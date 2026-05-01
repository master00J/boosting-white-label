import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import SettingsClient from "./settings-client";

export const metadata: Metadata = { title: "Settings" };

type ProfileData = {
  id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  discord_id: string | null;
  discord_username: string | null;
  two_factor_enabled: boolean;
};

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirect=/dashboard/settings");

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, email, display_name, avatar_url, discord_id, discord_username, two_factor_enabled")
    .eq("id", user.id)
    .single();

  if (error) throw error;

  return <SettingsClient profile={profile as ProfileData | null} />;
}
