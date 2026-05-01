"use client";

import { useState } from "react";
import { Plus, Tag, ToggleLeft, ToggleRight, Loader2, X, AlertCircle } from "lucide-react";

type Coupon = {
  id: string;
  code: string;
  discount_type: string;
  discount_value: number;
  min_order_amount: number | null;
  max_uses: number | null;
  used_count: number;
  is_active: boolean;
  expires_at: string | null;
  created_at: string;
};

export default function CouponsClient({ coupons: initial }: { coupons: Coupon[] }) {
  const [coupons, setCoupons] = useState<Coupon[]>(initial);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toggling, setToggling] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    code: "",
    discount_type: "percentage",
    discount_value: "",
    min_order_amount: "",
    max_uses: "",
    expires_at: "",
  });

  const createCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/admin/coupons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: form.code.toUpperCase(),
          discount_type: form.discount_type,
          discount_value: parseFloat(form.discount_value),
          min_order_amount: form.min_order_amount ? parseFloat(form.min_order_amount) : null,
          max_uses: form.max_uses ? parseInt(form.max_uses) : null,
          expires_at: form.expires_at || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error");
      setCoupons((p) => [data.coupon, ...p]);
      setShowForm(false);
      setForm({ code: "", discount_type: "percentage", discount_value: "", min_order_amount: "", max_uses: "", expires_at: "" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (id: string, current: boolean) => {
    setToggling(id);
    try {
      await fetch(`/api/admin/coupons/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !current }),
      });
      setCoupons((p) => p.map((c) => c.id === id ? { ...c, is_active: !current } : c));
    } finally {
      setToggling(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-1">Marketing</p>
          <h1 className="font-heading text-2xl font-semibold">Coupons</h1>
        </div>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors">
          <Plus className="h-4 w-4" /> New coupon
        </button>
      </div>

      {showForm && (
        <div className="p-5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-default)]">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-heading font-semibold text-sm">New coupon</h2>
            <button onClick={() => setShowForm(false)}><X className="h-4 w-4 text-[var(--text-muted)]" /></button>
          </div>
          <form onSubmit={createCoupon} className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium mb-1.5">Code</label>
              <input required value={form.code} onChange={(e) => setForm((p) => ({ ...p, code: e.target.value }))} placeholder="ZOMER20" className="w-full px-3 py-2 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-default)] text-sm font-mono uppercase focus:outline-none focus:border-primary/50 transition-colors" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5">Type</label>
              <select value={form.discount_type} onChange={(e) => setForm((p) => ({ ...p, discount_type: e.target.value }))} className="w-full px-3 py-2 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-default)] text-sm focus:outline-none focus:border-primary/50 transition-colors">
                <option value="percentage">Percentage (%)</option>
                <option value="fixed">Fixed amount (\$)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5">Discount {form.discount_type === "percentage" ? "(%)" : "(\$)"}</label>
              <input required type="number" min="0" step="0.01" value={form.discount_value} onChange={(e) => setForm((p) => ({ ...p, discount_value: e.target.value }))} className="w-full px-3 py-2 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-default)] text-sm focus:outline-none focus:border-primary/50 transition-colors" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5">Min. order amount (\$)</label>
              <input type="number" min="0" step="0.01" value={form.min_order_amount} onChange={(e) => setForm((p) => ({ ...p, min_order_amount: e.target.value }))} placeholder="Optioneel" className="w-full px-3 py-2 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-default)] text-sm focus:outline-none focus:border-primary/50 transition-colors" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5">Max. uses</label>
              <input type="number" min="1" value={form.max_uses} onChange={(e) => setForm((p) => ({ ...p, max_uses: e.target.value }))} placeholder="Unlimited" className="w-full px-3 py-2 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-default)] text-sm focus:outline-none focus:border-primary/50 transition-colors" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5">Expiry date</label>
              <input type="date" value={form.expires_at} onChange={(e) => setForm((p) => ({ ...p, expires_at: e.target.value }))} className="w-full px-3 py-2 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-default)] text-sm focus:outline-none focus:border-primary/50 transition-colors" />
            </div>
            {error && <div className="col-span-2 flex items-center gap-2 text-sm text-red-400"><AlertCircle className="h-4 w-4" />{error}</div>}
            <div className="col-span-2 flex justify-end gap-3">
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg border border-[var(--border-default)] text-sm">Cancel</button>
              <button type="submit" disabled={saving} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium disabled:opacity-40">
                {saving && <Loader2 className="h-4 w-4 animate-spin" />} Create
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="space-y-3">
        {coupons.length === 0 ? (
          <div className="text-center py-12 text-[var(--text-muted)]"><Tag className="h-8 w-8 mx-auto mb-2 opacity-30" /><p className="text-sm">None coupons</p></div>
        ) : coupons.map((coupon) => (
          <div key={coupon.id} className="p-4 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-default)] flex items-center gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <code className="text-sm font-mono font-bold text-primary">{coupon.code}</code>
                <span className={`text-xs px-2 py-0.5 rounded-full ${coupon.is_active ? "bg-green-400/10 text-green-400" : "bg-zinc-400/10 text-zinc-400"}`}>
                  {coupon.is_active ? "Active" : "Inactive"}
                </span>
              </div>
              <p className="text-sm text-[var(--text-secondary)]">
                {coupon.discount_type === "percentage" ? `${coupon.discount_value}% off` : `\$${coupon.discount_value} off`}
                {coupon.min_order_amount ? ` · min. \$${coupon.min_order_amount}` : ""}
              </p>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                {coupon.used_count} used{coupon.max_uses ? ` / ${coupon.max_uses}` : ""}
                {coupon.expires_at ? ` · expires ${new Date(coupon.expires_at).toLocaleDateString("en-GB")}` : ""}
              </p>
            </div>
            <button onClick={() => toggleActive(coupon.id, coupon.is_active)} disabled={toggling === coupon.id} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
              {toggling === coupon.id ? <Loader2 className="h-5 w-5 animate-spin" /> : coupon.is_active ? <ToggleRight className="h-5 w-5 text-green-400" /> : <ToggleLeft className="h-5 w-5" />}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
