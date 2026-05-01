"use client";

import { useState } from "react";
import { Wallet, ArrowDownLeft, ArrowUpRight, Plus, TrendingUp, Ticket, Copy, Check, AlertCircle } from "lucide-react";
import type { UserCoupon } from "./page";

type Transaction = {
  id: string;
  order_number: string;
  status: string;
  total: number;
  payment_method: string | null;
  created_at: string;
  service: { name: string } | null;
};

const METHOD_LABEL: Record<string, string> = {
  stripe: "Creditcard",
  paypal: "PayPal",
  balance: "Balance",
};

function CopyButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs text-[var(--text-muted)] hover:bg-white/10 hover:text-[var(--text-primary)] transition-colors"
      title="Copy code"
    >
      {copied ? <Check className="h-3 w-3 text-green-400" /> : <Copy className="h-3 w-3" />}
      {copied ? "Copied!" : "Copy"}
    </button>
  );
}

export default function WalletClient({
  balance,
  totalSpent,
  transactions,
  coupons,
}: {
  balance: number;
  totalSpent: number;
  transactions: Transaction[];
  coupons: UserCoupon[];
}) {
  const [showTopup, setShowTopup] = useState(false);
  const [topupAmount, setTopupAmount] = useState("");

  const QUICK_AMOUNTS = [5, 10, 20, 50];

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-1">My account</p>
        <h1 className="font-heading text-2xl font-semibold">Wallet</h1>
      </div>

      {/* Balance cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="sm:col-span-2 p-6 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-primary" />
              <span className="text-sm font-medium text-[var(--text-secondary)]">Available balance</span>
            </div>
            <button
              onClick={() => setShowTopup(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-medium hover:bg-primary/90 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              Top up
            </button>
          </div>
          <p className="font-heading text-4xl font-bold">${balance.toFixed(2)}</p>
          <p className="text-xs text-[var(--text-muted)] mt-2">Can be used on your next order</p>
        </div>
        <div className="p-5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-default)]">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="h-4 w-4 text-orange-400" />
              <span className="text-xs text-[var(--text-muted)]">Total spent</span>
          </div>
          <p className="font-heading text-2xl font-bold text-orange-400">${totalSpent.toFixed(2)}</p>
          <p className="text-xs text-[var(--text-muted)] mt-1">{transactions.length} transactions</p>
        </div>
      </div>

      {/* Top-up modal */}
      {showTopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div className="w-full max-w-sm p-6 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-default)] space-y-5">
            <h2 className="font-heading font-semibold">Top up balance</h2>
            <div className="grid grid-cols-4 gap-2">
              {QUICK_AMOUNTS.map((a) => (
                <button
                  key={a}
                  onClick={() => setTopupAmount(String(a))}
                  className={`py-2 rounded-lg text-sm font-medium border transition-colors ${
                    topupAmount === String(a)
                      ? "bg-primary text-white border-primary"
                      : "border-[var(--border-default)] text-[var(--text-secondary)] hover:border-primary/50"
                  }`}
                >
                  ${a}
                </button>
              ))}
            </div>
            <div>
              <label className="block text-xs text-[var(--text-muted)] mb-1.5">Custom amount</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] text-sm">$</span>
                <input
                  type="number"
                  min="1"
                  step="0.01"
                  value={topupAmount}
                  onChange={(e) => setTopupAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full pl-7 pr-4 py-2.5 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-default)] text-sm focus:outline-none focus:border-primary/50 transition-colors"
                />
              </div>
            </div>
            <p className="text-xs text-[var(--text-muted)] bg-[var(--bg-elevated)] rounded-lg px-3 py-2">
              Top up via Stripe or PayPal. Balance never expires and can be used for all orders.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowTopup(false)}
                className="flex-1 py-2.5 rounded-xl border border-[var(--border-default)] text-sm font-medium text-[var(--text-secondary)] hover:bg-white/5 transition-colors"
              >
                Cancel
              </button>
              <button
                disabled={!topupAmount || parseFloat(topupAmount) < 1}
                className="flex-1 py-2.5 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {/* My coupons */}
      <div className="rounded-2xl bg-[var(--bg-card)] border border-[var(--border-default)] overflow-hidden">
        <div className="px-5 py-4 border-b border-[var(--border-default)] flex items-center gap-2">
          <Ticket className="h-4 w-4 text-[#E8720C]" />
          <h2 className="font-heading font-semibold text-sm">My coupons</h2>
          {coupons.length > 0 && (
            <span className="ml-auto text-xs text-[var(--text-muted)]">{coupons.filter(c => c.is_active).length} active</span>
          )}
        </div>
        {coupons.length === 0 ? (
          <div className="text-center py-10">
            <Ticket className="h-8 w-8 text-[var(--text-muted)] mx-auto mb-2 opacity-40" />
            <p className="text-sm text-[var(--text-muted)]">No coupons yet</p>
            <p className="text-xs text-[var(--text-muted)] mt-1 opacity-60">Open lootboxes to win discount codes</p>
          </div>
        ) : (
          <div className="divide-y divide-[var(--border-default)]">
            {coupons.map((coupon) => {
              const isExpired = coupon.expires_at ? new Date(coupon.expires_at) < new Date() : false;
              const isUsedUp = coupon.max_uses !== null && coupon.current_uses >= coupon.max_uses;
              const inactive = !coupon.is_active || isExpired || isUsedUp;
              const discountLabel = coupon.discount_type === "percentage"
                ? `${coupon.discount_value}% off`
                : `$${Number(coupon.discount_value).toFixed(2)} off`;

              return (
                <div key={coupon.id} className={`px-5 py-4 transition-colors ${inactive ? "opacity-50" : ""}`}>
                  <div className="flex items-start gap-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${inactive ? "bg-[var(--bg-elevated)]" : "bg-[#E8720C]/10"}`}>
                      <Ticket className={`h-4 w-4 ${inactive ? "text-[var(--text-muted)]" : "text-[#E8720C]"}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <code className={`font-mono text-sm font-bold tracking-wider select-all ${inactive ? "text-[var(--text-muted)]" : "text-[#E8720C]"}`}>
                          {coupon.code}
                        </code>
                        {inactive ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-[var(--bg-elevated)] text-[var(--text-muted)]">
                            <AlertCircle className="h-2.5 w-2.5" />
                            {isExpired ? "Expired" : isUsedUp ? "Used" : "Inactive"}
                          </span>
                        ) : (
                          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-[#E8720C]/10 text-[#E8720C] border border-[#E8720C]/20">
                            Active
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[var(--text-muted)] mt-0.5">
                        {coupon.description ?? discountLabel}
                      </p>
                      <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                        <span className="text-xs font-semibold text-[var(--text-secondary)]">{discountLabel}</span>
                        {coupon.expires_at && (
                          <span className="text-xs text-[var(--text-muted)]">
                            Expires {new Date(coupon.expires_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                          </span>
                        )}
                        {coupon.max_uses && (
                          <span className="text-xs text-[var(--text-muted)]">
                            {coupon.current_uses}/{coupon.max_uses} uses
                          </span>
                        )}
                      </div>
                    </div>
                    {!inactive && <CopyButton code={coupon.code} />}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Transaction history */}
      <div className="rounded-2xl bg-[var(--bg-card)] border border-[var(--border-default)] overflow-hidden">
        <div className="px-5 py-4 border-b border-[var(--border-default)]">
          <h2 className="font-heading font-semibold text-sm">Transaction history</h2>
        </div>
        {transactions.length === 0 ? (
          <div className="text-center py-14">
            <Wallet className="h-10 w-10 text-[var(--text-muted)] mx-auto mb-3" />
            <p className="text-sm font-medium text-[var(--text-secondary)]">No transactions yet</p>
          </div>
        ) : (
          <div className="divide-y divide-[var(--border-default)]">
            {transactions.map((tx) => {
              const isRefund = tx.status === "refunded";
              return (
                <div key={tx.id} className="flex items-center gap-4 px-5 py-3.5">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${isRefund ? "bg-green-400/10" : "bg-red-400/10"}`}>
                    {isRefund
                      ? <ArrowDownLeft className="h-4 w-4 text-green-400" />
                      : <ArrowUpRight className="h-4 w-4 text-red-400" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{tx.service?.name ?? "Order"}</p>
                    <p className="text-xs text-[var(--text-muted)]">
                      #{tx.order_number} · {METHOD_LABEL[tx.payment_method ?? ""] ?? tx.payment_method} · {new Date(tx.created_at).toLocaleDateString("en-GB")}
                    </p>
                  </div>
                  <span className={`text-sm font-bold flex-shrink-0 ${isRefund ? "text-green-400" : "text-[var(--text-primary)]"}`}>
                    {isRefund ? "+" : "-"}${tx.total.toFixed(2)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
