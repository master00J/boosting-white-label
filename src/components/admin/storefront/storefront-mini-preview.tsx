"use client";

import type { CSSProperties, KeyboardEvent, MouseEvent, ReactNode } from "react";
import type { ThemeSettings } from "@/components/providers/theme-provider";
import { HEADING_FONT_STACKS, BODY_FONT_STACKS } from "@/components/providers/theme-provider";
import {
  STOREFRONT_DEFAULT_NAV_LINKS,
  HOMEPAGE_SERVICE_CATEGORIES_DEFAULT,
} from "@/lib/storefront-defaults";
import {
  HOMEPAGE_FAQ_DEFAULT,
  HOMEPAGE_HOW_IT_WORKS_DEFAULT,
  HOMEPAGE_TRUST_FEATURES_DEFAULT,
} from "@/lib/storefront-defaults";
import { ArrowRight, Check, ChevronDown, Search, ShoppingCart, User } from "lucide-react";

type Props = {
  theme: ThemeSettings;
  siteName: string;
  siteTagline: string;
  /** Click regions jump to the matching field in the builder (shared state = instant preview). */
  visualEditEnabled?: boolean;
  onVisualEditPick?: (pick: string) => void;
};

function pickStop(e: MouseEvent | KeyboardEvent) {
  e.preventDefault();
  e.stopPropagation();
}

function EditHit({
  enabled,
  pick,
  onPick,
  className,
  style,
  children,
}: {
  enabled: boolean;
  pick: string;
  onPick?: (p: string) => void;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}) {
  if (!enabled || !onPick) return <>{children}</>;
  const ring = "cursor-crosshair rounded-sm outline-offset-1 hover:outline hover:outline-2 hover:outline-primary/70";
  return (
    <span
      role="button"
      tabIndex={0}
      style={style}
      className={`${ring} ${className ?? ""}`}
      onClick={(e) => {
        pickStop(e);
        onPick(pick);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          pickStop(e);
          onPick(pick);
        }
      }}
    >
      {children}
    </span>
  );
}

const VISUAL_QUICK_PICKS: [string, string][] = [
  ["bg_secondary", "Nav bg"],
  ["bg_card", "Cards"],
  ["primary_color", "Primary"],
  ["secondary_color", "2nd"],
  ["accent_color", "Accent"],
  ["success_color", "Success"],
  ["text_muted", "Muted"],
  ["text_primary", "Text"],
  ["font_heading", "H font"],
  ["font_body", "Body"],
  ["border_radius", "Radius"],
  ["hero_bg_overlay", "Overlay"],
];

/** Compact approximation of the public homepage — uses the same theme tokens as the live site. */
export default function StorefrontMiniPreview({
  theme,
  siteName,
  siteTagline,
  visualEditEnabled = false,
  onVisualEditPick,
}: Props) {
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
  const trustTop = (theme.homepage_trust_features?.length
    ? theme.homepage_trust_features
    : HOMEPAGE_TRUST_FEATURES_DEFAULT)[0];
  const howFirst = (theme.homepage_how_it_works?.length
    ? theme.homepage_how_it_works
    : HOMEPAGE_HOW_IT_WORKS_DEFAULT)[0];
  const faqFirst = (theme.homepage_faq?.length ? theme.homepage_faq : HOMEPAGE_FAQ_DEFAULT)[0];

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

  const edit = visualEditEnabled && onVisualEditPick;

  return (
    <div
      className="rounded-2xl border overflow-hidden shadow-lg text-[11px]"
      style={shellStyle}
    >
      {visualEditEnabled && onVisualEditPick ? (
        <button
          type="button"
          className="w-full py-1.5 text-[9px] font-medium text-center border-b transition-colors hover:bg-white/5"
          style={{ borderColor: theme.border_subtle, color: theme.text_muted }}
          onClick={() => onVisualEditPick("shell_bg")}
        >
          Page shell background →
        </button>
      ) : null}

      {visualEditEnabled && onVisualEditPick ? (
        <div
          className="flex flex-wrap gap-1 px-2 py-1.5 border-b"
          style={{ borderColor: theme.border_subtle, backgroundColor: theme.bg_secondary }}
        >
          {VISUAL_QUICK_PICKS.map(([pick, label]) => (
            <button
              key={pick}
              type="button"
              className="text-[8px] font-medium px-1.5 py-0.5 rounded border"
              style={{ borderColor: theme.border_default, color: theme.text_secondary }}
              onClick={() => onVisualEditPick(pick)}
            >
              {label}
            </button>
          ))}
        </div>
      ) : null}

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
            <EditHit enabled={!!edit} pick="logo_url" onPick={onVisualEditPick}>
              {/* eslint-disable-next-line @next/next/no-img-element -- preview URLs may be any host */}
              <img src={logoSrc} alt="" className="h-6 w-auto object-contain max-w-[100px]" />
            </EditHit>
          ) : (
            <EditHit enabled={!!edit} pick="brand_name" onPick={onVisualEditPick}>
              <span className="font-semibold text-xs truncate" style={{ fontFamily: headingFont }}>
                {brandLabel}
              </span>
            </EditHit>
          )}
          <EditHit enabled={!!edit} pick="site_name" onPick={onVisualEditPick} className="inline-flex min-w-0">
            <span className="text-[9px] opacity-50 truncate max-w-[72px]" title="Site name">
              {siteName || "Site name"}
            </span>
          </EditHit>
          <EditHit enabled={!!edit} pick="nav_links" onPick={onVisualEditPick} className="hidden sm:inline-flex items-center gap-0.5 text-[10px] opacity-80 truncate">
            Games
            <ChevronDown className="h-3 w-3 opacity-60 shrink-0" />
          </EditHit>
          {navPreview.slice(0, 2).map((l) => (
            <EditHit key={l.href} enabled={!!edit} pick="nav_links" onPick={onVisualEditPick}>
              <span className="hidden md:inline text-[10px] opacity-70 truncate max-[72px]">{l.label}</span>
            </EditHit>
          ))}
        </div>
        <div className="flex items-center gap-1.5 shrink-0 text-[10px]" style={{ color: theme.text_muted }}>
          <EditHit enabled={!!edit} pick="text_muted" onPick={onVisualEditPick} className="inline-flex">
            <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md border opacity-90"
              style={{ borderColor: theme.border_default, backgroundColor: theme.bg_elevated }}>
              <Search className="h-3 w-3" />
              Search
            </span>
          </EditHit>
          <EditHit enabled={!!edit} pick="primary_color" onPick={onVisualEditPick} className="inline-flex">
            <ShoppingCart className="h-3.5 w-3.5" style={{ color: theme.accent_color }} />
          </EditHit>
          <EditHit enabled={!!edit} pick="accent_color" onPick={onVisualEditPick} className="inline-flex">
            <User className="h-3.5 w-3.5 opacity-70" />
          </EditHit>
        </div>
      </div>

      {siteTagline ? (
        <EditHit enabled={!!edit} pick="site_tagline" onPick={onVisualEditPick} className="block px-2.5 pt-1.5">
          <p className="truncate opacity-50" style={{ fontFamily: bodyFont }}>
            {siteTagline}
          </p>
        </EditHit>
      ) : edit ? (
        <button
          type="button"
          className="w-full text-left px-2.5 pt-1.5 text-[10px] italic opacity-40 hover:opacity-70 hover:underline"
          style={{ fontFamily: bodyFont }}
          onClick={() => onVisualEditPick("site_tagline")}
        >
          + Tagline
        </button>
      ) : null}

      {/* Hero — aligned with homepage-client structure */}
      <section className="relative mx-2 mt-2 rounded-xl overflow-hidden min-h-[168px] flex flex-col justify-end">
        {visualEditEnabled && onVisualEditPick ? (
          <div className="absolute top-1.5 right-1.5 z-[3] flex gap-1">
            <button
              type="button"
              className="rounded px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-wide text-white bg-black/55 hover:bg-black/75 border border-white/10"
              onClick={(e) => {
                e.stopPropagation();
                onVisualEditPick("hero_bg_overlay");
              }}
            >
              Overlay
            </button>
            <button
              type="button"
              className="rounded px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-wide text-white bg-black/55 hover:bg-black/75 border border-white/10"
              onClick={(e) => {
                e.stopPropagation();
                onVisualEditPick("hero_bg_url");
              }}
            >
              Hero img
            </button>
          </div>
        ) : null}
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
            <EditHit enabled={!!edit} pick="hero_headline_before" onPick={onVisualEditPick}>
              <span>{theme.hero_headline_before}</span>
            </EditHit>{" "}
            <EditHit enabled={!!edit} pick="hero_headline_highlight" onPick={onVisualEditPick}>
              <span
                className="text-transparent bg-clip-text"
                style={{
                  backgroundImage: `linear-gradient(135deg, ${theme.primary_color} 0%, ${theme.accent_color} 55%, ${theme.accent_color} 100%)`,
                }}
              >
                {theme.hero_headline_highlight}
              </span>
            </EditHit>{" "}
            <EditHit enabled={!!edit} pick="hero_headline_after" onPick={onVisualEditPick}>
              <span>{theme.hero_headline_after}</span>
            </EditHit>
          </h2>
          <EditHit enabled={!!edit} pick="hero_subtitle" onPick={onVisualEditPick} className="block mt-1.5">
            <p className="text-[10px] leading-snug max-w-[280px] mx-auto" style={{ color: "rgba(255,255,255,0.65)" }}>
              {theme.hero_subtitle}
            </p>
          </EditHit>
          <div className="flex flex-wrap items-center justify-center gap-1.5 mt-2.5">
            <EditHit enabled={!!edit} pick="hero_primary_cta_label" onPick={onVisualEditPick}>
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
            </EditHit>
            <EditHit enabled={!!edit} pick="hero_secondary_cta_label" onPick={onVisualEditPick}>
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
            </EditHit>
          </div>
          <div
            className="flex justify-center mt-2 items-center gap-1 text-[9px]"
            style={{ color: "rgba(255,255,255,0.55)" }}
          >
            <EditHit enabled={!!edit} pick="success_color" onPick={onVisualEditPick} className="inline-flex shrink-0">
              <Check className="h-2.5 w-2.5" style={{ color: theme.success_color }} />
            </EditHit>
            <EditHit enabled={!!edit} pick="hero_trust_guarantee_label" onPick={onVisualEditPick} className="inline-flex">
              <span>{theme.hero_trust_guarantee_label}</span>
            </EditHit>
          </div>
        </div>
      </section>

      {/* Stats strip — maps to first trust highlight + footer trust line */}
      <EditHit
        enabled={!!edit}
        pick="trust_feature:0"
        onPick={onVisualEditPick}
        className="block mx-2 mt-2 rounded-lg border py-2 px-2 text-center"
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
          {trustTop?.number?.trim() || "< 1hr"}
        </p>
        <EditHit enabled={!!edit} pick="trust_line_start" onPick={onVisualEditPick} className="inline-block mt-0.5">
          <p className="text-[9px]" style={{ color: theme.text_muted }}>
            {trustTop?.title?.trim() || theme.trust_line_start || "Avg. start time"}
          </p>
        </EditHit>
      </EditHit>

      {/* Services section — uses theme section labels + service tiles */}
      <div className="p-2.5 pb-3 mt-1">
        <div className="inline-flex items-center gap-1.5 mb-1">
          <span className="w-3 h-px shrink-0" style={{ backgroundColor: theme.primary_color }} />
          <EditHit enabled={!!edit} pick="homepage_services_section_label" onPick={onVisualEditPick}>
            <p
              className="text-[9px] font-bold uppercase tracking-[0.18em]"
              style={{ color: theme.primary_color }}
            >
              {theme.homepage_services_section_label}
            </p>
          </EditHit>
        </div>
        <EditHit enabled={!!edit} pick="homepage_services_section_title" onPick={onVisualEditPick}>
          <h3 className="text-xs font-bold mb-2" style={{ fontFamily: headingFont, color: theme.text_primary }}>
            {theme.homepage_services_section_title}
          </h3>
        </EditHit>
        <div className="grid grid-cols-2 gap-2">
          {catPreview.map((cat, tileIdx) => (
            <EditHit
              key={`${cat.title}-${tileIdx}`}
              enabled={!!edit}
              pick={`service_tile:${tileIdx}`}
              onPick={onVisualEditPick}
              className="block text-left"
            >
              <div
                className="rounded-lg border p-2 h-full"
                style={{
                  borderRadius: "var(--preview-radius)",
                  borderColor: theme.border_default,
                  backgroundColor: theme.bg_card,
                }}
              >
                <p className="text-[10px] font-semibold leading-tight" style={{ color: theme.text_primary }}>
                  {cat.title}
                </p>
                <p className="text-[9px] mt-1 line-clamp-2" style={{ color: theme.text_muted }}>
                  {cat.desc}
                </p>
                <p className="text-[9px] mt-1.5 font-medium inline-flex items-center gap-0.5" style={{ color: theme.primary_color }}>
                  {cat.cta}
                  <ArrowRight className="h-2.5 w-2.5" />
                </p>
              </div>
            </EditHit>
          ))}
        </div>
      </div>

      <div className="px-2.5 pt-2 border-t space-y-1" style={{ borderColor: theme.border_subtle }}>
        <EditHit enabled={!!edit} pick="homepage_catalog_section_label" onPick={onVisualEditPick}>
          <p className="text-[9px] font-bold uppercase tracking-wider" style={{ color: theme.primary_color }}>
            {theme.homepage_catalog_section_label}
          </p>
        </EditHit>
        <EditHit enabled={!!edit} pick="homepage_catalog_section_title" onPick={onVisualEditPick}>
          <p className="text-[10px] font-semibold" style={{ fontFamily: headingFont }}>
            {theme.homepage_catalog_section_title}
          </p>
        </EditHit>
      </div>

      <div className="px-2.5 pt-2 space-y-1">
        <EditHit enabled={!!edit} pick="homepage_why_section_label" onPick={onVisualEditPick}>
          <p className="text-[9px] font-bold uppercase tracking-wider" style={{ color: theme.primary_color }}>
            {theme.homepage_why_section_label}
          </p>
        </EditHit>
        <EditHit enabled={!!edit} pick="homepage_why_section_title" onPick={onVisualEditPick}>
          <p className="text-[10px] font-semibold leading-snug" style={{ fontFamily: headingFont }}>
            {theme.homepage_why_section_title}
          </p>
        </EditHit>
      </div>

      <EditHit enabled={!!edit} pick="how_step:0" onPick={onVisualEditPick} className="block px-2.5 pt-2">
        <p className="text-[9px] opacity-85">
          <span className="opacity-60">Process · </span>
          <span className="font-semibold">{howFirst?.title ?? "Step 1"}</span>
        </p>
      </EditHit>

      <div
        className="mx-2 mt-2 rounded-lg border p-2.5 space-y-1.5 text-center"
        style={{
          borderColor: theme.border_default,
          backgroundColor: theme.bg_card,
          borderRadius: "var(--preview-radius)",
        }}
      >
        <EditHit enabled={!!edit} pick="homepage_cta_title" onPick={onVisualEditPick}>
          <p className="text-[10px] font-bold leading-tight" style={{ fontFamily: headingFont }}>
            {theme.homepage_cta_title}
          </p>
        </EditHit>
        <EditHit enabled={!!edit} pick="homepage_cta_primary_label" onPick={onVisualEditPick}>
          <span
            className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[9px] font-semibold text-white"
            style={{
              background: `linear-gradient(135deg, ${theme.primary_color}, ${theme.secondary_color})`,
            }}
          >
            {theme.homepage_cta_primary_label}
            <ArrowRight className="h-2.5 w-2.5" />
          </span>
        </EditHit>
      </div>

      <EditHit enabled={!!edit} pick="faq_item:0" onPick={onVisualEditPick} className="block px-2.5 pt-2">
        <p className="text-[9px] font-semibold mb-0.5 opacity-70">FAQ</p>
        <p className="text-[9px] leading-snug line-clamp-2">{faqFirst?.question}</p>
      </EditHit>

      <div
        className="mt-2 pt-2 pb-2 px-2.5 border-t space-y-1.5"
        style={{ borderColor: theme.border_subtle, backgroundColor: theme.footer_bg }}
      >
        <EditHit enabled={!!edit} pick="footer_brand_blurb" onPick={onVisualEditPick}>
          <p className="text-[8px] leading-relaxed line-clamp-2 opacity-90">{theme.footer_brand_blurb}</p>
        </EditHit>
        <div className="flex flex-wrap justify-between items-center gap-2">
          <EditHit enabled={!!edit} pick="copyright_name" onPick={onVisualEditPick}>
            <span className="text-[8px] font-medium opacity-80">© {theme.copyright_name}</span>
          </EditHit>
          <EditHit enabled={!!edit} pick="footer_col:0" onPick={onVisualEditPick}>
            <span className="text-[8px] opacity-50 underline-offset-2">Columns →</span>
          </EditHit>
        </div>
        <EditHit enabled={!!edit} pick="trust_line_payments" onPick={onVisualEditPick}>
          <p className="text-[8px] opacity-55">{theme.trust_line_payments}</p>
        </EditHit>
      </div>

      <p className="px-2.5 pb-2 text-[9px] text-center opacity-45" style={{ color: theme.text_muted }}>
        Preview uses your theme fields above. Empty hero image falls back to colors (slideshow images are configured under Hero banners).
      </p>
    </div>
  );
}
