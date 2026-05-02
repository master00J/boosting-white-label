/** Query flag: full-site draft theme from Visual builder (sessionStorage). */
export const STOREFRONT_THEME_PREVIEW_QUERY = "theme_preview";

/**
 * When set with theme_preview=1, homepage listens on BroadcastChannel for live updates from /admin/storefront/builder.
 * Banner is hidden in this mode (embedded iframe).
 */
export const STOREFRONT_BUILDER_SYNC_QUERY = "builder_sync";

/** Same-tab/same-origin sync between builder and storefront iframe. */
export const STOREFRONT_BUILDER_BROADCAST = "storefront_builder_theme_v1";

/** sessionStorage JSON: `{ theme, site_name?, site_tagline? }` or legacy flat partial theme */
export const STOREFRONT_THEME_PREVIEW_STORAGE_KEY = "storefront_theme_preview";

/** Parsed session payload for theme preview (legacy flat JSON is still supported). */
export function parseThemePreviewSession(raw: string): {
  themePartial: Record<string, unknown>;
  siteName?: string;
  siteTagline?: string;
} | null {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return null;
    const o = parsed as Record<string, unknown>;
    if ("theme" in o && o.theme && typeof o.theme === "object") {
      return {
        themePartial: o.theme as Record<string, unknown>,
        siteName: typeof o.site_name === "string" ? o.site_name : undefined,
        siteTagline: typeof o.site_tagline === "string" ? o.site_tagline : undefined,
      };
    }
    return { themePartial: o };
  } catch {
    return null;
  }
}
