import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import StorefrontBuilderClient from "./storefront-builder-client";

export const metadata: Metadata = { title: "Storefront builder" };
export const dynamic = "force-dynamic";

function strVal(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function parseThemeJson(raw: unknown): unknown {
  if (raw == null) return undefined;
  if (typeof raw === "object") return raw;
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw) as unknown;
    } catch {
      return undefined;
    }
  }
  return undefined;
}

export default async function StorefrontBuilderPage() {
  const admin = createAdminClient();
  const { data: rows } = await admin
    .from("site_settings")
    .select("key, value")
    .in("key", ["theme", "site_name", "site_tagline"]);

  const map = Object.fromEntries((rows ?? []).map((r) => [r.key as string, r.value]));
  const themeRaw = parseThemeJson(map.theme);

  return (
    <StorefrontBuilderClient
      initialThemeValue={themeRaw}
      initialSiteName={strVal(map.site_name)}
      initialSiteTagline={strVal(map.site_tagline)}
    />
  );
}
