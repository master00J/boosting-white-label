"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft, Ban, CheckCircle2, Shield, UserCheck, Crown, Star,
  Mail, MessageSquare, Calendar, CreditCard, TrendingUp,
  Package, Activity, Wallet, Loader2, X, Edit2, Check, ExternalLink,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import UserAvatar from "@/components/shared/user-avatar";
import type { Database } from "@/types/database";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];

type Order = {
  id: string;
  created_at: string | null;
  status: string | null;
  payment_status: string | null;
  total: number | null;
  payment_method: string | null;
  game_slug: string | null;
  service_name: string | null;
};

type LoyaltyPoints = {
  current_points: number | null;
  lifetime_points: number | null;
  tier_id: string | null;
};

type LoyaltyTransaction = {
  id: string;
  points: number | null;
  reason: string | null;
  created_at: string | null;
};

type ActivityEntry = {
  id: string;
  action: string | null;
  details: string | null;
  created_at: string | null;
};

const STATUS_COLORS: Record<string, string> = {
  pending_payment: "bg-yellow-400/10 text-yellow-400",
  paid: "bg-blue-400/10 text-blue-400",
  queued: "bg-indigo-400/10 text-indigo-400",
  claimed: "bg-purple-400/10 text-purple-400",
  in_progress: "bg-orange-400/10 text-orange-400",
  completed: "bg-green-400/10 text-green-400",
  cancelled: "bg-muted/40 text-muted-foreground",
  refunded: "bg-pink-400/10 text-pink-400",
  disputed: "bg-destructive/10 text-destructive",
};

const fmt = (d: string | null) =>
  d ? new Date(d).toLocaleDateString("nl-BE", { day: "2-digit", month: "short", year: "numeric" }) : "—";

const fmtFull = (d: string | null) =>
  d
    ? new Date(d).toLocaleString("nl-BE", {
        day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
      })
    : "—";

export default function CustomerDetailClient({
  customer: initial,
  orders,
  loyaltyPoints,
  loyaltyTransactions,
  activityLog,
  isSuperAdmin,
}: {
  customer: Profile;
  orders: Order[];
  loyaltyPoints: LoyaltyPoints | null;
  loyaltyTransactions: LoyaltyTransaction[];
  activityLog: ActivityEntry[];
  isSuperAdmin: boolean;
}) {
  const [customer, setCustomer] = useState(initial);
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Balance edit
  const [editBalance, setEditBalance] = useState(false);
  const [balanceVal, setBalanceVal] = useState(String(customer.balance ?? 0));

  // Loyalty points modal
  const [pointsModal, setPointsModal] = useState(false);
  const [pointsAmount, setPointsAmount] = useState("");
  const [pointsReason, setPointsReason] = useState("");
  const [pointsSaving, setPointsSaving] = useState(false);
  const [localPoints, setLocalPoints] = useState(loyaltyPoints?.current_points ?? 0);

  const showSuccess = (msg: string) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(null), 3000);
  };

  const handleToggleBan = async () => {
    const reason = !customer.is_banned ? prompt("Reason for ban (optional):") : null;
    setError(null);
    setLoading("ban");
    const res = await fetch("/api/admin/table/profiles", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: customer.id,
        is_banned: !customer.is_banned,
        ban_reason: !customer.is_banned ? (reason ?? null) : null,
      }),
    });
    setLoading(null);
    if (!res.ok) { const j = await res.json(); setError(j.error); return; }
    setCustomer((prev) => ({ ...prev, is_banned: !prev.is_banned, ban_reason: !prev.is_banned ? null : (reason ?? null) }));
    showSuccess(customer.is_banned ? "Account geactiveerd" : "Account gebanned");
  };

  const handleSaveBalance = async () => {
    const val = parseFloat(balanceVal);
    if (isNaN(val)) return;
    setLoading("balance");
    const res = await fetch("/api/admin/table/profiles", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: customer.id, balance: val }),
    });
    setLoading(null);
    if (!res.ok) { const j = await res.json(); setError(j.error); return; }
    setCustomer((prev) => ({ ...prev, balance: val }));
    setEditBalance(false);
    showSuccess("Balance bijgewerkt");
  };

  const handleGivePoints = async () => {
    const amount = parseInt(pointsAmount, 10);
    if (!amount || isNaN(amount)) return;
    setPointsSaving(true);
    const res = await fetch("/api/admin/loyalty-points", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profile_id: customer.id, points: amount, reason: pointsReason || undefined }),
    });
    setPointsSaving(false);
    if (!res.ok) { const j = await res.json() as { error?: string }; setError(j.error ?? "Fout"); return; }
    setLocalPoints((p) => p + amount);
    setPointsModal(false);
    setPointsAmount("");
    setPointsReason("");
    showSuccess(`${amount > 0 ? "+" : ""}${amount} punten toegekend`);
  };

  const handleRoleChange = async (role: "admin" | "super_admin" | "worker") => {
    setError(null);
    setLoading("role");
    let res: Response;
    if (role === "worker") {
      res = await fetch("/api/admin/promote-worker", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: customer.id }),
      });
    } else {
      res = await fetch("/api/admin/admin-users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: customer.email, role }),
      });
    }
    setLoading(null);
    if (!res.ok) { const j = await res.json(); setError(j.error ?? "Fout"); return; }
    showSuccess(`Rol gewijzigd naar ${role}`);
  };

  const completedOrders = orders.filter((o) => o.status === "completed").length;
  const totalSpent = customer.total_spent ?? 0;

  return (
    <div className="space-y-6">
      {/* Back */}
      <Link
        href="/admin/customers"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to customers
      </Link>

      {/* Feedback banners */}
      {error && (
        <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive flex items-center justify-between">
          {error}
          <button onClick={() => setError(null)}><X className="h-3.5 w-3.5" /></button>
        </div>
      )}
      {success && (
        <div className="p-3 rounded-lg bg-green-400/10 border border-green-400/20 text-sm text-green-400">
          {success}
        </div>
      )}

      {/* Profile header */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            <UserAvatar
              src={customer.avatar_url}
              name={customer.display_name ?? customer.email}
              size={64}
            />
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-semibold truncate">
                  {customer.display_name ?? "No name"}
                </h1>
                {customer.is_banned ? (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-destructive/10 text-destructive">
                    Banned
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-green-400/10 text-green-400">
                    Actief
                  </span>
                )}
              </div>
              <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Mail className="h-3.5 w-3.5" />{customer.email}
                </span>
                {customer.discord_username && (
                  <span className="flex items-center gap-1">
                    <MessageSquare className="h-3.5 w-3.5" />{customer.discord_username}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />Lid sinds {fmt(customer.created_at)}
                </span>
              </div>
              {customer.ban_reason && (
                <p className="mt-1 text-xs text-destructive/80">
                  Ban-reden: {customer.ban_reason}
                </p>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex flex-wrap gap-2 shrink-0">
              {isSuperAdmin && (
                <>
                  <button
                    onClick={() => handleRoleChange("admin")}
                    disabled={!!loading}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs bg-indigo-400/10 text-indigo-400 hover:bg-indigo-400/20 transition-colors disabled:opacity-50"
                  >
                    <Shield className="h-3.5 w-3.5" />Admin
                  </button>
                  <button
                    onClick={() => handleRoleChange("super_admin")}
                    disabled={!!loading}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs bg-amber-400/10 text-amber-400 hover:bg-amber-400/20 transition-colors disabled:opacity-50"
                  >
                    <Crown className="h-3.5 w-3.5" />Super admin
                  </button>
                  <button
                    onClick={() => handleRoleChange("worker")}
                    disabled={!!loading}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs bg-green-400/10 text-green-400 hover:bg-green-400/20 transition-colors disabled:opacity-50"
                  >
                    <UserCheck className="h-3.5 w-3.5" />Worker
                  </button>
                </>
              )}
              <button
                onClick={handleToggleBan}
                disabled={loading === "ban"}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs transition-colors disabled:opacity-50 ${
                  customer.is_banned
                    ? "bg-green-400/10 text-green-400 hover:bg-green-400/20"
                    : "bg-destructive/10 text-destructive hover:bg-destructive/20"
                }`}
              >
                {loading === "ban" ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : customer.is_banned ? (
                  <CheckCircle2 className="h-3.5 w-3.5" />
                ) : (
                  <Ban className="h-3.5 w-3.5" />
                )}
                {customer.is_banned ? "Unban" : "Ban"}
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              <Wallet className="h-3.5 w-3.5" />Balance
            </div>
            {editBalance ? (
              <div className="flex items-center gap-1 mt-1">
                <Input
                  value={balanceVal}
                  onChange={(e) => setBalanceVal(e.target.value)}
                  className="h-7 text-sm w-24"
                  type="number"
                  step="0.01"
                />
                <button
                  onClick={handleSaveBalance}
                  disabled={loading === "balance"}
                  className="p-1 rounded text-green-400 hover:bg-green-400/10 transition-colors"
                >
                  {loading === "balance" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                </button>
                <button onClick={() => setEditBalance(false)} className="p-1 rounded text-muted-foreground hover:bg-white/5 transition-colors">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1">
                <span className="text-lg font-semibold">\${(customer.balance ?? 0).toFixed(2)}</span>
                <button
                  onClick={() => { setEditBalance(true); setBalanceVal(String(customer.balance ?? 0)); }}
                  className="p-0.5 rounded text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Edit2 className="h-3 w-3" />
                </button>
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              <CreditCard className="h-3.5 w-3.5" />Totaal besteed
            </div>
            <p className="text-lg font-semibold">\${totalSpent.toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              <Package className="h-3.5 w-3.5" />Orders
            </div>
            <p className="text-lg font-semibold">
              {orders.length}
              <span className="text-xs text-muted-foreground font-normal ml-1">({completedOrders} afgerond)</span>
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              <Star className="h-3.5 w-3.5 text-orange-400" />Loyalty Points
            </div>
            <div className="flex items-center gap-2">
              <p className="text-lg font-semibold">{localPoints.toLocaleString()}</p>
              <button
                onClick={() => { setPointsModal(true); setPointsAmount(""); setPointsReason(""); }}
                className="p-0.5 rounded text-orange-400 hover:bg-orange-400/10 transition-colors"
                title="Adjust points"
              >
                <Edit2 className="h-3 w-3" />
              </button>
            </div>
            {loyaltyPoints?.lifetime_points != null && (
              <p className="text-xs text-muted-foreground">{loyaltyPoints.lifetime_points.toLocaleString()} lifetime</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Orders */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Package className="h-4 w-4 text-muted-foreground" />
            Orders ({orders.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {orders.length === 0 ? (
            <p className="px-6 py-8 text-center text-sm text-muted-foreground">No orders found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[500px]">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left px-4 py-2.5 text-muted-foreground font-medium text-xs">ID</th>
                    <th className="text-left px-4 py-2.5 text-muted-foreground font-medium text-xs">Service</th>
                    <th className="text-left px-4 py-2.5 text-muted-foreground font-medium text-xs hidden sm:table-cell">Datum</th>
                    <th className="text-right px-4 py-2.5 text-muted-foreground font-medium text-xs">Bedrag</th>
                    <th className="text-center px-4 py-2.5 text-muted-foreground font-medium text-xs">Status</th>
                    <th className="text-center px-4 py-2.5 text-muted-foreground font-medium text-xs"></th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o) => (
                    <tr key={o.id} className="border-b border-border/40 hover:bg-white/[0.02] transition-colors">
                      <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">
                        {o.id.split("-")[0]}…
                      </td>
                      <td className="px-4 py-2.5">
                        <p className="font-medium text-xs">{o.service_name ?? "—"}</p>
                        {o.game_slug && <p className="text-xs text-muted-foreground">{o.game_slug}</p>}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-muted-foreground hidden sm:table-cell">
                        {fmt(o.created_at)}
                      </td>
                      <td className="px-4 py-2.5 text-right font-medium text-xs">
                        \${(o.total ?? 0).toFixed(2)}
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs ${STATUS_COLORS[o.status ?? ""] ?? "bg-muted/40 text-muted-foreground"}`}>
                          {o.status ?? "—"}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <Link
                          href={`/admin/orders/${o.id}`}
                          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <ExternalLink className="h-3 w-3" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Loyalty transactions + Activity in 2 cols */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Loyalty transactions */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-orange-400" />
              Loyalty Point Transactions
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loyaltyTransactions.length === 0 ? (
              <p className="px-6 py-6 text-center text-sm text-muted-foreground">No transactions.</p>
            ) : (
              <ul className="divide-y divide-border/40">
                {loyaltyTransactions.map((t) => (
                  <li key={t.id} className="px-4 py-2.5 flex items-center justify-between gap-2">
                    <div>
                      <p className="text-sm">{t.reason ?? "Points adjustment"}</p>
                      <p className="text-xs text-muted-foreground">{fmtFull(t.created_at)}</p>
                    </div>
                    <span className={`text-sm font-semibold tabular-nums ${(t.points ?? 0) >= 0 ? "text-green-400" : "text-destructive"}`}>
                      {(t.points ?? 0) >= 0 ? "+" : ""}{t.points}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Activity log */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="h-4 w-4 text-muted-foreground" />
              Activity Log
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {activityLog.length === 0 ? (
              <p className="px-6 py-6 text-center text-sm text-muted-foreground">No activity.</p>
            ) : (
              <ul className="divide-y divide-border/40">
                {activityLog.map((a) => (
                  <li key={a.id} className="px-4 py-2.5">
                    <p className="text-sm">{a.action ?? "—"}</p>
                    {a.details && <p className="text-xs text-muted-foreground truncate max-w-xs">{a.details}</p>}
                    <p className="text-xs text-muted-foreground mt-0.5">{fmtFull(a.created_at)}</p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Loyalty points modal */}
      {pointsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-background border border-border rounded-xl shadow-2xl w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-base flex items-center gap-2">
                <Star className="h-4 w-4 text-orange-400" />
                Adjust Loyalty Points
              </h3>
              <button onClick={() => setPointsModal(false)} className="p-1 rounded-md hover:bg-white/10 transition-colors">
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
            <p className="text-sm text-muted-foreground">
              Klant: <span className="text-foreground font-medium">{customer.display_name ?? customer.email}</span>
            </p>
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
                  placeholder="e.g. compensation, promo..."
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400/50"
                />
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => setPointsModal(false)}
                  className="flex-1 h-9 rounded-md border border-border text-sm hover:bg-white/5 transition-colors"
                >
                  Annuleer
                </button>
                <button
                  onClick={handleGivePoints}
                  disabled={pointsSaving || !pointsAmount}
                  className="flex-1 h-9 rounded-md bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {pointsSaving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Bevestigen
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
