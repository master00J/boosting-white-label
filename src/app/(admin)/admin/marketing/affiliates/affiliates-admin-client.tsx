"use client";

import { useState } from "react";
import {
  Link2, TrendingUp, MousePointer, ShoppingBag, DollarSign,
  ToggleLeft, ToggleRight, Search, Plus, X, Loader2, Pencil,
  Check, Copy, ExternalLink,
} from "lucide-react";

type Affiliate = {
  id: string;
  affiliate_code: string;
  company_name: string | null;
  website_url: string | null;
  commission_rate: number;
  cookie_days: number;
  total_clicks: number;
  total_conversions: number;
  total_earned: number;
  pending_balance: number;
  payout_minimum: number;
  is_active: boolean;
  notes: string | null;
  created_at: string;
  profile: { display_name: string | null; email: string } | null;
};

type FormState = {
  email: string;
  company_name: string;
  website_url: string;
  commission_rate: string;
  cookie_days: string;
  payout_minimum: string;
  notes: string;
};

const EMPTY_FORM: FormState = {
  email: "",
  company_name: "",
  website_url: "",
  commission_rate: "8",
  cookie_days: "30",
  payout_minimum: "50",
  notes: "",
};

export default function AffiliatesAdminClient({ affiliates: initial }: { affiliates: Affiliate[] }) {
  const [affiliates, setAffiliates] = useState<Affiliate[]>(initial);
  const [search, setSearch] = useState("");
  const [toggling, setToggling] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState<string | null>(null);

  // Create / edit modal
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState<Affiliate | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const filtered = affiliates.filter((a) => {
    const name = a.profile?.display_name ?? a.profile?.email ?? a.affiliate_code;
    return (
      name.toLowerCase().includes(search.toLowerCase()) ||
      a.affiliate_code.toLowerCase().includes(search.toLowerCase()) ||
      (a.company_name ?? "").toLowerCase().includes(search.toLowerCase())
    );
  });

  const totalClicks = affiliates.reduce((s, a) => s + a.total_clicks, 0);
  const totalConversions = affiliates.reduce((s, a) => s + a.total_conversions, 0);
  const totalEarned = affiliates.reduce((s, a) => s + a.total_earned, 0);
  const totalPending = affiliates.reduce((s, a) => s + a.pending_balance, 0);

  const openCreate = () => {
    setEditTarget(null);
    setForm(EMPTY_FORM);
    setFormError("");
    setShowModal(true);
  };

  const openEdit = (a: Affiliate) => {
    setEditTarget(a);
    setForm({
      email: a.profile?.email ?? "",
      company_name: a.company_name ?? "",
      website_url: a.website_url ?? "",
      commission_rate: String(Math.round(a.commission_rate * 100)),
      cookie_days: String(a.cookie_days),
      payout_minimum: String(a.payout_minimum),
      notes: a.notes ?? "",
    });
    setFormError("");
    setShowModal(true);
  };

  const saveAffiliate = async () => {
    setSaving(true);
    setFormError("");
    try {
      if (editTarget) {
        // Update existing
        const res = await fetch("/api/admin/table/affiliates", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: editTarget.id,
            company_name: form.company_name || null,
            website_url: form.website_url || null,
            commission_rate: parseFloat(form.commission_rate) / 100,
            cookie_days: parseInt(form.cookie_days),
            payout_minimum: parseFloat(form.payout_minimum),
            notes: form.notes || null,
          }),
        });
        if (!res.ok) { const j = await res.json(); setFormError(j.error ?? "Save failed."); return; }
        const updated = await res.json() as Affiliate;
        setAffiliates((prev) => prev.map((a) => a.id === updated.id ? { ...a, ...updated } : a));
      } else {
        // Create new — first find profile by email
        const res = await fetch("/api/admin/affiliates", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: form.email.trim(),
            company_name: form.company_name || null,
            website_url: form.website_url || null,
            commission_rate: parseFloat(form.commission_rate) / 100,
            cookie_days: parseInt(form.cookie_days),
            payout_minimum: parseFloat(form.payout_minimum),
            notes: form.notes || null,
          }),
        });
        if (!res.ok) { const j = await res.json(); setFormError(j.error ?? "Create failed."); return; }
        const created = await res.json() as Affiliate;
        setAffiliates((prev) => [created, ...prev]);
      }
      setShowModal(false);
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (affiliate: Affiliate) => {
    setToggling(affiliate.id);
    setError("");
    try {
      const res = await fetch("/api/admin/table/affiliates", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: affiliate.id, is_active: !affiliate.is_active }),
      });
      if (!res.ok) { const j = await res.json(); setError(j.error ?? "Failed"); return; }
      setAffiliates((prev) => prev.map((a) => a.id === affiliate.id ? { ...a, is_active: !a.is_active } : a));
    } finally {
      setToggling(null);
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/aff/${code}`);
    setCopied(code);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-1">Marketing</p>
          <h1 className="font-heading text-2xl font-semibold">Affiliates</h1>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4" /> Add affiliate
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total affiliates", value: affiliates.length, icon: Link2, color: "text-primary" },
          { label: "Total clicks", value: totalClicks.toLocaleString(), icon: MousePointer, color: "text-blue-400" },
          { label: "Conversions", value: totalConversions.toLocaleString(), icon: ShoppingBag, color: "text-amber-400" },
          { label: "Total earned", value: `$${totalEarned.toFixed(2)}`, icon: DollarSign, color: "text-green-400" },
        ].map((stat) => (
          <div key={stat.label} className="p-4 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-default)]">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-[var(--text-muted)]">{stat.label}</p>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </div>
            <p className={`font-heading text-xl font-bold ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      {totalPending > 0 && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-amber-400/10 border border-amber-400/20">
          <DollarSign className="h-4 w-4 text-amber-400 flex-shrink-0" />
          <p className="text-sm text-amber-400">
            <span className="font-bold">${totalPending.toFixed(2)}</span> pending affiliate payouts
          </p>
        </div>
      )}

      {error && (
        <div className="p-3 rounded-xl bg-red-400/10 border border-red-400/20 text-sm text-red-400">{error}</div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--text-muted)]" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, email or code..."
          className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-[var(--bg-card)] border border-[var(--border-default)] text-sm focus:outline-none focus:border-primary/50 transition-colors"
        />
      </div>

      {/* Table */}
      <div className="rounded-2xl bg-[var(--bg-card)] border border-[var(--border-default)] overflow-hidden">
        {filtered.length === 0 ? (
          <div className="text-center py-16">
            <TrendingUp className="h-10 w-10 text-[var(--text-muted)] mx-auto mb-3 opacity-40" />
            <p className="text-sm text-[var(--text-muted)]">
              {affiliates.length === 0 ? "No affiliates yet. Add your first one." : "No results found."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border-default)]">
                  <th className="text-left px-4 py-3 text-xs font-medium text-[var(--text-muted)]">Affiliate</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-[var(--text-muted)]">Link</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-[var(--text-muted)]">Commission</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-[var(--text-muted)] hidden sm:table-cell">Clicks</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-[var(--text-muted)] hidden sm:table-cell">Conv.</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-[var(--text-muted)]">Earned</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-[var(--text-muted)] hidden md:table-cell">Pending</th>
                  <th className="text-center px-4 py-3 text-xs font-medium text-[var(--text-muted)]">Status</th>
                  <th className="text-center px-4 py-3 text-xs font-medium text-[var(--text-muted)]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((affiliate) => (
                  <tr key={affiliate.id} className="border-b border-[var(--border-default)]/50 hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium">{affiliate.profile?.display_name ?? affiliate.company_name ?? "—"}</p>
                      <p className="text-xs text-[var(--text-muted)]">{affiliate.profile?.email}</p>
                      {affiliate.website_url && (
                        <a href={affiliate.website_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline flex items-center gap-0.5 mt-0.5">
                          <ExternalLink className="h-2.5 w-2.5" /> {affiliate.website_url.replace(/^https?:\/\//, "")}
                        </a>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-xs bg-[var(--bg-elevated)] px-2 py-1 rounded-md text-primary">
                          /aff/{affiliate.affiliate_code}
                        </span>
                        <button onClick={() => copyCode(affiliate.affiliate_code)} className="text-[var(--text-muted)] hover:text-primary transition-colors" title="Copy link">
                          {copied === affiliate.affiliate_code ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                      <p className="text-xs text-[var(--text-muted)] mt-0.5">{affiliate.cookie_days}d cookie</p>
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-primary">
                      {(affiliate.commission_rate * 100).toFixed(0)}%
                    </td>
                    <td className="px-4 py-3 text-right hidden sm:table-cell text-[var(--text-muted)]">
                      {affiliate.total_clicks.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right hidden sm:table-cell text-[var(--text-muted)]">
                      {affiliate.total_conversions.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-green-400">
                      ${affiliate.total_earned.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-right hidden md:table-cell text-amber-400">
                      {affiliate.pending_balance > 0 ? `$${affiliate.pending_balance.toFixed(2)}` : "—"}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => toggleActive(affiliate)}
                        disabled={toggling === affiliate.id}
                        className="transition-colors disabled:opacity-40"
                        title={affiliate.is_active ? "Deactivate" : "Activate"}
                      >
                        {affiliate.is_active
                          ? <ToggleRight className="h-6 w-6 text-primary" />
                          : <ToggleLeft className="h-6 w-6 text-[var(--text-muted)]" />}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button onClick={() => openEdit(affiliate)} className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-primary hover:bg-primary/10 transition-colors">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-[var(--bg-card)] border border-[var(--border-default)] p-6 space-y-5 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 className="font-heading font-semibold">{editTarget ? "Edit affiliate" : "Add affiliate"}</h2>
              <button onClick={() => setShowModal(false)} className="p-1 rounded hover:bg-white/5 transition-colors">
                <X className="h-4 w-4 text-[var(--text-muted)]" />
              </button>
            </div>

            <div className="space-y-4">
              {!editTarget && (
                <div>
                  <label className="block text-xs font-medium mb-1.5">User email <span className="text-red-400">*</span></label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                    placeholder="affiliate@example.com"
                    className="w-full px-3 py-2.5 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-default)] text-sm focus:outline-none focus:border-primary/50 transition-colors"
                  />
                  <p className="text-xs text-[var(--text-muted)] mt-1">The user must already have an account on the platform.</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1.5">Company name</label>
                  <input
                    type="text"
                    value={form.company_name}
                    onChange={(e) => setForm((p) => ({ ...p, company_name: e.target.value }))}
                    placeholder="Acme Inc."
                    className="w-full px-3 py-2.5 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-default)] text-sm focus:outline-none focus:border-primary/50 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5">Commission (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.5"
                    value={form.commission_rate}
                    onChange={(e) => setForm((p) => ({ ...p, commission_rate: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-default)] text-sm focus:outline-none focus:border-primary/50 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1.5">Website URL</label>
                <input
                  type="url"
                  value={form.website_url}
                  onChange={(e) => setForm((p) => ({ ...p, website_url: e.target.value }))}
                  placeholder="https://..."
                  className="w-full px-3 py-2.5 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-default)] text-sm focus:outline-none focus:border-primary/50 transition-colors"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1.5">Cookie duration (days)</label>
                  <input
                    type="number"
                    min="1"
                    max="365"
                    value={form.cookie_days}
                    onChange={(e) => setForm((p) => ({ ...p, cookie_days: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-default)] text-sm focus:outline-none focus:border-primary/50 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5">Min. payout ($)</label>
                  <input
                    type="number"
                    min="0"
                    step="5"
                    value={form.payout_minimum}
                    onChange={(e) => setForm((p) => ({ ...p, payout_minimum: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-default)] text-sm focus:outline-none focus:border-primary/50 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1.5">Internal notes</label>
                <textarea
                  rows={2}
                  value={form.notes}
                  onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                  placeholder="e.g. YouTube channel, agreed terms..."
                  className="w-full px-3 py-2.5 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-default)] text-sm resize-none focus:outline-none focus:border-primary/50 transition-colors"
                />
              </div>
            </div>

            {formError && (
              <p className="text-xs text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">{formError}</p>
            )}

            <div className="flex gap-2 pt-1">
              <button onClick={() => setShowModal(false)} className="flex-1 px-4 py-2.5 rounded-xl border border-[var(--border-default)] text-sm font-medium hover:bg-white/5 transition-colors">
                Cancel
              </button>
              <button
                onClick={saveAffiliate}
                disabled={saving || (!editTarget && !form.email.trim())}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary/90 disabled:opacity-40 transition-colors"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {editTarget ? "Save changes" : "Create affiliate"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
