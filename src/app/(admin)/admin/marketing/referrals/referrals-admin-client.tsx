"use client";

import { useState } from "react";
import { Save, Loader2, Users } from "lucide-react";

export default function ReferralsAdminClient({ settings: initialSettings, totalReferrals }: { settings: Record<string, string>; totalReferrals: number }) {
  const [settings, setSettings] = useState(initialSettings);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings }),
      });
      if (res.ok) { setSaved(true); setTimeout(() => setSaved(false), 2000); }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-xl">
      <div>
        <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-1">Marketing</p>
        <h1 className="font-heading text-2xl font-semibold">Referral programma</h1>
      </div>

      <div className="p-5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-default)]">
        <div className="flex items-center gap-3 mb-4">
          <Users className="h-8 w-8 text-primary bg-primary/10 p-1.5 rounded-lg" />
          <div>
            <p className="text-2xl font-bold font-heading">{totalReferrals}</p>
            <p className="text-xs text-[var(--text-muted)]">Total referrals</p>
          </div>
        </div>
      </div>

      <div className="p-5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-default)] space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-heading font-semibold text-sm">Settings</h2>
          <button onClick={save} disabled={saving} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-medium hover:bg-primary/90 disabled:opacity-40 transition-colors">
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            {saved ? "Saved!" : "Save"}
          </button>
        </div>

        <label className="flex items-center gap-3 cursor-pointer">
          <div onClick={() => setSettings((p) => ({ ...p, referral_enabled: p.referral_enabled === "true" ? "false" : "true" }))} className={`relative w-10 h-6 rounded-full transition-colors ${settings.referral_enabled === "true" ? "bg-primary" : "bg-[var(--bg-elevated)]"}`}>
            <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${settings.referral_enabled === "true" ? "translate-x-5" : "translate-x-1"}`} />
          </div>
          <span className="text-sm font-medium">Program enabled</span>
        </label>

        <div>
          <label className="block text-xs font-medium mb-1.5">Reward type</label>
          <div className="flex gap-2">
            {[["percentage", "Percentage (%)"], ["fixed", "Fixed amount ($)"]].map(([v, l]) => (
              <label key={v} className={`flex items-center gap-2 px-3 py-2 rounded-xl border cursor-pointer text-sm transition-colors ${(settings.referral_reward_type ?? "percentage") === v ? "border-primary bg-primary/10" : "border-[var(--border-default)]"}`}>
                <input type="radio" name="reward_type" value={v} checked={(settings.referral_reward_type ?? "percentage") === v} onChange={() => setSettings((p) => ({ ...p, referral_reward_type: v }))} className="accent-primary" />
                {l}
              </label>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium mb-1.5">
              {(settings.referral_reward_type ?? "percentage") === "percentage" ? "Commission (%)" : "Reward amount ($)"}
            </label>
            <input
              type="number" min="0"
              step={(settings.referral_reward_type ?? "percentage") === "percentage" ? "0.5" : "0.50"}
              max={(settings.referral_reward_type ?? "percentage") === "percentage" ? "100" : undefined}
              value={settings.referral_reward_amount ?? "5"}
              onChange={(e) => setSettings((p) => ({ ...p, referral_reward_amount: e.target.value }))}
              className="w-full px-3 py-2 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-default)] text-sm focus:outline-none focus:border-primary/50 transition-colors"
            />
            <p className="text-xs text-[var(--text-muted)] mt-1">
              {(settings.referral_reward_type ?? "percentage") === "percentage"
                ? "% of referred order credited to referrer"
                : "Fixed $ amount credited to referrer per referral"}
            </p>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5">Reward for referred ($)</label>
            <input
              type="number" min="0" step="0.50"
              value={settings.referral_reward_referred ?? "0"}
              onChange={(e) => setSettings((p) => ({ ...p, referral_reward_referred: e.target.value }))}
              className="w-full px-3 py-2 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-default)] text-sm focus:outline-none focus:border-primary/50 transition-colors"
            />
            <p className="text-xs text-[var(--text-muted)] mt-1">Bonus for the person who was referred (0 = disabled)</p>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium mb-1.5">Min. order amount to trigger reward ($)</label>
          <input
            type="number" min="0" step="1"
            value={settings.referral_min_order ?? "0"}
            onChange={(e) => setSettings((p) => ({ ...p, referral_min_order: e.target.value }))}
            className="w-32 px-3 py-2 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-default)] text-sm focus:outline-none focus:border-primary/50 transition-colors"
          />
          <p className="text-xs text-[var(--text-muted)] mt-1">Referred user must spend at least this amount (0 = no minimum)</p>
        </div>
      </div>
    </div>
  );
}
