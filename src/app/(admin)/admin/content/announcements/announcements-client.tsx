"use client";

import { useState } from "react";
import { Plus, ToggleLeft, ToggleRight, Trash2, Loader2, X, Megaphone } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Announcement = { id: string; title: string; content: string; type: string; is_active: boolean; created_at: string };

const TYPE_CONFIG: Record<string, { label: string; color: string }> = {
  info: { label: "Info", color: "text-blue-400 bg-blue-400/10" },
  warning: { label: "Warning", color: "text-amber-400 bg-amber-400/10" },
  success: { label: "Success", color: "text-green-400 bg-green-400/10" },
  maintenance: { label: "Maintenance", color: "text-orange-400 bg-orange-400/10" },
};

export default function AnnouncementsClient({ announcements: initial }: { announcements: Announcement[] }) {
  const [announcements, setAnnouncements] = useState<Announcement[]>(initial);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: "", content: "", type: "info" });
  const supabase = createClient();

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { data } = await supabase.from("announcements").insert({ ...form, is_active: true } as never).select("*").single() as unknown as { data: Announcement | null };
      if (data) setAnnouncements((p) => [data, ...p]);
      setShowForm(false);
      setForm({ title: "", content: "", type: "info" });
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (id: string, current: boolean) => {
    await supabase.from("announcements").update({ is_active: !current } as never).eq("id", id);
    setAnnouncements((p) => p.map((a) => a.id === id ? { ...a, is_active: !current } : a));
  };

  const remove = async (id: string) => {
    await supabase.from("announcements").delete().eq("id", id);
    setAnnouncements((p) => p.filter((a) => a.id !== id));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-1">Content</p>
          <h1 className="font-heading text-2xl font-semibold">Announcements</h1>
        </div>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors">
          <Plus className="h-4 w-4" /> New announcement
        </button>
      </div>

      {showForm && (
        <div className="p-5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-default)]">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-heading font-semibold text-sm">New announcement</h2>
            <button onClick={() => setShowForm(false)}><X className="h-4 w-4 text-[var(--text-muted)]" /></button>
          </div>
          <form onSubmit={create} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium mb-1">Title</label>
                <input required value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} placeholder="Planned maintenance" className="w-full px-3 py-2 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-default)] text-sm focus:outline-none focus:border-primary/50" />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Type</label>
                <select value={form.type} onChange={(e) => setForm((p) => ({ ...p, type: e.target.value }))} className="w-full px-3 py-2 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-default)] text-sm focus:outline-none focus:border-primary/50">
                  {Object.entries(TYPE_CONFIG).map(([v, { label }]) => <option key={v} value={v}>{label}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Content</label>
              <textarea required rows={3} value={form.content} onChange={(e) => setForm((p) => ({ ...p, content: e.target.value }))} placeholder="Tonight from 22:00-23:00 the site will be under maintenance." className="w-full px-3 py-2 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-default)] text-sm focus:outline-none focus:border-primary/50 resize-none" />
            </div>
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg border border-[var(--border-default)] text-sm">Cancel</button>
              <button type="submit" disabled={saving} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium disabled:opacity-40">
                {saving && <Loader2 className="h-4 w-4 animate-spin" />} Create
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="space-y-3">
        {announcements.length === 0 ? (
          <div className="text-center py-12 text-[var(--text-muted)]"><Megaphone className="h-8 w-8 mx-auto mb-2 opacity-30" /><p className="text-sm">No announcements</p></div>
        ) : announcements.map((a) => {
          const cfg = TYPE_CONFIG[a.type] ?? TYPE_CONFIG.info;
          return (
            <div key={a.id} className="p-4 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-default)] flex items-start gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-sm font-semibold">{a.title}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${cfg.color}`}>{cfg.label}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${a.is_active ? "bg-green-400/10 text-green-400" : "bg-zinc-400/10 text-zinc-400"}`}>{a.is_active ? "Active" : "Inactive"}</span>
                </div>
                <p className="text-xs text-[var(--text-muted)]">{a.content}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button onClick={() => toggle(a.id, a.is_active)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
                  {a.is_active ? <ToggleRight className="h-5 w-5 text-green-400" /> : <ToggleLeft className="h-5 w-5" />}
                </button>
                <button onClick={() => remove(a.id)} className="text-[var(--text-muted)] hover:text-red-400 transition-colors">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
