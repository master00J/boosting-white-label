"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MessageSquare, Clock, CheckCircle, Bot, Search, Filter } from "lucide-react";

type Ticket = {
  id: string;
  ticket_number: string;
  subject: string;
  status: string;
  priority: string;
  category: string | null;
  is_ai_handled: boolean;
  ai_confidence: number | null;
  created_at: string;
  updated_at: string;
  customer: { display_name: string | null; email: string } | null;
  assigned: { display_name: string | null } | null;
};

type Stats = {
  open: number;
  inProgress: number;
  awaitingReply: number;
  resolved: number;
  aiHandled: number;
};

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  open: { label: "Open", color: "text-blue-400 bg-blue-400/10" },
  awaiting_reply: { label: "Waiting", color: "text-amber-400 bg-amber-400/10" },
  in_progress: { label: "In progress", color: "text-indigo-400 bg-indigo-400/10" },
  resolved: { label: "Resolved", color: "text-green-400 bg-green-400/10" },
  closed: { label: "Closed", color: "text-zinc-400 bg-zinc-400/10" },
};

const PRIORITY_COLORS: Record<string, string> = {
  low: "text-zinc-400",
  medium: "text-amber-400",
  high: "text-orange-400",
  urgent: "text-red-400",
};

const FILTERS = ["All", "open", "in_progress", "awaiting_reply", "resolved", "closed"];

export default function AdminHelpdeskClient({ tickets, stats }: { tickets: Ticket[]; stats: Stats }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");

  const filtered = tickets.filter((t) => {
    const matchStatus = filter === "All" || t.status === filter;
    const q = search.toLowerCase();
    const matchSearch = !q || t.ticket_number.toLowerCase().includes(q) || t.subject.toLowerCase().includes(q) || t.customer?.email?.toLowerCase().includes(q) || t.customer?.display_name?.toLowerCase().includes(q);
    return matchStatus && matchSearch;
  });

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-1">Admin</p>
        <h1 className="font-heading text-2xl font-semibold">Helpdesk</h1>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: "Open", value: stats.open, icon: MessageSquare, color: "text-blue-400" },
          { label: "In progress", value: stats.inProgress, icon: Clock, color: "text-indigo-400" },
          { label: "Awaiting reply", value: stats.awaitingReply, icon: Clock, color: "text-amber-400" },
          { label: "Resolved", value: stats.resolved, icon: CheckCircle, color: "text-green-400" },
          { label: "AI handled", value: stats.aiHandled, icon: Bot, color: "text-purple-400" },
        ].map((s) => (
          <div key={s.label} className="p-4 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-default)]">
            <s.icon className={`h-4 w-4 ${s.color} mb-2`} />
            <p className="text-2xl font-bold font-heading">{s.value}</p>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by number, subject, customer..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-default)] text-sm placeholder:text-[var(--text-muted)] focus:outline-none focus:border-primary/50 transition-colors"
          />
        </div>
        <div className="flex items-center gap-1 bg-[var(--bg-elevated)] rounded-xl p-1 border border-[var(--border-default)]">
          <Filter className="h-3.5 w-3.5 text-[var(--text-muted)] ml-2" />
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${filter === f ? "bg-primary text-white" : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"}`}
            >
              {STATUS_CONFIG[f]?.label ?? f}
            </button>
          ))}
        </div>
      </div>

      {/* Tickets table */}
      <div className="rounded-2xl bg-[var(--bg-card)] border border-[var(--border-default)] overflow-hidden">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-[var(--text-muted)]">
            <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No tickets found</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--border-default)]">
                {["Ticket", "Customer", "Subject", "Status", "Priority", "Updated"].map((h) => (
                  <th key={h} className="text-left text-xs font-semibold text-[var(--text-muted)] px-4 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((ticket) => {
                const cfg = STATUS_CONFIG[ticket.status] ?? STATUS_CONFIG.open;
                return (
                  <tr
                    key={ticket.id}
                    onClick={() => router.push(`/admin/helpdesk/${ticket.id}`)}
                    className="border-b border-[var(--border-default)] last:border-0 hover:bg-white/[0.02] cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-[var(--text-muted)]">{ticket.ticket_number}</span>
                        {ticket.is_ai_handled && <Bot className="h-3 w-3 text-indigo-400" />}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium">{ticket.customer?.display_name ?? "—"}</p>
                      <p className="text-xs text-[var(--text-muted)]">{ticket.customer?.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm max-w-[200px] truncate">{ticket.subject}</p>
                      {ticket.category && <p className="text-xs text-[var(--text-muted)]">{ticket.category}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${cfg.color}`}>{cfg.label}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium ${PRIORITY_COLORS[ticket.priority] ?? ""}`}>{ticket.priority}</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-[var(--text-muted)]">
                      {new Date(ticket.updated_at).toLocaleDateString("en-GB")}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
