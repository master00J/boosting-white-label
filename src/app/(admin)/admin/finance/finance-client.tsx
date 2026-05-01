"use client";

import { TrendingUp, DollarSign, ArrowUpRight, Clock } from "lucide-react";

type MonthData = { label: string; revenue: number; payoutCost: number; margin: number };
type Stats = { totalRevenue: number; totalPayoutCost: number; pendingPayouts: number; completedOrders: number };

export default function FinanceClient({ monthlyData, stats }: { monthlyData: MonthData[]; stats: Stats }) {
  const maxRevenue = Math.max(...monthlyData.map((m) => m.revenue), 1);
  const marginPct = stats.totalRevenue > 0 ? ((stats.totalRevenue - stats.totalPayoutCost) / stats.totalRevenue) * 100 : 0;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-1">Admin</p>
        <h1 className="font-heading text-2xl font-semibold">Finance</h1>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total revenue", value: `\$${stats.totalRevenue.toFixed(2)}`, icon: DollarSign, color: "text-green-400" },
          { label: "Paid out to boosters", value: `\$${stats.totalPayoutCost.toFixed(2)}`, icon: ArrowUpRight, color: "text-amber-400" },
          { label: "Margin", value: `${marginPct.toFixed(1)}%`, icon: TrendingUp, color: "text-indigo-400" },
          { label: "Outstanding payouts", value: `\$${stats.pendingPayouts.toFixed(2)}`, icon: Clock, color: "text-orange-400" },
        ].map((s) => (
          <div key={s.label} className="p-5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-default)]">
            <s.icon className={`h-4 w-4 ${s.color} mb-3`} />
            <p className="text-2xl font-bold font-heading">{s.value}</p>
            <p className="text-xs text-[var(--text-muted)] mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Revenue chart */}
      <div className="p-5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-default)]">
        <h2 className="font-heading font-semibold text-sm mb-4">Revenue — last 6 months</h2>
        <div className="flex items-end gap-3 h-40">
          {monthlyData.map((m) => (
            <div key={m.label} className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full flex flex-col gap-0.5 justify-end" style={{ height: "120px" }}>
                <div
                  className="w-full bg-primary/30 rounded-t-sm"
                  style={{ height: `${(m.payoutCost / maxRevenue) * 100}%` }}
                  title={`Payout: \$${m.payoutCost.toFixed(2)}`}
                />
                <div
                  className="w-full bg-primary rounded-t-sm"
                  style={{ height: `${(m.margin / maxRevenue) * 100}%` }}
                  title={`Margin: \$${m.margin.toFixed(2)}`}
                />
              </div>
              <span className="text-xs text-[var(--text-muted)]">{m.label}</span>
              <span className="text-xs font-medium">\${m.revenue.toFixed(0)}</span>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-4 mt-3">
          <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
            <div className="w-3 h-3 rounded-sm bg-primary" /> Margin
          </div>
          <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
            <div className="w-3 h-3 rounded-sm bg-primary/30" /> Booster payout
          </div>
        </div>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <a href="/admin/finance/transactions" className="p-5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-default)] hover:border-primary/30 transition-colors">
          <h3 className="font-heading font-semibold text-sm mb-1">Transactions</h3>
          <p className="text-xs text-[var(--text-muted)]">All payments and refunds</p>
        </a>
        <a href="/admin/finance/payouts" className="p-5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-default)] hover:border-primary/30 transition-colors">
          <h3 className="font-heading font-semibold text-sm mb-1">Payouts</h3>
          <p className="text-xs text-[var(--text-muted)]">Process booster payouts</p>
        </a>
      </div>
    </div>
  );
}
