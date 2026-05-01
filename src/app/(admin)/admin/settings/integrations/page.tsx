import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import IntegrationsSettingsClient from "./integrations-settings-client";

export const metadata: Metadata = { title: "Integrations" };
export const dynamic = "force-dynamic";

export default async function IntegrationsSettingsPage() {
  const admin = createAdminClient();
  const { data } = await admin
    .from("site_settings")
    .select("value")
    .eq("key", "integrations")
    .single() as unknown as { data: { value: Record<string, unknown> } | null };

  let raw = data?.value ?? {};
  if (typeof raw === "string") {
    try { raw = JSON.parse(raw); } catch { raw = {}; }
  }

  const settings = raw as {
    tawkto_enabled?: boolean;
    tawkto_property_id?: string;
    tawkto_widget_id?: string;
    custom_chat_enabled?: boolean;
  };

  return <IntegrationsSettingsClient initialSettings={settings} />;
}
