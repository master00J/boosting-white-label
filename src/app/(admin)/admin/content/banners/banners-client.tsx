"use client";

import { useState } from "react";
import { Plus, ToggleLeft, ToggleRight, Trash2, Loader2, X, Pencil } from "lucide-react";
import Image from "next/image";
import { ImageUpload } from "@/components/ui/image-upload";

type Banner = {
  id: string;
  title: string;
  message: string;
  cta_text: string | null;
  cta_url: string | null;
  bg_color: string;
  image_url: string | null;
  is_active: boolean;
  starts_at: string | null;
  ends_at: string | null;
};

type FormState = {
  title: string;
  message: string;
  cta_text: string;
  cta_url: string;
  bg_color: string;
  image_url: string;
  starts_at: string;
  ends_at: string;
};

const PRESET_COLORS = ["#6366f1", "#f59e0b", "#22c55e", "#ef4444", "#3b82f6", "#8b5cf6"];
const EMPTY_FORM: FormState = { title: "", message: "", cta_text: "", cta_url: "", bg_color: "#6366f1", image_url: "", starts_at: "", ends_at: "" };

function toLocalDatetime(iso: string | null) {
  if (!iso) return "";
  return iso.slice(0, 16);
}

function BannerForm({
  initial,
  onSave,
  onCancel,
  saving,
  title,
}: {
  initial: FormState;
  onSave: (form: FormState) => void;
  onCancel: () => void;
  saving: boolean;
  title: string;
}) {
  const [form, setForm] = useState<FormState>(initial);
  const set = (patch: Partial<FormState>) => setForm((p) => ({ ...p, ...patch }));

  return (
    <div className="p-5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-default)]">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-heading font-semibold text-sm">{title}</h2>
        <button type="button" onClick={onCancel}><X className="h-4 w-4 text-[var(--text-muted)]" /></button>
      </div>
      <form onSubmit={(e) => { e.preventDefault(); onSave(form); }} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium mb-1">Title</label>
            <input required value={form.title} onChange={(e) => set({ title: e.target.value })} placeholder="Summer sale!" className="w-full px-3 py-2 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-default)] text-sm focus:outline-none focus:border-primary/50" />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Color</label>
            <div className="flex gap-2 items-center flex-wrap">
              {PRESET_COLORS.map((c) => (
                <button key={c} type="button" onClick={() => set({ bg_color: c })} className={`w-7 h-7 rounded-full border-2 transition-all ${form.bg_color === c ? "border-white scale-110" : "border-transparent"}`} style={{ backgroundColor: c }} />
              ))}
              <input type="color" value={form.bg_color} onChange={(e) => set({ bg_color: e.target.value })} className="w-7 h-7 rounded cursor-pointer border-0 bg-transparent p-0" title="Custom color" />
            </div>
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium mb-1">Message</label>
          <input required value={form.message} onChange={(e) => set({ message: e.target.value })} placeholder="20% off all orders this weekend!" className="w-full px-3 py-2 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-default)] text-sm focus:outline-none focus:border-primary/50" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium mb-1">CTA text</label>
            <input value={form.cta_text} onChange={(e) => set({ cta_text: e.target.value })} placeholder="View offer" className="w-full px-3 py-2 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-default)] text-sm focus:outline-none focus:border-primary/50" />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">CTA URL</label>
            <input value={form.cta_url} onChange={(e) => set({ cta_url: e.target.value })} placeholder="/games" className="w-full px-3 py-2 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-default)] text-sm focus:outline-none focus:border-primary/50" />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Start date</label>
            <input type="datetime-local" value={form.starts_at} onChange={(e) => set({ starts_at: e.target.value })} className="w-full px-3 py-2 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-default)] text-sm focus:outline-none focus:border-primary/50" />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">End date</label>
            <input type="datetime-local" value={form.ends_at} onChange={(e) => set({ ends_at: e.target.value })} className="w-full px-3 py-2 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-default)] text-sm focus:outline-none focus:border-primary/50" />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium mb-1">
            Banner image <span className="text-[var(--text-muted)] font-normal">(optional)</span>
          </label>
          <ImageUpload
            value={form.image_url}
            onChange={(url) => set({ image_url: url })}
            bucket="game-assets"
            folder="banners"
            label="Upload banner image"
            aspectRatio="banner"
          />
        </div>
        {/* Preview */}
        <div className="rounded-xl overflow-hidden text-white text-sm font-medium relative" style={{ backgroundColor: form.bg_color, minHeight: "48px" }}>
          {form.image_url && (
            <Image src={form.image_url} alt="Banner preview" fill className="object-cover opacity-50" unoptimized />
          )}
          <div className="relative z-10 p-3">
            {form.title && <span className="font-bold">{form.title}: </span>}
            {form.message || "Preview banner text"}
            {form.cta_text && <span className="ml-2 underline cursor-pointer">{form.cta_text} →</span>}
          </div>
        </div>
        <div className="flex justify-end gap-3">
          <button type="button" onClick={onCancel} className="px-4 py-2 rounded-lg border border-[var(--border-default)] text-sm">Cancel</button>
          <button type="submit" disabled={saving} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium disabled:opacity-40">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />} Save
          </button>
        </div>
      </form>
    </div>
  );
}

export default function BannersClient({ banners: initial }: { banners: Banner[] }) {
  const [banners, setBanners] = useState<Banner[]>(initial);
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const create = async (form: FormState) => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/table/promo_banners", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          message: form.message,
          cta_text: form.cta_text || null,
          cta_url: form.cta_url || null,
          bg_color: form.bg_color,
          image_url: form.image_url || null,
          starts_at: form.starts_at || null,
          ends_at: form.ends_at || null,
          is_active: true,
        }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error); return; }
      setBanners((p) => [json as Banner, ...p]);
      setShowCreate(false);
    } finally {
      setSaving(false);
    }
  };

  const update = async (id: string, form: FormState) => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/table/promo_banners", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          title: form.title,
          message: form.message,
          cta_text: form.cta_text || null,
          cta_url: form.cta_url || null,
          bg_color: form.bg_color,
          image_url: form.image_url || null,
          starts_at: form.starts_at || null,
          ends_at: form.ends_at || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error); return; }
      setBanners((p) => p.map((b) => b.id === id ? { ...b, ...json as Banner } : b));
      setEditingId(null);
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (id: string, current: boolean) => {
    const res = await fetch("/api/admin/table/promo_banners", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, is_active: !current }),
    });
    if (res.ok) setBanners((p) => p.map((b) => b.id === id ? { ...b, is_active: !current } : b));
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this banner?")) return;
    const res = await fetch("/api/admin/table/promo_banners", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (res.ok) setBanners((p) => p.filter((b) => b.id !== id));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-1">Content</p>
          <h1 className="font-heading text-2xl font-semibold">Promo banners</h1>
        </div>
        <button onClick={() => { setShowCreate(true); setEditingId(null); }} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors">
          <Plus className="h-4 w-4" /> New banner
        </button>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive">{error}</div>
      )}

      {showCreate && (
        <BannerForm
          title="New banner"
          initial={EMPTY_FORM}
          onSave={create}
          onCancel={() => setShowCreate(false)}
          saving={saving}
        />
      )}

      <div className="space-y-3">
        {banners.length === 0 ? (
          <div className="text-center py-12 text-[var(--text-muted)] text-sm">No banners created yet.</div>
        ) : banners.map((banner) => (
          <div key={banner.id} className="space-y-0">
            {editingId === banner.id ? (
              <BannerForm
                title={`Edit: ${banner.title}`}
                initial={{
                  title: banner.title,
                  message: banner.message,
                  cta_text: banner.cta_text ?? "",
                  cta_url: banner.cta_url ?? "",
                  bg_color: banner.bg_color,
                  image_url: banner.image_url ?? "",
                  starts_at: toLocalDatetime(banner.starts_at),
                  ends_at: toLocalDatetime(banner.ends_at),
                }}
                onSave={(form) => update(banner.id, form)}
                onCancel={() => setEditingId(null)}
                saving={saving}
              />
            ) : (
              <div className="p-4 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-default)] flex items-center gap-4">
                <div className="w-16 h-10 rounded-lg flex-shrink-0 overflow-hidden relative" style={{ backgroundColor: banner.bg_color }}>
                  {banner.image_url && (
                    <Image src={banner.image_url} alt={banner.title} fill className="object-cover" unoptimized />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold">{banner.title}</p>
                  <p className="text-xs text-[var(--text-muted)] truncate">{banner.message}</p>
                  {(banner.starts_at || banner.ends_at) && (
                    <p className="text-xs text-[var(--text-muted)] mt-0.5">
                      {banner.starts_at ? new Date(banner.starts_at).toLocaleDateString("en-GB") : "—"} → {banner.ends_at ? new Date(banner.ends_at).toLocaleDateString("en-GB") : "—"}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${banner.is_active ? "bg-green-400/10 text-green-400" : "bg-zinc-400/10 text-zinc-400"}`}>
                    {banner.is_active ? "Active" : "Inactive"}
                  </span>
                  <button onClick={() => setEditingId(banner.id)} className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-white/[0.06] transition-colors" title="Edit">
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => toggle(banner.id, banner.is_active)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
                    {banner.is_active ? <ToggleRight className="h-5 w-5 text-green-400" /> : <ToggleLeft className="h-5 w-5" />}
                  </button>
                  <button onClick={() => remove(banner.id)} className="text-[var(--text-muted)] hover:text-red-400 transition-colors">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
