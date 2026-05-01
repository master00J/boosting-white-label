"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ADMIN_SECTION_KEYS } from "@/lib/admin-sections";

type Rank = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  created_at: string | null;
  section_keys: string[];
};

const SECTION_LABELS: Record<string, string> = {
  dashboard: "Staff Overview",
  orders: "Orders",
  catalog: "Catalog",
  workers: "Workers",
  customers: "Customers",
  finance: "Finance",
  marketing: "Marketing",
  helpdesk: "Helpdesk",
  content: "Content",
  storefront: "Storefront",
  discord: "Discord",
  activity: "Activity Log",
  settings: "Settings",
  import: "Import",
  guide: "Admin Guide",
  ranks: "Ranks (super-admin only)",
};

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9_-]/g, "");
}

export default function RanksClient({ initialRanks }: { initialRanks: Rank[] }) {
  const [ranks, setRanks] = useState<Rank[]>(initialRanks);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Rank | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [sectionKeys, setSectionKeys] = useState<string[]>([]);

  const toggleSection = (key: string) => {
    if (key === "ranks") return;
    setSectionKeys((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const openCreate = () => {
    setEditing(null);
    setName("");
    setSlug("");
    setDescription("");
    setSectionKeys([]);
    setShowForm(true);
    setError(null);
  };

  const openEdit = (rank: Rank) => {
    setEditing(rank);
    setName(rank.name);
    setSlug(rank.slug);
    setDescription(rank.description ?? "");
    setSectionKeys(rank.section_keys.filter((k) => k !== "ranks"));
    setShowForm(true);
    setError(null);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditing(null);
    setError(null);
  };

  const handleNameChange = (v: string) => {
    setName(v);
    if (!editing) setSlug(slugify(v));
  };

  const save = async () => {
    if (!name.trim()) {
      setError("Name is required.");
      return;
    }
    if (!slug.trim()) {
      setError("Slug is required.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      if (editing) {
        const res = await fetch(`/api/admin/ranks/${editing.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: name.trim(),
            slug: slug.trim(),
            description: description.trim() || null,
            section_keys: sectionKeys,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error ?? "Failed to update");
          return;
        }
        setRanks((prev) => prev.map((r) => (r.id === editing.id ? data : r)));
      } else {
        const res = await fetch("/api/admin/ranks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: name.trim(),
            slug: slug.trim(),
            description: description.trim() || undefined,
            section_keys: sectionKeys,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error ?? "Failed to create");
          return;
        }
        setRanks((prev) => [...prev, data]);
      }
      closeForm();
    } finally {
      setSaving(false);
    }
  };

  const deleteRank = async (id: string) => {
    if (!confirm("Delete this rank? Admins with this rank will keep access until you assign a new rank.")) return;
    const res = await fetch(`/api/admin/ranks/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Failed to delete");
      return;
    }
    setRanks((prev) => prev.filter((r) => r.id !== id));
    if (editing?.id === id) closeForm();
  };

  const sectionsForPicker = ADMIN_SECTION_KEYS.filter((k) => k !== "ranks");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-1">Super Admin</p>
          <h1 className="font-heading text-2xl font-semibold">Admin Ranks</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Create ranks and choose which dashboard sections each rank can access. Assign ranks to admins in Settings → Admin Access.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" />
          New rank
        </Button>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive">
          {error}
        </div>
      )}

      {showForm && (
        <div className="p-6 rounded-2xl bg-card border border-border space-y-4">
          <h2 className="font-semibold">{editing ? "Edit rank" : "New rank"}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="e.g. Support"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Slug</Label>
              <Input
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="support"
                className="font-mono"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Description (optional)</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Short description of this rank"
              rows={2}
            />
          </div>
          <div className="space-y-2">
            <Label>Dashboard sections this rank can access</Label>
            <div className="flex flex-wrap gap-3 p-3 rounded-xl bg-muted/30 border border-border">
              {sectionsForPicker.map((key) => (
                <label key={key} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={sectionKeys.includes(key)}
                    onChange={() => toggleSection(key)}
                    className="rounded border-border"
                  />
                  <span className="text-sm">{SECTION_LABELS[key] ?? key}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <Button onClick={save} disabled={saving}>
              {saving ? "Saving..." : editing ? "Save changes" : "Create rank"}
            </Button>
            <Button variant="outline" onClick={closeForm} disabled={saving}>
              Cancel
            </Button>
            {editing && (
              <Button
                variant="destructive"
                onClick={() => deleteRank(editing.id)}
                disabled={saving}
                className="ml-auto"
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Delete
              </Button>
            )}
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="text-left px-4 py-3 font-medium">Name</th>
              <th className="text-left px-4 py-3 font-medium">Slug</th>
              <th className="text-left px-4 py-3 font-medium">Sections</th>
              <th className="w-24 px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {ranks.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                  No ranks yet. Create one to limit which admin sections each role can access.
                </td>
              </tr>
            ) : (
              ranks.map((rank) => (
                <tr key={rank.id} className="border-b border-border hover:bg-muted/20">
                  <td className="px-4 py-3 font-medium">{rank.name}</td>
                  <td className="px-4 py-3 font-mono text-muted-foreground">{rank.slug}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {rank.section_keys.length === 0
                      ? "—"
                      : rank.section_keys.map((k) => SECTION_LABELS[k] ?? k).join(", ")}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(rank)} aria-label="Edit">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteRank(rank.id)}
                        aria-label="Delete"
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
