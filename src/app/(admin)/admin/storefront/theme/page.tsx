import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import ThemeClient from "./theme-client";

export const metadata: Metadata = { title: "Theme Settings" };
export const dynamic = "force-dynamic";

type SettingRow = { key: string; value: string };

const THEME_KEYS = ["theme_primary_color", "theme_accent_color", "theme_bg_color", "theme_font_heading", "theme_font_body", "site_name", "site_tagline", "site_logo_url"];

export default async function ThemePage() {
  const admin = createAdminClient();
  const { data: settings } = await admin
    .from("site_settings")
    .select("key, value")
    .in("key", THEME_KEYS) as unknown as { data: SettingRow[] | null };

  const map = Object.fromEntries((settings ?? []).map((s) => [s.key, s.value]));
  return <ThemeClient initialSettings={map} />;
}
