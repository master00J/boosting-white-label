"use client";

import { useState } from "react";
import { Search } from "lucide-react";

type Tx = {
  id: string;
  order_number: string;
  status: string;
  total: number;
  payment_method: string | null;
  created_at: string;
  customer: { display_name: string | null; email: string } | null;
};

const STATUS_COLORS: Record<string, string> = {
  paid: "text-blue-400 bg-blue-400/10",
  completed: "text-green-400 bg-green-400/10",
  refunded: "text-amber-400 bg-amber-400/10",
  cancelled: "text-zinc-400 bg-zinc-400/10",
  disputed: "text-red-400 bg-red-400/10",
};

const METHOD_LABELS: Record<string, string> = {
  stripe: "Stripe",
  paypal: "PayPal",
  balance: "Balance",
};

export default function TransactionsClient({ transactions }: { transactions: Tx[] }) {
  const [search, setSearch] = useState("");

  const filtered = transactions.filter((t) => {
    const q = search.toLowerCase();
    return !q || t.order_number.toLowerCase().includes(q) || t.customer?.email?.toLowerCase().includes(q) || t.customer?.display_name?.toLowerCase().includes(q);
  });

  const total = filtered.reduce((s, t) => s + t.total, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-1">Finance</p>
          <h1 className="font-heading text-2xl font-semibold">Transactions</h1>
        </div>
        <div className="text-right">
          <p className="text-xs text-[var(--text-muted)]">Total filtered</p>
          <p className="text-lg font-bold font-heading">\${total.toFixed(2)}</p>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)]" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by order number, customer..."
          className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-default)] text-sm placeholder:text-[var(--text-muted)] focus:outline-none focus:border-primary/50 transition-colors"
        />
      </div>

      <div className="rounded-2xl bg-[var(--bg-card)] border border-[var(--border-default)] overflow-x-auto">
        <table className="w-full min-w-[480px]">
          <thead>
            <tr className="border-b border-[var(--border-default)]">
              <th className="text-left text-xs font-semibold text-[var(--text-muted)] px-4 py-3 hidden sm:table-cell">Order</th>
              <th className="text-left text-xs font-semibold text-[var(--text-muted)] px-4 py-3">Customer</th>
              <th className="text-left text-xs font-semibold text-[var(--text-muted)] px-4 py-3">Amount</th>
              <th className="text-left text-xs font-semibold text-[var(--text-muted)] px-4 py-3 hidden md:table-cell">Method</th>
              <th className="text-left text-xs font-semibold text-[var(--text-muted)] px-4 py-3">Status</th>
              <th className="text-left text-xs font-semibold text-[var(--text-muted)] px-4 py-3 hidden sm:table-cell">Date</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-10 text-sm text-[var(--text-muted)]">No transactions found</td></tr>
            ) : filtered.map((tx) => (
              <tr key={tx.id} className="border-b border-[var(--border-default)] last:border-0 hover:bg-white/[0.02] transition-colors">
                <td className="px-4 py-3 text-xs font-mono text-[var(--text-muted)] hidden sm:table-cell">{tx.order_number}</td>
                <td className="px-4 py-3">
                  <p className="text-sm font-medium">{tx.customer?.display_name ?? "—"}</p>
                  <p className="text-xs text-[var(--text-muted)]">{tx.customer?.email}</p>
                </td>
                <td className="px-4 py-3 text-sm font-semibold">\${tx.total.toFixed(2)}</td>
                <td className="px-4 py-3 text-xs text-[var(--text-muted)] hidden md:table-cell">{METHOD_LABELS[tx.payment_method ?? ""] ?? tx.payment_method ?? "—"}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_COLORS[tx.status] ?? "text-zinc-400 bg-zinc-400/10"}`}>{tx.status}</span>
                </td>
                <td className="px-4 py-3 text-xs text-[var(--text-muted)] hidden sm:table-cell">{new Date(tx.created_at).toLocaleDateString("en-GB")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
