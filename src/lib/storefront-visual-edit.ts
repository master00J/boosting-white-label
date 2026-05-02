/**
 * Maps clickable regions in the storefront mini-preview to builder form fields.
 * Section ids: storefront-builder-section-{section}
 * Field ids: storefront-field-{key} (see storefront-builder-client)
 */
export type StorefrontVisualEditTarget =
  | "site_name"
  | "site_tagline"
  | "logo_url"
  | "brand_name"
  | "shell_bg"
  | "primary_color"
  | "hero_headline_before"
  | "hero_headline_highlight"
  | "hero_headline_after"
  | "hero_subtitle"
  | "hero_primary_cta_label"
  | "hero_secondary_cta_label"
  | "hero_trust_guarantee_label"
  | "hero_bg_url"
  | "homepage_services_section_label"
  | "homepage_services_section_title"
  | "nav_links";

export const STOREFRONT_VISUAL_EDIT_MAP: Record<
  StorefrontVisualEditTarget,
  { section: string; fieldId: string }
> = {
  site_name: { section: "brand", fieldId: "storefront-field-site_name" },
  site_tagline: { section: "brand", fieldId: "storefront-field-site_tagline" },
  logo_url: { section: "brand", fieldId: "storefront-field-logo_url" },
  brand_name: { section: "brand", fieldId: "storefront-field-brand_name" },
  shell_bg: { section: "surfaces", fieldId: "storefront-field-shell_bg" },
  primary_color: { section: "colors", fieldId: "storefront-field-primary_color" },
  hero_headline_before: { section: "hero", fieldId: "storefront-field-hero_headline_before" },
  hero_headline_highlight: { section: "hero", fieldId: "storefront-field-hero_headline_highlight" },
  hero_headline_after: { section: "hero", fieldId: "storefront-field-hero_headline_after" },
  hero_subtitle: { section: "hero", fieldId: "storefront-field-hero_subtitle" },
  hero_primary_cta_label: { section: "hero", fieldId: "storefront-field-hero_primary_cta_label" },
  hero_secondary_cta_label: { section: "hero", fieldId: "storefront-field-hero_secondary_cta_label" },
  hero_trust_guarantee_label: { section: "hero", fieldId: "storefront-field-hero_trust_guarantee_label" },
  hero_bg_url: { section: "hero", fieldId: "storefront-field-hero_bg_url" },
  homepage_services_section_label: {
    section: "headings",
    fieldId: "storefront-field-homepage_services_section_label",
  },
  homepage_services_section_title: {
    section: "headings",
    fieldId: "storefront-field-homepage_services_section_title",
  },
  nav_links: { section: "nav", fieldId: "storefront-field-nav_links" },
};
