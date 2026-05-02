"use client";

import { useState, useEffect, startTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  Plus,
  Pencil,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Star,
  StarOff,
  GripVertical,
  ChevronRight,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ImageUpload } from "@/components/ui/image-upload";
import PageHeader from "@/components/shared/page-header";
import { slugify } from "@/lib/utils/slugify";
import type { Database } from "@/types/database";

type Game = Database["public"]["Tables"]["games"]["Row"];

function GameForm({
  initial,
  onSave,
  onCancel,
}: {
  initial?: Partial<Game>;
  onSave: (data: Partial<Game>) => Promise<void>;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [orderCode, setOrderCode] = useState(initial?.order_code ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [shortDescription, setShortDescription] = useState(initial?.short_description ?? "");
  const [logoUrl, setLogoUrl] = useState(initial?.logo_url ?? "");
  const [bannerUrl, setBannerUrl] = useState(initial?.banner_url ?? "");
  const [saving, setSaving] = useState(false);

  const handleNameChange = (v: string) => {
    setName(v);
    if (!initial?.slug) setSlug(slugify(v));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await onSave({ name, slug, order_code: orderCode || null, description, short_description: shortDescription, logo_url: logoUrl, banner_url: bannerUrl });
    setSaving(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Name</Label>
          <Input value={name} onChange={(e) => handleNameChange(e.target.value)} placeholder="e.g. League of Legends" required />
        </div>
        <div className="space-y-1.5">
          <Label>Slug</Label>
          <Input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="league-of-legends" required />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label>Order code (for order IDs)</Label>
          <Input value={orderCode} onChange={(e) => setOrderCode(e.target.value)} placeholder="e.g. OSRS, RS3" className="font-mono max-w-[8rem]" />
          <p className="text-xs text-muted-foreground">Short code used in order numbers: [BRAND]-[GAME]-[SERVICE]-[NUM]</p>
        </div>
      </div>
      <div className="space-y-1.5">
        <Label>Short description</Label>
        <Input value={shortDescription} onChange={(e) => setShortDescription(e.target.value)} placeholder="One sentence about the game" />
      </div>
      <div className="space-y-1.5">
        <Label>Description</Label>
        <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Full description..." rows={3} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="space-y-1.5">
          <Label>Logo</Label>
          <div className="flex items-end gap-3">
            <ImageUpload
              value={logoUrl}
              onChange={setLogoUrl}
              folder="logos"
              label="Upload logo"
              aspectRatio="square"
            />
            <div className="flex-1 space-y-1.5">
              <Label className="text-xs text-muted-foreground">Of plak een URL</Label>
              <Input value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} placeholder="https://..." />
            </div>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Banner</Label>
          <ImageUpload
            value={bannerUrl}
            onChange={setBannerUrl}
            folder="banners"
            label="Upload banner"
            aspectRatio="banner"
          />
          <Input value={bannerUrl} onChange={(e) => setBannerUrl(e.target.value)} placeholder="https://..." className="mt-1.5" />
        </div>
      </div>
      <div className="flex gap-2 justify-end">
        <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>Cancel</Button>
        <Button type="submit" disabled={saving}>{saving ? "Save..." : "Save"}</Button>
      </div>
    </form>
  );
}

export default function GamesClient({ initialGames }: { initialGames: Game[] }) {
  const router = useRouter();
  const [games, setGames] = useState<Game[]>(initialGames);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [listRevalidating, setListRevalidating] = useState(true);
  const [listSyncError, setListSyncError] = useState<string | null>(null);

  /**
   * Server-renderde lijst kan achterlopen na verwijderen in Supabase (ander tabblad / edge).
   * Setup gebruikt een verse DB-query → oude id geeft 404. Altijd met API gelijkzetten.
   */
  useEffect(() => {
    let cancelled = false;
    let ac: AbortController | null = null;

    const run = () => {
      ac?.abort();
      ac = new AbortController();
      setListRevalidating(true);
      setListSyncError(null);
      fetch("/api/admin/games", { cache: "no-store", signal: ac.signal })
        .then(async (res) => {
          if (!res.ok) {
            const j = (await res.json().catch(() => ({}))) as { error?: string };
            throw new Error(j.error ?? `HTTP ${res.status}`);
          }
          return res.json();
        })
        .then((data: unknown) => {
          if (cancelled) return;
          if (!Array.isArray(data)) throw new Error("Ongeldig antwoord");
          setGames(data as Game[]);
          startTransition(() => router.refresh());
        })
        .catch((e: unknown) => {
          if (cancelled || (e instanceof DOMException && e.name === "AbortError")) return;
          setListSyncError(e instanceof Error ? e.message : "Games laden mislukt");
        })
        .finally(() => {
          if (!cancelled) setListRevalidating(false);
        });
    };

    run();
    const onVis = () => {
      if (document.visibilityState === "visible") run();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      cancelled = true;
      ac?.abort();
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [router]);

  const handleCreate = async (data: Partial<Game>) => {
    setError(null);
    const res = await fetch("/api/admin/games", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...data, sort_order: games.length }),
    });
    const json = await res.json();
    if (!res.ok) { setError(json.error); return; }
    setGames((prev) => [...prev, json as Game]);
    setShowForm(false);
  };

  const handleUpdate = async (id: string, data: Partial<Game>) => {
    setError(null);
    const res = await fetch(`/api/admin/games/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) { setError(json.error); return; }
    setGames((prev) => prev.map((g) => (g.id === id ? json as Game : g)));
    setEditingId(null);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete game? This will also delete all associated services!")) return;
    const res = await fetch(`/api/admin/games/${id}`, { method: "DELETE" });
    if (!res.ok) { const json = await res.json(); setError(json.error); return; }
    setGames((prev) => prev.filter((g) => g.id !== id));
  };

  const handleToggleActive = async (game: Game) => {
    const res = await fetch(`/api/admin/games/${game.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: !game.is_active }),
    });
    const json = await res.json();
    if (!res.ok) { setError(json.error); return; }
    setGames((prev) => prev.map((g) => (g.id === game.id ? json as Game : g)));
  };

  const handleToggleFeatured = async (game: Game) => {
    const res = await fetch(`/api/admin/games/${game.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_featured: !game.is_featured }),
    });
    const json = await res.json();
    if (!res.ok) { setError(json.error); return; }
    setGames((prev) => prev.map((g) => (g.id === game.id ? json as Game : g)));
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Games"
        description="Manage the games on your platform"
        action={
          !showForm && (
            <Button onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add game
            </Button>
          )
        }
      />

      {(listRevalidating || listSyncError) && (
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          {listRevalidating && <span>Gameslijst verversen…</span>}
          {listSyncError && (
            <span className="text-amber-600 dark:text-amber-400">
              Kon lijst niet verversen ({listSyncError}). Vernieuw de pagina of controleer je sessie.
            </span>
          )}
        </div>
      )}

      {error && (
        <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive">
          {error}
        </div>
      )}

      {showForm && (
        <Card>
          <CardContent className="pt-6">
            <h3 className="font-semibold mb-4">New game</h3>
            <GameForm onSave={handleCreate} onCancel={() => setShowForm(false)} />
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-3">
        {games.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground text-sm">
              No games created yet.
            </CardContent>
          </Card>
        ) : (
          games.map((game) => (
            <Card key={game.id} className={!game.is_active ? "opacity-60" : ""}>
              {editingId === game.id ? (
                <CardContent className="pt-6">
                  <h3 className="font-semibold mb-4">Edit game</h3>
                  <GameForm
                    initial={game}
                    onSave={(data) => handleUpdate(game.id, data)}
                    onCancel={() => setEditingId(null)}
                  />
                </CardContent>
              ) : (
                <CardContent className="p-4">
                  <div className="flex items-start gap-3 sm:items-center sm:gap-4">
                    <GripVertical className="h-4 w-4 text-muted-foreground/40 flex-shrink-0 cursor-grab mt-1 sm:mt-0" />

                    {/* Logo */}
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-muted flex items-center justify-center flex-shrink-0 overflow-hidden">
                      {game.logo_url ? (
                        <Image src={game.logo_url} alt={game.name} width={48} height={48} className="object-cover" />
                      ) : (
                        <span className="text-xl">🎮</span>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold">{game.name}</p>
                        {game.is_featured && (
                          <span className="text-xs bg-yellow-400/10 text-yellow-400 px-1.5 py-0.5 rounded-full">
                            Featured
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground font-mono">{game.slug}</p>
                      {game.short_description && (
                        <p className="text-sm text-muted-foreground mt-0.5 truncate">{game.short_description}</p>
                      )}
                      {/* Mobile actions row */}
                      <div className="flex items-center gap-1 mt-2 sm:hidden flex-wrap">
                        <Link
                          href={`/admin/games/${game.id}/setup`}
                          className="flex items-center gap-0.5 px-2 py-1 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors border border-border/50"
                        >
                          Setup <ChevronRight className="h-3 w-3" />
                        </Link>
                        <Link
                          href={`/admin/games/${game.id}/categories`}
                          className="flex items-center gap-0.5 px-2 py-1 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors border border-border/50"
                        >
                          Categories <ChevronRight className="h-3 w-3" />
                        </Link>
                        <Link
                          href={`/admin/games/${game.id}/quest-packages`}
                          className="flex items-center gap-0.5 px-2 py-1 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors border border-border/50"
                        >
                          Quest packages <ChevronRight className="h-3 w-3" />
                        </Link>
                        <Link
                          href={`/admin/games/${game.id}/gim-shop`}
                          className="flex items-center gap-0.5 px-2 py-1 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors border border-border/50"
                        >
                          GIM Shop <ChevronRight className="h-3 w-3" />
                        </Link>
                        <button
                          onClick={() => handleToggleFeatured(game)}
                          className={`p-1.5 rounded-md transition-colors ${game.is_featured ? "text-yellow-400 hover:bg-yellow-400/10" : "text-muted-foreground hover:text-foreground hover:bg-white/5"}`}
                          title="Toggle featured"
                        >
                          {game.is_featured ? <Star className="h-4 w-4" /> : <StarOff className="h-4 w-4" />}
                        </button>
                        <button
                          onClick={() => handleToggleActive(game)}
                          className={`p-1.5 rounded-md transition-colors ${game.is_active ? "text-green-400 hover:bg-green-400/10" : "text-muted-foreground hover:bg-white/5"}`}
                          title={game.is_active ? "Deactivate" : "Activate"}
                        >
                          {game.is_active ? <ToggleRight className="h-5 w-5" /> : <ToggleLeft className="h-5 w-5" />}
                        </button>
                        <button
                          onClick={() => setEditingId(game.id)}
                          className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(game.id)}
                          className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Desktop Actions */}
                    <div className="hidden sm:flex items-center gap-1 flex-shrink-0">
                      <Link
                        href={`/admin/games/${game.id}/setup`}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
                      >
                        Setup
                        <ChevronRight className="h-3 w-3" />
                      </Link>
                      <Link
                        href={`/admin/games/${game.id}/categories`}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
                      >
                        Categories
                        <ChevronRight className="h-3 w-3" />
                      </Link>
                      <Link
                        href={`/admin/games/${game.id}/quest-packages`}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
                      >
                        Quest packages
                        <ChevronRight className="h-3 w-3" />
                      </Link>
                      <Link
                        href={`/admin/games/${game.id}/gim-shop`}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
                      >
                        GIM Shop
                        <ChevronRight className="h-3 w-3" />
                      </Link>
                      <button
                        onClick={() => handleToggleFeatured(game)}
                        className={`p-1.5 rounded-md transition-colors ${game.is_featured ? "text-yellow-400 hover:bg-yellow-400/10" : "text-muted-foreground hover:text-foreground hover:bg-white/5"}`}
                        title="Toggle featured"
                      >
                        {game.is_featured ? <Star className="h-4 w-4" /> : <StarOff className="h-4 w-4" />}
                      </button>
                      <button
                        onClick={() => handleToggleActive(game)}
                        className={`p-1.5 rounded-md transition-colors ${game.is_active ? "text-green-400 hover:bg-green-400/10" : "text-muted-foreground hover:bg-white/5"}`}
                        title={game.is_active ? "Deactivate" : "Activate"}
                      >
                        {game.is_active ? <ToggleRight className="h-5 w-5" /> : <ToggleLeft className="h-5 w-5" />}
                      </button>
                      <button
                        onClick={() => setEditingId(game.id)}
                        className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(game.id)}
                        className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
