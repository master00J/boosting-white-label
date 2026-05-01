"use client";

import { useState } from "react";
import { Plus, Save, Loader2, Star, Trash2, AlertCircle } from "lucide-react";

type Tier = { id: string; name: string; min_points: number; discount_percentage: number; color: string; icon: string };
type Settings = Record<string, string>;

export default function LoyaltyClient({ tiers: initial, settings: initialSettings }: { tiers: Tier[]; settings: Settings }) {
  const [tiers, setTiers] = useState<Tier[]>(initial);
  const [settings, setSettings] = useState<Settings>(initialSettings);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", min_points: "", discount_percentage: "", color: "#6366f1", icon: "⭐" });
  const saveSettings = async () => {
    setSaving(true);
    try {
      await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings }),
      });
    } finally {
      setSaving(false);
    }
  };

  const createTier = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/admin/table/loyalty_tiers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          min_points: parseInt(form.min_points),
          discount_percentage: parseFloat(form.discount_percentage),
          color: form.color,
          icon: form.icon,
        }),
      });
      if (!res.ok) throw new Error("Create failed");
      const data = await res.json() as Tier;
      setTiers((p) => [...p, data].sort((a, b) => a.min_points - b.min_points));
      setShowForm(false);
      setForm({ name: "", min_points: "", discount_percentage: "", color: "#6366f1", icon: "⭐" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setSaving(false);
    }
  };

  const deleteTier = async (id: string) => {
    await fetch("/api/admin/table/loyalty_tiers", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setTiers((p) => p.filter((t) => t.id !== id));
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-1">Marketing</p>
        <h1 className="font-heading text-2xl font-semibold">Loyalty program</h1>
      </div>

      {/* Settings */}
      <div className="p-5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-default)] space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-heading font-semibold text-sm">Settings</h2>
          <button onClick={saveSettings} disabled={saving} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-medium hover:bg-primary/90 disabled:opacity-40 transition-colors">
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} Save
          </button>
        </div>
        <label className="flex items-center gap-3 cursor-pointer">
          <div onClick={() => setSettings((p) => ({ ...p, loyalty_enabled: p.loyalty_enabled === "true" ? "false" : "true" }))} className={`relative w-10 h-6 rounded-full transition-colors ${settings.loyalty_enabled === "true" ? "bg-primary" : "bg-[var(--bg-elevated)]"}`}>
            <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${settings.loyalty_enabled === "true" ? "translate-x-5" : "translate-x-1"}`} />
          </div>
          <span className="text-sm font-medium">Program enabled</span>
        </label>
        <div>
          <label className="block text-xs font-medium mb-1.5">Points per dollar</label>
          <input type="number" min="1" value={settings.loyalty_points_per_euro ?? "10"} onChange={(e) => setSettings((p) => ({ ...p, loyalty_points_per_euro: e.target.value }))} className="w-32 px-3 py-2 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-default)] text-sm focus:outline-none focus:border-primary/50 transition-colors" />
          <p className="text-xs text-[var(--text-muted)] mt-1">Points customers earn per dollar spent</p>
        </div>
      </div>

      {/* Tiers */}
      <div className="p-5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-default)] space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-heading font-semibold text-sm">Tiers</h2>
          <button onClick={() => setShowForm(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--bg-elevated)] text-xs font-medium hover:bg-white/10 transition-colors">
            <Plus className="h-3.5 w-3.5" /> Add tier
          </button>
        </div>

        {showForm && (
          <form onSubmit={createTier} className="grid grid-cols-2 gap-3 p-4 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-default)]">
            <div>
              <label className="block text-xs font-medium mb-1">Name</label>
              <input required value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} placeholder="Gold" className="w-full px-3 py-2 rounded-lg bg-[var(--bg-card)] border border-[var(--border-default)] text-sm focus:outline-none focus:border-primary/50" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Icon (emoji)</label>
              <input required value={form.icon} onChange={(e) => setForm((p) => ({ ...p, icon: e.target.value }))} placeholder="⭐" className="w-full px-3 py-2 rounded-lg bg-[var(--bg-card)] border border-[var(--border-default)] text-sm focus:outline-none focus:border-primary/50" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Min. points</label>
              <input required type="number" min="0" value={form.min_points} onChange={(e) => setForm((p) => ({ ...p, min_points: e.target.value }))} className="w-full px-3 py-2 rounded-lg bg-[var(--bg-card)] border border-[var(--border-default)] text-sm focus:outline-none focus:border-primary/50" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Discount (%)</label>
              <input required type="number" min="0" max="100" step="0.5" value={form.discount_percentage} onChange={(e) => setForm((p) => ({ ...p, discount_percentage: e.target.value }))} className="w-full px-3 py-2 rounded-lg bg-[var(--bg-card)] border border-[var(--border-default)] text-sm focus:outline-none focus:border-primary/50" />
            </div>
            {error && <div className="col-span-2 flex items-center gap-2 text-xs text-red-400"><AlertCircle className="h-3.5 w-3.5" />{error}</div>}
            <div className="col-span-2 flex justify-end gap-2">
              <button type="button" onClick={() => setShowForm(false)} className="px-3 py-1.5 rounded-lg border border-[var(--border-default)] text-xs">Cancel</button>
              <button type="submit" disabled={saving} className="px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-medium disabled:opacity-40">Create</button>
            </div>
          </form>
        )}

        <div className="space-y-2">
          {tiers.length === 0 ? (
            <div className="text-center py-8 text-[var(--text-muted)]"><Star className="h-6 w-6 mx-auto mb-2 opacity-30" /><p className="text-xs">None tiers</p></div>
          ) : tiers.map((tier) => (
            <div key={tier.id} className="flex items-center gap-3 p-3 rounded-xl bg-[var(--bg-elevated)]">
              <span className="text-xl">{tier.icon}</span>
              <div className="flex-1">
                <p className="text-sm font-semibold">{tier.name}</p>
                <p className="text-xs text-[var(--text-muted)]">{tier.min_points.toLocaleString()} points · {tier.discount_percentage}% discount</p>
              </div>
              <button onClick={() => deleteTier(tier.id)} className="text-[var(--text-muted)] hover:text-red-400 transition-colors">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
