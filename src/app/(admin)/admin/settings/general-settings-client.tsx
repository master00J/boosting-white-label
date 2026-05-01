"use client";

import { useState } from "react";
import { Save, Loader2, Check, Globe, Trash2, Hash } from "lucide-react";

type Toggle = { key: string; label: string; desc: string };

const TOGGLES: Toggle[] = [
  { key: "maintenance_mode", label: "Maintenance mode", desc: "Site shows maintenance page to visitors" },
  { key: "registration_enabled", label: "Registration enabled", desc: "New customers can sign up" },
  { key: "worker_applications_open", label: "Booster applications open", desc: "New boosters can submit an application" },
];

export default function GeneralSettingsClient({ initialSettings }: { initialSettings: Record<string, string> }) {
  const [settings, setSettings] = useState(initialSettings);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [domainInput, setDomainInput] = useState(initialSettings["custom_domain"] ?? "");
  const [domainSaving, setDomainSaving] = useState(false);
  const [domainResult, setDomainResult] = useState<{ cname?: string; error?: string } | null>(null);

  const update = (key: string, value: string) => setSettings((p) => ({ ...p, [key]: value }));
  const toggle = (key: string) => setSettings((p) => ({ ...p, [key]: p[key] === "true" ? "false" : "true" }));

  const saveDomain = async () => {
    if (!domainInput.trim()) return;
    setDomainSaving(true);
    setDomainResult(null);
    try {
      const res = await fetch('/api/admin/domain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain: domainInput.trim().replace(/^https?:\/\//, '') }),
      });
      const data = await res.json() as { success?: boolean; cname?: string; error?: string };
      if (data.success) {
        setDomainResult({ cname: data.cname });
        setSettings(p => ({ ...p, custom_domain: domainInput.trim() }));
      } else {
        setDomainResult({ error: data.error ?? 'Failed to add domain' });
      }
    } catch {
      setDomainResult({ error: 'Network error' });
    } finally {
      setDomainSaving(false);
    }
  };

  const removeDomain = async () => {
    if (!settings["custom_domain"]) return;
    setDomainSaving(true);
    try {
      await fetch('/api/admin/domain', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain: settings["custom_domain"] }),
      });
      setSettings(p => ({ ...p, custom_domain: '' }));
      setDomainInput('');
      setDomainResult(null);
    } finally {
      setDomainSaving(false);
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings }),
      });
      if (!res.ok) throw new Error("Failed to save");
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
          <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-1">Settings</p>
          <h1 className="font-heading text-2xl font-semibold">General</h1>
        </div>
        <button onClick={save} disabled={saving} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 disabled:opacity-40 transition-colors">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : saved ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
          {saved ? "Saved!" : "Save"}
        </button>
      </div>

      <div className="p-5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-default)] space-y-4">
        <div className="flex items-center gap-2">
          <Hash className="h-4 w-4 text-primary" />
          <h2 className="font-heading font-semibold text-sm">Order ID</h2>
        </div>
        <p className="text-xs text-[var(--text-muted)]">
          Order numbers use the format <span className="font-mono text-[var(--text-secondary)]">[BRAND]-[GAME]-[SERVICE]-[NUM]</span>. Set the brand code here; game and service codes are set per game and per service.
        </p>
        <div>
          <label className="block text-xs font-medium mb-1.5">Brand code</label>
          <input
            value={settings["order_id_brand"] ?? ""}
            onChange={(e) => update("order_id_brand", e.target.value)}
            placeholder="e.g. BST"
            className="w-full px-3 py-2.5 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-default)] text-sm font-mono focus:outline-none focus:border-primary/50 transition-colors"
          />
        </div>
      </div>

      <div className="p-5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-default)] space-y-4">
        <h2 className="font-heading font-semibold text-sm">Site</h2>
        {[["site_name", "Site name", "BoostPlatform"], ["site_tagline", "Tagline", "The fastest boosting service"], ["site_url", "Site URL", "https://..."]].map(([key, label, placeholder]) => (
          <div key={key}>
            <label className="block text-xs font-medium mb-1.5">{label}</label>
            <input value={settings[key] ?? ""} onChange={(e) => update(key, e.target.value)} placeholder={placeholder} className="w-full px-3 py-2.5 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-default)] text-sm focus:outline-none focus:border-primary/50 transition-colors" />
          </div>
        ))}
      </div>

      <div className="p-5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-default)] space-y-4">
        <div className="flex items-center gap-2">
          <Globe className="h-4 w-4 text-primary" />
          <h2 className="font-heading font-semibold text-sm">Custom Domain</h2>
        </div>
        <p className="text-xs text-[var(--text-muted)]">
          Connect your own domain (e.g. <span className="font-mono">boost.yourdomain.com</span>) to this website.
        </p>
        {settings["custom_domain"] ? (
          <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--bg-elevated)] border border-green-500/30">
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-green-500" />
              <span className="font-mono text-sm">{settings["custom_domain"]}</span>
            </div>
            <button onClick={removeDomain} disabled={domainSaving} className="text-red-400 hover:text-red-500 transition-colors">
              {domainSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            </button>
          </div>
        ) : (
          <div className="flex gap-2">
            <input
              value={domainInput}
              onChange={(e) => setDomainInput(e.target.value)}
              placeholder="boost.yourdomain.com"
              className="flex-1 px-3 py-2.5 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-default)] text-sm focus:outline-none focus:border-primary/50 transition-colors font-mono"
            />
            <button
              onClick={saveDomain}
              disabled={domainSaving || !domainInput.trim()}
              className="px-4 py-2 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary/90 disabled:opacity-40 transition-colors flex items-center gap-2"
            >
              {domainSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Connect'}
            </button>
          </div>
        )}
        {domainResult?.error && (
          <p className="text-xs text-red-400">{domainResult.error}</p>
        )}
        {domainResult?.cname && (
          <div className="p-3 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-default)] text-xs space-y-2">
            <p className="font-medium text-green-500">✓ Domain added to Vercel</p>
            <p className="text-[var(--text-muted)]">Add this CNAME record at your domain registrar:</p>
            <div className="flex items-center gap-2 font-mono bg-[var(--bg-card)] rounded-lg p-2 border border-[var(--border-default)] flex-wrap">
              <span className="text-primary">CNAME</span>
              <span>{domainInput}</span>
              <span className="text-[var(--text-muted)]">→</span>
              <span className="text-green-500">cname.vercel-dns.com</span>
            </div>
            <p className="text-[var(--text-muted)]">DNS propagation can take up to 24 hours. Your site will be live on your domain automatically.</p>
          </div>
        )}
      </div>

      <div className="p-5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-default)] space-y-4">
        <h2 className="font-heading font-semibold text-sm">Features</h2>
        {TOGGLES.map((t) => (
          <label key={t.key} className="flex items-center gap-3 cursor-pointer">
            <div onClick={() => toggle(t.key)} className={`relative w-10 h-6 rounded-full transition-colors flex-shrink-0 ${settings[t.key] === "true" ? "bg-primary" : "bg-[var(--bg-elevated)]"}`}>
              <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${settings[t.key] === "true" ? "translate-x-5" : "translate-x-1"}`} />
            </div>
            <div>
              <p className="text-sm font-medium">{t.label}</p>
              <p className="text-xs text-[var(--text-muted)]">{t.desc}</p>
            </div>
          </label>
        ))}
      </div>
    </div>
  );
}
