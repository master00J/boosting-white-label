"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Plus,
  Pencil,
  Trash2,
  GripVertical,
  ToggleLeft,
  ToggleRight,
  ArrowLeft,
  ChevronRight,
} from "lucide-react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ImageUpload } from "@/components/ui/image-upload";
import { slugify } from "@/lib/utils/slugify";

interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  image_url: string | null;
  is_active: boolean | null;
  sort_order: number | null;
  game_id: string | null;
}

interface Game {
  id: string;
  name: string;
  slug: string;
}

function CategoryForm({
  initial,
  onSave,
  onCancel,
}: {
  initial?: Partial<Category>;
  onSave: (data: { name: string; slug: string; icon: string; image_url: string }) => Promise<void>;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [icon, setIcon] = useState(initial?.icon ?? "");
  const [imageUrl, setImageUrl] = useState(initial?.image_url ?? "");
  const [saving, setSaving] = useState(false);

  const handleNameChange = (v: string) => {
    setName(v);
    if (!initial?.slug) setSlug(slugify(v));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await onSave({ name, slug, icon, image_url: imageUrl });
    setSaving(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Name</Label>
          <Input
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            placeholder="e.g. Skilling"
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label>Slug</Label>
          <Input
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="skilling"
            required
          />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Icon (emoji)</Label>
          <Input
            value={icon}
            onChange={(e) => setIcon(e.target.value)}
            placeholder="⚔️"
          />
          <p className="text-xs text-muted-foreground">Used as fallback when no image is set.</p>
        </div>
        <div className="space-y-1.5">
          <Label>Category image</Label>
          <ImageUpload
            value={imageUrl}
            onChange={setImageUrl}
            bucket="game-assets"
            folder="categories"
            label="Upload image"
            aspectRatio="square"
          />
        </div>
      </div>
      <div className="flex gap-2 justify-end">
        <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? "Saving..." : "Save"}
        </Button>
      </div>
    </form>
  );
}

export default function CategoriesClient({
  game,
  initialCategories,
}: {
  game: Game;
  initialCategories: Category[];
}) {
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = categories.findIndex((c) => c.id === active.id);
    const newIndex = categories.findIndex((c) => c.id === over.id);
    const reordered = arrayMove(categories, oldIndex, newIndex);
    setCategories(reordered);
    await Promise.all(
      reordered.map((cat, idx) =>
        fetch("/api/admin/table/service_categories", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: cat.id, sort_order: idx }),
        })
      )
    );
  };

  const handleCreate = async (data: { name: string; slug: string; icon: string; image_url: string }) => {
    setError(null);
    const res = await fetch("/api/admin/table/service_categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...data, game_id: game.id, sort_order: categories.length }),
    });
    const json = await res.json();
    if (!res.ok) { setError(json.error); return; }
    setCategories((prev) => [...prev, json as Category]);
    setShowForm(false);
  };

  const handleUpdate = async (id: string, data: { name: string; slug: string; icon: string; image_url: string }) => {
    setError(null);
    const res = await fetch("/api/admin/table/service_categories", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...data }),
    });
    const json = await res.json();
    if (!res.ok) { setError(json.error); return; }
    setCategories((prev) => prev.map((c) => (c.id === id ? json as Category : c)));
    setEditingId(null);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete category? Services in this category will lose their category.")) return;
    const res = await fetch("/api/admin/table/service_categories", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (!res.ok) { const json = await res.json(); setError(json.error); return; }
    setCategories((prev) => prev.filter((c) => c.id !== id));
  };

  const handleToggle = async (cat: Category) => {
    const res = await fetch("/api/admin/table/service_categories", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: cat.id, is_active: !cat.is_active }),
    });
    const json = await res.json();
    if (!res.ok) { setError(json.error); return; }
    setCategories((prev) => prev.map((c) => (c.id === cat.id ? json as Category : c)));
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
        <span className="text-foreground">Categories</span>
      </div>

      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-heading text-2xl font-semibold">{`Categories — ${game.name}`}</h1>
          <p className="text-sm text-muted-foreground mt-1">{"Manage categories for this game's services"}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Link
            href={`/admin/games/${game.id}/quest-packages`}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-sm transition-colors"
          >
            Quest packages
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>
          <Link
            href={`/admin/games/${game.id}/gim-shop`}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-sm transition-colors"
          >
            GIM Shop
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>
          {!showForm && (
            <Button onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add category
            </Button>
          )}
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive">
          {error}
        </div>
      )}

      {showForm && (
        <Card>
          <CardContent className="pt-6">
            <h3 className="font-semibold mb-4">New category</h3>
            <CategoryForm onSave={handleCreate} onCancel={() => setShowForm(false)} />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          {categories.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground text-sm">
              No categories yet. Add a category to start organising services.
            </div>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={categories.map((c) => c.id)} strategy={verticalListSortingStrategy}>
                <div className="divide-y divide-border">
                  {categories.map((cat) => (
                    <SortableCategoryRow
                      key={cat.id}
                      cat={cat}
                      gameId={game.id}
                      isEditing={editingId === cat.id}
                      onEdit={() => setEditingId(cat.id)}
                      onCancelEdit={() => setEditingId(null)}
                      onSave={(data) => handleUpdate(cat.id, data)}
                      onDelete={() => handleDelete(cat.id)}
                      onToggle={() => handleToggle(cat)}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── SortableCategoryRow ──────────────────────────────────────────────────────

function SortableCategoryRow({
  cat,
  gameId,
  isEditing,
  onEdit,
  onCancelEdit,
  onSave,
  onDelete,
  onToggle,
}: {
  cat: Category;
  gameId: string;
  isEditing: boolean;
  onEdit: () => void;
  onCancelEdit: () => void;
  onSave: (data: { name: string; slug: string; icon: string; image_url: string }) => Promise<void>;
  onDelete: () => void;
  onToggle: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: cat.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      {isEditing ? (
        <div className="p-4">
          <CategoryForm
            initial={cat}
            onSave={onSave}
            onCancel={onCancelEdit}
          />
        </div>
      ) : (
        <div className={`flex items-center gap-3 px-4 py-3 hover:bg-white/[0.02] transition-colors ${isDragging ? "bg-white/[0.04]" : ""}`}>
          <button
            type="button"
            {...attributes}
            {...listeners}
            className="h-4 w-4 text-muted-foreground/40 flex-shrink-0 cursor-grab active:cursor-grabbing hover:text-muted-foreground/70 transition-colors touch-none p-0 bg-transparent border-0 flex items-center justify-center"
            title="Drag to reorder"
          >
            <GripVertical className="h-4 w-4" />
          </button>
          <div className="w-10 h-10 rounded-lg overflow-hidden bg-muted flex items-center justify-center flex-shrink-0 border border-border/50">
            {cat.image_url ? (
              <Image src={cat.image_url} alt={cat.name} width={40} height={40} className="object-contain w-full h-full p-1" />
            ) : (
              <span className="text-xl">{cat.icon ?? "📁"}</span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm">{cat.name}</p>
            <p className="text-xs text-muted-foreground font-mono">{cat.slug}</p>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <Link
              href={`/admin/games/${gameId}/categories/${cat.id}/services`}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
            >
              Services <ChevronRight className="h-3 w-3" />
            </Link>
            <button
              onClick={onToggle}
              className={`p-1.5 rounded-md transition-colors ${cat.is_active ? "text-green-400 hover:bg-green-400/10" : "text-muted-foreground hover:bg-white/5"}`}
              title={cat.is_active ? "Deactivate" : "Activate"}
            >
              {cat.is_active ? <ToggleRight className="h-5 w-5" /> : <ToggleLeft className="h-5 w-5" />}
            </button>
            <button onClick={onEdit} className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors">
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button onClick={onDelete} className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
