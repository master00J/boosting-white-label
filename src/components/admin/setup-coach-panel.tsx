"use client";

import { useCallback, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Send } from "lucide-react";

type Msg = { role: "user" | "assistant"; content: string };

export function SetupCoachPanel({
  variant,
  className = "",
}: {
  variant: "page" | "drawer";
  className?: string;
}) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;
    const prev = messages;
    const next: Msg[] = [...prev, { role: "user", content: text }];
    setInput("");
    setError(null);
    setMessages(next);
    setLoading(true);
    try {
      const res = await fetch("/api/admin/setup-assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, history: prev }),
      });
      const data = await res.json() as { reply?: string; error?: string };
      if (!res.ok) {
        setMessages(prev);
        setError(typeof data.error === "string" ? data.error : "Something went wrong.");
        return;
      }
      setMessages([...next, { role: "assistant", content: data.reply ?? "" }]);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    } catch {
      setMessages(prev);
      setError("Network error.");
    } finally {
      setLoading(false);
    }
  }, [input, loading, messages]);

  const boxHeight =
    variant === "page"
      ? "min-h-[calc(100vh-14rem)] max-h-[calc(100vh-10rem)]"
      : "h-[min(420px,50vh)]";

  return (
    <div className={`flex flex-col gap-3 ${className}`}>
      <div
        className={`overflow-y-auto rounded-xl border border-border bg-[var(--bg-elevated)]/80 p-3 space-y-3 text-sm ${boxHeight}`}
      >
        {messages.length === 0 && (
          <p className="text-muted-foreground text-xs py-8 text-center px-2">
            Ask anything about your shop — for example: “How do I enable Stripe?” or “What order should I create games and services?”
          </p>
        )}
        {messages.map((m, i) => (
          <div
            key={`${i}-${m.role}`}
            className={`rounded-lg px-3 py-2 ${
              m.role === "user"
                ? "bg-primary/15 ml-6 border border-primary/20"
                : "bg-background/80 mr-6 border border-border"
            }`}
          >
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">
              {m.role === "user" ? "Jij" : "Assistant"}
            </p>
            <p className="whitespace-pre-wrap leading-relaxed">{m.content}</p>
          </div>
        ))}
        {loading && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
            <Loader2 className="h-4 w-4 animate-spin shrink-0" />
            Thinking…
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}

      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your question…"
          rows={variant === "page" ? 4 : 3}
          className="resize-none sm:flex-1 bg-background"
          maxLength={12000}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void send();
            }
          }}
        />
        <Button type="button" onClick={() => void send()} disabled={loading || !input.trim()} className="gap-2 shrink-0">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          Send
        </Button>
      </div>
    </div>
  );
}
