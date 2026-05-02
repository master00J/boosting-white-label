/** Canonical slugs that always match OSRS catalog + setup UI. */
export const OSRS_CATALOG_SLUGS = new Set(["oldschool-runescape", "osrs"]);

function normalizeGameSlug(slug: string): string {
  return (slug ?? "").trim().toLowerCase().replace(/_/g, "-");
}

/**
 * OSRS catalog seed + preload UI when slug matches canonical set, or clearly refers to Old School / OSRS
 * (tenants often use variants like `runescape-osrs`, `oldschool_rs`, etc.).
 */
export function isOsrsCatalogGameSlug(slug: string): boolean {
  const s = normalizeGameSlug(slug);
  if (!s) return false;
  if (OSRS_CATALOG_SLUGS.has(s)) return true;
  if (s.includes("oldschool")) return true;
  if (s.includes("osrs")) return true;
  return false;
}
