"use client";

import { useState } from "react";
import { Save, Loader2, Check, Monitor } from "lucide-react";
import { ImageUpload } from "@/components/ui/image-upload";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export default function HeroClient({
  initialSlides,
  initialOverlay,
  initialHeight = 65,
  initialMobileLogo = "",
  initialMobileLogoOnly = false,
}: {
  initialSlides: string[];
  initialVideoSlides?: string[];
  initialOverlay: number;
  initialHeight?: number;
  initialMobileLogo?: string;
  initialMobileLogoOnly?: boolean;
}) {
  const [imageUrl, setImageUrl] = useState(initialSlides[0] ?? "");
  const [overlayOpacity, setOverlayOpacity] = useState(initialOverlay);
  const [heightVh, setHeightVh] = useState(initialHeight);
  const [mobileLogo, setMobileLogo] = useState(initialMobileLogo);
  const [mobileLogoOnly, setMobileLogoOnly] = useState(initialMobileLogoOnly);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/settings/homepage-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hero_slides: imageUrl.trim() ? [imageUrl.trim()] : [],
          hero_video_slides: [],
          hero_bg_overlay: Math.min(1, Math.max(0, overlayOpacity)),
          hero_height: heightVh,
          hero_mobile_logo: mobileLogo.trim() || null,
          hero_mobile_logo_only: mobileLogoOnly,
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.error ?? "Save failed");
        return;
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-1">
            Storefront
          </p>
          <h1 className="font-heading text-2xl font-semibold">Hero banner</h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Background image, overlay transparency and height of the homepage hero.
          </p>
        </div>
        <Button onClick={save} disabled={saving} className="flex items-center gap-2">
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : saved ? (
            <Check className="h-4 w-4" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {saved ? "Saved!" : "Save"}
        </Button>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Live preview */}
      <div className="rounded-2xl border border-[var(--border-default)] overflow-hidden bg-[var(--bg-card)]">
        <div className="flex items-center gap-2 px-4 py-2 border-b border-[var(--border-default)] bg-[var(--bg-elevated)]">
          <Monitor className="h-4 w-4 text-[var(--text-muted)]" />
          <span className="text-xs font-medium text-[var(--text-muted)]">Live preview</span>
        </div>
        <div className="p-3 bg-[var(--bg-elevated)]/50">
          <div
            className="relative overflow-hidden rounded-xl border border-[var(--border-default)] mx-auto max-w-2xl"
            style={{ height: `${Math.round((heightVh / 100) * 200)}px`, minHeight: 80 }}
          >
            {imageUrl.trim() ? (
              <>
                <div
                  className="absolute inset-0 bg-cover bg-center"
                  style={{ backgroundImage: `url(${imageUrl})` }}
                />
                <div
                  className="absolute inset-0"
                  style={{
                    background: `linear-gradient(to bottom, rgba(0,0,0,${overlayOpacity * 0.25}) 0%, rgba(0,0,0,${overlayOpacity * 0.55}) 45%, rgba(0,0,0,${Math.min(overlayOpacity + 0.15, 1)}) 100%)`,
                  }}
                />
              </>
            ) : (
              <div className="absolute inset-0 bg-[var(--bg-elevated)] flex items-center justify-center text-[var(--text-muted)] text-xs">
                Upload an image to preview
              </div>
            )}
            <div className="absolute inset-0 flex items-end items-center justify-center pb-4 pointer-events-none">
              <span className="text-white/80 font-heading text-base drop-shadow-lg">
                The Fastest &amp; Safest Game Boosting
              </span>
            </div>
          </div>
          <p className="text-xs text-[var(--text-muted)] mt-2 text-center">
            Height: {heightVh}% of screen · Overlay opacity: {Math.round(overlayOpacity * 100)}%
          </p>
        </div>
      </div>

      {/* Background image */}
      <div className="p-5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-default)] space-y-3">
        <div>
          <Label className="text-sm font-medium">Background image</Label>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            Displayed as the hero background. Use a wide image (e.g. 1920×1080).
          </p>
        </div>
        <ImageUpload
          value={imageUrl}
          onChange={setImageUrl}
          bucket="game-assets"
          folder="hero"
          label="Upload image"
          aspectRatio="banner"
        />
        <Input
          value={imageUrl}
          onChange={(e) => setImageUrl(e.target.value)}
          placeholder="https://... or upload above"
          className="text-sm"
        />
      </div>

      {/* Overlay opacity */}
      <div className="p-5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-default)] space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-sm font-medium">Overlay darkness</Label>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              How dark the overlay is over the image. Lower = more image visible.
            </p>
          </div>
          <span className="text-sm font-mono font-medium text-primary tabular-nums">
            {Math.round(overlayOpacity * 100)}%
          </span>
        </div>
        <input
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={overlayOpacity}
          onChange={(e) => setOverlayOpacity(parseFloat(e.target.value))}
          className="w-full h-2.5 rounded-full bg-[var(--bg-elevated)] appearance-none cursor-pointer accent-primary"
        />
        <div className="flex justify-between text-xs text-[var(--text-muted)]">
          <span>Transparent (0%)</span>
          <span>Half (50%)</span>
          <span>Fully dark (100%)</span>
        </div>
      </div>

      {/* Hero height */}
      <div className="p-5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-default)] space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-sm font-medium">Hero height</Label>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              How tall the hero is displayed (% of screen height).
            </p>
          </div>
          <span className="text-sm font-mono font-medium text-primary tabular-nums">{heightVh}%</span>
        </div>
        <input
          type="range"
          min="30"
          max="100"
          step="5"
          value={heightVh}
          onChange={(e) => setHeightVh(Number(e.target.value))}
          className="w-full h-2.5 rounded-full bg-[var(--bg-elevated)] appearance-none cursor-pointer accent-primary"
        />
        <div className="flex justify-between text-xs text-[var(--text-muted)]">
          <span>30%</span>
          <span>65%</span>
          <span>100%</span>
        </div>
      </div>

      {/* Mobile: logo only */}
      <div className="p-5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-default)] space-y-4">
        <div>
          <Label className="text-sm font-medium">Mobile: logo only</Label>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            On mobile devices, hide the banner and show only a logo.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="mobile-logo-only"
            checked={mobileLogoOnly}
            onChange={(e) => setMobileLogoOnly(e.target.checked)}
            className="w-4 h-4 rounded border-[var(--border-default)] bg-[var(--bg-elevated)] accent-primary"
          />
          <Label htmlFor="mobile-logo-only" className="text-sm cursor-pointer">
            Use logo on mobile instead of banner
          </Label>
        </div>
        {mobileLogoOnly && (
          <div className="space-y-2">
            <Label className="text-sm font-medium">Mobile logo</Label>
            <div className="flex gap-2">
              <ImageUpload
                value={mobileLogo}
                onChange={setMobileLogo}
                bucket="game-assets"
                folder="hero"
                label="Upload logo"
              />
              <Input
                value={mobileLogo}
                onChange={(e) => setMobileLogo(e.target.value)}
                placeholder="https://... or upload"
                className="flex-1 text-sm"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
