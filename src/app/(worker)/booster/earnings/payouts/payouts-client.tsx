"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, DollarSign, Clock, CheckCircle2, XCircle, Loader2, AlertCircle } from "lucide-react";

type PayoutRow = {
  id: string;
  amount: number;
  method: string;
  status: string;
  transaction_id: string | null;
  created_at: string;
  processed_at: string | null;
};

const STATUS_LABEL: Record<string, string> = {
  pending: "Pending",
  processing: "Processing",
  completed: "Paid out",
  failed: "Failed",
};

const STATUS_COLOR: Record<string, string> = {
  pending: "text-orange-400 bg-orange-400/10 border-orange-400/20",
  processing: "text-blue-400 bg-blue-400/10 border-blue-400/20",
  completed: "text-green-400 bg-green-400/10 border-green-400/20",
  failed: "text-red-400 bg-red-400/10 border-red-400/20",
};

const STATUS_ICON: Record<string, React.ElementType> = {
  pending: Clock,
  processing: Loader2,
  completed: CheckCircle2,
  failed: XCircle,
};

export default function PayoutsClient({
  pendingBalance,
  payoutMinimum,
  payoutMethod,
  payouts,
}: {
  pendingBalance: number;
  payoutMinimum: number;
  payoutMethod: string | null;
  payouts: PayoutRow[];
}) {
  const [requesting, setRequesting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const canRequest = pendingBalance >= payoutMinimum && !!payoutMethod;

  const requestPayout = async () => {
    setRequesting(true);
    setError("");
    try {
      const res = await fetch("/api/worker/payouts/request", { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Request failed.");
        return;
      }
      setSuccess(true);
    } finally {
      setRequesting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <Link
          href="/booster/earnings"
          className="p-2 rounded-lg hover:bg-white/5 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-1">Earnings</p>
          <h1 className="font-heading text-2xl font-semibold">Payouts</h1>
        </div>
      </div>

      {/* Balance card */}
      <div className="p-6 rounded-2xl bg-gradient-to-br from-green-500/20 to-green-500/5 border border-green-500/20">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-green-400" />
            <span className="text-sm font-medium text-[var(--text-secondary)]">Pending balance</span>
          </div>
        </div>
        <p className="font-heading text-4xl font-bold text-green-400">${pendingBalance.toFixed(2)}</p>
        <p className="text-xs text-[var(--text-muted)] mt-2">
          Minimum payout: ${payoutMinimum.toFixed(2)}
        </p>

        {success ? (
          <div className="mt-4 flex items-center gap-2 text-sm text-green-400 bg-green-400/10 border border-green-400/20 rounded-lg px-3 py-2">
            <CheckCircle2 className="h-4 w-4" />
            Payout request submitted! Admin will process this as soon as possible.
          </div>
        ) : (
          <>
            {error && (
              <div className="mt-3 flex items-center gap-2 text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                {error}
              </div>
            )}
            {!payoutMethod && (
              <div className="mt-3 flex items-center gap-2 text-sm text-orange-400 bg-orange-400/10 border border-orange-400/20 rounded-lg px-3 py-2">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                Please set a payout method first.{" "}
                <Link href="/booster/settings" className="underline">Settings</Link>
              </div>
            )}
            <button
              onClick={requestPayout}
              disabled={!canRequest || requesting}
              className="mt-4 flex items-center gap-2 px-5 py-2.5 rounded-xl bg-green-500 text-white text-sm font-medium hover:bg-green-500/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {requesting ? <Loader2 className="h-4 w-4 animate-spin" /> : <DollarSign className="h-4 w-4" />}
              Request payout
            </button>
          </>
        )}
      </div>

      {/* Payout history */}
      <div className="rounded-2xl bg-[var(--bg-card)] border border-[var(--border-default)] overflow-hidden">
        <div className="px-5 py-4 border-b border-[var(--border-default)]">
          <h2 className="font-heading font-semibold text-sm">Payout history</h2>
        </div>
        {payouts.length === 0 ? (
          <div className="text-center py-12">
            <DollarSign className="h-10 w-10 text-[var(--text-muted)] mx-auto mb-3" />
            <p className="text-sm text-[var(--text-secondary)]">No payouts yet</p>
          </div>
        ) : (
          <div className="divide-y divide-[var(--border-default)]">
            {payouts.map((payout) => {
              const Icon = STATUS_ICON[payout.status] ?? Clock;
              return (
                <div key={payout.id} className="flex items-center gap-4 px-5 py-3.5">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${STATUS_COLOR[payout.status]?.split(" ")[1] ?? ""}`}>
                    <Icon className={`h-4 w-4 ${STATUS_COLOR[payout.status]?.split(" ")[0] ?? ""}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium capitalize">{payout.method}</p>
                    <p className="text-xs text-[var(--text-muted)]">
                      {new Date(payout.created_at).toLocaleDateString("en-US")}
                      {payout.transaction_id && ` · ${payout.transaction_id}`}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-bold text-green-400">${payout.amount.toFixed(2)}</p>
                    <span className={`text-xs px-1.5 py-0.5 rounded-full border ${STATUS_COLOR[payout.status] ?? ""}`}>
                      {STATUS_LABEL[payout.status] ?? payout.status}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
