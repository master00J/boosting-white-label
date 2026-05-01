"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2, GripVertical, Shield, Link } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import PageHeader from "@/components/shared/page-header";
import { slugify } from "@/lib/utils/slugify";
import type { Database } from "@/types/database";

type WorkerTier = Database["public"]["Tables"]["worker_tiers"]["Row"];

function TierForm({
  initial,
  onSave,
  onCancel,
}: {
  initial?: Partial<WorkerTier>;
  onSave: (data: Partial<WorkerTier>) => Promise<void>;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [color, setColor] = useState(initial?.color ?? "#6366f1");
  const [icon, setIcon] = useState(initial?.icon ?? "⭐");
  const [commissionRate, setCommissionRate] = useState(String(initial?.commission_rate ?? 0.70));
  const [maxActiveOrders, setMaxActiveOrders] = useState(String(initial?.max_active_orders ?? 5));
  const [minCompletedOrders, setMinCompletedOrders] = useState(String(initial?.min_completed_orders ?? 0));
  const [minRating, setMinRating] = useState(String(initial?.min_rating ?? 0));
  const [minDeposit, setMinDeposit] = useState(initial?.min_deposit != null ? String(initial.min_deposit) : "");
  const [discordRoleId, setDiscordRoleId] = useState(initial?.discord_role_id ?? "");
  const [isInviteOnly, setIsInviteOnly] = useState(initial?.is_invite_only ?? false);
  const [isDefault, setIsDefault] = useState(initial?.is_default ?? false);
  const [saving, setSaving] = useState(false);

  const handleNameChange = (v: string) => {
    setName(v);
    if (!initial?.slug) setSlug(slugify(v));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await onSave({
      name,
      slug,
      color,
      icon,
      commission_rate: parseFloat(commissionRate),
      max_active_orders: parseInt(maxActiveOrders),
      min_completed_orders: parseInt(minCompletedOrders),
      min_rating: parseFloat(minRating),
      min_deposit: minDeposit === "" ? null : parseFloat(minDeposit),
      is_invite_only: isInviteOnly,
      is_default: isDefault,
      discord_role_id: discordRoleId.trim() === "" ? null : discordRoleId.trim(),
    });
    setSaving(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-1.5">
          <Label>Name</Label>
          <Input value={name} onChange={(e) => handleNameChange(e.target.value)} placeholder="e.g. Bronze" required />
        </div>
        <div className="space-y-1.5">
          <Label>Slug</Label>
          <Input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="bronze" required />
        </div>
        <div className="space-y-1.5">
          <Label>Icon (emoji)</Label>
          <Input value={icon} onChange={(e) => setIcon(e.target.value)} placeholder="⭐" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Color</Label>
          <div className="flex gap-2">
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="h-9 w-12 rounded-md border border-input cursor-pointer bg-transparent"
            />
            <Input value={color} onChange={(e) => setColor(e.target.value)} placeholder="#6366f1" />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Commission rate (0.00 – 1.00, e.g. 0.70 = 70%)</Label>
          <Input type="number" min="0" max="1" step="0.01" value={commissionRate} onChange={(e) => setCommissionRate(e.target.value)} />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-1.5">
          <Label>Max active orders</Label>
          <Input type="number" min="1" value={maxActiveOrders} onChange={(e) => setMaxActiveOrders(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Min. completed orders</Label>
          <Input type="number" min="0" value={minCompletedOrders} onChange={(e) => setMinCompletedOrders(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Min. rating</Label>
          <Input type="number" min="0" max="5" step="0.1" value={minRating} onChange={(e) => setMinRating(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Min. deposit (\$)</Label>
          <Input type="number" min="0" step="0.01" value={minDeposit} onChange={(e) => setMinDeposit(e.target.value)} placeholder="Optional" />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label>Discord Role ID <span className="text-muted-foreground font-normal">(optional — auto-filled when tier is created)</span></Label>
        <Input
          value={discordRoleId}
          onChange={(e) => setDiscordRoleId(e.target.value)}
          placeholder="e.g. 1234567890123456789"
          className="font-mono text-sm"
        />
        <p className="text-xs text-muted-foreground">
          Leave empty to let the bot create a Discord role automatically. Or paste an existing Discord role ID to link it manually.
        </p>
      </div>
      <div className="flex gap-6">
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={isInviteOnly}
            onChange={(e) => setIsInviteOnly(e.target.checked)}
            className="rounded"
          />
          Invite only
        </label>
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={isDefault}
            onChange={(e) => setIsDefault(e.target.checked)}
            className="rounded"
          />
          Default tier (for new workers)
        </label>
      </div>
      <div className="flex gap-2 justify-end">
        <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>Cancel</Button>
        <Button type="submit" disabled={saving}>{saving ? "Save..." : "Save"}</Button>
      </div>
    </form>
  );
}

export default function WorkerTiersClient({ initialTiers }: { initialTiers: WorkerTier[] }) {
  const [tiers, setTiers] = useState<WorkerTier[]>(initialTiers);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async (data: Partial<WorkerTier>) => {
    setError(null);
    const res = await fetch("/api/admin/table/worker_tiers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...(data as WorkerTier), sort_order: tiers.length }),
    });
    const json = await res.json();
    if (!res.ok) { setError(json.error); return; }
    setTiers((prev) => [...prev, json as WorkerTier]);
    setShowForm(false);
  };

  const handleUpdate = async (id: string, data: Partial<WorkerTier>) => {
    setError(null);
    const res = await fetch("/api/admin/table/worker_tiers", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...data }),
    });
    const json = await res.json();
    if (!res.ok) { setError(json.error); return; }
    setTiers((prev) => prev.map((t) => (t.id === id ? json as WorkerTier : t)));
    setEditingId(null);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete tier?")) return;
    const res = await fetch("/api/admin/table/worker_tiers", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (!res.ok) { const json = await res.json(); setError(json.error); return; }
    setTiers((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Worker Tiers"
        description="Manage tier levels for workers"
        action={
          !showForm && (
            <Button onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add tier
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
            <CardTitle className="text-base">New tier</CardTitle>
          </CardHeader>
          <CardContent>
            <TierForm onSave={handleCreate} onCancel={() => setShowForm(false)} />
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {tiers.length === 0 ? (
          <div className="col-span-full">
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground text-sm">
                No tiers created yet.
              </CardContent>
            </Card>
          </div>
        ) : (
          tiers.map((tier) => (
            <Card key={tier.id}>
              {editingId === tier.id ? (
                <CardContent className="pt-6">
                  <TierForm
                    initial={tier}
                    onSave={(data) => handleUpdate(tier.id, data)}
                    onCancel={() => setEditingId(null)}
                  />
                </CardContent>
              ) : (
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <GripVertical className="h-4 w-4 text-muted-foreground/40 cursor-grab" />
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-lg"
                        style={{ backgroundColor: `${tier.color}20`, border: `1px solid ${tier.color}40` }}
                      >
                        {tier.icon}
                      </div>
                      <div>
                        <p className="font-semibold" style={{ color: tier.color ?? undefined }}>{tier.name}</p>
                        <p className="text-xs text-muted-foreground font-mono">{tier.slug}</p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => setEditingId(tier.id)}
                        className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(tier.id)}
                        className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                  <div className="space-y-1.5 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Commission</span>
                      <span className="font-medium">{((tier.commission_rate ?? 0) * 100).toFixed(0)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Max orders</span>
                      <span className="font-medium">{tier.max_active_orders}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Min. orders</span>
                      <span className="font-medium">{tier.min_completed_orders}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Min. rating</span>
                      <span className="font-medium">{tier.min_rating} ⭐</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-3">
                    {tier.is_default && (
                      <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Shield className="h-2.5 w-2.5" /> Default
                      </span>
                    )}
                    {tier.is_invite_only && (
                      <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                        Invite only
                      </span>
                    )}
                    {tier.discord_role_id ? (
                      <span className="text-xs bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded-full flex items-center gap-1" title={tier.discord_role_id}>
                        <Link className="h-2.5 w-2.5" /> Discord linked
                      </span>
                    ) : (
                      <span className="text-xs bg-yellow-500/10 text-yellow-500 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Link className="h-2.5 w-2.5" /> No Discord role
                      </span>
                    )}
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
