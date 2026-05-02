"use client";

import type { CSSProperties } from "react";
import type { ThemeSettings } from "@/components/providers/theme-provider";
import { HEADING_FONT_STACKS, BODY_FONT_STACKS } from "@/components/providers/theme-provider";
import { ShoppingCart } from "lucide-react";

type Props = {
  theme: ThemeSettings;
  siteName: string;
  siteTagline: string;
};

export default function StorefrontMiniPreview({ theme, siteName, siteTagline }: Props) {
  const headingFont =
    (theme.font_heading && HEADING_FONT_STACKS[theme.font_heading]) ??
    HEADING_FONT_STACKS["Cal Sans"];
  const bodyFont =
    (theme.font_body && BODY_FONT_STACKS[theme.font_body]) ?? BODY_FONT_STACKS["Satoshi"];

  const logoSrc = theme.logo_url?.trim();
  const overlay = Math.min(1, Math.max(0, Number(theme.hero_bg_overlay) || 0.55));

  const cssVars = {
    "--preview-primary": theme.primary_color,
    "--preview-secondary": theme.secondary_color,
    "--preview-accent": theme.accent_color,
    "--preview-success": theme.success_color,
    "--preview-radius": theme.border_radius,
  } as CSSProperties;

  return (
    <div
      className="rounded-2xl border border-[var(--border-default)] overflow-hidden shadow-lg bg-[#0c0906] text-[#f5ede0]"
      style={cssVars}
    >
      <div className="flex items-center justify-between gap-2 px-3 py-2.5 border-b border-white/10 bg-black/30">
        <div className="flex items-center gap-2 min-w-0">
          {logoSrc ? (
            // eslint-disable-next-line @next/next/no-img-element -- preview URLs may be any host
            <img src={logoSrc} alt="" className="h-7 w-auto object-contain max-w-[120px]" />
          ) : (
            <span className="font-semibold text-sm truncate" style={{ fontFamily: headingFont }}>
              {siteName || "Your brand"}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 text-[10px] text-white/50 shrink-0">
          <span>Games</span>
          <span className="flex items-center gap-0.5 text-[var(--preview-accent)]">
            <ShoppingCart className="h-3 w-3" />
            Cart
          </span>
        </div>
      </div>

      {siteTagline ? (
        <p className="px-3 pt-2 text-[10px] text-white/40 truncate" style={{ fontFamily: bodyFont }}>
          {siteTagline}
        </p>
      ) : null}

      <section
        className="relative m-2 rounded-xl overflow-hidden min-h-[140px] flex flex-col justify-end p-4"
        style={{
          fontFamily: bodyFont,
          borderRadius: "var(--preview-radius)",
          backgroundImage: theme.hero_bg_url?.trim()
            ? `linear-gradient(to top, rgba(12,9,6,${overlay + 0.15}) 0%, rgba(12,9,6,${0.35 + overlay * 0.2}) 40%, transparent 100%), url(${theme.hero_bg_url.trim()})`
            : `linear-gradient(145deg, ${theme.primary_color}33 0%, #0c0906 55%, ${theme.secondary_color}22 100%)`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <h2
          className="text-lg sm:text-xl font-bold leading-tight text-white drop-shadow-sm"
          style={{ fontFamily: headingFont }}
        >
          {theme.hero_headline_before}{" "}
          <span style={{ color: theme.accent_color }}>{theme.hero_headline_highlight}</span>{" "}
          {theme.hero_headline_after}
        </h2>
        <p className="mt-1 text-[11px] text-white/75 line-clamp-2">{theme.hero_subtitle}</p>
        <button
          type="button"
          className="mt-3 self-start px-3 py-1.5 text-xs font-semibold text-white shadow-md transition-transform active:scale-[0.98]"
          style={{
            background: `linear-gradient(135deg, ${theme.primary_color}, ${theme.secondary_color})`,
            borderRadius: "var(--preview-radius)",
          }}
        >
          {theme.hero_primary_cta_label || theme.hero_cta_text}
        </button>
      </section>

      <div className="grid grid-cols-2 gap-2 p-2 pb-3">
        <div
          className="rounded-lg border border-white/10 bg-white/[0.03] p-2.5"
          style={{ borderRadius: "var(--preview-radius)" }}
        >
          <p className="text-[10px] text-white/45 mb-1">Service</p>
          <p className="text-xs font-semibold" style={{ color: "var(--preview-accent)" }}>
            OSRS Bossing
          </p>
          <p className="text-[10px] text-white/50 mt-1">From $1/kill</p>
        </div>
        <div
          className="rounded-lg border border-white/10 bg-white/[0.03] p-2.5"
          style={{ borderRadius: "var(--preview-radius)" }}
        >
          <p className="text-[10px] text-white/45 mb-1">Service</p>
          <p className="text-xs font-semibold" style={{ color: "var(--preview-primary)" }}>
            Skilling
          </p>
          <p className="text-[10px] text-white/50 mt-1">XP tiers</p>
        </div>
      </div>

      <p className="px-3 pb-2 text-[9px] text-center text-white/35">
        Live preview — homepage banner images are set under Hero banners.
      </p>
    </div>
  );
}
