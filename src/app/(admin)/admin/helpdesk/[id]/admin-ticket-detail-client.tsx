"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Send, Bot, User, ArrowLeft, Loader2, Sparkles, Lock, AlertCircle, Check, X } from "lucide-react";

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
  customer: { display_name: string | null; email: string } | null;
};

type Message = {
  id: string;
  content: string;
  is_ai_generated: boolean;
  is_internal_note: boolean;
  created_at: string;
  sender: { display_name: string | null; role: string } | null;
};

const STATUS_OPTIONS = [
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In progress" },
  { value: "awaiting_reply", label: "Awaiting reply" },
  { value: "resolved", label: "Resolved" },
  { value: "closed", label: "Closed" },
];

const PRIORITY_OPTIONS = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Normal" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
];

export default function AdminTicketDetailClient({ ticket, messages: initialMessages }: { ticket: Ticket; messages: Message[] }) {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [reply, setReply] = useState("");
  const [isInternal, setIsInternal] = useState(false);
  const [sending, setSending] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [status, setStatus] = useState(ticket.status);
  const [priority, setPriority] = useState(ticket.priority);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [aiPreviewMeta, setAiPreviewMeta] = useState<{ shouldEscalate: boolean; confidence: number } | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reply.trim() || sending) return;
    setSending(true);
    setError("");
    try {
      const body: { content: string; isInternalNote: boolean; isAiGenerated?: boolean; aiConfidence?: number; shouldEscalate?: boolean } = {
        content: reply,
        isInternalNote: isInternal,
      };
      if (aiPreviewMeta) {
        body.isAiGenerated = true;
        body.aiConfidence = aiPreviewMeta.confidence;
        body.shouldEscalate = aiPreviewMeta.shouldEscalate;
      }
      const res = await fetch(`/api/helpdesk/${ticket.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Send failed");
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          content: reply,
          is_ai_generated: !!aiPreviewMeta,
          is_internal_note: isInternal,
          created_at: new Date().toISOString(),
          sender: aiPreviewMeta ? null : { display_name: "Admin", role: "admin" },
        },
      ]);
      setReply("");
      setAiPreviewMeta(null);
    } catch {
      setError("Send failed.");
    } finally {
      setSending(false);
    }
  };

  const generateAIPreview = async () => {
    setAiLoading(true);
    setError("");
    setAiPreviewMeta(null);
    try {
      const res = await fetch("/api/helpdesk/ai/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticketId: ticket.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "AI error");
      setReply(data.content);
      setAiPreviewMeta({ shouldEscalate: data.shouldEscalate ?? false, confidence: data.confidence ?? 0.8 });
      if (data.shouldEscalate) {
        setError("⚠️ AI suggests this ticket may need human follow-up. Review and edit before sending.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "AI error");
    } finally {
      setAiLoading(false);
    }
  };

  const discardAIPreview = () => {
    setReply("");
    setAiPreviewMeta(null);
    setError("");
  };

  const saveMetadata = async () => {
    await fetch(`/api/helpdesk/${ticket.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, priority }),
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6 h-full">
      {/* Main conversation */}
      <div className="flex flex-col h-full max-h-[calc(100vh-140px)]">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => router.push("/admin/helpdesk")} className="p-2 rounded-lg hover:bg-[var(--bg-elevated)] transition-colors">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-xs font-mono text-[var(--text-muted)]">{ticket.ticket_number}</span>
              {ticket.is_ai_handled && (
                <span className="text-xs bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Bot className="h-2.5 w-2.5" /> AI {ticket.ai_confidence ? `${Math.round(ticket.ai_confidence * 100)}%` : ""}
                </span>
              )}
            </div>
            <h1 className="font-heading font-semibold text-lg truncate">{ticket.subject}</h1>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1 pb-4">
          {messages.map((msg) => {
            const isCustomer = msg.sender?.role === "customer";
            const isAI = msg.is_ai_generated;
            const isNote = msg.is_internal_note;
            return (
              <div key={msg.id} className={`flex gap-3 ${isCustomer ? "" : "flex-row-reverse"}`}>
                <div className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center ${isAI ? "bg-indigo-500/20 text-indigo-400" : isCustomer ? "bg-[var(--bg-elevated)] text-[var(--text-muted)]" : "bg-primary/20 text-primary"}`}>
                  {isAI ? <Bot className="h-4 w-4" /> : <User className="h-4 w-4" />}
                </div>
                <div className={`flex-1 max-w-[80%] flex flex-col gap-1 ${isCustomer ? "items-start" : "items-end"}`}>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[var(--text-muted)]">
                      {isAI ? "AI Support" : (msg.sender?.display_name ?? "Support")}
                    </span>
                    {isNote && (
                      <span className="text-xs bg-amber-400/10 text-amber-400 px-1.5 py-0.5 rounded flex items-center gap-1">
                        <Lock className="h-2.5 w-2.5" /> Internal
                      </span>
                    )}
                    <span className="text-xs text-[var(--text-muted)]">
                      {new Date(msg.created_at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${isCustomer ? "bg-[var(--bg-card)] border border-[var(--border-default)] rounded-tl-sm" : isNote ? "bg-amber-400/10 border border-amber-400/20 rounded-tr-sm" : "bg-primary/20 rounded-tr-sm"}`}>
                    {msg.content}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        {/* Reply */}
        <div className="mt-4 border-t border-[var(--border-default)] pt-4 space-y-3">
          {aiPreviewMeta && (
            <div className="flex items-center justify-between gap-2 text-sm text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 rounded-lg px-3 py-2">
              <span className="flex items-center gap-2">
                <Bot className="h-4 w-4 flex-shrink-0" />
                AI draft — review and edit below, then click Send to reply to the customer.
              </span>
              <button
                type="button"
                onClick={discardAIPreview}
                className="p-1.5 rounded hover:bg-indigo-500/20 transition-colors"
                title="Discard draft"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
          {error && (
            <div className="flex items-center gap-2 text-sm text-amber-400 bg-amber-400/10 border border-amber-400/20 rounded-lg px-3 py-2">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {error}
            </div>
          )}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={generateAIPreview}
              disabled={aiLoading}
              title="Generate AI draft to review before sending"
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-indigo-500/10 text-indigo-400 text-sm font-medium hover:bg-indigo-500/20 disabled:opacity-40 transition-colors"
            >
              {aiLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
              AI response
            </button>
            <label className="flex items-center gap-2 text-sm text-[var(--text-muted)] cursor-pointer">
              <input
                type="checkbox"
                checked={isInternal}
                onChange={(e) => setIsInternal(e.target.checked)}
                className="rounded"
              />
              Internal note
            </label>
          </div>
          <form onSubmit={sendReply} className="flex gap-3">
            <textarea
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendReply(e); } }}
              placeholder={isInternal ? "Internal note (not visible to customer)..." : "Reply to customer..."}
              rows={3}
              className={`flex-1 px-4 py-3 rounded-xl border text-sm placeholder:text-[var(--text-muted)] focus:outline-none transition-colors resize-none ${isInternal ? "bg-amber-400/5 border-amber-400/20 focus:border-amber-400/40" : "bg-[var(--bg-elevated)] border-[var(--border-default)] focus:border-primary/50"}`}
            />
            <button
              type="submit"
              disabled={sending || !reply.trim()}
              className="self-end px-4 py-3 rounded-xl bg-primary text-white hover:bg-primary/90 disabled:opacity-40 transition-colors"
            >
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </button>
          </form>
        </div>
      </div>

      {/* Sidebar */}
      <div className="space-y-4">
        <div className="p-4 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-default)] space-y-4">
          <h2 className="font-heading font-semibold text-sm">Ticket details</h2>
          <div>
            <label className="block text-xs text-[var(--text-muted)] mb-1.5">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-default)] text-sm focus:outline-none focus:border-primary/50 transition-colors"
            >
              {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-[var(--text-muted)] mb-1.5">Priority</label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-default)] text-sm focus:outline-none focus:border-primary/50 transition-colors"
            >
              {PRIORITY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <button
            onClick={saveMetadata}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            {saved ? <><Check className="h-4 w-4" /> Saved</> : "Save"}
          </button>
        </div>

        {ticket.customer && (
          <div className="p-4 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-default)] space-y-2">
            <h2 className="font-heading font-semibold text-sm">Customer</h2>
            <p className="text-sm font-medium">{ticket.customer.display_name ?? "—"}</p>
            <p className="text-xs text-[var(--text-muted)]">{ticket.customer.email}</p>
          </div>
        )}

        <div className="p-4 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-default)] space-y-2">
          <h2 className="font-heading font-semibold text-sm">Info</h2>
          {ticket.category && <div className="flex justify-between text-xs"><span className="text-[var(--text-muted)]">Category</span><span>{ticket.category}</span></div>}
          <div className="flex justify-between text-xs"><span className="text-[var(--text-muted)]">Created</span><span>{new Date(ticket.created_at).toLocaleDateString("en-GB")}</span></div>
          {ticket.is_ai_handled && (
            <div className="flex justify-between text-xs">
              <span className="text-[var(--text-muted)]">AI confidence</span>
              <span className="text-indigo-400">{ticket.ai_confidence ? `${Math.round(ticket.ai_confidence * 100)}%` : "—"}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
