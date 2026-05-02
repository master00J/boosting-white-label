"use client";

import type { CSSProperties } from "react";
import type { ThemeSettings } from "@/components/providers/theme-provider";
import { HEADING_FONT_STACKS, BODY_FONT_STACKS } from "@/components/providers/theme-provider";
import {
  STOREFRONT_DEFAULT_NAV_LINKS,
  HOMEPAGE_SERVICE_CATEGORIES_DEFAULT,
} from "@/lib/storefront-defaults";
import { ArrowRight, Check, ChevronDown, Search, ShoppingCart, User } from "lucide-react";

type Props = {
  theme: ThemeSettings;
  siteName: string;
  siteTagline: string;
};

/** Compact approximation of the public homepage — uses the same theme tokens as the live site. */
export default function StorefrontMiniPreview({ theme, siteName, siteTagline }: Props) {
  const headingFont =
    (theme.font_heading && HEADING_FONT_STACKS[theme.font_heading]) ??
    HEADING_FONT_STACKS["Cal Sans"];
  const bodyFont =
    (theme.font_body && BODY_FONT_STACKS[theme.font_body]) ?? BODY_FONT_STACKS["Satoshi"];

  const logoSrc = theme.logo_url?.trim();
  const brandLabel = (theme.brand_name?.trim() || siteName || "BoostPlatform").trim();
  const overlay = Math.min(1, Math.max(0, Number(theme.hero_bg_overlay) || 0.55));

  const navLinks = theme.nav_links?.length ? theme.nav_links : STOREFRONT_DEFAULT_NAV_LINKS;
  const navPreview = navLinks.slice(0, 4);

  const categories =
    theme.homepage_service_categories?.length > 0
      ? theme.homepage_service_categories
      : HOMEPAGE_SERVICE_CATEGORIES_DEFAULT;
  const catPreview = categories.slice(0, 2);

  const cssVars = {
    "--preview-primary": theme.primary_color,
    "--preview-secondary": theme.secondary_color,
    "--preview-accent": theme.accent_color,
    "--preview-success": theme.success_color,
    "--preview-radius": theme.border_radius,
  } as CSSProperties;

  const shellStyle: CSSProperties = {
    ...cssVars,
    backgroundColor: theme.shell_bg,
    color: theme.text_primary,
    borderColor: theme.border_default,
  };

  const heroBgUrl = theme.hero_bg_url?.trim();

  return (
    <div
      className="rounded-2xl border overflow-hidden shadow-lg text-[11px]"
      style={shellStyle}
    >
      {/* Navbar — mirrors storefront navbar structure */}
      <div
        className="flex items-center justify-between gap-2 px-2.5 py-2 border-b"
        style={{
          borderColor: theme.border_subtle,
          backgroundColor: theme.bg_secondary,
        }}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {logoSrc ? (
            // eslint-disable-next-line @next/next/no-img-element -- preview URLs may be any host
            <img src={logoSrc} alt="" className="h-6 w-auto object-contain max-w-[100px]" />
          ) : (
            <span className="font-semibold text-xs truncate" style={{ fontFamily: headingFont }}>
              {brandLabel}
            </span>
          )}
          <span className="hidden sm:inline-flex items-center gap-0.5 text-[10px] opacity-80 truncate">
            Games
            <ChevronDown className="h-3 w-3 opacity-60 shrink-0" />
          </span>
          {navPreview.slice(0, 2).map((l) => (
            <span key={l.href} className="hidden md:inline text-[10px] opacity-70 truncate max-[72px]">
              {l.label}
            </span>
          ))}
        </div>
        <div className="flex items-center gap-1.5 shrink-0 text-[10px]" style={{ color: theme.text_muted }}>
          <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md border opacity-90"
            style={{ borderColor: theme.border_default, backgroundColor: theme.bg_elevated }}>
            <Search className="h-3 w-3" />
            Search
          </span>
          <ShoppingCart className="h-3.5 w-3.5" style={{ color: theme.accent_color }} />
          <User className="h-3.5 w-3.5 opacity-70" />
        </div>
      </div>

      {siteTagline ? (
        <p className="px-2.5 pt-1.5 truncate opacity-50" style={{ fontFamily: bodyFont }}>
          {siteTagline}
        </p>
      ) : null}

      {/* Hero — aligned with homepage-client structure */}
      <section className="relative mx-2 mt-2 rounded-xl overflow-hidden min-h-[168px] flex flex-col justify-end">
        {heroBgUrl ? (
          <>
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: `url(${heroBgUrl})` }}
            />
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: `linear-gradient(to bottom,
                  rgba(0,0,0,${overlay * 0.25}) 0%,
                  rgba(0,0,0,${overlay * 0.55}) 45%,
                  rgba(0,0,0,${Math.min(overlay + 0.15, 1)}) 100%)`,
              }}
            />
          </>
        ) : (
          <div
            className="absolute inset-0"
            style={{
              background: `radial-gradient(ellipse at 60% 40%, ${theme.bg_secondary} 0%, ${theme.bg_primary} 70%)`,
            }}
          />
        )}
        <div
          className="absolute bottom-0 left-0 right-0 h-1/2 pointer-events-none opacity-[0.07]"
          style={{
            background: `radial-gradient(ellipse at 50% 100%, ${theme.primary_color} 0%, transparent 65%)`,
          }}
        />
        <div
          className="absolute inset-x-0 bottom-0 h-14 pointer-events-none"
          style={{
            background: `linear-gradient(to top, color-mix(in srgb, ${theme.bg_primary} 92%, transparent), transparent)`,
          }}
        />

        <div className="relative z-[1] text-center px-3 pb-3 pt-8">
          <h2
            className="text-[13px] sm:text-[15px] font-bold leading-tight text-white"
            style={{ fontFamily: headingFont }}
          >
            {theme.hero_headline_before}{" "}
            <span
              className="text-transparent bg-clip-text"
              style={{
                backgroundImage: `linear-gradient(135deg, ${theme.primary_color} 0%, ${theme.accent_color} 55%, ${theme.accent_color} 100%)`,
              }}
            >
              {theme.hero_headline_highlight}
            </span>{" "}
            {theme.hero_headline_after}
          </h2>
          <p className="mt-1.5 text-[10px] leading-snug max-w-[280px] mx-auto" style={{ color: "rgba(255,255,255,0.65)" }}>
            {theme.hero_subtitle}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-1.5 mt-2.5">
            <span
              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold text-white shadow-sm"
              style={{
                background: `linear-gradient(135deg, ${theme.primary_color}, ${theme.secondary_color})`,
                borderRadius: "var(--preview-radius)",
              }}
            >
              {theme.hero_primary_cta_label || theme.hero_cta_text}
              <ArrowRight className="h-3 w-3" />
            </span>
            <span
              className="inline-flex items-center px-2 py-1 rounded-lg text-[10px] font-semibold text-white/85 border backdrop-blur-sm"
              style={{
                backgroundColor: "rgba(255,255,255,0.08)",
                borderColor: "rgba(255,255,255,0.15)",
                borderRadius: "var(--preview-radius)",
              }}
            >
              {theme.hero_secondary_cta_label}
            </span>
          </div>
          <div className="flex justify-center items-center gap-1 mt-2 text-[9px]" style={{ color: "rgba(255,255,255,0.55)" }}>
            <Check className="h-2.5 w-2.5" style={{ color: theme.success_color }} />
            <span>{theme.hero_trust_guarantee_label}</span>
          </div>
        </div>
      </section>

      {/* Stats strip — same pattern as homepage */}
      <div
        className="mx-2 mt-2 rounded-lg border py-2 px-2 text-center"
        style={{
          borderColor: `color-mix(in srgb, ${theme.primary_color} 14%, transparent)`,
          background: `linear-gradient(to right, color-mix(in srgb, ${theme.primary_color} 5%, transparent), color-mix(in srgb, ${theme.primary_color} 2%, transparent), color-mix(in srgb, ${theme.primary_color} 5%, transparent))`,
        }}
      >
        <p
          className="text-sm font-bold"
          style={{
            fontFamily: headingFont,
            backgroundImage: `linear-gradient(135deg, ${theme.accent_color}, ${theme.primary_color})`,
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          &lt; 1hr
        </p>
        <p className="text-[9px] mt-0.5" style={{ color: theme.text_muted }}>
          Avg. start time
        </p>
      </div>

      {/* Services section — uses theme section labels + service tiles */}
      <div className="p-2.5 pb-3 mt-1">
        <div className="inline-flex items-center gap-1.5 mb-1">
          <span className="w-3 h-px shrink-0" style={{ backgroundColor: theme.primary_color }} />
          <p
            className="text-[9px] font-bold uppercase tracking-[0.18em]"
            style={{ color: theme.primary_color }}
          >
            {theme.homepage_services_section_label}
          </p>
        </div>
        <h3 className="text-xs font-bold mb-2" style={{ fontFamily: headingFont, color: theme.text_primary }}>
          {theme.homepage_services_section_title}
        </h3>
        <div className="grid grid-cols-2 gap-2">
          {catPreview.map((cat) => (
            <div
              key={cat.title}
              className="rounded-lg border p-2"
              style={{
                borderRadius: "var(--preview-radius)",
                borderColor: theme.border_default,
                backgroundColor: theme.bg_card,
              }}
            >
              <p className="text-[10px] font-semibold text-white leading-tight">{cat.title}</p>
              <p className="text-[9px] mt-1 line-clamp-2" style={{ color: theme.text_muted }}>
                {cat.desc}
              </p>
              <p className="text-[9px] mt-1.5 font-medium inline-flex items-center gap-0.5" style={{ color: theme.primary_color }}>
                {cat.cta}
                <ArrowRight className="h-2.5 w-2.5" />
              </p>
            </div>
          ))}
        </div>
      </div>

      <p className="px-2.5 pb-2 text-[9px] text-center opacity-45" style={{ color: theme.text_muted }}>
        Preview uses your theme fields above. Empty hero image falls back to colors (slideshow images are configured under Hero banners).
      </p>
    </div>
  );
}
