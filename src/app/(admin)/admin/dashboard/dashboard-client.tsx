"use client";

import Link from "next/link";
import {
  ShoppingBag,
  Zap,
  Users,
  Wrench,
  TrendingUp,
  DollarSign,
  Clock,
  CheckCircle2,
  MessageSquare,
  ChevronRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import PageHeader from "@/components/shared/page-header";
import { formatUSD } from "@/lib/format";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";

interface Stats {
  totalOrders: number;
  activeOrders: number;
  totalCustomers: number;
  totalWorkers: number;
  revenueThisMonth: number;
  revenueChart: { month: string; revenue: number }[];
  ordersChart: { day: string; orders: number }[];
  openTicketsCount: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  recentOrders: any[];
}

const STATUS_COLORS: Record<string, string> = {
  pending_payment: "text-zinc-400 bg-zinc-400/10",
  paid: "text-blue-400 bg-blue-400/10",
  queued: "text-yellow-400 bg-yellow-400/10",
  claimed: "text-purple-400 bg-purple-400/10",
  in_progress: "text-blue-400 bg-blue-400/10",
  paused: "text-orange-400 bg-orange-400/10",
  completed: "text-green-400 bg-green-400/10",
  cancelled: "text-red-400 bg-red-400/10",
  refunded: "text-red-400 bg-red-400/10",
  disputed: "text-red-400 bg-red-400/10",
};

const STATUS_LABELS: Record<string, string> = {
  pending_payment: "Pending payment",
  paid: "Paid",
  queued: "Queued",
  claimed: "Claimed",
  in_progress: "In progress",
  paused: "Paused",
  completed: "Completed",
  cancelled: "Cancelled",
  refunded: "Refunded",
  disputed: "Disputed",
};

interface KpiCardProps {
  title: string;
  value: string | number;
  icon: React.ElementType;
  sub?: string;
  color?: string;
}

function KpiCard({ title, value, icon: Icon, sub, color = "text-primary" }: KpiCardProps) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-3xl font-bold mt-1">{value}</p>
            {sub && <p className="text-xs mt-1 text-muted-foreground">{sub}</p>}
          </div>
          <div className={`p-3 rounded-xl bg-primary/10 ${color}`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AdminDashboardClient({ stats, canSeeFinance = true }: { stats: Stats; canSeeFinance?: boolean }) {
  const completionRate = stats.totalOrders > 0
    ? Math.round((stats.totalOrders - stats.activeOrders) / stats.totalOrders * 100)
    : 0;

  return (
    <div className="space-y-6">
      <PageHeader title="Staff Overview" description="Platform overview" />

      {/* Ticket alert — melding wanneer er open tickets zijn */}
      {stats.openTicketsCount > 0 && (
        <Link
          href="/admin/helpdesk"
          className="flex items-center gap-4 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/15 transition-colors"
        >
          <div className="p-2.5 rounded-lg bg-amber-500/20">
            <MessageSquare className="h-5 w-5 text-amber-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-amber-200">
              {stats.openTicketsCount} support ticket{stats.openTicketsCount !== 1 ? "s" : ""} waiting for a reply
            </p>
            <p className="text-sm text-amber-200/70 mt-0.5">
              Open or awaiting reply — click to view
            </p>
          </div>
          <ChevronRight className="h-5 w-5 text-amber-400 flex-shrink-0" />
        </Link>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard title="Total orders" value={stats.totalOrders} icon={ShoppingBag} />
        <KpiCard title="Active orders" value={stats.activeOrders} icon={Zap} color="text-yellow-400" />
        <KpiCard title="Customers" value={stats.totalCustomers} icon={Users} color="text-blue-400" />
        <KpiCard title="Active workers" value={stats.totalWorkers} icon={Wrench} color="text-green-400" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {canSeeFinance && (
          <KpiCard
            title="Revenue this month"
            value={formatUSD(stats.revenueThisMonth)}
            icon={DollarSign}
            color="text-green-400"
          />
        )}
        <KpiCard title="Avg. completion time" value="—" icon={Clock} color="text-purple-400" sub="No data yet" />
        <KpiCard
          title="Completion rate"
          value={stats.totalOrders > 0 ? `${completionRate}%` : "—"}
          icon={CheckCircle2}
          color="text-green-400"
        />
        <KpiCard title="Growth MoM" value="—" icon={TrendingUp} color="text-primary" sub="No data yet" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {canSeeFinance && (
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">Revenue (last 7 months)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={stats.revenueChart}>
                  <defs>
                    <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#71717a" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 12, fill: "#71717a" }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v}`} />
                  <Tooltip
                    contentStyle={{ background: "#1c1c24", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8 }}
                    labelStyle={{ color: "#f4f4f5" }}
                    formatter={(v: number) => [formatUSD(v), "Revenue"]}
                  />
                  <Area type="monotone" dataKey="revenue" stroke="#6366f1" strokeWidth={2} fill="url(#revenueGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        <Card className={canSeeFinance ? "" : "lg:col-span-2"}>
          <CardHeader>
            <CardTitle className="text-base">Orders this week</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={stats.ordersChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="day" tick={{ fontSize: 12, fill: "#71717a" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: "#71717a" }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: "#1c1c24", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8 }}
                  labelStyle={{ color: "#f4f4f5" }}
                />
                <Bar dataKey="orders" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent orders</CardTitle>
        </CardHeader>
        <CardContent>
          {stats.recentOrders.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No orders yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[400px]">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 pr-4 text-muted-foreground font-medium hidden sm:table-cell">Order</th>
                    <th className="text-left py-2 pr-4 text-muted-foreground font-medium">Customer</th>
                    <th className="text-left py-2 pr-4 text-muted-foreground font-medium hidden md:table-cell">Service</th>
                    <th className="text-left py-2 pr-4 text-muted-foreground font-medium">Status</th>
                    {canSeeFinance && <th className="text-right py-2 text-muted-foreground font-medium">Amount</th>}
                  </tr>
                </thead>
                <tbody>
                  {stats.recentOrders.map((order) => (
                    <tr key={order.id} className="border-b border-border/50 hover:bg-white/[0.02] transition-colors">
                      <td className="py-3 pr-4 font-mono text-xs text-muted-foreground hidden sm:table-cell">{order.order_number}</td>
                      <td className="py-3 pr-4 font-medium">{order.profiles?.display_name ?? "—"}</td>
                      <td className="py-3 pr-4 text-muted-foreground hidden md:table-cell">{order.services?.name ?? "—"}</td>
                      <td className="py-3 pr-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[order.status] ?? "text-zinc-400 bg-zinc-400/10"}`}>
                          {STATUS_LABELS[order.status] ?? order.status}
                        </span>
                      </td>
                      {canSeeFinance && <td className="py-3 text-right font-medium">{formatUSD(Number(order.total))}</td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
