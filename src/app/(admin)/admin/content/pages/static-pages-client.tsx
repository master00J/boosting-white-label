"use client";

import { useState } from "react";
import { Save, Loader2, FileText, Check } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Page = { id: string; slug: string; title: string; content: string; is_published: boolean; updated_at: string };
type DefaultPage = { slug: string; title: string; content: string; is_published: boolean };

export default function StaticPagesClient({ pages: initial, defaults }: { pages: Page[]; defaults: DefaultPage[] }) {
  const [pages, setPages] = useState<Page[]>(initial);
  const [selected, setSelected] = useState<Page | null>(pages[0] ?? null);
  const [content, setContent] = useState(pages[0]?.content ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const supabase = createClient();

  const selectPage = (page: Page) => {
    setSelected(page);
    setContent(page.content);
    setSaved(false);
  };

  const save = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      const { data } = await supabase.from("static_pages").upsert({ id: selected.id, slug: selected.slug, title: selected.title, content, is_published: selected.is_published, updated_at: new Date().toISOString() } as never, { onConflict: "slug" }).select("*").single() as unknown as { data: Page | null };
      if (data) {
        setPages((p) => p.map((pg) => pg.id === selected.id ? data : pg));
        setSelected(data);
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  const createDefault = async (def: DefaultPage) => {
    const { data } = await supabase.from("static_pages").insert(def as never).select("*").single() as unknown as { data: Page | null };
    if (data) {
      setPages((p) => [...p, data]);
      selectPage(data);
    }
  };

  const missingDefaults = defaults.filter((d) => !pages.find((p) => p.slug === d.slug));

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-1">Content</p>
        <h1 className="font-heading text-2xl font-semibold">Static pages</h1>
      </div>

      {missingDefaults.length > 0 && (
        <div className="p-4 rounded-xl bg-amber-400/10 border border-amber-400/20">
          <p className="text-sm font-medium text-amber-400 mb-2">Missing default pages:</p>
          <div className="flex gap-2">
            {missingDefaults.map((d) => (
              <button key={d.slug} onClick={() => createDefault(d)} className="px-3 py-1.5 rounded-lg bg-amber-400/20 text-amber-400 text-xs font-medium hover:bg-amber-400/30 transition-colors">
                + {d.title}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-[200px_1fr] gap-4">
        {/* Page list */}
        <div className="space-y-1">
          {pages.map((page) => (
            <button key={page.id} onClick={() => selectPage(page)} className={`w-full text-left px-3 py-2.5 rounded-xl text-sm transition-all ${selected?.id === page.id ? "bg-primary/10 text-primary font-medium" : "text-[var(--text-secondary)] hover:bg-white/5"}`}>
              <div className="flex items-center gap-2">
                <FileText className="h-3.5 w-3.5 flex-shrink-0" />
                <span className="truncate">{page.title}</span>
              </div>
            </button>
          ))}
        </div>

        {/* Editor */}
        {selected ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-heading font-semibold">{selected.title}</h2>
              <button onClick={save} disabled={saving} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 disabled:opacity-40 transition-colors">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : saved ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
                {saved ? "Saved!" : "Save"}
              </button>
            </div>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={20}
              className="w-full px-4 py-3 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-default)] text-sm font-mono focus:outline-none focus:border-primary/50 transition-colors resize-none"
              placeholder="Markdown content..."
            />
            <p className="text-xs text-[var(--text-muted)]">Markdown supported. Page available at: /{selected.slug}</p>
          </div>
        ) : (
          <div className="text-center py-12 text-[var(--text-muted)] text-sm">Select a page</div>
        )}
      </div>
    </div>
  );
}
