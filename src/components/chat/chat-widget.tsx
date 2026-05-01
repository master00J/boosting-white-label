"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/components/providers/auth-provider";
import { MessageCircle, X, Send, Loader2, Lock, ChevronLeft, CheckCheck, Plus, Bell, BellOff } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import Link from "next/link";

interface ChatMessage {
  id: string;
  sender_role: "customer" | "agent" | "system";
  sender_name: string;
  body: string;
  created_at: string;
}

interface Conversation {
  id: string;
  status: string;
  order_number?: string | null;
  game_name?: string | null;
  service_name?: string | null;
  last_message_at?: string | null;
  unread_count?: number | null;
}

declare global {
  interface WindowEventMap {
    "chat:open": CustomEvent<{
      conversationId?: string;
      initialMessage?: string;
      gameName?: string;
      serviceName?: string;
      autoStart?: boolean;
    }>;
  }
}

type View = "list" | "chat" | "new";

export default function ChatWidget() {
  const pathname = usePathname();
  const { user, loading: authLoading } = useAuth();
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<View>("list");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConv, setActiveConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingConvs, setLoadingConvs] = useState(false);
  const [loadingChat, setLoadingChat] = useState(false);
  const [closingConv, setClosingConv] = useState(false);
  const [unread, setUnread] = useState(0);
  const [startInput, setStartInput] = useState("");
  const [pushStatus, setPushStatus] = useState<"default" | "granted" | "denied" | "unsupported" | "busy">("default");
  const bottomRef = useRef<HTMLDivElement>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const startInputRef = useRef<HTMLTextAreaElement>(null);
  const supabase = createClient();
  const isAdmin = pathname?.startsWith("/admin") ?? false;

  const scrollToBottom = useCallback(() => {
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
  }, []);

  const loadConversations = useCallback(async () => {
    if (!user) return;
    setLoadingConvs(true);
    try {
      const res = await fetch("/api/chat/conversations");
      if (!res.ok) return;
      const data = await res.json() as { conversations: Conversation[] };
      setConversations(data.conversations ?? []);
      return data.conversations ?? [];
    } finally {
      setLoadingConvs(false);
    }
  }, [user]);

  const openChat = useCallback(async (conv: Conversation) => {
    setActiveConv(conv);
    setView("chat");
    setLoadingChat(true);
    try {
      const res = await fetch(`/api/chat/conversations/${conv.id}/messages`);
      if (res.ok) {
        const data = await res.json() as { conversation: Conversation; messages: ChatMessage[] };
        setActiveConv(data.conversation);
        setMessages(data.messages);
        // Mark as read locally
        setConversations(prev =>
          prev.map(c => c.id === conv.id ? { ...c, unread_count: 0 } : c)
        );
      }
    } finally {
      setLoadingChat(false);
      scrollToBottom();
    }
  }, [scrollToBottom]);

  const backToList = useCallback(() => {
    setView("list");
    setActiveConv(null);
    setMessages([]);
    setInput("");
    loadConversations();
  }, [loadConversations]);

  // Play a soft "pling" using Web Audio API — no sound file needed
  const playMessageSound = useCallback(() => {
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioContext();
      }
      const ctx = audioCtxRef.current;
      // Resume if suspended (browser autoplay policy)
      if (ctx.state === "suspended") ctx.resume();

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.type = "sine";
      osc.frequency.setValueAtTime(880, ctx.currentTime);        // A5
      osc.frequency.exponentialRampToValueAtTime(660, ctx.currentTime + 0.12); // E5

      gain.gain.setValueAtTime(0.18, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.35);

      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.35);
    } catch {
      // AudioContext not available — silently skip
    }
  }, []);

  // Realtime for active conversation
  useEffect(() => {
    if (!activeConv?.id || !user) return;
    const channel = supabase
      .channel(`chat:${activeConv.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: `conversation_id=eq.${activeConv.id}`,
        },
        (payload) => {
          const msg = payload.new as ChatMessage;
          setMessages(prev => {
            // If already present (e.g. added via API response), skip
            if (prev.some(m => m.id === msg.id)) return prev;
            // Replace any temp message with same body/role sent by this user
            const tempIdx = prev.findIndex(m =>
              m.id.startsWith("temp-") && m.body === msg.body && m.sender_role === msg.sender_role
            );
            if (tempIdx !== -1) {
              const next = [...prev];
              next[tempIdx] = msg;
              return next;
            }
            return [...prev, msg];
          });
          if (msg.sender_role === "agent") {
            if (!open) setUnread(n => n + 1);
            // Play in-app sound when agent replies (foreground)
            playMessageSound();
          }
          scrollToBottom();
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [activeConv?.id, user, open, scrollToBottom, supabase, playMessageSound]);

  // Listen for external chat:open events (from checkout success / reward claim CTAs)
  useEffect(() => {
    const handler = async (e: CustomEvent<{
      conversationId?: string;
      initialMessage?: string;
      gameName?: string;
      serviceName?: string;
      autoStart?: boolean;
    }>) => {
      setOpen(true);
      if (e.detail?.conversationId) {
        const res = await fetch(`/api/chat/conversations/${e.detail.conversationId}/messages`);
        if (res.ok) {
          const data = await res.json() as { conversation: Conversation; messages: ChatMessage[] };
          setConversations(prev => {
            const exists = prev.some(c => c.id === data.conversation.id);
            return exists ? prev : [data.conversation, ...prev];
          });
          setActiveConv(data.conversation);
          setMessages(data.messages);
          setView("chat");
        }
      } else if (e.detail?.initialMessage) {
        const initialMessage = e.detail.initialMessage.trim();
        if (!initialMessage) return;

        if (e.detail.autoStart && user) {
          setLoadingChat(true);
          try {
            const res = await fetch("/api/chat/conversations", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                initial_message: initialMessage,
                game_name: e.detail.gameName ?? null,
                service_name: e.detail.serviceName ?? null,
              }),
            });
            if (res.ok) {
              const data = await res.json() as { conversation: Conversation };
              setConversations(prev => [data.conversation, ...prev.filter(c => c.id !== data.conversation.id)]);
              const msgRes = await fetch(`/api/chat/conversations/${data.conversation.id}/messages`);
              if (msgRes.ok) {
                const msgData = await msgRes.json() as { conversation: Conversation; messages: ChatMessage[] };
                setActiveConv(msgData.conversation);
                setMessages(msgData.messages);
              } else {
                setActiveConv(data.conversation);
                setMessages([]);
              }
              setStartInput("");
              setView("chat");
              scrollToBottom();
            } else {
              setStartInput(initialMessage);
              setView("new");
            }
          } finally {
            setLoadingChat(false);
          }
        } else {
          setStartInput(initialMessage);
          setView("new");
          setTimeout(() => startInputRef.current?.focus(), 50);
        }
      }
    };
    window.addEventListener("chat:open", handler);
    return () => window.removeEventListener("chat:open", handler);
  }, [scrollToBottom, user]);

  // Load conversations when widget opens
  useEffect(() => {
    if (open && user && view === "list") {
      loadConversations().then(convs => {
        if (convs && convs.length === 0) setView("new");
      });
      setUnread(0);
    }
  }, [open, user]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (messages.length) scrollToBottom();
  }, [messages, scrollToBottom]);

  // Initialize push notification status
  useEffect(() => {
    if (!("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window)) {
      setPushStatus("unsupported");
    } else {
      setPushStatus(Notification.permission as "default" | "granted" | "denied");
    }
  }, []);

  const togglePush = async () => {
    if (pushStatus === "busy" || pushStatus === "unsupported") return;
    setPushStatus("busy");
    try {
      if (pushStatus === "granted") {
        // Unsubscribe
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        if (sub) {
          await fetch("/api/push/subscribe", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ endpoint: sub.endpoint }),
          });
          await sub.unsubscribe();
        }
        setPushStatus("default");
      } else {
        // Subscribe
        const permission = await Notification.requestPermission();
        if (permission !== "granted") { setPushStatus("denied"); return; }
        const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
        if (!vapidKey) { setPushStatus("default"); return; }
        const reg = await navigator.serviceWorker.ready;
        const padding = "=".repeat((4 - (vapidKey.length % 4)) % 4);
        const base64 = (vapidKey + padding).replace(/-/g, "+").replace(/_/g, "/");
        const raw = atob(base64);
        const key = new Uint8Array(raw.length);
        for (let i = 0; i < raw.length; i++) key[i] = raw.charCodeAt(i);
        const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key });
        const json = sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } };
        await fetch("/api/push/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: json.endpoint, keys: json.keys }),
        });
        setPushStatus("granted");
      }
    } catch {
      setPushStatus(Notification.permission as "default" | "granted" | "denied");
    }
  };

  const startConversation = async () => {
    if (!user) return;
    setLoadingChat(true);
    try {
      const res = await fetch("/api/chat/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          startInput.trim() ? { initial_message: startInput.trim() } : {}
        ),
      });
      if (!res.ok) return;
      const data = await res.json() as { conversation: Conversation };
      setConversations(prev => [data.conversation, ...prev]);
      setStartInput("");
      // Load messages
      const msgRes = await fetch(`/api/chat/conversations/${data.conversation.id}/messages`);
      if (msgRes.ok) {
        const msgData = await msgRes.json() as { messages: ChatMessage[] };
        setMessages(msgData.messages);
      } else {
        setMessages([]);
      }
      setActiveConv(data.conversation);
      setView("chat");
    } finally {
      setLoadingChat(false);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || !activeConv || sending) return;
    const text = input.trim();
    const tempId = `temp-${Date.now()}`;
    setInput("");
    setSending(true);

    // Optimistically add temp message
    setMessages(prev => [...prev, {
      id: tempId,
      sender_role: "customer",
      sender_name: "You",
      body: text,
      created_at: new Date().toISOString(),
    }]);
    scrollToBottom();

    try {
      const res = await fetch(`/api/chat/conversations/${activeConv.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: text }),
      });
      if (res.ok) {
        const data = await res.json() as { message?: ChatMessage };
        if (data.message) {
          // Replace temp message with the real one (prevents duplicate from realtime)
          setMessages(prev => prev.map(m => m.id === tempId ? data.message! : m));
        }
      }
    } finally {
      setSending(false);
    }
  };

  const closeConversation = async () => {
    if (!activeConv || closingConv) return;
    setClosingConv(true);
    try {
      await fetch(`/api/chat/conversations/${activeConv.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "closed" }),
      });
      setActiveConv(prev => prev ? { ...prev, status: "closed" } : null);
      setConversations(prev =>
        prev.map(c => c.id === activeConv.id ? { ...c, status: "closed" } : c)
      );
    } finally {
      setClosingConv(false);
    }
  };

  if (authLoading || isAdmin) return null;

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(v => !v)}
        className={cn(
          "fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all duration-200",
          "bg-primary hover:bg-primary/90 text-white",
          open && "scale-90 opacity-0 pointer-events-none"
        )}
        aria-label="Open chat"
      >
        <MessageCircle className="h-6 w-6" />
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center font-bold">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {/* Chat panel */}
      <div
        className={cn(
          "fixed bottom-6 right-6 z-50 w-[360px] max-w-[calc(100vw-1.5rem)] rounded-2xl shadow-2xl border border-white/10 bg-[#16161e] flex flex-col transition-all duration-300 origin-bottom-right",
          open ? "opacity-100 scale-100 pointer-events-auto" : "opacity-0 scale-95 pointer-events-none"
        )}
        style={{ height: "520px" }}
      >
        {/* Header */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10 bg-primary/10 rounded-t-2xl flex-shrink-0">
          {(view === "chat" || view === "new") && (
            <button
              onClick={() => {
                if (view === "new" && conversations.length === 0) {
                  setOpen(false);
                } else {
                  backToList();
                  setView(conversations.length > 0 ? "list" : "new");
                }
              }}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors flex-shrink-0"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          )}
          <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
            <MessageCircle className="h-3.5 w-3.5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white leading-tight">
              {view === "list" ? "Support Chat" : view === "new" ? "New conversation" : (activeConv?.order_number ? `Order #${activeConv.order_number}` : "Support Chat")}
            </p>
            {view === "list" && (
              <p className="text-xs text-green-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />
                Online · replies within minutes
              </p>
            )}
          </div>
          {view === "list" && (
            <button
              onClick={() => setView("new")}
              title="New conversation"
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <Plus className="h-4 w-4" />
            </button>
          )}
          {/* Push notification toggle — only shown to logged-in customers on supported browsers */}
          {user && pushStatus !== "unsupported" && (
            <button
              onClick={togglePush}
              disabled={pushStatus === "busy" || pushStatus === "denied"}
              title={
                pushStatus === "granted" ? "Notifications on — click to disable"
                : pushStatus === "denied" ? "Notifications blocked in browser settings"
                : "Enable notifications for new replies"
              }
              className={cn(
                "p-1.5 rounded-lg transition-colors",
                pushStatus === "granted"
                  ? "text-green-400 hover:text-zinc-400 hover:bg-white/10"
                  : pushStatus === "denied"
                  ? "text-zinc-600 cursor-not-allowed"
                  : "text-zinc-400 hover:text-white hover:bg-white/10"
              )}
            >
              {pushStatus === "busy"
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : pushStatus === "granted"
                ? <Bell className="h-4 w-4" />
                : <BellOff className="h-4 w-4" />
              }
            </button>
          )}
          {view === "chat" && activeConv?.status === "open" && (
            <button
              onClick={closeConversation}
              disabled={closingConv}
              title="Close conversation"
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-40"
            >
              {closingConv ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCheck className="h-4 w-4" />}
            </button>
          )}
          <button
            onClick={() => setOpen(false)}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 min-h-0 flex flex-col">
          {!user ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 px-6 text-center">
              <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center">
                <Lock className="h-5 w-5 text-zinc-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-white mb-1">Sign in to chat</p>
                <p className="text-xs text-zinc-400">You need an account to use live support.</p>
              </div>
              <Link
                href="/login"
                className="px-4 py-2 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                Sign in
              </Link>
            </div>
          ) : view === "list" ? (
            <ConversationList
              conversations={conversations}
              loading={loadingConvs}
              onOpen={openChat}
              onNew={() => setView("new")}
            />
          ) : view === "new" ? (
            <NewConversationView
              startInput={startInput}
              setStartInput={setStartInput}
              onStart={startConversation}
              loading={loadingChat}
              inputRef={startInputRef}
            />
          ) : (
            <ChatView
              conversation={activeConv}
              messages={messages}
              loading={loadingChat}
              input={input}
              setInput={setInput}
              onSend={sendMessage}
              sending={sending}
              bottomRef={bottomRef}
              inputRef={inputRef}
              onStartNew={() => setView("new")}
            />
          )}
        </div>
      </div>
    </>
  );
}

// ── Sub-components ──────────────────────────────────────────────

function ConversationList({
  conversations, loading, onOpen, onNew,
}: {
  conversations: Conversation[];
  loading: boolean;
  onOpen: (c: Conversation) => void;
  onNew: () => void;
}) {
  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="h-5 w-5 text-zinc-500 animate-spin" />
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 px-6 text-center">
        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
          <MessageCircle className="h-5 w-5 text-primary" />
        </div>
        <div>
          <p className="text-sm font-medium text-white mb-1">No conversations yet</p>
          <p className="text-xs text-zinc-400">Start a chat and our team will reply within minutes.</p>
        </div>
        <button
          onClick={onNew}
          className="px-4 py-2 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          Start a conversation
        </button>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto py-2">
      {conversations.map(conv => (
        <button
          key={conv.id}
          onClick={() => onOpen(conv)}
          className="w-full px-4 py-3 flex items-start gap-3 hover:bg-white/5 transition-colors text-left"
        >
          <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0 mt-0.5">
            <MessageCircle className="h-3.5 w-3.5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium text-white truncate">
                {conv.order_number ? `Order #${conv.order_number}` : "General support"}
              </p>
              <span className={cn(
                "text-[10px] px-1.5 py-0.5 rounded-full flex-shrink-0",
                conv.status === "open"
                  ? "bg-green-500/15 text-green-400"
                  : "bg-zinc-700 text-zinc-400"
              )}>
                {conv.status === "open" ? "Open" : "Closed"}
              </span>
            </div>
            <p className="text-xs text-zinc-400 truncate mt-0.5">
              {conv.game_name ?? "Tap to open"}
            </p>
          </div>
          {(conv.unread_count ?? 0) > 0 && (
            <span className="w-5 h-5 rounded-full bg-primary text-white text-[10px] flex items-center justify-center font-bold flex-shrink-0">
              {conv.unread_count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

function NewConversationView({
  startInput, setStartInput, onStart, loading, inputRef,
}: {
  startInput: string;
  setStartInput: (v: string) => void;
  onStart: () => void;
  loading: boolean;
  inputRef: React.RefObject<HTMLTextAreaElement | null>;
}) {
  return (
    <div className="flex-1 flex flex-col px-4 py-4 gap-3">
      <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center">
        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
          <MessageCircle className="h-5 w-5 text-primary" />
        </div>
        <div>
          <p className="text-sm font-medium text-white mb-1">How can we help?</p>
          <p className="text-xs text-zinc-400">Ask a question or report an issue — we reply within minutes.</p>
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <textarea
          ref={inputRef}
          value={startInput}
          onChange={e => setStartInput(e.target.value)}
          onKeyDown={e => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              if (startInput.trim()) onStart();
            }
          }}
          placeholder="Type your message…"
          rows={3}
          className="w-full resize-none bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-zinc-500 outline-none focus:border-primary/50 transition-colors"
          autoFocus
        />
        <button
          onClick={onStart}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {loading
            ? <Loader2 className="h-4 w-4 animate-spin" />
            : <><Send className="h-4 w-4" />{startInput.trim() ? "Send message" : "Start conversation"}</>}
        </button>
      </div>
    </div>
  );
}

function ChatView({
  conversation, messages, loading, input, setInput, onSend, sending,
  bottomRef, inputRef, onStartNew,
}: {
  conversation: Conversation | null;
  messages: ChatMessage[];
  loading: boolean;
  input: string;
  setInput: (v: string) => void;
  onSend: () => void;
  sending: boolean;
  bottomRef: React.RefObject<HTMLDivElement | null>;
  inputRef: React.RefObject<HTMLTextAreaElement | null>;
  onStartNew: () => void;
}) {
  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="h-5 w-5 text-zinc-500 animate-spin" />
      </div>
    );
  }

  return (
    <>
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {messages.length === 0 && (
          <p className="text-xs text-zinc-500 text-center py-4">
            Send a message to start the conversation.
          </p>
        )}
        {messages.map(msg => (
          <MessageBubble key={msg.id} msg={msg} />
        ))}
        <div ref={bottomRef} />
      </div>
      {conversation?.status === "closed" ? (
        <div className="px-4 py-3 border-t border-white/10 flex flex-col items-center gap-2 flex-shrink-0">
          <p className="text-xs text-zinc-500">This conversation has been closed.</p>
          <button onClick={onStartNew} className="text-xs text-primary hover:underline">
            Start a new conversation
          </button>
        </div>
      ) : (
        <div className="px-3 py-3 border-t border-white/10 flex gap-2 flex-shrink-0">
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onSend(); }
            }}
            placeholder="Type a message…"
            rows={1}
            className="flex-1 resize-none bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-zinc-500 outline-none focus:border-primary/50 transition-colors max-h-24"
            style={{ lineHeight: "1.5" }}
            autoFocus
          />
          <button
            onClick={onSend}
            disabled={!input.trim() || sending}
            className="w-9 h-9 rounded-xl bg-primary text-white flex items-center justify-center hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0 self-end"
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </button>
        </div>
      )}
    </>
  );
}

function MessageBubble({ msg }: { msg: ChatMessage }) {
  if (msg.sender_role === "system") {
    return (
      <div className="flex justify-center">
        <div className="max-w-[90%] px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-zinc-400 whitespace-pre-line text-center">
          {msg.body}
        </div>
      </div>
    );
  }

  const isCustomer = msg.sender_role === "customer";
  return (
    <div className={cn("flex gap-2", isCustomer ? "justify-end" : "justify-start")}>
      {!isCustomer && (
        <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
          <span className="text-[10px] font-bold text-primary">
            {msg.sender_name.charAt(0).toUpperCase()}
          </span>
        </div>
      )}
      <div className={cn("max-w-[75%] flex flex-col gap-0.5", isCustomer ? "items-end" : "items-start")}>
        {!isCustomer && (
          <span className="text-[10px] text-zinc-500 px-1">{msg.sender_name}</span>
        )}
        <div
          className={cn(
            "px-3 py-2 rounded-2xl text-sm whitespace-pre-wrap break-words",
            isCustomer
              ? "bg-primary text-white rounded-br-sm"
              : "bg-white/10 text-white rounded-bl-sm"
          )}
        >
          {msg.body}
        </div>
        <span className="text-[10px] text-zinc-600 px-1">
          {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </span>
      </div>
    </div>
  );
}
