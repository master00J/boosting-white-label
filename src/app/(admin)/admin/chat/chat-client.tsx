"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  MessageCircle, Send, Loader2, CheckCheck, X,
  RefreshCw, Package, User, Clock, Circle, ArrowLeft,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import PushSubscribe from "@/components/chat/push-subscribe";
import StaffChatSetupCard from "@/components/chat/staff-chat-setup-card";

interface Conversation {
  id: string;
  customer_id: string;
  customer_name: string;
  customer_email: string;
  order_number: string | null;
  game_name: string | null;
  service_name: string | null;
  status: "open" | "closed";
  unread_count: number;
  created_at: string;
  last_message_at: string;
}

interface ChatMessage {
  id: string;
  sender_role: "customer" | "agent" | "system";
  sender_name: string;
  body: string;
  created_at: string;
}

function getLootboxRewardId(messages: ChatMessage[]) {
  for (const msg of messages) {
    const match = msg.body.match(/Reward ID:\s*([0-9a-f-]{36})/i);
    if (match?.[1]) return match[1];
  }
  return null;
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function AdminChatClient({
  agentName,
  agentId: _agentId,
}: {
  agentName: string;
  agentId: string;
}) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [loadingConvs, setLoadingConvs] = useState(true);
  const [filter, setFilter] = useState<"open" | "closed" | "all">("open");
  const [markingDelivered, setMarkingDelivered] = useState(false);
  const [deliveredRewardIds, setDeliveredRewardIds] = useState<Set<string>>(new Set());
  // Mobile: "list" shows conversations panel, "chat" shows active chat
  const [mobileView, setMobileView] = useState<"list" | "chat">("list");
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const supabase = createClient();

  // Play a soft "pling" using Web Audio API — no sound file needed
  const playMessageSound = useCallback(() => {
    try {
      if (!audioCtxRef.current) audioCtxRef.current = new AudioContext();
      const ctx = audioCtxRef.current;
      if (ctx.state === "suspended") ctx.resume();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(660, ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.18, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.35);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.35);
    } catch { /* AudioContext not available */ }
  }, []);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
  }, []);

  const loadConversations = useCallback(async () => {
    setLoadingConvs(true);
    try {
      const res = await fetch("/api/admin/chat");
      if (!res.ok) return;
      const data = await res.json() as { conversations: Conversation[] };
      setConversations(data.conversations);
    } finally {
      setLoadingConvs(false);
    }
  }, []);

  const openConversation = useCallback(async (id: string) => {
    setActiveId(id);
    setMobileView("chat");
    setLoadingMessages(true);
    try {
      const res = await fetch(`/api/admin/chat/${id}`);
      if (!res.ok) return;
      const data = await res.json() as { conversation: Conversation; messages: ChatMessage[] };
      setMessages(data.messages);
      setConversations(prev =>
        prev.map(c => c.id === id ? { ...c, unread_count: 0 } : c)
      );
      scrollToBottom();
    } finally {
      setLoadingMessages(false);
    }
    setTimeout(() => inputRef.current?.focus(), 150);
  }, [scrollToBottom]);

  const sendMessage = async () => {
    if (!input.trim() || !activeId || sending) return;
    const text = input.trim();
    setInput("");
    setSending(true);

    const tempMsg: ChatMessage = {
      id: `temp-${Date.now()}`,
      sender_role: "agent",
      sender_name: agentName,
      body: text,
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, tempMsg]);
    scrollToBottom();

    try {
      await fetch(`/api/admin/chat/${activeId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: text }),
      });
    } finally {
      setSending(false);
    }
  };

  const closeConversation = async (id: string, newStatus: "open" | "closed") => {
    await fetch(`/api/admin/chat/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    setConversations(prev => prev.map(c => c.id === id ? { ...c, status: newStatus } : c));
  };

  const markRewardDelivered = async () => {
    const rewardId = getLootboxRewardId(messages);
    if (!rewardId || !activeId || markingDelivered) return;

    setMarkingDelivered(true);
    try {
      const res = await fetch(`/api/admin/lootbox-opens/${rewardId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          delivery_status: "delivered",
          delivery_notes: `Marked delivered from live chat conversation ${activeId}`,
        }),
      });
      if (!res.ok) return;

      setDeliveredRewardIds(prev => new Set(prev).add(rewardId));

      const messageRes = await fetch(`/api/admin/chat/${activeId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          body: "✅ Your lootbox reward has been marked as delivered. Thanks for claiming it!",
        }),
      });
      if (messageRes.ok) {
        const data = await messageRes.json() as { message?: ChatMessage };
        if (data.message) {
          setMessages(prev => [...prev.filter(m => m.id !== data.message?.id), data.message!]);
          scrollToBottom();
        }
      }
    } finally {
      setMarkingDelivered(false);
    }
  };

  const backToList = () => {
    setMobileView("list");
    setActiveId(null);
    setMessages([]);
  };

  // Initial load
  useEffect(() => { loadConversations(); }, [loadConversations]);

  // Realtime subscriptions
  useEffect(() => {
    const msgChannel = supabase
      .channel("admin-chat-messages")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages" },
        (payload) => {
          const msg = payload.new as ChatMessage & { conversation_id: string };
          if (msg.conversation_id === activeId) {
            if (msg.sender_role === "agent") return;
            setMessages(prev => {
              if (prev.some(m => m.id === msg.id)) return prev;
              return [...prev, msg];
            });
            // Play sound when customer sends a message (foreground)
            if (msg.sender_role === "customer") playMessageSound();
            scrollToBottom();
          } else if (msg.sender_role === "customer") {
            // New message in a different conversation — also play sound
            playMessageSound();
          }
          setConversations(prev =>
            prev.map(c => {
              if (c.id !== msg.conversation_id) return c;
              return {
                ...c,
                last_message_at: msg.created_at,
                unread_count: c.id === activeId ? 0 : c.unread_count + (msg.sender_role === "customer" ? 1 : 0),
              };
            })
          );
        }
      )
      .subscribe();

    const convChannel = supabase
      .channel("admin-chat-conversations")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_conversations" },
        (payload) => {
          const newConv = payload.new as Conversation;
          setConversations(prev => [newConv, ...prev]);
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "chat_conversations" },
        (payload) => {
          const updated = payload.new as Conversation;
          setConversations(prev => prev.map(c => c.id === updated.id ? { ...c, ...updated } : c));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(msgChannel);
      supabase.removeChannel(convChannel);
    };
  }, [activeId, scrollToBottom, supabase, playMessageSound]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const activeConv = conversations.find(c => c.id === activeId);
  const activeRewardId = getLootboxRewardId(messages);
  const canMarkRewardDelivered =
    Boolean(activeRewardId) &&
    activeConv?.service_name === "Lootbox reward claim" &&
    !deliveredRewardIds.has(activeRewardId!);
  const filteredConvs = conversations.filter(c => {
    if (filter === "all") return true;
    return c.status === filter;
  });
  const totalUnread = conversations.filter(c => c.status === "open").reduce((sum, c) => sum + c.unread_count, 0);

  return (
    // Full-viewport on mobile, constrained in admin panel on desktop
    <div className="flex h-[calc(100dvh-0px)] md:h-full -m-4 md:-m-6 overflow-hidden md:rounded-xl md:border md:border-border">

      {/* ── LEFT PANEL: conversation list ─────────────────────── */}
      <div className={cn(
        "flex flex-col bg-card border-r border-border",
        // Mobile: full width when viewing list, hidden when viewing chat
        "absolute inset-0 md:relative md:inset-auto md:w-72 md:flex-shrink-0",
        mobileView === "chat" ? "hidden md:flex" : "flex"
      )}>
        {/* Header */}
        <div className="px-4 pb-3 border-b border-border flex items-center justify-between flex-shrink-0 pt-safe">
          <div className="flex items-center gap-2">
            <MessageCircle className="h-4 w-4 text-primary" />
            <span className="font-semibold text-sm">Live Chat</span>
            {totalUnread > 0 && (
              <span className="w-5 h-5 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center font-bold">
                {totalUnread > 9 ? "9+" : totalUnread}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <PushSubscribe />
            <button
              onClick={loadConversations}
              className="p-1.5 rounded-md text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
            >
              <RefreshCw className={cn("h-3.5 w-3.5", loadingConvs && "animate-spin")} />
            </button>
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex border-b border-border flex-shrink-0">
          {(["open", "closed", "all"] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "flex-1 py-2.5 text-xs font-medium capitalize transition-colors",
                filter === f
                  ? "text-primary border-b-2 border-primary"
                  : "text-zinc-400 hover:text-white"
              )}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto overscroll-contain">
          <StaffChatSetupCard />
          {loadingConvs ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-5 w-5 text-zinc-500 animate-spin" />
            </div>
          ) : filteredConvs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center px-4">
              <MessageCircle className="h-8 w-8 text-zinc-700 mb-2" />
              <p className="text-xs text-zinc-500">No {filter === "all" ? "" : filter} conversations</p>
            </div>
          ) : (
            filteredConvs.map(conv => (
              <button
                key={conv.id}
                onClick={() => openConversation(conv.id)}
                className={cn(
                  "w-full px-3 py-3.5 text-left hover:bg-white/5 active:bg-white/10 transition-colors border-b border-border/50 flex gap-2.5",
                  activeId === conv.id && "bg-primary/10"
                )}
              >
                <div className="flex-shrink-0 pt-0.5">
                  <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-sm font-bold text-zinc-300">
                    {conv.customer_name.charAt(0).toUpperCase()}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1 mb-0.5">
                    <span className="text-sm font-medium text-white truncate">{conv.customer_name}</span>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {conv.unread_count > 0 && (
                        <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-white text-[9px] flex items-center justify-center font-bold">
                          {conv.unread_count > 9 ? "9+" : conv.unread_count}
                        </span>
                      )}
                      <Circle
                        className={cn(
                          "h-2 w-2 flex-shrink-0",
                          conv.status === "open" ? "text-green-400 fill-green-400" : "text-zinc-600 fill-zinc-600"
                        )}
                      />
                    </div>
                  </div>
                  {conv.order_number && (
                    <p className="text-[11px] text-primary truncate font-medium">#{conv.order_number}</p>
                  )}
                  {conv.game_name && (
                    <p className="text-[11px] text-zinc-500 truncate">{conv.game_name}</p>
                  )}
                  <p className="text-[10px] text-zinc-600 flex items-center gap-1 mt-0.5">
                    <Clock className="h-2.5 w-2.5" />
                    {timeAgo(conv.last_message_at)}
                  </p>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* ── RIGHT PANEL: conversation view ────────────────────── */}
      <div className={cn(
        "flex-1 flex flex-col min-w-0 bg-[#0f0f14]",
        // Mobile: full width when viewing chat, hidden when viewing list
        "absolute inset-0 md:relative md:inset-auto",
        mobileView === "list" ? "hidden md:flex" : "flex"
      )}>
        {!activeId ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center px-8">
            <MessageCircle className="h-12 w-12 text-zinc-700" />
            <div>
              <p className="text-sm font-medium text-zinc-400">Select a conversation</p>
              <p className="text-xs text-zinc-600 mt-1">Tap a conversation to start chatting.</p>
            </div>
          </div>
        ) : (
          <>
            {/* Conversation header */}
            <div className="px-3 pb-3 border-b border-border flex items-center gap-2 flex-shrink-0 bg-card pt-safe">
              {/* Back button — mobile only */}
              <button
                onClick={backToList}
                className="md:hidden p-2 -ml-1 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition-colors flex-shrink-0"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>

              <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0 text-sm font-bold text-zinc-300">
                {activeConv?.customer_name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">{activeConv?.customer_name}</p>
                <p className="text-xs text-zinc-500 truncate">{activeConv?.customer_email}</p>
              </div>

              {activeConv?.order_number && (
                <div className="hidden sm:flex items-center gap-1.5 px-2 py-1 rounded-lg bg-primary/10 border border-primary/20 flex-shrink-0">
                  <Package className="h-3 w-3 text-primary" />
                  <span className="text-xs text-primary font-medium">#{activeConv.order_number}</span>
                  {activeConv.game_name && (
                    <span className="text-xs text-zinc-400">· {activeConv.game_name}</span>
                  )}
                </div>
              )}

              {canMarkRewardDelivered && (
                <button
                  onClick={markRewardDelivered}
                  disabled={markingDelivered}
                  className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-green-500/10 border border-green-500/25 text-xs font-semibold text-green-400 hover:bg-green-500/15 transition-colors disabled:opacity-50"
                  title="Mark this lootbox reward as delivered"
                >
                  {markingDelivered ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <CheckCheck className="h-3.5 w-3.5" />
                  )}
                  Mark delivered
                </button>
              )}

              <div className="flex items-center gap-1.5 flex-shrink-0">
                <span className={cn(
                  "text-xs px-2 py-0.5 rounded-full border",
                  activeConv?.status === "open"
                    ? "bg-green-400/10 text-green-400 border-green-400/20"
                    : "bg-zinc-700/30 text-zinc-400 border-zinc-600/30"
                )}>
                  {activeConv?.status}
                </span>
                {activeConv?.status === "open" ? (
                  <button
                    onClick={() => closeConversation(activeId, "closed")}
                    className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs text-zinc-400 hover:text-white hover:bg-white/5 border border-border transition-colors"
                  >
                    <CheckCheck className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Close</span>
                  </button>
                ) : (
                  <button
                    onClick={() => closeConversation(activeId, "open")}
                    className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs text-zinc-400 hover:text-white hover:bg-white/5 border border-border transition-colors"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Reopen</span>
                  </button>
                )}
                <button
                  onClick={() => { setActiveId(null); setMessages([]); setMobileView("list"); }}
                  className="hidden md:flex p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Order tag on mobile */}
            {activeConv?.order_number && (
              <div className="sm:hidden px-3 py-1.5 bg-primary/5 border-b border-white/5 flex-shrink-0">
                <p className="text-xs text-zinc-400">
                  Order <span className="text-primary font-medium">#{activeConv.order_number}</span>
                  {activeConv.game_name && ` · ${activeConv.game_name}`}
                </p>
              </div>
            )}

            {canMarkRewardDelivered && (
              <div className="sm:hidden px-3 py-2 bg-green-500/5 border-b border-green-500/10 flex-shrink-0">
                <button
                  onClick={markRewardDelivered}
                  disabled={markingDelivered}
                  className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-green-500/10 border border-green-500/25 px-3 py-2 text-xs font-semibold text-green-400 disabled:opacity-50"
                >
                  {markingDelivered ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <CheckCheck className="h-3.5 w-3.5" />
                  )}
                  Mark reward as delivered
                </button>
              </div>
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto overscroll-contain px-3 py-3 space-y-3">
              {loadingMessages ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-5 w-5 text-zinc-500 animate-spin" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <User className="h-8 w-8 text-zinc-700 mb-2" />
                  <p className="text-xs text-zinc-500">No messages yet. Waiting for the customer.</p>
                </div>
              ) : (
                messages.map(msg => <AdminMessageBubble key={msg.id} msg={msg} />)
              )}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            {activeConv?.status === "closed" ? (
              <div className="px-4 py-3 border-t border-border text-center bg-card flex-shrink-0 safe-area-bottom">
                <p className="text-xs text-zinc-500">
                  Conversation closed.{" "}
                  <button
                    onClick={() => closeConversation(activeId, "open")}
                    className="text-primary hover:underline"
                  >
                    Reopen
                  </button>
                  {" "}to reply.
                </p>
              </div>
            ) : (
              <div className="px-3 py-3 border-t border-border flex gap-2 bg-card flex-shrink-0 safe-area-bottom">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={`Reply as ${agentName}…`}
                  rows={2}
                  className="flex-1 resize-none bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-zinc-500 outline-none focus:border-primary/50 transition-colors"
                  style={{ fontSize: "16px" }}
                />
                <button
                  onClick={sendMessage}
                  disabled={!input.trim() || sending}
                  className="w-11 h-11 rounded-xl bg-primary text-white flex items-center justify-center hover:bg-primary/90 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed self-end flex-shrink-0"
                >
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function AdminMessageBubble({ msg }: { msg: ChatMessage }) {
  if (msg.sender_role === "system") {
    return (
      <div className="flex justify-center">
        <div className="max-w-[85%] px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-zinc-400 whitespace-pre-line text-center">
          {msg.body}
        </div>
      </div>
    );
  }

  const isAgent = msg.sender_role === "agent";
  return (
    <div className={cn("flex gap-2", isAgent ? "justify-end" : "justify-start")}>
      {!isAgent && (
        <div className="w-7 h-7 rounded-full bg-indigo-500/20 flex items-center justify-center flex-shrink-0 mt-0.5 text-[11px] font-bold text-indigo-400">
          {msg.sender_name.charAt(0).toUpperCase()}
        </div>
      )}
      <div className={cn("max-w-[75%] flex flex-col gap-0.5", isAgent ? "items-end" : "items-start")}>
        {!isAgent && <span className="text-[10px] text-zinc-500 px-1">{msg.sender_name}</span>}
        <div
          className={cn(
            "px-3 py-2 rounded-2xl text-sm whitespace-pre-wrap break-words",
            isAgent
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
      {isAgent && (
        <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5 text-[11px] font-bold text-primary">
          {msg.sender_name.charAt(0).toUpperCase()}
        </div>
      )}
    </div>
  );
}
