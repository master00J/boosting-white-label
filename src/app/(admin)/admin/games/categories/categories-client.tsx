"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2, GripVertical, ToggleLeft, ToggleRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import PageHeader from "@/components/shared/page-header";
import { slugify } from "@/lib/utils/slugify";
import type { Database } from "@/types/database";

type Category = Database["public"]["Tables"]["service_categories"]["Row"];

interface Props {
  initialCategories: Category[];
}

function CategoryForm({
  initial,
  onSave,
  onCancel,
}: {
  initial?: Partial<Category>;
  onSave: (data: { name: string; slug: string; icon: string }) => Promise<void>;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [icon, setIcon] = useState(initial?.icon ?? "");
  const [saving, setSaving] = useState(false);

  const handleNameChange = (v: string) => {
    setName(v);
    if (!initial?.slug) setSlug(slugify(v));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await onSave({ name, slug, icon });
    setSaving(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="cat-name">Name</Label>
          <Input
            id="cat-name"
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            placeholder="e.g. Rank Boost"
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="cat-slug">Slug</Label>
          <Input
            id="cat-slug"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="rank-boost"
            required
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="cat-icon">Icon (emoji or name)</Label>
        <Input
          id="cat-icon"
          value={icon}
          onChange={(e) => setIcon(e.target.value)}
          placeholder="🎮 or 'gamepad'"
        />
      </div>
      <div className="flex gap-2 justify-end">
        <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? "Save..." : "Save"}
        </Button>
      </div>
    </form>
  );
}

export default function CategoriesClient({ initialCategories }: Props) {
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async (data: { name: string; slug: string; icon: string }) => {
    setError(null);
    const res = await fetch("/api/admin/table/service_categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...data, sort_order: categories.length }),
    });
    const json = await res.json();
    if (!res.ok) { setError(json.error); return; }
    setCategories((prev) => [...prev, json as Category]);
    setShowForm(false);
  };

  const handleUpdate = async (id: string, data: { name: string; slug: string; icon: string }) => {
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
    if (!confirm("Delete category?")) return;
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
      <PageHeader
        title="Service Categories"
        description="Manage the categories for your services"
        action={
          !showForm && (
            <Button onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add category
            </Button>
          )
        }
      />

      {error && (
        <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive">
          {error}
        </div>
      )}

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">New category</CardTitle>
          </CardHeader>
          <CardContent>
            <CategoryForm
              onSave={handleCreate}
              onCancel={() => setShowForm(false)}
            />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          {categories.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground text-sm">
              No categories created yet.
            </div>
          ) : (
            <div className="divide-y divide-border">
              {categories.map((cat) => (
                <div key={cat.id}>
                  {editingId === cat.id ? (
                    <div className="p-4">
                      <CategoryForm
                        initial={cat}
                        onSave={(data) => handleUpdate(cat.id, data)}
                        onCancel={() => setEditingId(null)}
                      />
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 px-4 py-3 hover:bg-white/[0.02] transition-colors">
                      <GripVertical className="h-4 w-4 text-muted-foreground/40 flex-shrink-0 cursor-grab" />
                      <span className="text-lg w-8 text-center flex-shrink-0">
                        {cat.icon ?? "📁"}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">{cat.name}</p>
                        <p className="text-xs text-muted-foreground font-mono">{cat.slug}</p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                          onClick={() => handleToggle(cat)}
                          className={`transition-colors ${cat.is_active ? "text-green-400" : "text-muted-foreground"}`}
                          title={cat.is_active ? "Deactivate" : "Activate"}
                        >
                          {cat.is_active ? (
                            <ToggleRight className="h-5 w-5" />
                          ) : (
                            <ToggleLeft className="h-5 w-5" />
                          )}
                        </button>
                        <button
                          onClick={() => setEditingId(cat.id)}
                          className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(cat.id)}
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
    </div>
  );
}
