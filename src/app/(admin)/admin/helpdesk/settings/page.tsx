import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import HelpdeskSettingsClient from "./helpdesk-settings-client";

export const metadata: Metadata = { title: "Helpdesk Settings" };
export const dynamic = "force-dynamic";

type SettingRow = { key: string; value: string };

const KEYS = ["ai_provider", "ai_api_key", "ai_model", "helpdesk_auto_reply", "helpdesk_sla_hours"];

export default async function HelpdeskSettingsPage() {
  const admin = createAdminClient();
  const { data: settings } = await admin
    .from("site_settings")
    .select("key, value")
    .in("key", KEYS) as unknown as { data: SettingRow[] | null };

  const map = Object.fromEntries((settings ?? []).map((s) => [s.key, s.value]));

  return <HelpdeskSettingsClient initialSettings={map} />;
}
