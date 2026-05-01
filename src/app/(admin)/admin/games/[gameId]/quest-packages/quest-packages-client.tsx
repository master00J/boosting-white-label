"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Plus,
  Pencil,
  Trash2,
  Package,
  Loader2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { slugify } from "@/lib/utils/slugify";
import type { Database } from "@/types/database";

type Game = Pick<Database["public"]["Tables"]["games"]["Row"], "id" | "name" | "slug">;

type PackageRow = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  base_price: number;
  sort_order: number;
  is_active: boolean;
  quest_ids: string[];
};

type QuestOption = { id: string; name: string; slug: string };

export default function QuestPackagesClient({ game }: { game: Game }) {
  const [packages, setPackages] = useState<PackageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState<"create" | "edit" | null>(null);
  const [editingPackage, setEditingPackage] = useState<PackageRow | null>(null);

  const fetchPackages = useCallback(() => {
    setLoading(true);
    setError(null);
    fetch(`/api/admin/games/${game.id}/quest-packages`)
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load packages");
        return r.json();
      })
      .then((data: PackageRow[]) => setPackages(Array.isArray(data) ? data : []))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [game.id]);

  useEffect(() => {
    fetchPackages();
  }, [fetchPackages]);

  const openCreate = () => {
    setEditingPackage(null);
    setModalOpen("create");
  };
  const openEdit = (pkg: PackageRow) => {
    setEditingPackage(pkg);
    setModalOpen("edit");
  };
  const closeModal = () => {
    setModalOpen(null);
    setEditingPackage(null);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this quest package? This cannot be undone.")) return;
    const res = await fetch(`/api/admin/quest-packages/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Delete failed");
      return;
    }
    setError(null);
    fetchPackages();
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <nav className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
        <Link
          href="/admin/games"
          className="hover:text-[var(--text-primary)] transition-colors flex items-center gap-1"
        >
          <ArrowLeft className="h-3 w-3" />
          Games
        </Link>
        <span className="text-white/20">/</span>
        <Link
          href={`/admin/games/${game.id}/services`}
          className="hover:text-[var(--text-primary)] transition-colors"
        >
          {game.name}
        </Link>
        <span className="text-white/20">/</span>
        <span className="text-[var(--text-secondary)]">Quest packages</span>
      </nav>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[var(--text-primary)]">Quest packages</h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Bundle multiple quests into one package with a fixed price. Use these in quest services (Quest + Stats pricing).
          </p>
          <p className="text-xs text-[var(--text-muted)] mt-2">
            {packages.length} package{packages.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Button onClick={openCreate} className="shrink-0 flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Add package
        </Button>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-400 flex items-center justify-between gap-2">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-red-400/60 hover:text-red-400">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-[var(--text-muted)] py-8">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading packages…
        </div>
      ) : packages.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] py-12 flex flex-col items-center gap-4 text-center">
          <Package className="h-10 w-10 text-white/20" />
          <p className="text-sm text-[var(--text-muted)]">No quest packages yet</p>
          <p className="text-xs text-[var(--text-muted)] max-w-sm">
            Create a package to offer multiple quests as one bundle (e.g. &quot;Starter pack&quot;, &quot;Quest cape bundle&quot;).
          </p>
          <Button onClick={openCreate} variant="outline" className="border-white/10 text-white/70 hover:text-white hover:border-white/20">
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            Add first package
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {packages.map((pkg) => (
            <div
              key={pkg.id}
              className="flex items-center justify-between gap-4 p-4 rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)]"
            >
              <div className="min-w-0 flex-1">
                <p className="font-medium text-[var(--text-primary)]">{pkg.name}</p>
                <p className="text-xs text-[var(--text-muted)] font-mono mt-0.5">{pkg.slug}</p>
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  {pkg.quest_ids.length} quest{pkg.quest_ids.length !== 1 ? "s" : ""} · ${Number(pkg.base_price).toFixed(2)}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button variant="ghost" size="sm" onClick={() => openEdit(pkg)} className="text-[var(--text-muted)]">
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(pkg.id)}
                  className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modalOpen && (
        <PackageFormModal
          gameId={game.id}
          initial={editingPackage ?? undefined}
          onSave={() => {
            closeModal();
            fetchPackages();
          }}
          onCancel={closeModal}
        />
      )}
    </div>
  );
}

function PackageFormModal({
  gameId,
  initial,
  onSave,
  onCancel,
}: {
  gameId: string;
  initial?: PackageRow;
  onSave: () => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [base_price, setBasePrice] = useState(initial?.base_price ?? 0);
  const [questIds, setQuestIds] = useState<string[]>(initial?.quest_ids ?? []);
  const [quests, setQuests] = useState<QuestOption[]>([]);
  const [questsLoading, setQuestsLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setQuestsLoading(true);
    fetch(`/api/admin/game-quests?game_id=${gameId}&members=all`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data: QuestOption[]) => setQuests(Array.isArray(data) ? data : []))
      .catch(() => setQuests([]))
      .finally(() => setQuestsLoading(false));
  }, [gameId]);

  const handleNameChange = (v: string) => {
    setName(v);
    if (!initial) setSlug(slugify(v));
  };

  const toggleQuest = (id: string) => {
    setQuestIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const url = initial
      ? `/api/admin/quest-packages/${initial.id}`
      : `/api/admin/games/${gameId}/quest-packages`;
    const method = initial ? "PATCH" : "POST";
    const body = initial
      ? { name, slug, description: description || null, base_price, quest_ids: questIds }
      : { name, slug, description: description || null, base_price, quest_ids: questIds };

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.error ?? "Save failed");
      setSaving(false);
      return;
    }
    onSave();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
      <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-4 border-b border-[var(--border-default)] flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">
            {initial ? "Edit quest package" : "New quest package"}
          </h2>
          <button
            type="button"
            onClick={onCancel}
            className="p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-white/5"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <form id="package-form" onSubmit={handleSubmit} className="p-4 space-y-4 overflow-y-auto flex-1">
          <div className="space-y-2">
            <Label>Name</Label>
            <Input
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="e.g. Starter quest pack"
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Slug</Label>
            <Input
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="starter-quest-pack"
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Description (optional)</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Short description for this package"
              rows={2}
            />
          </div>
          <div className="space-y-2">
            <Label>Base price ($)</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={base_price || ""}
              onChange={(e) => setBasePrice(parseFloat(e.target.value) || 0)}
              placeholder="0.00"
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Quests in this package</Label>
            {questsLoading ? (
              <p className="text-xs text-[var(--text-muted)] flex items-center gap-1.5">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading quests…
              </p>
            ) : (
              <div className="max-h-48 overflow-y-auto rounded-lg border border-[var(--border-default)] p-2 space-y-1">
                {quests.map((q) => (
                  <label
                    key={q.id}
                    className="flex items-center gap-2 py-1.5 px-2 rounded-md hover:bg-white/5 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={questIds.includes(q.id)}
                      onChange={() => toggleQuest(q.id)}
                      className="rounded border-[var(--border-default)]"
                    />
                    <span className="text-sm text-[var(--text-primary)]">{q.name}</span>
                  </label>
                ))}
                {quests.length === 0 && (
                  <p className="text-xs text-[var(--text-muted)] py-2">No quests found for this game.</p>
                )}
              </div>
            )}
            <p className="text-[11px] text-[var(--text-muted)]">
              Select at least one quest. Customers will get all selected quests for the package price.
            </p>
          </div>
        </form>
        <div className="p-4 border-t border-[var(--border-default)] flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="package-form"
            disabled={saving || questIds.length === 0 || !name.trim() || !slug.trim()}
          >
            {saving ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                Saving…
              </>
            ) : initial ? "Save changes" : "Create package"}
          </Button>
        </div>
      </div>
    </div>
  );
}
