"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Send, Bot, User, ArrowLeft, Loader2, AlertCircle } from "lucide-react";

type Ticket = {
  id: string;
  ticket_number: string;
  subject: string;
  status: string;
  priority: string;
  category: string | null;
  is_ai_handled: boolean;
  created_at: string;
};

type Message = {
  id: string;
  content: string;
  is_ai_generated: boolean;
  created_at: string;
  sender: { display_name: string | null; role: string } | null;
};

const STATUS_LABELS: Record<string, string> = {
  open: "Open",
  awaiting_reply: "Awaiting reply",
  in_progress: "In progress",
  resolved: "Resolved",
  closed: "Closed",
};

export default function TicketDetailClient({
  ticket,
  messages: initialMessages,
  currentUserId: _currentUserId,
}: {
  ticket: Ticket;
  messages: Message[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const isClosed = ["resolved", "closed"].includes(ticket.status);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reply.trim() || sending) return;
    setSending(true);
    setError("");
    try {
      const res = await fetch(`/api/helpdesk/${ticket.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: reply }),
      });
      if (!res.ok) throw new Error("Send failed");
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          content: reply,
          is_ai_generated: false,
          created_at: new Date().toISOString(),
          sender: { display_name: "You", role: "customer" },
        },
      ]);
      setReply("");
    } catch {
      setError("Send failed. Please try again.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-col h-full max-h-[calc(100vh-120px)]">
      {/* Header */}
      <div className="flex items-start gap-3 mb-4">
        <button
          onClick={() => router.push("/support")}
          className="p-2 rounded-lg hover:bg-[var(--bg-elevated)] transition-colors mt-0.5"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono text-[var(--text-muted)]">{ticket.ticket_number}</span>
            <span className="text-xs bg-[var(--bg-elevated)] px-2 py-0.5 rounded-full">
              {STATUS_LABELS[ticket.status] ?? ticket.status}
            </span>
            {ticket.is_ai_handled && (
              <span className="text-xs bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded-full flex items-center gap-1">
                <Bot className="h-2.5 w-2.5" /> AI
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
          return (
            <div key={msg.id} className={`flex gap-3 ${isCustomer ? "" : "flex-row-reverse"}`}>
              <div className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center text-xs font-semibold ${isAI ? "bg-indigo-500/20 text-indigo-400" : isCustomer ? "bg-primary/20 text-primary" : "bg-[var(--bg-elevated)] text-[var(--text-muted)]"}`}>
                {isAI ? <Bot className="h-4 w-4" /> : <User className="h-4 w-4" />}
              </div>
              <div className={`flex-1 max-w-[80%] ${isCustomer ? "items-start" : "items-end"} flex flex-col gap-1`}>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[var(--text-muted)]">
                    {isAI ? "AI Support" : (msg.sender?.display_name ?? "Support")}
                  </span>
                  <span className="text-xs text-[var(--text-muted)]">
                    {new Date(msg.created_at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
                <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${isCustomer ? "bg-primary/20 text-[var(--text-primary)] rounded-tr-sm" : "bg-[var(--bg-card)] border border-[var(--border-default)] rounded-tl-sm"}`}>
                  {msg.content}
                </div>
                {isAI && (
                  <span className="text-xs text-indigo-400 flex items-center gap-1">
                    <Bot className="h-2.5 w-2.5" /> Generated by AI
                  </span>
                )}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Reply input */}
      {!isClosed ? (
        <form onSubmit={sendReply} className="mt-4 border-t border-[var(--border-default)] pt-4">
          {error && (
            <div className="flex items-center gap-2 text-sm text-red-400 mb-3">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          )}
          <div className="flex gap-3">
            <textarea
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendReply(e); } }}
              placeholder="Type your message... (Enter to send)"
              rows={3}
              className="flex-1 px-4 py-3 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-default)] text-sm placeholder:text-[var(--text-muted)] focus:outline-none focus:border-primary/50 transition-colors resize-none"
            />
            <button
              type="submit"
              disabled={sending || !reply.trim()}
              className="self-end px-4 py-3 rounded-xl bg-primary text-white hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </button>
          </div>
        </form>
      ) : (
        <div className="mt-4 border-t border-[var(--border-default)] pt-4 text-center text-sm text-[var(--text-muted)]">
          This ticket is {ticket.status === "resolved" ? "resolved" : "closed"}.
        </div>
      )}
    </div>
  );
}
