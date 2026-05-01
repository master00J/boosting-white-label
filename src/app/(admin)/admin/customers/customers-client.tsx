"use client";

import { useState } from "react";
import Link from "next/link";
import { Search, Ban, CheckCircle2, Shield, UserCheck, Crown, Star, X, Loader2, Eye } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import PageHeader from "@/components/shared/page-header";
import UserAvatar from "@/components/shared/user-avatar";
import type { Database } from "@/types/database";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];

export default function CustomersClient({
  initialCustomers,
  isSuperAdmin = false,
}: {
  initialCustomers: Profile[];
  isSuperAdmin?: boolean;
}) {
  const [customers, setCustomers] = useState<Profile[]>(initialCustomers);
  const [search, setSearch] = useState("");
  const [filterBanned, setFilterBanned] = useState("");
  const [filterRecent, setFilterRecent] = useState("");
  const [filterDiscord, setFilterDiscord] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Loyalty points modal
  const [pointsModal, setPointsModal] = useState<{ id: string; name: string } | null>(null);
  const [pointsAmount, setPointsAmount] = useState("");
  const [pointsReason, setPointsReason] = useState("");
  const [pointsSaving, setPointsSaving] = useState(false);
  const [pointsSuccess, setPointsSuccess] = useState("");

  const filtered = customers.filter((c) => {
    const name = (c.display_name ?? c.email).toLowerCase();
    const matchSearch = name.includes(search.toLowerCase()) || c.email.toLowerCase().includes(search.toLowerCase());
    const matchBanned =
      filterBanned === "banned"
        ? c.is_banned
        : filterBanned === "active"
        ? !c.is_banned
        : true;
    const matchRecent =
      filterRecent === "7d"
        ? c.created_at && new Date(c.created_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        : filterRecent === "30d"
        ? c.created_at && new Date(c.created_at) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        : true;
    const matchDiscord = !filterDiscord || !!c.discord_id;
    return matchSearch && matchBanned && matchRecent && matchDiscord;
  });

  const handleMakeAdmin = async (customer: Profile, role: "admin" | "super_admin" = "admin") => {
    setError(null);
    setLoading(customer.id);
    try {
      const res = await fetch("/api/admin/admin-users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: customer.email, role }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Something went wrong"); return; }
      setCustomers((prev) => prev.filter((c) => c.id !== customer.id));
    } finally { setLoading(null); }
  };

  const handleMakeWorker = async (customer: Profile) => {
    setError(null);
    setLoading(customer.id);
    try {
      const res = await fetch("/api/admin/promote-worker", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: customer.id }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Something went wrong"); return; }
      setCustomers((prev) => prev.filter((c) => c.id !== customer.id));
    } finally { setLoading(null); }
  };

  const handleToggleBan = async (customer: Profile) => {
    const reason = !customer.is_banned
      ? prompt("Reason for ban (optional):")
      : null;
    setError(null);
    const res = await fetch("/api/admin/table/profiles", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: customer.id,
        is_banned: !customer.is_banned,
        ban_reason: !customer.is_banned ? (reason ?? null) : null,
      }),
    });
    if (!res.ok) { const json = await res.json(); setError(json.error); return; }
    setCustomers((prev) =>
      prev.map((c) =>
        c.id === customer.id
          ? { ...c, is_banned: !c.is_banned, ban_reason: !c.is_banned ? (reason ?? null) : null }
          : c
      )
    );
  };

  const handleGivePoints = async () => {
    if (!pointsModal) return;
    const amount = parseInt(pointsAmount, 10);
    if (!amount || isNaN(amount)) return;

    setPointsSaving(true);
    const res = await fetch("/api/admin/loyalty-points", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        profile_id: pointsModal.id,
        points: amount,
        reason: pointsReason || undefined,
      }),
    });
    setPointsSaving(false);

    if (!res.ok) {
      const json = await res.json() as { error?: string };
      setError(json.error ?? "Something went wrong");
      return;
    }

    setPointsSuccess(`${amount > 0 ? "+" : ""}${amount} points granted to ${pointsModal.name}`);
    setPointsAmount("");
    setPointsReason("");
    setTimeout(() => {
      setPointsModal(null);
      setPointsSuccess("");
    }, 1800);
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Customers"
        description={`${customers.length} customers total`}
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
            placeholder="Search customer..."
            className="pl-9"
          />
        </div>
        <select
          value={filterBanned}
          onChange={(e) => setFilterBanned(e.target.value)}
          className="h-9 rounded-md border border-input bg-background text-foreground px-3 text-sm"
        >
          <option value="">All status</option>
          <option value="active">Active</option>
          <option value="banned">Banned</option>
        </select>
        <select
          value={filterRecent}
          onChange={(e) => setFilterRecent(e.target.value)}
          className="h-9 rounded-md border border-input bg-background text-foreground px-3 text-sm"
        >
          <option value="">All dates</option>
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
        </select>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={filterDiscord}
            onChange={(e) => setFilterDiscord(e.target.checked)}
            className="rounded border-input"
          />
          <span className="text-sm text-muted-foreground">Discord only</span>
        </label>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[500px]">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-4 py-3 text-muted-foreground font-medium">Customer</th>
                  <th className="text-left px-4 py-3 text-muted-foreground font-medium hidden md:table-cell">Discord</th>
                  <th className="text-right px-4 py-3 text-muted-foreground font-medium hidden sm:table-cell">Balance</th>
                  <th className="text-right px-4 py-3 text-muted-foreground font-medium hidden md:table-cell">Total spent</th>
                  <th className="text-left px-4 py-3 text-muted-foreground font-medium hidden lg:table-cell">Member since</th>
                  <th className="text-center px-4 py-3 text-muted-foreground font-medium">Status</th>
                  <th className="text-center px-4 py-3 text-muted-foreground font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                      No customers found.
                    </td>
                  </tr>
                ) : (
                  filtered.map((customer) => (
                    <tr key={customer.id} className="border-b border-border/50 hover:bg-white/[0.02] transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <UserAvatar
                            src={customer.avatar_url}
                            name={customer.display_name ?? customer.email}
                            size={28}
                          />
                          <div>
                            <p className="font-medium">{customer.display_name ?? "—"}</p>
                            <p className="text-xs text-muted-foreground">{customer.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs hidden md:table-cell">
                        {customer.discord_username ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-right font-medium hidden sm:table-cell">
                        \${(customer.balance ?? 0).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-right text-muted-foreground hidden md:table-cell">
                        \${(customer.total_spent ?? 0).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs hidden lg:table-cell">
                        {formatDate(customer.created_at ?? "")}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {customer.is_banned ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-destructive/10 text-destructive">
                            Banned
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-green-400/10 text-green-400">
                            Active
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1">
                          <Link
                            href={`/admin/customers/${customer.id}`}
                            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
                            title="Details bekijken"
                          >
                            <Eye className="h-4 w-4" />
                          </Link>
                          {isSuperAdmin && (
                            <>
                              <button
                                onClick={() => handleMakeAdmin(customer, "admin")}
                                disabled={!!loading}
                                className="p-1.5 rounded-md text-indigo-400 hover:bg-indigo-400/10 transition-colors disabled:opacity-50"
                                title="Make Admin"
                              >
                                <Shield className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleMakeAdmin(customer, "super_admin")}
                                disabled={!!loading}
                                className="p-1.5 rounded-md text-amber-400 hover:bg-amber-400/10 transition-colors disabled:opacity-50"
                                title="Make Super Admin"
                              >
                                <Crown className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleMakeWorker(customer)}
                                disabled={!!loading}
                                className="p-1.5 rounded-md text-green-400 hover:bg-green-400/10 transition-colors disabled:opacity-50"
                                title="Make worker"
                              >
                                <UserCheck className="h-4 w-4" />
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => {
                              setPointsModal({ id: customer.id, name: customer.display_name ?? customer.email });
                              setPointsAmount("");
                              setPointsReason("");
                              setPointsSuccess("");
                            }}
                            className="p-1.5 rounded-md text-orange-400 hover:bg-orange-400/10 transition-colors"
                            title="Give loyalty points"
                          >
                            <Star className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleToggleBan(customer)}
                            className={`p-1.5 rounded-md transition-colors ${
                              customer.is_banned
                                ? "text-green-400 hover:bg-green-400/10"
                                : "text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            }`}
                            title={customer.is_banned ? "Unban" : "Ban"}
                          >
                            {customer.is_banned ? (
                              <CheckCircle2 className="h-4 w-4" />
                            ) : (
                              <Ban className="h-4 w-4" />
                            )}
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

      {/* Loyalty points modal */}
      {pointsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-background border border-border rounded-xl shadow-2xl w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-base flex items-center gap-2">
                <Star className="h-4 w-4 text-orange-400" />
                Adjust loyalty points
              </h3>
              <button onClick={() => setPointsModal(null)} className="p-1 rounded-md hover:bg-white/10 transition-colors">
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>

            <p className="text-sm text-muted-foreground">
              Customer: <span className="text-foreground font-medium">{pointsModal.name}</span>
            </p>

            {pointsSuccess ? (
              <div className="p-3 rounded-lg bg-orange-400/10 border border-orange-400/20 text-orange-400 text-sm text-center font-medium">
                {pointsSuccess}
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">
                    Points <span className="text-muted-foreground/60">(negative = deduct)</span>
                  </label>
                  <input
                    type="number"
                    value={pointsAmount}
                    onChange={(e) => setPointsAmount(e.target.value)}
                    placeholder="e.g. 500 or -100"
                    className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400/50"
                  />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Reason (optional)</label>
                  <input
                    type="text"
                    value={pointsReason}
                    onChange={(e) => setPointsReason(e.target.value)}
                    placeholder="e.g. Compensation, promo..."
                    className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400/50"
                  />
                </div>
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => setPointsModal(null)}
                    className="flex-1 h-9 rounded-md border border-border text-sm hover:bg-white/5 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleGivePoints}
                    disabled={pointsSaving || !pointsAmount}
                    className="flex-1 h-9 rounded-md bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {pointsSaving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    Confirm
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
