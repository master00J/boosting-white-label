"use client";

import { createContext, useContext, useEffect, useState } from "react";
import type {
  NavLinkConfig,
  FooterColumnConfig,
  HomepageTrustFeature,
  HomepageHowStep,
  HomepageServiceCategory,
  HomepageFaqItem,
} from "@/lib/storefront-defaults";
import {
  STOREFRONT_DEFAULT_NAV_LINKS,
  STOREFRONT_DEFAULT_FOOTER_COLUMNS,
  HOMEPAGE_TRUST_FEATURES_DEFAULT,
  HOMEPAGE_HOW_IT_WORKS_DEFAULT,
  HOMEPAGE_SERVICE_CATEGORIES_DEFAULT,
  HOMEPAGE_FAQ_DEFAULT,
} from "@/lib/storefront-defaults";
import {
  STOREFRONT_THEME_PREVIEW_QUERY,
  STOREFRONT_THEME_PREVIEW_STORAGE_KEY,
  parseThemePreviewSession,
} from "@/lib/storefront-theme-preview";

export type {
  NavLinkConfig,
  FooterColumnConfig,
  HomepageTrustFeature,
  HomepageHowStep,
  HomepageServiceCategory,
  HomepageFaqItem,
} from "@/lib/storefront-defaults";

export interface ThemeSettings {
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  success_color: string;
  border_radius: string;

  shell_bg: string;
  bg_primary: string;
  bg_secondary: string;
  bg_card: string;
  bg_elevated: string;
  footer_bg: string;

  text_primary: string;
  text_secondary: string;
  text_muted: string;

  /** Full CSS color, e.g. rgba(232,114,12,0.08) */
  border_subtle: string;
  border_default: string;

  logo_url: string;
  favicon_url: string;
  /** Logo text fallback when no image */
  brand_name: string;

  font_heading?: string;
  font_body?: string;

  /** Mini preview / legacy single-line hero sample */
  hero_title: string;
  hero_subtitle: string;
  hero_cta_text: string;
  hero_bg_url: string;
  hero_bg_overlay: number;

  hero_headline_before: string;
  hero_headline_highlight: string;
  hero_headline_after: string;
  hero_primary_cta_label: string;
  hero_primary_cta_href: string;
  hero_secondary_cta_label: string;
  hero_secondary_cta_href: string;
  hero_trust_guarantee_label: string;

  /** Empty → use STOREFRONT_DEFAULT_NAV_LINKS */
  nav_links: NavLinkConfig[];
  /** Empty → use STOREFRONT_DEFAULT_FOOTER_COLUMNS */
  footer_columns: FooterColumnConfig[];
  footer_brand_blurb: string;
  footer_brand_note: string;
  copyright_name: string;
  trust_line_payments: string;
  trust_line_start: string;
  trust_line_support: string;

  homepage_services_section_label: string;
  homepage_services_section_title: string;

  homepage_catalog_section_label: string;
  homepage_catalog_section_title: string;
  homepage_why_section_label: string;
  homepage_why_section_title: string;
  homepage_reviews_section_label: string;
  homepage_reviews_section_title: string;
  homepage_team_section_label: string;
  homepage_team_section_title: string;
  homepage_team_section_subtitle: string;
  homepage_process_section_label: string;
  homepage_process_section_title: string;
  homepage_process_section_subtitle: string;
  homepage_faq_section_label: string;
  homepage_faq_section_title: string;

  homepage_cta_title: string;
  homepage_cta_subtitle: string;
  homepage_cta_primary_label: string;
  homepage_cta_primary_href: string;
  /** Leeg → vaste drie bullets onder de CTA-knop */
  homepage_cta_bullets: string[];

  homepage_trust_features: HomepageTrustFeature[];
  homepage_how_it_works: HomepageHowStep[];
  homepage_service_categories: HomepageServiceCategory[];
  homepage_faq: HomepageFaqItem[];
}

export const HEADING_FONT_STACKS: Record<string, string> = {
  "Cal Sans": 'var(--font-cal-sans), "Space Grotesk", system-ui, sans-serif',
  Inter: 'var(--font-satoshi), "Inter", system-ui, sans-serif',
  Sora: '"Sora", "Inter", system-ui, sans-serif',
  "Space Grotesk": '"Space Grotesk", system-ui, sans-serif',
  Outfit: '"Outfit", "Inter", system-ui, sans-serif',
};

export const BODY_FONT_STACKS: Record<string, string> = {
  Satoshi: 'var(--font-satoshi), "Inter", system-ui, sans-serif',
  Inter: '"Inter", system-ui, sans-serif',
  "DM Sans": '"DM Sans", "Inter", system-ui, sans-serif',
  "Plus Jakarta Sans": '"Plus Jakarta Sans", "Inter", system-ui, sans-serif',
};

export const defaultTheme: ThemeSettings = {
  primary_color: "#E8720C",
  secondary_color: "#C95E08",
  accent_color: "#FF9438",
  success_color: "#22c55e",
  border_radius: "0.5rem",

  shell_bg: "#09090b",
  bg_primary: "#0C0906",
  bg_secondary: "#130D07",
  bg_card: "#180E08",
  bg_elevated: "#201408",
  footer_bg: "#0F0A05",

  text_primary: "#F5EDE0",
  text_secondary: "#B8A78A",
  text_muted: "#8A7A62",

  border_subtle: "rgba(232, 114, 12, 0.08)",
  border_default: "rgba(232, 114, 12, 0.18)",

  logo_url: "",
  favicon_url: "",
  brand_name: "BoostPlatform",

  hero_title: "Fast & safe game boosting",
  hero_subtitle:
    "Verified boosters, instant start, and a satisfaction guarantee — for all your favourite games.",
  hero_cta_text: "Browse services",
  hero_bg_url: "",
  hero_bg_overlay: 0.55,

  hero_headline_before: "The Fastest &",
  hero_headline_highlight: "Safest",
  hero_headline_after: "Game Boosting",
  hero_primary_cta_label: "Browse Services",
  hero_primary_cta_href: "/games",
  hero_secondary_cta_label: "How it works",
  hero_secondary_cta_href: "/how-it-works",
  hero_trust_guarantee_label: "Satisfaction guaranteed",

  nav_links: [],
  footer_columns: [],
  footer_brand_blurb:
    "Professional game boosting by verified players. Fast, safe, and backed by a full refund guarantee.",
  footer_brand_note:
    "Configure your support email, Discord invite and review links from the admin panel.",
  copyright_name: "BoostPlatform",
  trust_line_payments: "Payments via Whop & Stripe",
  trust_line_start: "Avg. start within 1 hour",
  trust_line_support: "Support replies within 2 hours",

  homepage_services_section_label: "Services",
  homepage_services_section_title: "Everything you need for OSRS",

  homepage_catalog_section_label: "Catalog",
  homepage_catalog_section_title: "Available games",
  homepage_why_section_label: "Why us",
  homepage_why_section_title: "Why players choose us",
  homepage_reviews_section_label: "Reviews",
  homepage_reviews_section_title: "What customers say",
  homepage_team_section_label: "Our team",
  homepage_team_section_title: "Meet the people behind the boosts",
  homepage_team_section_subtitle:
    "Hand-picked, verified boosters. See who might be playing on your account.",
  homepage_process_section_label: "Process",
  homepage_process_section_title: "Simple, secure, fast",
  homepage_process_section_subtitle:
    "We've streamlined the process so getting your boost is as easy as possible.",
  homepage_faq_section_label: "FAQ",
  homepage_faq_section_title: "Frequently asked questions",

  homepage_cta_title: "Start your first order today",
  homepage_cta_subtitle:
    "Choose your game, configure your service, and let a verified booster handle the rest.",
  homepage_cta_primary_label: "Browse games",
  homepage_cta_primary_href: "/games",
  homepage_cta_bullets: [
    "Booster assigned within 1 hour",
    "No hidden fees",
    "Satisfaction guaranteed",
  ],

  homepage_trust_features: [],
  homepage_how_it_works: [],
  homepage_service_categories: [],
  homepage_faq: [],
};

const ThemeContext = createContext<ThemeSettings>(defaultTheme);

export type SiteBranding = { siteName: string; siteTagline: string };

const SiteBrandingContext = createContext<SiteBranding>({ siteName: "", siteTagline: "" });

function strSetting(val: unknown): string {
  return typeof val === "string" ? val : "";
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<ThemeSettings>(defaultTheme);
  const [siteBranding, setSiteBranding] = useState<SiteBranding>({ siteName: "", siteTagline: "" });

  useEffect(() => {
    let cancelled = false;

    const loadTheme = async () => {
      if (typeof window !== "undefined") {
        const qs = new URLSearchParams(window.location.search);
        if (qs.get(STOREFRONT_THEME_PREVIEW_QUERY) === "1") {
          try {
            const raw = sessionStorage.getItem(STOREFRONT_THEME_PREVIEW_STORAGE_KEY);
            if (raw) {
              const parsed = parseThemePreviewSession(raw);
              if (parsed) {
                const partial = parsed.themePartial as Partial<ThemeSettings>;
                if (!cancelled) {
                  setTheme({ ...defaultTheme, ...partial });
                  setSiteBranding({
                    siteName: parsed.siteName ?? "",
                    siteTagline: parsed.siteTagline ?? "",
                  });
                }
                return;
              }
            }
          } catch {
            /* fall through to saved theme */
          }
        }
      }

      if (
        !process.env.NEXT_PUBLIC_SUPABASE_URL ||
        !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      ) {
        return;
      }

      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();

      const { data: rows, error } = await supabase
        .from("site_settings")
        .select("key, value")
        .in("key", ["theme", "site_name", "site_tagline"]);

      if (cancelled) return;

      if (error || !rows?.length) return;

      const rowList = rows as { key: string; value: unknown }[];
      const map = Object.fromEntries(rowList.map((r) => [r.key, r.value]));

      let themeValue: Partial<ThemeSettings> | string | null = map.theme as
        | Partial<ThemeSettings>
        | string
        | null;
      if (typeof themeValue === "string") {
        try {
          themeValue = JSON.parse(themeValue) as Partial<ThemeSettings>;
        } catch {
          themeValue = null;
        }
      }
      if (themeValue && typeof themeValue === "object") {
        setTheme({ ...defaultTheme, ...themeValue });
      }

      setSiteBranding({
        siteName: strSetting(map.site_name),
        siteTagline: strSetting(map.site_tagline),
      });
    };

    loadTheme();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--color-primary", theme.primary_color);
    root.style.setProperty("--color-secondary", theme.secondary_color);
    root.style.setProperty("--color-accent", theme.accent_color);
    root.style.setProperty("--color-success", theme.success_color);
    root.style.setProperty("--accent-primary", theme.primary_color);
    root.style.setProperty("--border-radius", theme.border_radius);

    root.style.setProperty("--shell-bg", theme.shell_bg);
    root.style.setProperty("--bg-primary", theme.bg_primary);
    root.style.setProperty("--bg-secondary", theme.bg_secondary);
    root.style.setProperty("--bg-card", theme.bg_card);
    root.style.setProperty("--bg-elevated", theme.bg_elevated);
    root.style.setProperty("--footer-bg", theme.footer_bg);

    root.style.setProperty("--text-primary", theme.text_primary);
    root.style.setProperty("--text-secondary", theme.text_secondary);
    root.style.setProperty("--text-muted", theme.text_muted);

    root.style.setProperty("--border-subtle", theme.border_subtle);
    root.style.setProperty("--border-default", theme.border_default);

    if (theme.font_heading && HEADING_FONT_STACKS[theme.font_heading]) {
      root.style.setProperty("--font-heading", HEADING_FONT_STACKS[theme.font_heading]);
    } else {
      root.style.removeProperty("--font-heading");
    }
    if (theme.font_body && BODY_FONT_STACKS[theme.font_body]) {
      root.style.setProperty("--font-body", BODY_FONT_STACKS[theme.font_body]);
    } else {
      root.style.removeProperty("--font-body");
    }

    document.body.style.backgroundColor = theme.shell_bg;
    document.body.style.color = theme.text_primary;
  }, [theme]);

  return (
    <ThemeContext.Provider value={theme}>
      <SiteBrandingContext.Provider value={siteBranding}>{children}</SiteBrandingContext.Provider>
    </ThemeContext.Provider>
  );
}

/** Resolved nav links (theme override or defaults). */
export function useStorefrontNavLinks(): NavLinkConfig[] {
  const t = useContext(ThemeContext);
  return t.nav_links?.length ? t.nav_links : STOREFRONT_DEFAULT_NAV_LINKS;
}

export function useStorefrontFooterColumns(): FooterColumnConfig[] {
  const t = useContext(ThemeContext);
  return t.footer_columns?.length ? t.footer_columns : STOREFRONT_DEFAULT_FOOTER_COLUMNS;
}

export function useHomepageTrustFeatures(): HomepageTrustFeature[] {
  const t = useContext(ThemeContext);
  return t.homepage_trust_features?.length ? t.homepage_trust_features : HOMEPAGE_TRUST_FEATURES_DEFAULT;
}

export function useHomepageHowItWorks(): HomepageHowStep[] {
  const t = useContext(ThemeContext);
  return t.homepage_how_it_works?.length ? t.homepage_how_it_works : HOMEPAGE_HOW_IT_WORKS_DEFAULT;
}

export function useHomepageServiceCategories(): HomepageServiceCategory[] {
  const t = useContext(ThemeContext);
  return t.homepage_service_categories?.length
    ? t.homepage_service_categories
    : HOMEPAGE_SERVICE_CATEGORIES_DEFAULT;
}

export function useHomepageFaq(): HomepageFaqItem[] {
  const t = useContext(ThemeContext);
  return t.homepage_faq?.length ? t.homepage_faq : HOMEPAGE_FAQ_DEFAULT;
}

export const useTheme = () => useContext(ThemeContext);

export function useSiteBranding(): SiteBranding {
  return useContext(SiteBrandingContext);
}
