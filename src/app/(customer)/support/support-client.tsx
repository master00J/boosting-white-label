"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, MessageSquare, Clock, CheckCircle, AlertCircle, Loader2, X } from "lucide-react";

type Ticket = {
  id: string;
  ticket_number: string;
  subject: string;
  status: string;
  priority: string;
  category: string | null;
  is_ai_handled: boolean;
  created_at: string;
  updated_at: string;
};

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  open: { label: "Open", color: "text-blue-400 bg-blue-400/10", icon: MessageSquare },
  awaiting_reply: { label: "Awaiting reply", color: "text-orange-400 bg-orange-400/10", icon: Clock },
  in_progress: { label: "In progress", color: "text-indigo-400 bg-indigo-400/10", icon: Loader2 },
  resolved: { label: "Resolved", color: "text-green-400 bg-green-400/10", icon: CheckCircle },
  closed: { label: "Closed", color: "text-zinc-400 bg-zinc-400/10", icon: X },
};

const PRIORITY_COLORS: Record<string, string> = {
  low: "text-zinc-400",
  medium: "text-orange-400",
  high: "text-orange-400",
  urgent: "text-red-400",
};

const CATEGORIES = ["Order", "Payment", "Account", "Technical", "Other"];

export default function SupportClient({ tickets }: { tickets: Ticket[] }) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ subject: "", message: "", category: "Other", priority: "medium" });
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/helpdesk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error creating ticket");
      setShowForm(false);
      setForm({ subject: "", message: "", category: "Other", priority: "medium" });
      router.push(`/support/${data.ticket.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-1">Support</p>
          <h1 className="font-heading text-2xl font-semibold">My tickets</h1>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4" />
          New ticket
        </button>
      </div>

      {/* New ticket form */}
      {showForm && (
        <div className="p-6 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-default)]">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-heading font-semibold">New support ticket</h2>
            <button onClick={() => setShowForm(false)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">Category</label>
                <select
                  value={form.category}
                  onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-default)] text-sm focus:outline-none focus:border-primary/50 transition-colors"
                >
                  {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Priority</label>
                <select
                  value={form.priority}
                  onChange={(e) => setForm((p) => ({ ...p, priority: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-default)] text-sm focus:outline-none focus:border-primary/50 transition-colors"
                >
                  <option value="low">Low</option>
                  <option value="medium">Normal</option>
                  <option value="high">High</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Subject</label>
              <input
                type="text"
                required
                value={form.subject}
                onChange={(e) => setForm((p) => ({ ...p, subject: e.target.value }))}
                placeholder="Briefly describe your issue"
                className="w-full px-3 py-2.5 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-default)] text-sm placeholder:text-[var(--text-muted)] focus:outline-none focus:border-primary/50 transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Message</label>
              <textarea
                required
                rows={5}
                value={form.message}
                onChange={(e) => setForm((p) => ({ ...p, message: e.target.value }))}
                placeholder="Describe your issue in as much detail as possible..."
                className="w-full px-3 py-2.5 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-default)] text-sm placeholder:text-[var(--text-muted)] focus:outline-none focus:border-primary/50 transition-colors resize-none"
              />
            </div>
            {error && (
              <div className="flex items-center gap-2 text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                {error}
              </div>
            )}
            <div className="flex gap-3 justify-end">
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg border border-[var(--border-default)] text-sm hover:bg-[var(--bg-elevated)] transition-colors">
                Cancel
              </button>
              <button type="submit" disabled={submitting} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 disabled:opacity-40 transition-colors">
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                Create ticket
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tickets list */}
      {tickets.length === 0 && !showForm ? (
        <div className="text-center py-16 text-[var(--text-muted)]">
          <MessageSquare className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No tickets</p>
          <p className="text-sm mt-1">Have a question or issue? Create a ticket.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tickets.map((ticket) => {
            const cfg = STATUS_CONFIG[ticket.status] ?? STATUS_CONFIG.open;
            const StatusIcon = cfg.icon;
            return (
              <button
                key={ticket.id}
                onClick={() => router.push(`/support/${ticket.id}`)}
                className="w-full text-left p-4 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-default)] hover:border-primary/30 transition-all"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-mono text-[var(--text-muted)]">{ticket.ticket_number}</span>
                      {ticket.category && (
                        <span className="text-xs bg-[var(--bg-elevated)] px-2 py-0.5 rounded-full">{ticket.category}</span>
                      )}
                      {ticket.is_ai_handled && (
                        <span className="text-xs bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded-full">AI</span>
                      )}
                    </div>
                    <p className="font-medium text-sm truncate">{ticket.subject}</p>
                    <p className="text-xs text-[var(--text-muted)] mt-1">
                      Updated {new Date(ticket.updated_at).toLocaleDateString("en-GB")}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    <span className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${cfg.color}`}>
                      <StatusIcon className="h-3 w-3" />
                      {cfg.label}
                    </span>
                    <span className={`text-xs font-medium ${PRIORITY_COLORS[ticket.priority] ?? ""}`}>
                      {ticket.priority}
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
