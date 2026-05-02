"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { Save, Loader2, Check, ExternalLink, Palette, Plus, Trash2, MonitorPlay } from "lucide-react";
import StorefrontMiniPreview from "@/components/admin/storefront/storefront-mini-preview";
import {
  ColorHexRow,
  BorderRgbaRow,
  hexToRgb,
  hexForColorInput,
} from "@/components/admin/storefront/builder-color-fields";
import {
  STOREFRONT_THEME_PREVIEW_QUERY,
  STOREFRONT_THEME_PREVIEW_STORAGE_KEY,
} from "@/lib/storefront-theme-preview";
import {
  defaultTheme,
  type ThemeSettings,
  HEADING_FONT_STACKS,
  BODY_FONT_STACKS,
} from "@/components/providers/theme-provider";
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

const PRESET_SWATCHES = [
  { name: "Orange", primary: "#E8720C", secondary: "#C95E08", accent: "#FF9438" },
  { name: "Indigo", primary: "#6366f1", secondary: "#4f46e5", accent: "#f59e0b" },
  { name: "Violet", primary: "#8b5cf6", secondary: "#7c3aed", accent: "#f59e0b" },
  { name: "Emerald", primary: "#10b981", secondary: "#059669", accent: "#fbbf24" },
  { name: "Rose", primary: "#f43f5e", secondary: "#e11d48", accent: "#fbbf24" },
];

function mergeTheme(raw: unknown): ThemeSettings {
  const base = { ...defaultTheme };
  if (!raw || typeof raw !== "object") return base;
  const o = raw as Partial<ThemeSettings>;
  for (const key of Object.keys(o) as (keyof ThemeSettings)[]) {
    const v = o[key];
    if (v !== undefined) (base as Record<string, unknown>)[key] = v;
  }
  return base;
}

function inputCls() {
  return "w-full px-3 py-2.5 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-default)] text-sm focus:outline-none focus:border-primary/50";
}

function smallInputCls() {
  return "w-full px-2 py-1.5 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-default)] text-xs focus:outline-none focus:border-primary/50";
}

export default function StorefrontBuilderClient({
  initialThemeValue,
  initialSiteName,
  initialSiteTagline,
}: {
  initialThemeValue: unknown;
  initialSiteName: string;
  initialSiteTagline: string;
}) {
  const [theme, setTheme] = useState<ThemeSettings>(() => mergeTheme(initialThemeValue));
  const [siteName, setSiteName] = useState(initialSiteName);
  const [siteTagline, setSiteTagline] = useState(initialSiteTagline);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const headingPresets = useMemo(() => Object.keys(HEADING_FONT_STACKS), []);
  const bodyPresets = useMemo(() => Object.keys(BODY_FONT_STACKS), []);

  const primaryTintRgb = useMemo(
    () => hexToRgb(hexForColorInput(theme.primary_color)),
    [theme.primary_color]
  );

  const patchTheme = (partial: Partial<ThemeSettings>) =>
    setTheme((prev) => ({ ...prev, ...partial }));

  const openLiveThemePreview = useCallback(() => {
    try {
      const payload = {
        theme: {
          ...theme,
          logo_url: theme.logo_url?.trim() ?? "",
          favicon_url: theme.favicon_url?.trim() ?? "",
          hero_bg_url: theme.hero_bg_url?.trim() ?? "",
        },
        site_name: siteName.trim(),
        site_tagline: siteTagline.trim(),
      };
      sessionStorage.setItem(STOREFRONT_THEME_PREVIEW_STORAGE_KEY, JSON.stringify(payload));
    } catch {
      /* storage full or disabled */
    }
    const url = `/?${STOREFRONT_THEME_PREVIEW_QUERY}=1`;
    window.open(url, "_blank", "noopener,noreferrer");
  }, [theme, siteName, siteTagline]);

  const save = async () => {
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          settings: {
            theme: {
              ...theme,
              logo_url: theme.logo_url?.trim() ?? "",
              favicon_url: theme.favicon_url?.trim() ?? "",
              hero_bg_url: theme.hero_bg_url?.trim() ?? "",
            },
            site_name: siteName.trim(),
            site_tagline: siteTagline.trim(),
          },
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.error ?? "Save failed.");
        return;
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2200);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-1">Storefront</p>
          <h1 className="font-heading text-2xl font-semibold flex items-center gap-2">
            <Palette className="h-7 w-7 opacity-90" />
            Visual builder
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-2 max-w-xl">
            Edit colors, surfaces, typography, navigation, footer, full hero, homepage section headings, service tiles, trust blocks, how-it-works steps, and FAQ.
            Use color pickers where available; advanced values can still be typed. Open <strong className="text-[var(--text-secondary)]">Live theme preview</strong> in a new tab to walk the real storefront with your <em>unsaved</em> draft (session only).
          </p>
          <div className="flex flex-wrap gap-2 mt-3">
            <Link
              href="/admin/storefront/hero"
              className="text-xs font-medium text-primary hover:underline"
            >
              Hero banners (slideshow)
            </Link>
            <span className="text-[var(--text-muted)]">·</span>
            <a href="/" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
              Open storefront <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={openLiveThemePreview}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-[var(--border-default)] text-sm font-medium hover:bg-white/5 transition-colors"
          >
            <MonitorPlay className="h-4 w-4" />
            Live preview (new tab)
          </button>
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary/90 disabled:opacity-40 transition-colors"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : saved ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
            {saved ? "Saved!" : "Save theme"}
          </button>
        </div>
      </div>

      {error ? (
        <div className="p-3 rounded-xl bg-red-400/10 border border-red-400/20 text-sm text-red-400">{error}</div>
      ) : null}

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(280px,380px)] xl:grid-cols-[minmax(0,1fr)_400px]">
        <div className="space-y-6 min-w-0">
          <div className="p-5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-default)] space-y-4">
            <h2 className="font-heading font-semibold text-sm">Brand</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium mb-1.5">Site name</label>
                <input
                  value={siteName}
                  onChange={(e) => setSiteName(e.target.value)}
                  className={inputCls()}
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium mb-1.5">Tagline</label>
                <input
                  value={siteTagline}
                  onChange={(e) => setSiteTagline(e.target.value)}
                  placeholder="Shown in meta / footer areas"
                  className={inputCls()}
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5">Logo URL</label>
                <input
                  value={theme.logo_url}
                  onChange={(e) => patchTheme({ logo_url: e.target.value })}
                  placeholder="https://..."
                  className={inputCls()}
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5">Favicon URL</label>
                <input
                  value={theme.favicon_url}
                  onChange={(e) => patchTheme({ favicon_url: e.target.value })}
                  placeholder="Optional"
                  className={inputCls()}
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium mb-1.5">Logo text (when no logo image)</label>
                <input
                  value={theme.brand_name}
                  onChange={(e) => patchTheme({ brand_name: e.target.value })}
                  placeholder={siteName || "BoostPlatform"}
                  className={inputCls()}
                />
              </div>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-default)] space-y-4">
            <h2 className="font-heading font-semibold text-sm">Colors</h2>
            <div className="flex gap-2 flex-wrap">
              {PRESET_SWATCHES.map((p) => (
                <button
                  key={p.name}
                  type="button"
                  onClick={() =>
                    patchTheme({ primary_color: p.primary, secondary_color: p.secondary, accent_color: p.accent })
                  }
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-medium transition-all ${
                    theme.primary_color === p.primary ? "border-white" : "border-[var(--border-default)]"
                  }`}
                >
                  <span className="w-4 h-4 rounded-full ring-1 ring-white/20" style={{ backgroundColor: p.primary }} />
                  {p.name}
                </button>
              ))}
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {(
                [
                  ["primary_color", "Primary"],
                  ["secondary_color", "Secondary"],
                  ["accent_color", "Accent"],
                  ["success_color", "Success accent"],
                ] as const
              ).map(([key, label]) => (
                <ColorHexRow
                  key={key}
                  label={label}
                  value={theme[key]}
                  onChange={(v) => patchTheme({ [key]: v })}
                  inputClassName={`${inputCls()} font-mono text-xs flex-1 min-w-0`}
                />
              ))}
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5">Corner radius (CSS)</label>
              <input
                value={theme.border_radius}
                onChange={(e) => patchTheme({ border_radius: e.target.value })}
                placeholder="0.5rem"
                className={`${inputCls()} max-w-xs font-mono`}
              />
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-default)] space-y-4">
            <h2 className="font-heading font-semibold text-sm">Surfaces</h2>
            <p className="text-xs text-[var(--text-muted)]">
              Background layers for the page shell, content areas, and footer. Pick a color or paste any valid CSS color.
            </p>
            <div className="grid sm:grid-cols-2 gap-3">
              {(
                [
                  ["shell_bg", "Shell (page)"],
                  ["bg_primary", "Primary background"],
                  ["bg_secondary", "Secondary background"],
                  ["bg_card", "Cards"],
                  ["bg_elevated", "Elevated"],
                  ["footer_bg", "Footer"],
                ] as const
              ).map(([key, label]) => (
                <ColorHexRow
                  key={key}
                  label={label}
                  value={theme[key]}
                  onChange={(v) => patchTheme({ [key]: v })}
                  inputClassName={`${inputCls()} font-mono text-xs flex-1 min-w-0`}
                />
              ))}
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-default)] space-y-4">
            <h2 className="font-heading font-semibold text-sm">Text & borders</h2>
            <div className="grid sm:grid-cols-3 gap-3">
              {(
                [
                  ["text_primary", "Primary text"],
                  ["text_secondary", "Secondary text"],
                  ["text_muted", "Muted text"],
                ] as const
              ).map(([key, label]) => (
                <ColorHexRow
                  key={key}
                  label={label}
                  value={theme[key]}
                  onChange={(v) => patchTheme({ [key]: v })}
                  inputClassName={`${inputCls()} font-mono text-xs flex-1 min-w-0`}
                />
              ))}
            </div>
            <div className="grid sm:grid-cols-1 lg:grid-cols-2 gap-4">
              <BorderRgbaRow
                label="Subtle border"
                value={theme.border_subtle}
                onChange={(v) => patchTheme({ border_subtle: v })}
                fallbackRgb={primaryTintRgb}
                inputClassName={`${inputCls()} font-mono text-xs`}
              />
              <BorderRgbaRow
                label="Default border"
                value={theme.border_default}
                onChange={(v) => patchTheme({ border_default: v })}
                fallbackRgb={primaryTintRgb}
                inputClassName={`${inputCls()} font-mono text-xs`}
              />
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-default)] space-y-4">
            <h2 className="font-heading font-semibold text-sm">Typography</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium mb-1.5">Heading font</label>
                <select
                  value={theme.font_heading ?? ""}
                  onChange={(e) => patchTheme({ font_heading: e.target.value || undefined })}
                  className="w-full px-3 py-2.5 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-default)] text-sm focus:outline-none focus:border-primary/50"
                >
                  <option value="">Default (site CSS)</option>
                  {headingPresets.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5">Body font</label>
                <select
                  value={theme.font_body ?? ""}
                  onChange={(e) => patchTheme({ font_body: e.target.value || undefined })}
                  className="w-full px-3 py-2.5 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-default)] text-sm focus:outline-none focus:border-primary/50"
                >
                  <option value="">Default (site CSS)</option>
                  {bodyPresets.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-default)] space-y-4">
            <h2 className="font-heading font-semibold text-sm">Hero (homepage)</h2>
            <p className="text-xs text-[var(--text-muted)]">
              Three-part headline, buttons, and overlay. Leave background URL empty to use the hero slideshow from Hero banners.
            </p>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="sm:col-span-3">
                <label className="block text-xs font-medium mb-1.5">Legacy single-line title (older previews)</label>
                <input
                  value={theme.hero_title}
                  onChange={(e) => patchTheme({ hero_title: e.target.value })}
                  className={inputCls()}
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5">Headline · before highlight</label>
                <input
                  value={theme.hero_headline_before}
                  onChange={(e) => patchTheme({ hero_headline_before: e.target.value })}
                  className={inputCls()}
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5">Headline · highlighted word</label>
                <input
                  value={theme.hero_headline_highlight}
                  onChange={(e) => patchTheme({ hero_headline_highlight: e.target.value })}
                  className={inputCls()}
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5">Headline · after highlight</label>
                <input
                  value={theme.hero_headline_after}
                  onChange={(e) => patchTheme({ hero_headline_after: e.target.value })}
                  className={inputCls()}
                />
              </div>
              <div className="sm:col-span-3">
                <label className="block text-xs font-medium mb-1.5">Subtitle</label>
                <textarea
                  value={theme.hero_subtitle}
                  onChange={(e) => patchTheme({ hero_subtitle: e.target.value })}
                  rows={2}
                  className={inputCls()}
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5">Primary CTA · label</label>
                <input
                  value={theme.hero_primary_cta_label}
                  onChange={(e) => patchTheme({ hero_primary_cta_label: e.target.value })}
                  className={inputCls()}
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5">Primary CTA · URL</label>
                <input
                  value={theme.hero_primary_cta_href}
                  onChange={(e) => patchTheme({ hero_primary_cta_href: e.target.value })}
                  className={inputCls()}
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5">Secondary CTA · label</label>
                <input
                  value={theme.hero_secondary_cta_label}
                  onChange={(e) => patchTheme({ hero_secondary_cta_label: e.target.value })}
                  className={inputCls()}
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5">Secondary CTA · URL</label>
                <input
                  value={theme.hero_secondary_cta_href}
                  onChange={(e) => patchTheme({ hero_secondary_cta_href: e.target.value })}
                  className={inputCls()}
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5">Trust line under hero</label>
                <input
                  value={theme.hero_trust_guarantee_label}
                  onChange={(e) => patchTheme({ hero_trust_guarantee_label: e.target.value })}
                  className={inputCls()}
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5">Legacy CTA label (fallback)</label>
                <input
                  value={theme.hero_cta_text}
                  onChange={(e) => patchTheme({ hero_cta_text: e.target.value })}
                  className={inputCls()}
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5">
                  Overlay strength ({theme.hero_bg_overlay})
                </label>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={theme.hero_bg_overlay}
                  onChange={(e) => patchTheme({ hero_bg_overlay: Number(e.target.value) })}
                  className="w-full accent-primary mt-2"
                />
              </div>
              <div className="sm:col-span-3">
                <label className="block text-xs font-medium mb-1.5">Hero background image URL (optional)</label>
                <input
                  value={theme.hero_bg_url}
                  onChange={(e) => patchTheme({ hero_bg_url: e.target.value })}
                  placeholder="https://..."
                  className={inputCls()}
                />
              </div>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-default)] space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-heading font-semibold text-sm">Navigation · links</h2>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="text-xs px-2 py-1 rounded-lg border border-[var(--border-default)] hover:bg-white/5"
                  onClick={() => patchTheme({ nav_links: [...STOREFRONT_DEFAULT_NAV_LINKS] })}
                >
                  Load defaults
                </button>
                <button
                  type="button"
                  className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-lg bg-primary text-white"
                  onClick={() =>
                    patchTheme({ nav_links: [...theme.nav_links, { href: "/", label: "New link" }] })
                  }
                >
                  <Plus className="h-3 w-3" /> Link
                </button>
              </div>
            </div>
            <p className="text-xs text-[var(--text-muted)]">
              Leave empty to use the built-in default nav. Adding at least one link replaces the default list entirely.
            </p>
            <div className="space-y-2">
              {theme.nav_links.map((link: NavLinkConfig, i: number) => (
                <div key={i} className="flex flex-wrap gap-2 items-center">
                  <input
                    value={link.label}
                    onChange={(e) => {
                      const next = [...theme.nav_links];
                      next[i] = { ...next[i], label: e.target.value };
                      patchTheme({ nav_links: next });
                    }}
                    placeholder="Label"
                    className={`${smallInputCls()} flex-1 min-w-[100px]`}
                  />
                  <input
                    value={link.href}
                    onChange={(e) => {
                      const next = [...theme.nav_links];
                      next[i] = { ...next[i], href: e.target.value };
                      patchTheme({ nav_links: next });
                    }}
                    placeholder="/path"
                    className={`${smallInputCls()} flex-1 min-w-[120px] font-mono`}
                  />
                  <button
                    type="button"
                    aria-label="Remove link"
                    className="p-1.5 rounded-lg border border-[var(--border-default)] text-[var(--text-muted)] hover:text-red-400"
                    onClick={() =>
                      patchTheme({ nav_links: theme.nav_links.filter((_: NavLinkConfig, j: number) => j !== i) })
                    }
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-default)] space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-heading font-semibold text-sm">Footer</h2>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="text-xs px-2 py-1 rounded-lg border border-[var(--border-default)] hover:bg-white/5"
                  onClick={() => patchTheme({ footer_columns: structuredClone(STOREFRONT_DEFAULT_FOOTER_COLUMNS) })}
                >
                  Load default columns
                </button>
                <button
                  type="button"
                  className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-lg bg-primary text-white"
                  onClick={() =>
                    patchTheme({
                      footer_columns: [
                        ...theme.footer_columns,
                        { title: "New column", links: [{ href: "/", label: "Link" }] },
                      ],
                    })
                  }
                >
                  <Plus className="h-3 w-3" /> Column
                </button>
              </div>
            </div>
            <div className="grid gap-3">
              <div>
                <label className="block text-xs font-medium mb-1.5">Brand · short blurb</label>
                <textarea
                  value={theme.footer_brand_blurb}
                  onChange={(e) => patchTheme({ footer_brand_blurb: e.target.value })}
                  rows={2}
                  className={inputCls()}
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5">Brand · note</label>
                <textarea
                  value={theme.footer_brand_note}
                  onChange={(e) => patchTheme({ footer_brand_note: e.target.value })}
                  rows={2}
                  className={inputCls()}
                />
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1.5">Copyright name</label>
                  <input
                    value={theme.copyright_name}
                    onChange={(e) => patchTheme({ copyright_name: e.target.value })}
                    className={inputCls()}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5">Trust · payments</label>
                  <input
                    value={theme.trust_line_payments}
                    onChange={(e) => patchTheme({ trust_line_payments: e.target.value })}
                    className={inputCls()}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5">Trust · start</label>
                  <input
                    value={theme.trust_line_start}
                    onChange={(e) => patchTheme({ trust_line_start: e.target.value })}
                    className={inputCls()}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5">Trust · support</label>
                  <input
                    value={theme.trust_line_support}
                    onChange={(e) => patchTheme({ trust_line_support: e.target.value })}
                    className={inputCls()}
                  />
                </div>
              </div>
            </div>
            <p className="text-xs text-[var(--text-muted)]">Column links: leave columns empty to use the default footer.</p>
            <div className="space-y-4">
              {theme.footer_columns.map((col: FooterColumnConfig, ci: number) => (
                <div
                  key={ci}
                  className="rounded-xl border border-[var(--border-default)] p-3 space-y-2 bg-[var(--bg-elevated)]/40"
                >
                  <div className="flex gap-2 items-center">
                    <input
                      value={col.title}
                      onChange={(e) => {
                        const next = [...theme.footer_columns];
                        next[ci] = { ...next[ci], title: e.target.value };
                        patchTheme({ footer_columns: next });
                      }}
                      placeholder="Column title"
                      className={`${smallInputCls()} flex-1`}
                    />
                    <button
                      type="button"
                      className="text-xs px-2 py-1 rounded-lg border border-[var(--border-default)]"
                      onClick={() => {
                        const next = [...theme.footer_columns];
                        next[ci] = { ...next[ci], links: [...next[ci].links, { href: "/", label: "Link" }] };
                        patchTheme({ footer_columns: next });
                      }}
                    >
                      + Link
                    </button>
                    <button
                      type="button"
                      aria-label="Remove column"
                      className="p-1.5 rounded-lg border border-[var(--border-default)] text-[var(--text-muted)] hover:text-red-400"
                      onClick={() =>
                        patchTheme({
                          footer_columns: theme.footer_columns.filter((_: FooterColumnConfig, j: number) => j !== ci),
                        })
                      }
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  {col.links.map((link: NavLinkConfig, li: number) => (
                    <div key={li} className="flex flex-wrap gap-2 items-center pl-2 border-l-2 border-primary/25">
                      <input
                        value={link.label}
                        onChange={(e) => {
                          const next = structuredClone(theme.footer_columns);
                          next[ci].links[li].label = e.target.value;
                          patchTheme({ footer_columns: next });
                        }}
                        className={`${smallInputCls()} flex-1 min-w-[80px]`}
                      />
                      <input
                        value={link.href}
                        onChange={(e) => {
                          const next = structuredClone(theme.footer_columns);
                          next[ci].links[li].href = e.target.value;
                          patchTheme({ footer_columns: next });
                        }}
                        className={`${smallInputCls()} flex-1 min-w-[100px] font-mono`}
                      />
                      <button
                        type="button"
                        className="p-1 rounded hover:bg-white/5"
                        onClick={() => {
                          const next = structuredClone(theme.footer_columns);
                          next[ci].links = next[ci].links.filter((_: NavLinkConfig, j: number) => j !== li);
                          patchTheme({ footer_columns: next });
                        }}
                      >
                        <Trash2 className="h-3 w-3 text-[var(--text-muted)]" />
                      </button>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-default)] space-y-4">
            <h2 className="font-heading font-semibold text-sm">Homepage · section headings</h2>
            <div className="grid sm:grid-cols-2 gap-3 text-xs">
              {(
                [
                  ["homepage_services_section_label", "Services · label"],
                  ["homepage_services_section_title", "Services · title"],
                  ["homepage_catalog_section_label", "Catalog · label"],
                  ["homepage_catalog_section_title", "Catalog · title"],
                  ["homepage_why_section_label", "Why us · label"],
                  ["homepage_why_section_title", "Why us · title"],
                  ["homepage_reviews_section_label", "Reviews · label"],
                  ["homepage_reviews_section_title", "Reviews · title"],
                  ["homepage_team_section_label", "Team · label"],
                  ["homepage_team_section_title", "Team · title"],
                  ["homepage_process_section_label", "Process · label"],
                  ["homepage_process_section_title", "Process · title"],
                  ["homepage_faq_section_label", "FAQ · label"],
                  ["homepage_faq_section_title", "FAQ · title"],
                ] as const
              ).map(([key, label]) => (
                <div key={key}>
                  <label className="block font-medium mb-1 text-[var(--text-muted)]">{label}</label>
                  <input
                    value={theme[key]}
                    onChange={(e) => patchTheme({ [key]: e.target.value })}
                    className={smallInputCls()}
                  />
                </div>
              ))}
              <div className="sm:col-span-2">
                <label className="block font-medium mb-1 text-[var(--text-muted)]">Team · subtitle</label>
                <textarea
                  value={theme.homepage_team_section_subtitle}
                  onChange={(e) => patchTheme({ homepage_team_section_subtitle: e.target.value })}
                  rows={2}
                  className={inputCls()}
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block font-medium mb-1 text-[var(--text-muted)]">Process · subtitle</label>
                <textarea
                  value={theme.homepage_process_section_subtitle}
                  onChange={(e) => patchTheme({ homepage_process_section_subtitle: e.target.value })}
                  rows={2}
                  className={inputCls()}
                />
              </div>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-default)] space-y-4">
            <h2 className="font-heading font-semibold text-sm">Homepage · bottom CTA</h2>
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium mb-1.5">Title</label>
                <input
                  value={theme.homepage_cta_title}
                  onChange={(e) => patchTheme({ homepage_cta_title: e.target.value })}
                  className={inputCls()}
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium mb-1.5">Subtitle</label>
                <textarea
                  value={theme.homepage_cta_subtitle}
                  onChange={(e) => patchTheme({ homepage_cta_subtitle: e.target.value })}
                  rows={2}
                  className={inputCls()}
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5">Button · label</label>
                <input
                  value={theme.homepage_cta_primary_label}
                  onChange={(e) => patchTheme({ homepage_cta_primary_label: e.target.value })}
                  className={inputCls()}
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5">Button · URL</label>
                <input
                  value={theme.homepage_cta_primary_href}
                  onChange={(e) => patchTheme({ homepage_cta_primary_href: e.target.value })}
                  className={inputCls()}
                />
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs text-[var(--text-muted)]">Bullets next to the button</p>
              <button
                type="button"
                className="text-xs px-2 py-1 rounded-lg border border-[var(--border-default)]"
                onClick={() => patchTheme({ homepage_cta_bullets: [...defaultTheme.homepage_cta_bullets] })}
              >
                Reset bullets
              </button>
            </div>
            {theme.homepage_cta_bullets.map((line: string, i: number) => (
              <div key={i} className="flex gap-2 items-center">
                <input
                  value={line}
                  onChange={(e) => {
                    const next = [...theme.homepage_cta_bullets];
                    next[i] = e.target.value;
                    patchTheme({ homepage_cta_bullets: next });
                  }}
                  className={smallInputCls()}
                />
                <button
                  type="button"
                  className="p-1.5 rounded-lg border border-[var(--border-default)]"
                  onClick={() =>
                    patchTheme({
                      homepage_cta_bullets: theme.homepage_cta_bullets.filter((_: string, j: number) => j !== i),
                    })
                  }
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            ))}
            <button
              type="button"
              className="text-xs inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-primary text-white"
              onClick={() => patchTheme({ homepage_cta_bullets: [...theme.homepage_cta_bullets, "New line"] })}
            >
              <Plus className="h-3 w-3" /> Bullet
            </button>
          </div>

          <div className="p-5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-default)] space-y-4">
            <div className="flex flex-wrap justify-between gap-2">
              <h2 className="font-heading font-semibold text-sm">Homepage · trust highlights</h2>
              <button
                type="button"
                className="text-xs px-2 py-1 rounded-lg border border-[var(--border-default)]"
                onClick={() =>
                  patchTheme({ homepage_trust_features: structuredClone(HOMEPAGE_TRUST_FEATURES_DEFAULT) })
                }
              >
                Reset to defaults
              </button>
            </div>
            <p className="text-xs text-[var(--text-muted)]">Empty list uses built-in default copy and icons.</p>
            {(theme.homepage_trust_features.length
              ? theme.homepage_trust_features
              : HOMEPAGE_TRUST_FEATURES_DEFAULT
            ).map((row: HomepageTrustFeature, i: number) => (
              <div key={i} className="rounded-xl border border-[var(--border-default)] p-3 space-y-2 bg-[var(--bg-elevated)]/30">
                <div className="flex justify-between">
                  <span className="text-[10px] font-semibold text-[var(--text-muted)]">Item {i + 1}</span>
                  <button
                    type="button"
                    className="text-[10px] text-red-400"
                    onClick={() => {
                      const src = theme.homepage_trust_features.length
                        ? theme.homepage_trust_features
                        : [...HOMEPAGE_TRUST_FEATURES_DEFAULT];
                      patchTheme({ homepage_trust_features: src.filter((_: HomepageTrustFeature, j: number) => j !== i) });
                    }}
                  >
                    Remove
                  </button>
                </div>
                <div className="grid sm:grid-cols-4 gap-2">
                  <input
                    placeholder="No."
                    value={row.number ?? ""}
                    onChange={(e) => {
                      const src = [...(theme.homepage_trust_features.length ? theme.homepage_trust_features : HOMEPAGE_TRUST_FEATURES_DEFAULT)];
                      src[i] = { ...src[i], number: e.target.value };
                      patchTheme({ homepage_trust_features: src });
                    }}
                    className={smallInputCls()}
                  />
                  <input
                    placeholder="Title"
                    value={row.title}
                    onChange={(e) => {
                      const src = [...(theme.homepage_trust_features.length ? theme.homepage_trust_features : HOMEPAGE_TRUST_FEATURES_DEFAULT)];
                      src[i] = { ...src[i], title: e.target.value };
                      patchTheme({ homepage_trust_features: src });
                    }}
                    className={`${smallInputCls()} sm:col-span-3`}
                  />
                  <textarea
                    placeholder="Beschrijving"
                    value={row.description}
                    onChange={(e) => {
                      const src = [...(theme.homepage_trust_features.length ? theme.homepage_trust_features : HOMEPAGE_TRUST_FEATURES_DEFAULT)];
                      src[i] = { ...src[i], description: e.target.value };
                      patchTheme({ homepage_trust_features: src });
                    }}
                    rows={2}
                    className={`${smallInputCls()} sm:col-span-4`}
                  />
                  <input
                    placeholder="Icon URL"
                    value={row.osrs_icon_url ?? ""}
                    onChange={(e) => {
                      const src = [...(theme.homepage_trust_features.length ? theme.homepage_trust_features : HOMEPAGE_TRUST_FEATURES_DEFAULT)];
                      src[i] = { ...src[i], osrs_icon_url: e.target.value };
                      patchTheme({ homepage_trust_features: src });
                    }}
                    className={`${smallInputCls()} sm:col-span-3 font-mono`}
                  />
                  <input
                    placeholder="Alt"
                    value={row.icon_alt ?? ""}
                    onChange={(e) => {
                      const src = [...(theme.homepage_trust_features.length ? theme.homepage_trust_features : HOMEPAGE_TRUST_FEATURES_DEFAULT)];
                      src[i] = { ...src[i], icon_alt: e.target.value };
                      patchTheme({ homepage_trust_features: src });
                    }}
                    className={smallInputCls()}
                  />
                </div>
              </div>
            ))}
            <button
              type="button"
              className="text-xs inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-[var(--border-default)]"
              onClick={() =>
                patchTheme({
                  homepage_trust_features: [
                    ...(theme.homepage_trust_features.length ? theme.homepage_trust_features : HOMEPAGE_TRUST_FEATURES_DEFAULT),
                    { title: "New highlight", description: "", number: "00", osrs_icon_url: "", icon_alt: "" },
                  ],
                })
              }
            >
              <Plus className="h-3 w-3" /> Trust row
            </button>
          </div>

          <div className="p-5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-default)] space-y-4">
            <div className="flex flex-wrap justify-between gap-2">
              <h2 className="font-heading font-semibold text-sm">Homepage · how it works</h2>
              <button
                type="button"
                className="text-xs px-2 py-1 rounded-lg border border-[var(--border-default)]"
                onClick={() =>
                  patchTheme({ homepage_how_it_works: structuredClone(HOMEPAGE_HOW_IT_WORKS_DEFAULT) })
                }
              >
                Reset to defaults
              </button>
            </div>
            {(theme.homepage_how_it_works.length ? theme.homepage_how_it_works : HOMEPAGE_HOW_IT_WORKS_DEFAULT).map(
              (row: HomepageHowStep, i: number) => (
                <div key={i} className="rounded-xl border border-[var(--border-default)] p-3 space-y-2 bg-[var(--bg-elevated)]/30">
                  <div className="flex justify-between">
                    <span className="text-[10px] font-semibold text-[var(--text-muted)]">Step {i + 1}</span>
                    <button
                      type="button"
                      className="text-[10px] text-red-400"
                      onClick={() => {
                        const src = theme.homepage_how_it_works.length
                          ? theme.homepage_how_it_works
                          : [...HOMEPAGE_HOW_IT_WORKS_DEFAULT];
                        patchTheme({ homepage_how_it_works: src.filter((_: HomepageHowStep, j: number) => j !== i) });
                      }}
                    >
                      Remove
                    </button>
                  </div>
                  <div className="grid sm:grid-cols-4 gap-2">
                    <input
                      placeholder="Step #"
                      value={row.step ?? ""}
                      onChange={(e) => {
                        const src = [...(theme.homepage_how_it_works.length ? theme.homepage_how_it_works : HOMEPAGE_HOW_IT_WORKS_DEFAULT)];
                        src[i] = { ...src[i], step: e.target.value };
                        patchTheme({ homepage_how_it_works: src });
                      }}
                      className={smallInputCls()}
                    />
                    <input
                      placeholder="Title"
                      value={row.title}
                      onChange={(e) => {
                        const src = [...(theme.homepage_how_it_works.length ? theme.homepage_how_it_works : HOMEPAGE_HOW_IT_WORKS_DEFAULT)];
                        src[i] = { ...src[i], title: e.target.value };
                        patchTheme({ homepage_how_it_works: src });
                      }}
                      className={`${smallInputCls()} sm:col-span-3`}
                    />
                    <textarea
                      placeholder="Beschrijving"
                      value={row.description}
                      onChange={(e) => {
                        const src = [...(theme.homepage_how_it_works.length ? theme.homepage_how_it_works : HOMEPAGE_HOW_IT_WORKS_DEFAULT)];
                        src[i] = { ...src[i], description: e.target.value };
                        patchTheme({ homepage_how_it_works: src });
                      }}
                      rows={2}
                      className={`${smallInputCls()} sm:col-span-4`}
                    />
                    <input
                      placeholder="Icon URL"
                      value={row.osrs_icon_url ?? ""}
                      onChange={(e) => {
                        const src = [...(theme.homepage_how_it_works.length ? theme.homepage_how_it_works : HOMEPAGE_HOW_IT_WORKS_DEFAULT)];
                        src[i] = { ...src[i], osrs_icon_url: e.target.value };
                        patchTheme({ homepage_how_it_works: src });
                      }}
                      className={`${smallInputCls()} sm:col-span-3 font-mono`}
                    />
                    <input
                      placeholder="Alt"
                      value={row.icon_alt ?? ""}
                      onChange={(e) => {
                        const src = [...(theme.homepage_how_it_works.length ? theme.homepage_how_it_works : HOMEPAGE_HOW_IT_WORKS_DEFAULT)];
                        src[i] = { ...src[i], icon_alt: e.target.value };
                        patchTheme({ homepage_how_it_works: src });
                      }}
                      className={smallInputCls()}
                    />
                  </div>
                </div>
              )
            )}
            <button
              type="button"
              className="text-xs inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-[var(--border-default)]"
              onClick={() =>
                patchTheme({
                  homepage_how_it_works: [
                    ...(theme.homepage_how_it_works.length ? theme.homepage_how_it_works : HOMEPAGE_HOW_IT_WORKS_DEFAULT),
                    { title: "New step", description: "", step: "00", osrs_icon_url: "", icon_alt: "" },
                  ],
                })
              }
            >
              <Plus className="h-3 w-3" /> Step
            </button>
          </div>

          <div className="p-5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-default)] space-y-4">
            <div className="flex flex-wrap justify-between gap-2">
              <h2 className="font-heading font-semibold text-sm">Homepage · service tiles</h2>
              <button
                type="button"
                className="text-xs px-2 py-1 rounded-lg border border-[var(--border-default)]"
                onClick={() =>
                  patchTheme({
                    homepage_service_categories: structuredClone(HOMEPAGE_SERVICE_CATEGORIES_DEFAULT),
                  })
                }
              >
                Reset to defaults
              </button>
            </div>
            {(theme.homepage_service_categories.length
              ? theme.homepage_service_categories
              : HOMEPAGE_SERVICE_CATEGORIES_DEFAULT
            ).map((row: HomepageServiceCategory, i: number) => (
              <div key={i} className="rounded-xl border border-[var(--border-default)] p-3 space-y-2 bg-[var(--bg-elevated)]/30">
                <div className="flex justify-between">
                  <span className="text-[10px] font-semibold text-[var(--text-muted)]">Tile {i + 1}</span>
                  <button
                    type="button"
                    className="text-[10px] text-red-400"
                    onClick={() => {
                      const src = theme.homepage_service_categories.length
                        ? theme.homepage_service_categories
                        : [...HOMEPAGE_SERVICE_CATEGORIES_DEFAULT];
                      patchTheme({
                        homepage_service_categories: src.filter((_: HomepageServiceCategory, j: number) => j !== i),
                      });
                    }}
                  >
                    Remove
                  </button>
                </div>
                <div className="grid sm:grid-cols-2 gap-2">
                  <input
                    placeholder="Title"
                    value={row.title}
                    onChange={(e) => {
                      const src = [
                        ...(theme.homepage_service_categories.length
                          ? theme.homepage_service_categories
                          : HOMEPAGE_SERVICE_CATEGORIES_DEFAULT),
                      ];
                      src[i] = { ...src[i], title: e.target.value };
                      patchTheme({ homepage_service_categories: src });
                    }}
                    className={smallInputCls()}
                  />
                  <input
                    placeholder="CTA"
                    value={row.cta}
                    onChange={(e) => {
                      const src = [
                        ...(theme.homepage_service_categories.length
                          ? theme.homepage_service_categories
                          : HOMEPAGE_SERVICE_CATEGORIES_DEFAULT),
                      ];
                      src[i] = { ...src[i], cta: e.target.value };
                      patchTheme({ homepage_service_categories: src });
                    }}
                    className={smallInputCls()}
                  />
                  <input
                    placeholder="URL"
                    value={row.href}
                    onChange={(e) => {
                      const src = [
                        ...(theme.homepage_service_categories.length
                          ? theme.homepage_service_categories
                          : HOMEPAGE_SERVICE_CATEGORIES_DEFAULT),
                      ];
                      src[i] = { ...src[i], href: e.target.value };
                      patchTheme({ homepage_service_categories: src });
                    }}
                    className={`${smallInputCls()} font-mono sm:col-span-2`}
                  />
                  <textarea
                    placeholder="Beschrijving"
                    value={row.desc}
                    onChange={(e) => {
                      const src = [
                        ...(theme.homepage_service_categories.length
                          ? theme.homepage_service_categories
                          : HOMEPAGE_SERVICE_CATEGORIES_DEFAULT),
                      ];
                      src[i] = { ...src[i], desc: e.target.value };
                      patchTheme({ homepage_service_categories: src });
                    }}
                    rows={2}
                    className={`${smallInputCls()} sm:col-span-2`}
                  />
                  <input
                    placeholder="Icon URL"
                    value={row.osrs_icon_url ?? ""}
                    onChange={(e) => {
                      const src = [
                        ...(theme.homepage_service_categories.length
                          ? theme.homepage_service_categories
                          : HOMEPAGE_SERVICE_CATEGORIES_DEFAULT),
                      ];
                      src[i] = { ...src[i], osrs_icon_url: e.target.value };
                      patchTheme({ homepage_service_categories: src });
                    }}
                    className={`${smallInputCls()} font-mono`}
                  />
                  <input
                    placeholder="Alt"
                    value={row.icon_alt ?? ""}
                    onChange={(e) => {
                      const src = [
                        ...(theme.homepage_service_categories.length
                          ? theme.homepage_service_categories
                          : HOMEPAGE_SERVICE_CATEGORIES_DEFAULT),
                      ];
                      src[i] = { ...src[i], icon_alt: e.target.value };
                      patchTheme({ homepage_service_categories: src });
                    }}
                    className={smallInputCls()}
                  />
                </div>
              </div>
            ))}
            <button
              type="button"
              className="text-xs inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-[var(--border-default)]"
              onClick={() =>
                patchTheme({
                  homepage_service_categories: [
                    ...(theme.homepage_service_categories.length
                      ? theme.homepage_service_categories
                      : HOMEPAGE_SERVICE_CATEGORIES_DEFAULT),
                    {
                      title: "New tile",
                      desc: "",
                      cta: "Learn more",
                      href: "/games",
                      osrs_icon_url: "",
                      icon_alt: "",
                    },
                  ],
                })
              }
            >
              <Plus className="h-3 w-3" /> Tile
            </button>
          </div>

          <div className="p-5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-default)] space-y-4">
            <div className="flex flex-wrap justify-between gap-2">
              <h2 className="font-heading font-semibold text-sm">Homepage · FAQ</h2>
              <button
                type="button"
                className="text-xs px-2 py-1 rounded-lg border border-[var(--border-default)]"
                onClick={() => patchTheme({ homepage_faq: structuredClone(HOMEPAGE_FAQ_DEFAULT) })}
              >
                Reset to defaults
              </button>
            </div>
            <p className="text-xs text-[var(--text-muted)]">
              Include <code className="font-mono text-[var(--text-primary)]">PLACEHOLDER_ORDER_STATS</code> in an answer
              to inject live order-count text (only replaced when that token appears).
            </p>
            {(theme.homepage_faq.length ? theme.homepage_faq : HOMEPAGE_FAQ_DEFAULT).map((row: HomepageFaqItem, i: number) => (
              <div key={i} className="rounded-xl border border-[var(--border-default)] p-3 space-y-2 bg-[var(--bg-elevated)]/30">
                <div className="flex justify-between">
                  <span className="text-[10px] font-semibold text-[var(--text-muted)]">Question {i + 1}</span>
                  <button
                    type="button"
                    className="text-[10px] text-red-400"
                    onClick={() => {
                      const src = theme.homepage_faq.length ? theme.homepage_faq : [...HOMEPAGE_FAQ_DEFAULT];
                      patchTheme({ homepage_faq: src.filter((_: HomepageFaqItem, j: number) => j !== i) });
                    }}
                  >
                    Remove
                  </button>
                </div>
                <input
                  placeholder="Question"
                  value={row.question}
                  onChange={(e) => {
                    const src = [...(theme.homepage_faq.length ? theme.homepage_faq : HOMEPAGE_FAQ_DEFAULT)];
                    src[i] = { ...src[i], question: e.target.value };
                    patchTheme({ homepage_faq: src });
                  }}
                  className={smallInputCls()}
                />
                <textarea
                  placeholder="Answer"
                  value={row.answer}
                  onChange={(e) => {
                    const src = [...(theme.homepage_faq.length ? theme.homepage_faq : HOMEPAGE_FAQ_DEFAULT)];
                    src[i] = { ...src[i], answer: e.target.value };
                    patchTheme({ homepage_faq: src });
                  }}
                  rows={4}
                  className={inputCls()}
                />
              </div>
            ))}
            <button
              type="button"
              className="text-xs inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-[var(--border-default)]"
              onClick={() =>
                patchTheme({
                  homepage_faq: [
                    ...(theme.homepage_faq.length ? theme.homepage_faq : HOMEPAGE_FAQ_DEFAULT),
                    { question: "New question", answer: "" },
                  ],
                })
              }
            >
              <Plus className="h-3 w-3" /> FAQ entry
            </button>
          </div>
        </div>

        <div className="lg:sticky lg:top-24 space-y-3">
          <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Live preview</p>
          <StorefrontMiniPreview theme={theme} siteName={siteName} siteTagline={siteTagline} />
        </div>
      </div>
    </div>
  );
}
