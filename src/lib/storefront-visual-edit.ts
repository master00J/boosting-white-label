/**
 * Visual click-to-edit: mini-preview sends a `pick` string; builder resolves to section + field id.
 * Sections: storefront-builder-section-{section}
 * Fields: storefront-field-* (see storefront-builder-client)
 */
export type StorefrontVisualEditPick = string;

/** Static picks (non-indexed). */
export const STOREFRONT_VISUAL_EDIT_MAP: Record<string, { section: string; fieldId: string }> = {
  site_name: { section: "brand", fieldId: "storefront-field-site_name" },
  site_tagline: { section: "brand", fieldId: "storefront-field-site_tagline" },
  logo_url: { section: "brand", fieldId: "storefront-field-logo_url" },
  brand_name: { section: "brand", fieldId: "storefront-field-brand_name" },

  shell_bg: { section: "surfaces", fieldId: "storefront-field-shell_bg" },
  bg_secondary: { section: "surfaces", fieldId: "storefront-field-bg_secondary" },
  bg_primary: { section: "surfaces", fieldId: "storefront-field-bg_primary" },
  bg_card: { section: "surfaces", fieldId: "storefront-field-bg_card" },

  primary_color: { section: "colors", fieldId: "storefront-field-primary_color" },
  secondary_color: { section: "colors", fieldId: "storefront-field-secondary_color" },
  accent_color: { section: "colors", fieldId: "storefront-field-accent_color" },
  success_color: { section: "colors", fieldId: "storefront-field-success_color" },
  border_radius: { section: "colors", fieldId: "storefront-field-border_radius" },

  text_muted: { section: "text", fieldId: "storefront-field-text_muted" },
  text_primary: { section: "text", fieldId: "storefront-field-text_primary" },

  font_heading: { section: "typography", fieldId: "storefront-field-font_heading" },
  font_body: { section: "typography", fieldId: "storefront-field-font_body" },

  hero_headline_before: { section: "hero", fieldId: "storefront-field-hero_headline_before" },
  hero_headline_highlight: { section: "hero", fieldId: "storefront-field-hero_headline_highlight" },
  hero_headline_after: { section: "hero", fieldId: "storefront-field-hero_headline_after" },
  hero_subtitle: { section: "hero", fieldId: "storefront-field-hero_subtitle" },
  hero_primary_cta_label: { section: "hero", fieldId: "storefront-field-hero_primary_cta_label" },
  hero_secondary_cta_label: { section: "hero", fieldId: "storefront-field-hero_secondary_cta_label" },
  hero_trust_guarantee_label: { section: "hero", fieldId: "storefront-field-hero_trust_guarantee_label" },
  hero_bg_url: { section: "hero", fieldId: "storefront-field-hero_bg_url" },
  hero_bg_overlay: { section: "hero", fieldId: "storefront-field-hero_bg_overlay" },

  nav_links: { section: "nav", fieldId: "storefront-field-nav_links" },

  footer_brand_blurb: { section: "footer", fieldId: "storefront-field-footer_brand_blurb" },
  copyright_name: { section: "footer", fieldId: "storefront-field-copyright_name" },
  trust_line_start: { section: "footer", fieldId: "storefront-field-trust_line_start" },
  trust_line_payments: { section: "footer", fieldId: "storefront-field-trust_line_payments" },

  homepage_services_section_label: {
    section: "headings",
    fieldId: "storefront-field-homepage_services_section_label",
  },
  homepage_services_section_title: {
    section: "headings",
    fieldId: "storefront-field-homepage_services_section_title",
  },
  homepage_catalog_section_label: {
    section: "headings",
    fieldId: "storefront-field-homepage_catalog_section_label",
  },
  homepage_catalog_section_title: {
    section: "headings",
    fieldId: "storefront-field-homepage_catalog_section_title",
  },
  homepage_why_section_label: {
    section: "headings",
    fieldId: "storefront-field-homepage_why_section_label",
  },
  homepage_why_section_title: {
    section: "headings",
    fieldId: "storefront-field-homepage_why_section_title",
  },

  homepage_cta_title: { section: "cta", fieldId: "storefront-field-homepage_cta_title" },
  homepage_cta_primary_label: { section: "cta", fieldId: "storefront-field-homepage_cta_primary_label" },
};

export function resolveStorefrontVisualPick(pick: string): { section: string; fieldId: string } | null {
  if (pick.startsWith("service_tile:")) {
    const i = Number(pick.slice("service_tile:".length));
    if (!Number.isInteger(i) || i < 0) return null;
    return { section: "services", fieldId: `storefront-field-service_tile_${i}_title` };
  }
  if (pick.startsWith("trust_feature:")) {
    const i = Number(pick.slice("trust_feature:".length));
    if (!Number.isInteger(i) || i < 0) return null;
    return { section: "trust", fieldId: `storefront-field-trust_${i}_title` };
  }
  if (pick.startsWith("how_step:")) {
    const i = Number(pick.slice("how_step:".length));
    if (!Number.isInteger(i) || i < 0) return null;
    return { section: "how", fieldId: `storefront-field-how_${i}_title` };
  }
  if (pick.startsWith("faq_item:")) {
    const i = Number(pick.slice("faq_item:".length));
    if (!Number.isInteger(i) || i < 0) return null;
    return { section: "faq", fieldId: `storefront-field-faq_${i}_question` };
  }
  if (pick.startsWith("footer_col:")) {
    const i = Number(pick.slice("footer_col:".length));
    if (!Number.isInteger(i) || i < 0) return null;
    return { section: "footer", fieldId: `storefront-field-footer_col_${i}_title` };
  }
  return STOREFRONT_VISUAL_EDIT_MAP[pick] ?? null;
}
