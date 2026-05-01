"use client";

import { useState } from "react";
import { Save, Loader2, Check } from "lucide-react";

const PRESET_COLORS = [
  { name: "Indigo", primary: "#6366f1", accent: "#f59e0b" },
  { name: "Violet", primary: "#8b5cf6", accent: "#f59e0b" },
  { name: "Blue", primary: "#3b82f6", accent: "#f59e0b" },
  { name: "Emerald", primary: "#10b981", accent: "#f59e0b" },
  { name: "Rose", primary: "#f43f5e", accent: "#f59e0b" },
];

const HEADING_FONTS = ["Cal Sans", "Inter", "Sora", "Space Grotesk", "Outfit"];
const BODY_FONTS = ["Satoshi", "Inter", "DM Sans", "Plus Jakarta Sans"];

export default function ThemeClient({ initialSettings }: { initialSettings: Record<string, string> }) {
  const [settings, setSettings] = useState(initialSettings);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const update = (key: string, value: string) => setSettings((p) => ({ ...p, [key]: value }));

  const save = async () => {
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings }),
      });
      if (!res.ok) { const d = await res.json().catch(() => ({})); setError(d.error ?? "Save failed."); return; }
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
          <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-1">Storefront</p>
          <h1 className="font-heading text-2xl font-semibold">Theme</h1>
        </div>
        <button onClick={save} disabled={saving} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 disabled:opacity-40 transition-colors">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : saved ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
          {saved ? "Saved!" : "Save"}
        </button>
      </div>
      {error && <div className="p-3 rounded-xl bg-red-400/10 border border-red-400/20 text-sm text-red-400">{error}</div>}

      {/* Site info */}
      <div className="p-5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-default)] space-y-4">
        <h2 className="font-heading font-semibold text-sm">Site information</h2>
        <div>
          <label className="block text-xs font-medium mb-1.5">Site name</label>
          <input value={settings.site_name ?? ""} onChange={(e) => update("site_name", e.target.value)} className="w-full px-3 py-2.5 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-default)] text-sm focus:outline-none focus:border-primary/50 transition-colors" />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1.5">Tagline</label>
          <input value={settings.site_tagline ?? ""} onChange={(e) => update("site_tagline", e.target.value)} placeholder="The fastest boosting service" className="w-full px-3 py-2.5 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-default)] text-sm focus:outline-none focus:border-primary/50 transition-colors" />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1.5">Logo URL</label>
          <input value={settings.site_logo_url ?? ""} onChange={(e) => update("site_logo_url", e.target.value)} placeholder="https://..." className="w-full px-3 py-2.5 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-default)] text-sm focus:outline-none focus:border-primary/50 transition-colors" />
        </div>
      </div>

      {/* Colors */}
      <div className="p-5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-default)] space-y-4">
        <h2 className="font-heading font-semibold text-sm">Colors</h2>
        <div className="flex gap-2 flex-wrap">
          {PRESET_COLORS.map((preset) => (
            <button
              key={preset.name}
              onClick={() => { update("theme_primary_color", preset.primary); update("theme_accent_color", preset.accent); }}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-medium transition-all ${settings.theme_primary_color === preset.primary ? "border-white" : "border-[var(--border-default)]"}`}
            >
              <div className="w-4 h-4 rounded-full" style={{ backgroundColor: preset.primary }} />
              {preset.name}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium mb-1.5">Primary color</label>
            <div className="flex gap-2">
              <input type="color" value={settings.theme_primary_color ?? "#6366f1"} onChange={(e) => update("theme_primary_color", e.target.value)} className="w-10 h-10 rounded-lg cursor-pointer border-0 bg-transparent" />
              <input type="text" value={settings.theme_primary_color ?? "#6366f1"} onChange={(e) => update("theme_primary_color", e.target.value)} className="flex-1 px-3 py-2 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-default)] text-sm font-mono focus:outline-none focus:border-primary/50 transition-colors" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5">Accent color</label>
            <div className="flex gap-2">
              <input type="color" value={settings.theme_accent_color ?? "#f59e0b"} onChange={(e) => update("theme_accent_color", e.target.value)} className="w-10 h-10 rounded-lg cursor-pointer border-0 bg-transparent" />
              <input type="text" value={settings.theme_accent_color ?? "#f59e0b"} onChange={(e) => update("theme_accent_color", e.target.value)} className="flex-1 px-3 py-2 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-default)] text-sm font-mono focus:outline-none focus:border-primary/50 transition-colors" />
            </div>
          </div>
        </div>
      </div>

      {/* Fonts */}
      <div className="p-5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-default)] space-y-4">
        <h2 className="font-heading font-semibold text-sm">Fonts</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium mb-1.5">Heading font</label>
            <select value={settings.theme_font_heading ?? "Cal Sans"} onChange={(e) => update("theme_font_heading", e.target.value)} className="w-full px-3 py-2.5 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-default)] text-sm focus:outline-none focus:border-primary/50 transition-colors">
              {HEADING_FONTS.map((f) => <option key={f}>{f}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5">Body font</label>
            <select value={settings.theme_font_body ?? "Satoshi"} onChange={(e) => update("theme_font_body", e.target.value)} className="w-full px-3 py-2.5 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-default)] text-sm focus:outline-none focus:border-primary/50 transition-colors">
              {BODY_FONTS.map((f) => <option key={f}>{f}</option>)}
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}
