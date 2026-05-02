"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, Trash2, GripVertical, Pencil, Download, Library } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import PageHeader from "@/components/shared/page-header";
import { slugify } from "@/lib/utils/slugify";
import { OSRS_SKILLS } from "@/lib/osrs-skills";
import { isOsrsCatalogGameSlug } from "@/lib/osrs-catalog-slugs";
import { cn } from "@/lib/utils/cn";

interface Game { id: string; name: string; slug: string }

export interface GameSkill {
  id: string;
  game_id: string;
  name: string;
  icon: string | null;
  slug: string;
  sort_order: number;
}

export interface GameMethod {
  id: string;
  game_id: string;
  name: string;
  description: string | null;
  multiplier: number;
  sort_order: number;
}

// ─── OSRS Icon Picker ─────────────────────────────────────────────────────────

function OsrsIconPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const isUrl = value?.startsWith("http");
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-10 h-9 rounded-md border border-input bg-background flex items-center justify-center hover:bg-muted transition-colors"
        title="Pick skill icon"
      >
        {isUrl
          ? <Image src={value} alt="" width={20} height={20} className="object-contain" unoptimized />
          : <span className="text-base">{value || "?"}</span>
        }
      </button>
      {open && (
        <div className="absolute top-10 left-0 z-30 bg-background border border-border rounded-xl p-2 shadow-2xl" style={{ width: 208 }}>
          <div className="grid grid-cols-6 gap-1">
            {OSRS_SKILLS.map((s) => (
              <button
                key={s.id}
                type="button"
                title={s.label}
                onClick={() => { onChange(s.icon); setOpen(false); }}
                className={cn(
                  "p-1 rounded hover:bg-muted transition-colors",
                  value === s.icon && "bg-primary/20 ring-1 ring-primary"
                )}
              >
                <Image src={s.icon} alt={s.label} width={22} height={22} className="object-contain" unoptimized />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Skill Form ───────────────────────────────────────────────────────────────

function SkillForm({
  initial,
  onSave,
  onCancel,
}: {
  initial?: Partial<GameSkill>;
  onSave: (data: { name: string; icon: string; slug: string }) => Promise<void>;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const defaultIcon =
    OSRS_SKILLS.find((s) => s.id === initial?.slug)?.icon ??
    (initial?.icon?.startsWith("http") ? initial.icon : null) ??
    OSRS_SKILLS[0].icon;
  const [icon, setIcon] = useState(defaultIcon);
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [saving, setSaving] = useState(false);

  const handleNameChange = (v: string) => {
    setName(v);
    if (!initial?.slug) {
      const sl = slugify(v);
      setSlug(sl);
      // Auto-match OSRS icon when skill name is recognised
      const match = OSRS_SKILLS.find(
        (s) => s.id === sl || s.label.toLowerCase() === v.toLowerCase()
      );
      if (match) setIcon(match.icon);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await onSave({ name, icon, slug });
    setSaving(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="grid grid-cols-[auto_1fr] sm:grid-cols-[auto_1fr_1fr] gap-3 items-start sm:items-end">
        <div className="space-y-1.5">
          <Label className="text-xs">Icon</Label>
          <OsrsIconPicker value={icon} onChange={setIcon} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Name</Label>
          <Input
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            placeholder="e.g. Fishing"
            required
            className="h-9"
          />
        </div>
        <div className="space-y-1.5 col-span-2 sm:col-span-1">
          <Label className="text-xs">Slug</Label>
          <Input
            value={slug}
            onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/\s+/g, "-"))}
            placeholder="fishing"
            required
            className="h-9 font-mono"
          />
        </div>
      </div>
      <div className="flex gap-2 justify-end">
        <Button type="button" variant="outline" size="sm" onClick={onCancel} disabled={saving}>Cancel</Button>
        <Button type="submit" size="sm" disabled={saving}>{saving ? "Saving..." : "Save skill"}</Button>
      </div>
    </form>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function SetupClient({
  game,
  initialSkills,
}: {
  game: Game;
  initialSkills: GameSkill[];
}) {
  const router = useRouter();
  const [skills, setSkills] = useState<GameSkill[]>(initialSkills);
  const [showSkillForm, setShowSkillForm] = useState(false);
  const [editingSkillId, setEditingSkillId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fetchingQuestItems, setFetchingQuestItems] = useState(false);
  const [preloadingCatalog, setPreloadingCatalog] = useState(false);
  const isOsrs = isOsrsCatalogGameSlug(game.slug ?? "");

  // ── Skills CRUD ──

  const createSkill = async (data: { name: string; icon: string; slug: string }) => {
    setError(null);
    const res = await fetch("/api/admin/table/game_skills", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...data, game_id: game.id, sort_order: skills.length }),
    });
    const json = await res.json();
    if (!res.ok) { setError(json.error); return; }
    setSkills((prev) => [...prev, json as GameSkill]);
    setShowSkillForm(false);
  };

  const updateSkill = async (id: string, data: { name: string; icon: string; slug: string }) => {
    setError(null);
    const res = await fetch("/api/admin/table/game_skills", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...data }),
    });
    const json = await res.json();
    if (!res.ok) { setError(json.error); return; }
    setSkills((prev) => prev.map((s) => s.id === id ? json as GameSkill : s));
    setEditingSkillId(null);
  };

  const deleteSkill = async (id: string) => {
    if (!confirm("Delete this skill? This will affect services that use it.")) return;
    const res = await fetch("/api/admin/table/game_skills", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (!res.ok) { const json = await res.json(); setError(json.error); return; }
    setSkills((prev) => prev.filter((s) => s.id !== id));
  };

  const fetchQuestItems = async () => {
    setFetchingQuestItems(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/fetch-quest-items", { method: "POST" });
      const json = await res.json();
      if (!res.ok) { setError(json.error ?? "Fetch failed"); return; }
      alert(`Fetched ${json.fetched} quests, ${json.items} items. Skipped: ${json.skipped}, Errors: ${json.errors}`);
    } catch {
      setError("Request failed");
    } finally {
      setFetchingQuestItems(false);
    }
  };

  const preloadOsrsCatalog = async () => {
    setPreloadingCatalog(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/games/${game.id}/preload-osrs-catalog`, { method: "POST" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof json.error === "string" ? json.error : "Preload failed");
        return;
      }
      const s = json.summary as {
        skillsInserted?: number;
        questsInserted?: number;
        bossProfilesInserted?: number;
        skillingRowsCopied?: number;
        bossIconsSynced?: number;
        methodsInserted?: number;
      } | undefined;
      if (s) {
        alert(
          `Catalog updated.\nSkills: ${s.skillsInserted ?? 0}\nTraining methods: ${s.methodsInserted ?? 0}\nQuests: ${s.questsInserted ?? 0}\nBoss profiles (global, new): ${s.bossProfilesInserted ?? 0}\nBoss icons synced (wiki): ${s.bossIconsSynced ?? 0}\nGP/XP rows copied: ${s.skillingRowsCopied ?? 0}`
        );
      }
      router.refresh();
    } catch {
      setError("Preload request failed");
    } finally {
      setPreloadingCatalog(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/admin/games" className="hover:text-foreground transition-colors flex items-center gap-1">
          <ArrowLeft className="h-3.5 w-3.5" />
          Games
        </Link>
        <span>/</span>
        <span className="text-foreground">{game.name}</span>
        <span>/</span>
        <span className="text-foreground">Skills</span>
      </div>

      <PageHeader
        title={`Setup — ${game.name}`}
        description="Manage skills available for this game's services"
        action={
          !showSkillForm && (
            <Button size="sm" onClick={() => setShowSkillForm(true)}>
              <Plus className="h-4 w-4 mr-1.5" /> Add skill
            </Button>
          )
        }
      />

      {error && (
        <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive">
          {error}
        </div>
      )}

      {showSkillForm && (
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm font-medium mb-3">New skill</p>
            <SkillForm onSave={createSkill} onCancel={() => setShowSkillForm(false)} />
          </CardContent>
        </Card>
      )}

      {isOsrs && (
        <Card className="border-primary/25 bg-primary/[0.04]">
          <CardContent className="pt-4 space-y-3">
            <div>
              <p className="text-sm font-medium mb-1">Pre-load OSRS catalog</p>
              <p className="text-xs text-muted-foreground mb-3">
                Skills (all OSRS skills), quests, global boss/minigame profiles, standard training methods, and GP/XP rows when applicable. Safe to run again (upserts).
              </p>
              <Button
                size="sm"
                onClick={preloadOsrsCatalog}
                disabled={preloadingCatalog}
              >
                <Library className="h-4 w-4 mr-1.5" />
                {preloadingCatalog ? "Loading…" : "Load / refresh OSRS catalog"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          {skills.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground space-y-2 px-4">
              <p>No skills in the database for this game yet.</p>
              {isOsrs ? (
                <p>
                  Use <strong className="text-foreground">Load / refresh OSRS catalog</strong> above to import all skills at once, or add skills manually with <strong className="text-foreground">Add skill</strong>.
                </p>
              ) : (
                <p>
                  Game slug must be <code className="text-xs bg-muted px-1 rounded">oldschool-runescape</code> or{" "}
                  <code className="text-xs bg-muted px-1 rounded">osrs</code> for automatic OSRS catalog preload. You can still add skills manually.
                </p>
              )}
            </div>
          ) : (
            <div className="divide-y divide-border">
              {skills.map((skill) => (
                <div key={skill.id}>
                  {editingSkillId === skill.id ? (
                    <div className="p-4">
                      <SkillForm
                        initial={skill}
                        onSave={(data) => updateSkill(skill.id, data)}
                        onCancel={() => setEditingSkillId(null)}
                      />
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 px-4 py-3 hover:bg-white/[0.02] transition-colors">
                      <GripVertical className="h-4 w-4 text-muted-foreground/30 cursor-grab flex-shrink-0" />
                      {(() => {
                        const iconUrl = skill.icon?.startsWith("http")
                          ? skill.icon
                          : OSRS_SKILLS.find((s) => s.id === skill.slug)?.icon ?? null;
                        return iconUrl ? (
                          <Image src={iconUrl} alt={skill.name} width={24} height={24} className="object-contain flex-shrink-0 w-8" unoptimized />
                        ) : (
                          <span className="text-xl w-8 text-center flex-shrink-0">{skill.icon ?? "⚔️"}</span>
                        );
                      })()}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{skill.name}</p>
                        <p className="text-xs text-muted-foreground font-mono">{skill.slug}</p>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          onClick={() => setEditingSkillId(skill.id)}
                          className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => deleteSkill(skill.id)}
                          className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {isOsrs && (
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm font-medium mb-1">Quest required items</p>
            <p className="text-xs text-muted-foreground mb-3">
              Fetch item requirements for all OSRS quests from the wiki. Used for the Bank tab on loadouts to show which quest items you have.
            </p>
            <Button
              size="sm"
              variant="outline"
              onClick={fetchQuestItems}
              disabled={fetchingQuestItems}
            >
              <Download className="h-4 w-4 mr-1.5" />
              {fetchingQuestItems ? "Fetching..." : "Fetch quest items from Wiki"}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
