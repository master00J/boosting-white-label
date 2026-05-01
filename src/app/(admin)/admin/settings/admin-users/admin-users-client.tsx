"use client";

import { useState } from "react";
import { Shield, ShieldCheck, UserPlus, Trash2, Crown, Plus, Pencil } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import UserAvatar from "@/components/shared/user-avatar";
import { ADMIN_SECTION_KEYS, ADMIN_SECTION_LABELS } from "@/lib/admin-sections";

type AdminProfile = {
  id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  role: "admin" | "super_admin" | null;
  admin_rank_id: string | null;
  created_at: string | null;
};

type Rank = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  section_keys: string[];
};

export default function AdminUsersClient({
  initialAdmins,
  initialRanks,
  currentUserId,
  isSuperAdmin,
}: {
  initialAdmins: AdminProfile[];
  initialRanks: Rank[];
  currentUserId: string | null;
  isSuperAdmin: boolean;
}) {
  const [admins, setAdmins] = useState<AdminProfile[]>(initialAdmins);
  const [ranks, setRanks] = useState<Rank[]>(initialRanks);
  const [email, setEmail] = useState("");
  const [newRole, setNewRole] = useState<"admin" | "super_admin">("admin");
  const [newAdminRankId, setNewAdminRankId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Rank form state (create/edit)
  const [showRankForm, setShowRankForm] = useState(false);
  const [editingRank, setEditingRank] = useState<Rank | null>(null);
  const [rankName, setRankName] = useState("");
  const [rankSlug, setRankSlug] = useState("");
  const [rankDescription, setRankDescription] = useState("");
  const [rankSectionKeys, setRankSectionKeys] = useState<string[]>([]);
  const [rankSaving, setRankSaving] = useState(false);
  const [rankError, setRankError] = useState<string | null>(null);

  const sectionsForPicker = ADMIN_SECTION_KEYS.filter((k) => k !== "ranks");

  function slugify(s: string): string {
    return s.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9_-]/g, "");
  }

  const openCreateRank = () => {
    setEditingRank(null);
    setRankName("");
    setRankSlug("");
    setRankDescription("");
    setRankSectionKeys([]);
    setShowRankForm(true);
    setRankError(null);
  };

  const openEditRank = (rank: Rank) => {
    setEditingRank(rank);
    setRankName(rank.name);
    setRankSlug(rank.slug);
    setRankDescription(rank.description ?? "");
    setRankSectionKeys(rank.section_keys.filter((k) => k !== "ranks"));
    setShowRankForm(true);
    setRankError(null);
  };

  const closeRankForm = () => {
    setShowRankForm(false);
    setEditingRank(null);
    setRankError(null);
  };

  const toggleRankSection = (key: string) => {
    setRankSectionKeys((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const handleRankNameChange = (v: string) => {
    setRankName(v);
    if (!editingRank) setRankSlug(slugify(v));
  };

  const saveRank = async () => {
    if (!rankName.trim()) {
      setRankError("Name is required.");
      return;
    }
    if (!rankSlug.trim()) {
      setRankError("Slug is required.");
      return;
    }
    setRankSaving(true);
    setRankError(null);
    try {
      if (editingRank) {
        const res = await fetch(`/api/admin/ranks/${editingRank.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: rankName.trim(),
            slug: rankSlug.trim(),
            description: rankDescription.trim() || null,
            section_keys: rankSectionKeys,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          setRankError(data.error ?? "Failed to save");
          return;
        }
        setRanks((prev) => prev.map((r) => (r.id === editingRank.id ? data : r)));
      } else {
        const res = await fetch("/api/admin/ranks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: rankName.trim(),
            slug: rankSlug.trim(),
            description: rankDescription.trim() || undefined,
            section_keys: rankSectionKeys,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          setRankError(data.error ?? "Failed to create");
          return;
        }
        setRanks((prev) => [...prev, data]);
      }
      closeRankForm();
    } finally {
      setRankSaving(false);
    }
  };

  const deleteRank = async (id: string) => {
    if (!confirm("Delete this rank? Admins with this rank will keep their access until you assign a new rank.")) return;
    const res = await fetch(`/api/admin/ranks/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json();
      setRankError(data.error ?? "Failed to delete");
      return;
    }
    setRanks((prev) => prev.filter((r) => r.id !== id));
    if (editingRank?.id === id) closeRankForm();
  };

  const formatDate = (d: string | null) =>
    d ? new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—";

  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      const res = await fetch("/api/admin/admin-users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          role: newRole,
          admin_rank_id: newRole === "admin" && newAdminRankId ? newAdminRankId : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong");
        return;
      }
      setAdmins((prev) => [data, ...prev]);
      setEmail("");
      setSuccess(`${data.email} is now ${newRole === "super_admin" ? "Super Admin" : "Admin"}.`);
    } finally {
      setLoading(false);
    }
  };

  const handleChangeRole = async (admin: AdminProfile, newRole: "admin" | "super_admin", adminRankId?: string | null) => {
    if (admin.role === newRole && (newRole !== "admin" || admin.admin_rank_id === (adminRankId ?? null))) return;
    if (admin.id === currentUserId && newRole === "admin") {
      setError("You cannot demote yourself.");
      return;
    }
    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      const res = await fetch("/api/admin/admin-users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: admin.id,
          newRole,
          admin_rank_id: newRole === "admin" ? (adminRankId ?? null) : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong");
        return;
      }
      setAdmins((prev) => prev.map((a) => (a.id === admin.id ? { ...a, role: newRole, admin_rank_id: data.admin_rank_id ?? null } : a)));
      setSuccess(`Role updated to ${newRole === "super_admin" ? "Super Admin" : "Admin"}.`);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveAdmin = async (admin: AdminProfile) => {
    if (!confirm(`Remove admin access from ${admin.display_name ?? admin.email}?`)) return;
    if (admin.role === "super_admin" && admin.id === currentUserId) {
      setError("You cannot remove admin access from yourself.");
      return;
    }
    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      const res = await fetch("/api/admin/admin-users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: admin.id, newRole: "customer" }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong");
        return;
      }
      setAdmins((prev) => prev.filter((a) => a.id !== admin.id));
      setSuccess("Admin access has been removed.");
    } finally {
      setLoading(false);
    }
  };

  const canManage = isSuperAdmin;

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-1">Settings</p>
        <h1 className="font-heading text-2xl font-semibold">Admin Access</h1>
        <p className="text-sm text-[var(--text-muted)] mt-1">
          Manage who has access to the admin dashboard. Only super_admins can add or remove admins.
        </p>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive">
          {error}
        </div>
      )}
      {success && (
        <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-sm text-green-400">
          {success}
        </div>
      )}

      {canManage && (
        <>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-medium flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Ranks
                </h2>
                <Button variant="outline" size="sm" onClick={openCreateRank} disabled={showRankForm}>
                  <Plus className="h-4 w-4 mr-2" />
                  New rank
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mb-3">
                Create ranks and specify which pages each rank can access. Then assign a rank under &quot;Add admin&quot; or in the list below.
              </p>
              {rankError && (
                <div className="p-2 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive mb-3">
                  {rankError}
                </div>
              )}
              {showRankForm && (
                <div className="p-4 rounded-xl bg-muted/30 border border-border space-y-4 mb-4">
                  <h3 className="font-medium">{editingRank ? "Edit rank" : "New rank"}</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label>Name</Label>
                      <Input
                        value={rankName}
                        onChange={(e) => handleRankNameChange(e.target.value)}
                        placeholder="e.g. Support"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Slug</Label>
                      <Input
                        value={rankSlug}
                        onChange={(e) => setRankSlug(e.target.value)}
                        placeholder="support"
                        className="font-mono"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Description (optional)</Label>
                    <Textarea
                      value={rankDescription}
                      onChange={(e) => setRankDescription(e.target.value)}
                      placeholder="Short description of this rank"
                      rows={2}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Pages this rank has access to</Label>
                    <div className="flex flex-wrap gap-3 p-3 rounded-lg bg-background/50 border border-border">
                      {sectionsForPicker.map((key) => (
                        <label key={key} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={rankSectionKeys.includes(key)}
                            onChange={() => toggleRankSection(key)}
                            className="rounded border-border"
                          />
                          <span className="text-sm">{ADMIN_SECTION_LABELS[key] ?? key}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={saveRank} disabled={rankSaving}>
                      {rankSaving ? "Saving…" : editingRank ? "Save" : "Create rank"}
                    </Button>
                    <Button variant="outline" onClick={closeRankForm} disabled={rankSaving}>
                      Cancel
                    </Button>
                    {editingRank && (
                      <Button
                        variant="destructive"
                        onClick={() => deleteRank(editingRank.id)}
                        disabled={rankSaving}
                        className="ml-auto"
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Delete
                      </Button>
                    )}
                  </div>
                </div>
              )}
              {ranks.length === 0 && !showRankForm ? (
                <p className="text-sm text-muted-foreground">No ranks yet. Click &quot;New rank&quot; to create one.</p>
              ) : (
                <div className="space-y-1">
                  {ranks.map((rank) => (
                    <div
                      key={rank.id}
                      className="flex items-center justify-between gap-2 py-2 px-3 rounded-lg hover:bg-muted/30"
                    >
                      <div>
                        <span className="font-medium">{rank.name}</span>
                        <span className="text-muted-foreground text-xs ml-2 font-mono">{rank.slug}</span>
                        {rank.section_keys.length > 0 && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {rank.section_keys.map((k) => ADMIN_SECTION_LABELS[k] ?? k).join(", ")}
                          </p>
                        )}
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => openEditRank(rank)} aria-label="Edit">
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
          <Card>
          <CardContent className="p-4">
            <h2 className="text-sm font-medium mb-3 flex items-center gap-2">
              <UserPlus className="h-4 w-4" />
              Add admin
            </h2>
            <form onSubmit={handleAddAdmin} className="flex flex-col gap-3">
              <div className="flex flex-col sm:flex-row gap-2">
                <Input
                  type="email"
                  placeholder="User's email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="flex-1"
                  disabled={loading}
                />
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as "admin" | "super_admin")}
                  className="h-9 rounded-md border border-input bg-background px-3 text-sm min-w-[120px]"
                >
                  <option value="admin">Admin</option>
                  <option value="super_admin">Super Admin</option>
                </select>
                {newRole === "admin" && ranks.length > 0 && (
                  <select
                    value={newAdminRankId}
                    onChange={(e) => setNewAdminRankId(e.target.value)}
                    className="h-9 rounded-md border border-input bg-background px-3 text-sm min-w-[140px]"
                  >
                    <option value="">No rank (full access)</option>
                    {ranks.map((r) => (
                      <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                  </select>
                )}
                <Button type="submit" disabled={loading || !email.trim()}>
                  {loading ? "..." : "Add"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
        </>
      )}

      <Card>
        <CardContent className="p-0">
          <div className="p-4 border-b border-border">
            <h2 className="text-sm font-medium flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Admins with access ({admins.length})
            </h2>
          </div>
          <div className="divide-y divide-border">
            {admins.length === 0 ? (
              <div className="px-4 py-12 text-center text-muted-foreground text-sm">
                No admins found.
              </div>
            ) : (
              admins.map((admin) => (
                <div
                  key={admin.id}
                  className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-white/[0.02] transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <UserAvatar
                      src={admin.avatar_url}
                      name={admin.display_name ?? admin.email}
                      size={36}
                    />
                    <div className="min-w-0">
                      <p className="font-medium truncate">{admin.display_name ?? "—"}</p>
                      <p className="text-xs text-muted-foreground truncate">{admin.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                        admin.role === "super_admin"
                          ? "bg-amber-500/10 text-amber-400"
                          : "bg-indigo-500/10 text-indigo-400"
                      }`}
                    >
                      {admin.role === "super_admin" ? (
                        <>
                          <Crown className="h-3 w-3" /> Super Admin
                        </>
                      ) : (
                        <>
                          <ShieldCheck className="h-3 w-3" /> Admin
                        </>
                      )}
                    </span>
                    {admin.role === "admin" && (!canManage || admin.id === currentUserId) && (
                      <span className="text-xs text-muted-foreground">
                        Rank: {admin.admin_rank_id ? ranks.find((r) => r.id === admin.admin_rank_id)?.name ?? "—" : "Full access"}
                      </span>
                    )}
                    {canManage && admin.id !== currentUserId && (
                      <div className="flex items-center gap-2 flex-wrap">
                        <select
                          value={admin.role ?? "admin"}
                          onChange={(e) => handleChangeRole(admin, e.target.value as "admin" | "super_admin")}
                          disabled={loading}
                          className="h-7 rounded-md border border-input bg-background px-2 text-xs"
                        >
                          <option value="admin">Admin</option>
                          <option value="super_admin">Super Admin</option>
                        </select>
                        {admin.role === "admin" && (
                          <select
                            value={admin.admin_rank_id ?? ""}
                            onChange={(e) => handleChangeRole(admin, "admin", e.target.value || null)}
                            disabled={loading}
                            className="h-7 rounded-md border border-input bg-background px-2 text-xs min-w-[130px]"
                            title="Assign rank"
                          >
                            <option value="">Full access</option>
                            {ranks.map((r) => (
                              <option key={r.id} value={r.id}>{r.name}</option>
                            ))}
                          </select>
                        )}
                      </div>
                    )}
                    <span className="text-xs text-muted-foreground hidden sm:inline">
                      {formatDate(admin.created_at)}
                    </span>
                    {canManage && (
                      <button
                        onClick={() => handleRemoveAdmin(admin)}
                        disabled={loading || (admin.id === currentUserId && admin.role === "super_admin")}
                        className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        title={
                          admin.id === currentUserId && admin.role === "super_admin"
                            ? "You cannot remove yourself"
                            : "Remove admin access"
                        }
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
