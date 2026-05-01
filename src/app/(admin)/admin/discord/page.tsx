import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import DiscordSettingsClient from "./discord-settings-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Discord Integration" };

type SettingRow = { key: string; value: string };

const DISCORD_KEYS = [
  "discord_invite_url",
  "discord_bot_token",
  "discord_client_id",
  "discord_guild_id",
  "discord_channel_new_orders",
  "discord_channel_completed_orders",
  "discord_channel_worker_notifications",
  "discord_channel_admin_alerts",
  "discord_channel_reviews",
  "discord_category_tickets",
  "discord_role_customer",
  "discord_role_worker",
  "discord_role_admin",
];

// Keys that are sensitive — never sent to the browser, only existence is indicated
const SENSITIVE_KEYS = ["discord_bot_token"];

export default async function DiscordSettingsPage() {
  const admin = createAdminClient();

  const { data: settings } = await admin
    .from("site_settings")
    .select("key, value")
    .in("key", DISCORD_KEYS) as unknown as { data: SettingRow[] | null };

  const settingsMap: Record<string, string> = {};
  for (const row of settings ?? []) {
    if (SENSITIVE_KEYS.includes(row.key)) {
      // Never send the actual token to the browser — only indicate if it's set
      settingsMap[row.key] = row.value ? "__SET__" : "";
    } else {
      settingsMap[row.key] = row.value;
    }
  }

  return <DiscordSettingsClient initialSettings={settingsMap} />;
}
