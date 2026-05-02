import { createAdminClient } from "@/lib/supabase/admin";

/** site_settings.value is Json — coerce to string for URL building. */
function siteSettingString(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return "";
}

/** Normalize user/env input to origin only (no trailing slash, no path). */
export function normalizeShopOrigin(raw: string | null | undefined): string | null {
  const t = (raw ?? "").trim();
  if (!t) return null;
  try {
    const u = new URL(t.includes("://") ? t : `https://${t}`);
    if (!u.hostname) return null;
    return `${u.protocol}//${u.host}`.replace(/\/$/, "");
  } catch {
    return null;
  }
}

/**
 * Canonical public origin for this shop — used to build full admin URLs for the Setup AI.
 * Order: site_settings site_url → custom_domain → NEXT_PUBLIC_SITE_URL → VERCEL_URL.
 */
export async function resolveShopOriginForSetupAI(): Promise<string | null> {
  try {
    const admin = createAdminClient();
    const { data: rows } = await admin
      .from("site_settings")
      .select("key, value")
      .in("key", ["site_url", "custom_domain"]);

    const map = Object.fromEntries(
      (rows ?? []).map((r) => [r.key, siteSettingString(r.value)]),
    ) as Record<string, string>;

    const fromSiteUrl = normalizeShopOrigin(map["site_url"]);
    if (fromSiteUrl) return fromSiteUrl;

    const domain = (map["custom_domain"] ?? "").trim().replace(/^https?:\/\//, "");
    if (domain) {
      const o = normalizeShopOrigin(`https://${domain}`);
      if (o) return o;
    }
  } catch {
    // fall through to env
  }

  const fromEnv = normalizeShopOrigin(process.env.NEXT_PUBLIC_SITE_URL);
  if (fromEnv) return fromEnv;

  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) return normalizeShopOrigin(`https://${vercel}`);

  return null;
}

/** Origin from the incoming browser request (Vercel sets x-forwarded-host / x-forwarded-proto). */
export function resolveShopOriginFromRequest(req: Request): string | null {
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  if (!host) return null;
  const first = host.split(",")[0].trim();
  if (!first) return null;
  const protoHeader = req.headers.get("x-forwarded-proto");
  const proto = protoHeader ? protoHeader.split(",")[0].trim() : "https";
  return normalizeShopOrigin(`${proto}://${first}`);
}

/** Prefer the URL the admin is actually using, then DB / deploy env. */
export async function resolveEffectiveShopOrigin(req: Request): Promise<string | null> {
  const fromReq = resolveShopOriginFromRequest(req);
  if (fromReq) return fromReq;
  return resolveShopOriginForSetupAI();
}
