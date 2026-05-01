"use client";

import { useState } from "react";
import { CheckCircle, Clock, Loader2, XCircle, RefreshCw } from "lucide-react";

type Payout = {
  id: string;
  amount: number;
  method: string;
  status: string;
  notes: string | null;
  transaction_id: string | null;
  created_at: string;
  processed_at: string | null;
  worker: {
    payout_details_encrypted: string | null;
    profile: { display_name: string | null; email: string } | null;
  } | null;
};

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  pending: { label: "Pending", color: "text-amber-400 bg-amber-400/10", icon: Clock },
  processing: { label: "Processing", color: "text-blue-400 bg-blue-400/10", icon: Loader2 },
  completed: { label: "Completed", color: "text-green-400 bg-green-400/10", icon: CheckCircle },
  failed: { label: "Failed", color: "text-red-400 bg-red-400/10", icon: XCircle },
};

export default function PayoutsAdminClient({ payouts: initial }: { payouts: Payout[] }) {
  const [payouts, setPayouts] = useState<Payout[]>(initial);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [filter, setFilter] = useState("pending");
  // Per-payout transaction ID input state
  const [txInputs, setTxInputs] = useState<Record<string, string>>({});

  const filtered = filter === "all" ? payouts : payouts.filter((p) => p.status === filter);
  const pendingTotal = payouts
    .filter((p) => p.status === "pending" || p.status === "processing")
    .reduce((s, p) => s + p.amount, 0);

  const updateStatus = async (id: string, status: string) => {
    setLoadingId(id);
    try {
      const transaction_id = txInputs[id]?.trim() || undefined;
      const res = await fetch(`/api/admin/payouts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, ...(transaction_id ? { transaction_id } : {}) }),
      });
      if (res.ok) {
        setPayouts((prev) =>
          prev.map((p) =>
            p.id === id
              ? { ...p, status, processed_at: new Date().toISOString(), transaction_id: transaction_id ?? p.transaction_id }
              : p
          )
        );
      }
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-1">Finance</p>
          <h1 className="font-heading text-2xl font-semibold">Payouts</h1>
        </div>
        <div className="text-right">
          <p className="text-xs text-[var(--text-muted)]">Outstanding</p>
          <p className="text-lg font-bold font-heading text-amber-400">${pendingTotal.toFixed(2)}</p>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 bg-[var(--bg-elevated)] rounded-xl p-1 border border-[var(--border-default)] w-fit">
        {[["pending", "Pending"], ["processing", "Processing"], ["completed", "Completed"], ["all", "All"]].map(([v, l]) => (
          <button
            key={v}
            onClick={() => setFilter(v)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${filter === v ? "bg-primary text-white" : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"}`}
          >
            {l}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-[var(--text-muted)] text-sm">No payouts found</div>
        ) : filtered.map((payout) => {
          const cfg = STATUS_CONFIG[payout.status] ?? STATUS_CONFIG.pending;
          const StatusIcon = cfg.icon;
          const isLoading = loadingId === payout.id;
          const isActive = payout.status === "pending" || payout.status === "processing";
          return (
            <div key={payout.id} className="p-4 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-default)] space-y-3">
              <div className="flex items-start gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-semibold">${payout.amount.toFixed(2)}</p>
                    <span className={`flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${cfg.color}`}>
                      <StatusIcon className="h-3 w-3" />
                      {cfg.label}
                    </span>
                  </div>
                  <p className="text-sm">{payout.worker?.profile?.display_name ?? "—"}</p>
                  <p className="text-xs text-[var(--text-muted)]">{payout.worker?.profile?.email} · {payout.method}</p>
                  {payout.worker?.payout_details_encrypted && (
                    <p className="text-xs font-mono text-[var(--text-secondary)] mt-0.5 bg-[var(--bg-elevated)] px-2 py-0.5 rounded-md inline-block">
                      {payout.worker.payout_details_encrypted}
                    </p>
                  )}
                  <p className="text-xs text-[var(--text-muted)] mt-0.5">
                    Requested: {new Date(payout.created_at).toLocaleDateString("en-US")}
                    {payout.transaction_id && <> · Ref: <span className="font-mono">{payout.transaction_id}</span></>}
                  </p>
                </div>
              </div>

              {/* Action row for active payouts */}
              {isActive && (
                <div className="flex items-center gap-2 pt-1 border-t border-[var(--border-default)]">
                  <input
                    type="text"
                    placeholder="Transaction ID / reference (optional)"
                    value={txInputs[payout.id] ?? ""}
                    onChange={(e) => setTxInputs((prev) => ({ ...prev, [payout.id]: e.target.value }))}
                    className="flex-1 text-xs bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-lg px-3 py-1.5 text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-primary"
                  />
                  {payout.status === "pending" && (
                    <button
                      onClick={() => updateStatus(payout.id, "processing")}
                      disabled={isLoading}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500/10 text-blue-400 text-xs font-medium hover:bg-blue-500/20 disabled:opacity-40 transition-colors whitespace-nowrap"
                    >
                      {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                      Processing
                    </button>
                  )}
                  <button
                    onClick={() => updateStatus(payout.id, "completed")}
                    disabled={isLoading}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-500/10 text-green-400 text-xs font-medium hover:bg-green-500/20 disabled:opacity-40 transition-colors whitespace-nowrap"
                  >
                    {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle className="h-3.5 w-3.5" />}
                    Mark paid
                  </button>
                  <button
                    onClick={() => updateStatus(payout.id, "failed")}
                    disabled={isLoading}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 text-xs font-medium hover:bg-red-500/20 disabled:opacity-40 transition-colors"
                  >
                    {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <XCircle className="h-3.5 w-3.5" />}
                    Failed
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
