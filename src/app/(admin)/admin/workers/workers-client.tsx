"use client";

import { useState } from "react";
import { Search, Star, CheckCircle2, XCircle, ChevronDown, Settings2, X, Loader2, Banknote, Plus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import PageHeader from "@/components/shared/page-header";
import UserAvatar from "@/components/shared/user-avatar";
import type { Database } from "@/types/database";

type WorkerTier = Database["public"]["Tables"]["worker_tiers"]["Row"];

interface WorkerWithRelations {
  id: string;
  profile_id: string;
  tier_id: string | null;
  is_active: boolean;
  is_verified: boolean;
  commission_rate: number;
  payout_minimum: number;
  deposit_paid: number | null;
  total_earned: number;
  total_orders_completed: number;
  average_rating: number;
  total_ratings: number;
  current_active_orders: number;
  max_active_orders: number;
  created_at: string;
  profile: {
    id: string;
    display_name: string | null;
    email: string;
    avatar_url: string | null;
    is_banned: boolean;
  } | null;
  tier: {
    id: string;
    name: string;
    color: string | null;
    icon: string | null;
  } | null;
}

export default function WorkersClient({
  initialWorkers,
  tiers,
}: {
  initialWorkers: WorkerWithRelations[];
  tiers: WorkerTier[];
}) {
  const [workers, setWorkers] = useState<WorkerWithRelations[]>(initialWorkers);
  const [search, setSearch] = useState("");
  const [filterTier, setFilterTier] = useState("");
  const [filterActive, setFilterActive] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Edit modal state
  const [editWorker, setEditWorker] = useState<WorkerWithRelations | null>(null);
  const [editCommission, setEditCommission] = useState("");
  const [editMinPayout, setEditMinPayout] = useState("");
  const [editMaxOrders, setEditMaxOrders] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState("");
  const [depositAmount, setDepositAmount] = useState("");
  const [depositNote, setDepositNote] = useState("");
  const [depositSaving, setDepositSaving] = useState(false);
  const [depositError, setDepositError] = useState("");

  const openEdit = (worker: WorkerWithRelations) => {
    setEditWorker(worker);
    setEditCommission(String(Math.round(worker.commission_rate * 100)));
    setEditMinPayout(String(worker.payout_minimum ?? 25));
    setEditMaxOrders(String(worker.max_active_orders));
    setEditError("");
    setDepositAmount("");
    setDepositNote("");
    setDepositError("");
  };

  const addDeposit = async () => {
    if (!editWorker) return;
    const amount = parseFloat(depositAmount);
    if (isNaN(amount) || amount <= 0) { setDepositError("Enter a valid amount."); return; }
    setDepositSaving(true);
    setDepositError("");
    try {
      const res = await fetch(`/api/admin/workers/${editWorker.id}/deposit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount, note: depositNote.trim() || undefined }),
      });
      if (!res.ok) { const j = await res.json(); setDepositError(j.error ?? "Failed."); return; }
      const newTotal = (editWorker.deposit_paid ?? 0) + amount;
      setEditWorker({ ...editWorker, deposit_paid: newTotal });
      setWorkers((prev) => prev.map((w) => (w.id === editWorker.id ? { ...w, deposit_paid: newTotal } : w)));
      setDepositAmount("");
      setDepositNote("");
    } finally {
      setDepositSaving(false);
    }
  };

  const saveEdit = async () => {
    if (!editWorker) return;
    setEditSaving(true);
    setEditError("");
    const commission = parseFloat(editCommission) / 100;
    const minPayout = parseFloat(editMinPayout);
    const maxOrders = parseInt(editMaxOrders, 10);
    if (isNaN(commission) || commission < 0 || commission > 1) { setEditError("Commission must be 0–100%."); setEditSaving(false); return; }
    if (isNaN(minPayout) || minPayout < 0) { setEditError("Invalid minimum payout."); setEditSaving(false); return; }
    if (isNaN(maxOrders) || maxOrders < 1) { setEditError("Max orders must be at least 1."); setEditSaving(false); return; }
    try {
      const res = await fetch("/api/admin/table/workers", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editWorker.id, commission_rate: commission, payout_minimum: minPayout, max_active_orders: maxOrders }),
      });
      if (!res.ok) { const j = await res.json(); setEditError(j.error ?? "Save failed."); return; }
      setWorkers((prev) => prev.map((w) => w.id === editWorker.id ? { ...w, commission_rate: commission, payout_minimum: minPayout, max_active_orders: maxOrders } : w));
      setEditWorker(null);
    } finally {
      setEditSaving(false);
    }
  };

  const filtered = workers.filter((w) => {
    const name = w.profile?.display_name ?? w.profile?.email ?? "";
    const matchSearch = name.toLowerCase().includes(search.toLowerCase());
    const matchTier = filterTier ? w.tier_id === filterTier : true;
    const matchActive =
      filterActive === "active"
        ? w.is_active
        : filterActive === "inactive"
        ? !w.is_active
        : true;
    return matchSearch && matchTier && matchActive;
  });

  const handleTierChange = async (workerId: string, tierId: string) => {
    setError(null);
    const res = await fetch("/api/admin/table/workers", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: workerId, tier_id: tierId || null }),
    });
    if (!res.ok) { const json = await res.json(); setError(json.error); return; }
    setWorkers((prev) =>
      prev.map((w) => {
        if (w.id !== workerId) return w;
        const newTier = tiers.find((t) => t.id === tierId) ?? null;
        return {
          ...w,
          tier_id: tierId || null,
          tier: newTier
            ? { id: newTier.id, name: newTier.name, color: newTier.color ?? null, icon: newTier.icon ?? null }
            : null,
        };
      })
    );
  };

  const handleToggleActive = async (worker: WorkerWithRelations) => {
    setError(null);
    const res = await fetch("/api/admin/table/workers", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: worker.id, is_active: !worker.is_active }),
    });
    if (!res.ok) { const json = await res.json(); setError(json.error); return; }
    setWorkers((prev) =>
      prev.map((w) => (w.id === worker.id ? { ...w, is_active: !w.is_active } : w))
    );
  };

  const handleToggleVerified = async (worker: WorkerWithRelations) => {
    setError(null);
    const res = await fetch("/api/admin/table/workers", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: worker.id, is_verified: !worker.is_verified }),
    });
    if (!res.ok) { const json = await res.json(); setError(json.error); return; }
    setWorkers((prev) =>
      prev.map((w) => (w.id === worker.id ? { ...w, is_verified: !w.is_verified } : w))
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Workers"
        description={`${workers.length} workers total`}
      />

      {error && (
        <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search worker..."
            className="pl-9"
          />
        </div>
        <select
          value={filterTier}
          onChange={(e) => setFilterTier(e.target.value)}
          className="h-9 rounded-md border border-input bg-background text-foreground px-3 text-sm"
        >
          <option value="" className="bg-background text-foreground">All tiers</option>
          {tiers.map((t) => (
            <option key={t.id} value={t.id} className="bg-background text-foreground">{t.icon} {t.name}</option>
          ))}
        </select>
        <select
          value={filterActive}
          onChange={(e) => setFilterActive(e.target.value)}
          className="h-9 rounded-md border border-input bg-background text-foreground px-3 text-sm"
        >
          <option value="" className="bg-background text-foreground">All statuses</option>
          <option value="active" className="bg-background text-foreground">Active</option>
          <option value="inactive" className="bg-background text-foreground">Inactive</option>
        </select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[600px]">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-4 py-3 text-muted-foreground font-medium">Worker</th>
                  <th className="text-left px-4 py-3 text-muted-foreground font-medium">Tier</th>
                  <th className="text-right px-4 py-3 text-muted-foreground font-medium hidden sm:table-cell">Orders</th>
                  <th className="text-right px-4 py-3 text-muted-foreground font-medium hidden sm:table-cell">Rating</th>
                  <th className="text-right px-4 py-3 text-muted-foreground font-medium hidden md:table-cell">Earnings</th>
                  <th className="text-right px-4 py-3 text-muted-foreground font-medium hidden lg:table-cell">Deposit</th>
                  <th className="text-center px-4 py-3 text-muted-foreground font-medium">Status</th>
                  <th className="text-center px-4 py-3 text-muted-foreground font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">
                      No workers found.
                    </td>
                  </tr>
                ) : (
                  filtered.map((worker) => (
                    <tr key={worker.id} className="border-b border-border/50 hover:bg-white/[0.02] transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <UserAvatar
                            src={worker.profile?.avatar_url}
                            name={worker.profile?.display_name ?? worker.profile?.email}
                            size={28}
                          />
                          <div>
                            <p className="font-medium">{worker.profile?.display_name ?? "—"}</p>
                            <p className="text-xs text-muted-foreground">{worker.profile?.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="relative">
                          <select
                            value={worker.tier_id ?? ""}
                            onChange={(e) => handleTierChange(worker.id, e.target.value)}
                            className="appearance-none h-7 rounded-md border border-input bg-background text-foreground pl-2 pr-6 text-xs"
                            style={worker.tier?.color ? { color: worker.tier.color } : undefined}
                          >
                            <option value="" className="bg-background text-foreground">— None tier —</option>
                            {tiers.map((t) => (
                              <option key={t.id} value={t.id} className="bg-background text-foreground">{t.icon} {t.name}</option>
                            ))}
                          </select>
                          <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground pointer-events-none" />
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right hidden sm:table-cell">
                        <span className="font-medium">{worker.total_orders_completed}</span>
                        <span className="text-muted-foreground text-xs ml-1">
                          ({worker.current_active_orders}/{worker.max_active_orders} active)
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right hidden sm:table-cell">
                        <span className="flex items-center justify-end gap-1">
                          <Star className="h-3 w-3 text-yellow-400" />
                          {worker.average_rating.toFixed(1)}
                          <span className="text-muted-foreground text-xs">({worker.total_ratings})</span>
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-medium hidden md:table-cell">
                        \${worker.total_earned.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-right hidden lg:table-cell">
                        \${(worker.deposit_paid ?? 0).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-xs ${worker.is_active ? "bg-green-400/10 text-green-400" : "bg-muted text-muted-foreground"}`}>
                            {worker.is_active ? "Active" : "Inactive"}
                          </span>
                          {worker.is_verified && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs bg-blue-400/10 text-blue-400 hidden sm:inline-flex">
                              Verified
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleToggleActive(worker)}
                            className={`p-1 rounded text-xs transition-colors ${worker.is_active ? "text-green-400 hover:bg-green-400/10" : "text-muted-foreground hover:bg-white/5"}`}
                            title={worker.is_active ? "Deactivate" : "Activate"}
                          >
                            {worker.is_active ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                          </button>
                          <button
                            onClick={() => handleToggleVerified(worker)}
                            className={`p-1 rounded text-xs transition-colors ${worker.is_verified ? "text-blue-400 hover:bg-blue-400/10" : "text-muted-foreground hover:bg-white/5"}`}
                            title={worker.is_verified ? "Revoke verification" : "Verify"}
                          >
                            <Star className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => openEdit(worker)}
                            className="p-1 rounded text-xs text-muted-foreground hover:bg-white/5 transition-colors"
                            title="Edit commission & payout settings"
                          >
                            <Settings2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Edit modal */}
      {editWorker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-[var(--bg-card)] border border-[var(--border-default)] p-6 space-y-5 shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-heading font-semibold">Edit worker</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {editWorker.profile?.display_name ?? editWorker.profile?.email}
                </p>
              </div>
              <button onClick={() => setEditWorker(null)} className="p-1 rounded hover:bg-white/5 transition-colors">
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium mb-1.5">Commission rate (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  value={editCommission}
                  onChange={(e) => setEditCommission(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-default)] text-sm focus:outline-none focus:border-primary/50 transition-colors"
                />
                <p className="text-xs text-muted-foreground mt-1">Percentage of order value paid to the worker.</p>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5">Minimum payout ($)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={editMinPayout}
                  onChange={(e) => setEditMinPayout(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-default)] text-sm focus:outline-none focus:border-primary/50 transition-colors"
                />
                <p className="text-xs text-muted-foreground mt-1">Minimum balance required before requesting a payout.</p>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5">Max active orders</label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={editMaxOrders}
                  onChange={(e) => setEditMaxOrders(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-default)] text-sm focus:outline-none focus:border-primary/50 transition-colors"
                />
              </div>

              <div className="pt-2 border-t border-[var(--border-default)]">
                <div className="flex items-center gap-2 mb-2">
                  <Banknote className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs font-medium">Deposit paid</span>
                </div>
                <p className="text-sm font-medium mb-3">\${(editWorker.deposit_paid ?? 0).toFixed(2)} total</p>
                <div className="flex gap-2 flex-wrap">
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    placeholder="Amount"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    className="w-24 px-3 py-2 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-default)] text-sm"
                  />
                  <input
                    type="text"
                    placeholder="Note (optional)"
                    value={depositNote}
                    onChange={(e) => setDepositNote(e.target.value)}
                    className="flex-1 min-w-24 px-3 py-2 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-default)] text-sm"
                  />
                  <button
                    type="button"
                    onClick={addDeposit}
                    disabled={depositSaving || !depositAmount}
                    className="flex items-center gap-1 px-3 py-2 rounded-xl bg-primary/20 text-primary text-sm font-medium hover:bg-primary/30 disabled:opacity-40"
                  >
                    {depositSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                    Add payment
                  </button>
                </div>
                {depositError && <p className="text-xs text-red-400 mt-1">{depositError}</p>}
              </div>
            </div>

            {editError && (
              <p className="text-xs text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">{editError}</p>
            )}

            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setEditWorker(null)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-[var(--border-default)] text-sm font-medium hover:bg-white/5 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={saveEdit}
                disabled={editSaving}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary/90 disabled:opacity-40 transition-colors"
              >
                {editSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
