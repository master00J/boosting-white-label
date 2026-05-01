import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import GeneralSettingsClient from "./general-settings-client";

export const metadata: Metadata = { title: "General Settings" };
export const dynamic = "force-dynamic";

type SettingRow = { key: string; value: string };

const GENERAL_KEYS = ["site_name", "site_tagline", "site_url", "custom_domain", "maintenance_mode", "registration_enabled", "worker_applications_open", "order_id"];

export default async function GeneralSettingsPage() {
  const admin = createAdminClient();
  const { data: settings } = await admin
    .from("site_settings")
    .select("key, value")
    .in("key", GENERAL_KEYS) as unknown as { data: (SettingRow & { value?: unknown })[] | null };

  const map: Record<string, string> = {};
  for (const s of settings ?? []) {
    if (s.key === "order_id" && s.value && typeof s.value === "object" && "brand" in s.value) {
      map.order_id_brand = String((s.value as { brand?: string }).brand ?? "BST");
    } else if (typeof s.value === "string") {
      map[s.key] = s.value;
    }
  }
  return <GeneralSettingsClient initialSettings={map} />;
}
