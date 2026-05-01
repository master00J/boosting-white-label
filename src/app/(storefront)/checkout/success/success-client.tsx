"use client";

import { useEffect, useState, useRef } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, Package, ArrowRight, Loader2, AlertCircle, Coins, MessageCircle, Clock } from "lucide-react";
import { formatGold, formatUSD } from "@/lib/format";

interface OrderSummary {
  id: string;
  order_number: string;
  status: string;
  total: number;
  track_token?: string | null;
  service_name?: string;
  game_name?: string;
}

export default function SuccessClient({ userId }: { userId: string | null }) {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("order");
  const paymentMethod = searchParams.get("method");
  const goldAmount = Number(searchParams.get("goldAmount") ?? 0);
  const goldLabel = searchParams.get("goldLabel") ?? "GP";
  const goldInstructions = searchParams.get("instructions") ?? "";

  const isGoldOrder = paymentMethod === "gold";
  const isCryptoOrder = paymentMethod === "nowpayments";

  const [order, setOrder] = useState<OrderSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const chatOpenedRef = useRef(false);

  useEffect(() => {
    if (!orderId) { setLoading(false); return; }

    let pollInterval: ReturnType<typeof setInterval> | null = null;

    const fetchOrder = async () => {
      try {
        const r = await fetch(`/api/orders/${orderId}`);
        const data = await r.json() as { order?: OrderSummary; error?: string };
        if (data.order) {
          setOrder(data.order);
          // For crypto: keep polling until status moves from pending_payment to paid
          if (isCryptoOrder && data.order.status === "pending_payment") {
            // keep polling
          } else {
            if (pollInterval) clearInterval(pollInterval);
          }
        } else {
          setError(true);
          if (pollInterval) clearInterval(pollInterval);
        }
      } catch {
        setError(true);
        if (pollInterval) clearInterval(pollInterval);
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();

    // For crypto payments, poll every 5s until order is paid (max 10 min)
    if (isCryptoOrder) {
      let attempts = 0;
      pollInterval = setInterval(() => {
        attempts++;
        if (attempts > 120) { // 120 × 5s = 10 min
          if (pollInterval) clearInterval(pollInterval);
          return;
        }
        fetchOrder();
      }, 5000);
    }

    return () => { if (pollInterval) clearInterval(pollInterval); };
  }, [orderId, isCryptoOrder]);

  // Once order data is loaded, create a chat conversation and auto-open the widget
  useEffect(() => {
    if (!userId || !order || chatOpenedRef.current) return;
    chatOpenedRef.current = true;

    const createAndOpenChat = async () => {
      try {
        const res = await fetch("/api/chat/conversations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            order_id: order.id,
            order_number: order.order_number,
            game_name: order.game_name ?? null,
            service_name: order.service_name ?? null,
          }),
        });
        if (!res.ok) return;
        const data = await res.json() as { conversation: { id: string } };
        // Short delay so the chat widget has time to mount
        setTimeout(() => {
          window.dispatchEvent(
            new CustomEvent("chat:open", { detail: { conversationId: data.conversation.id } })
          );
        }, 800);
      } catch {
        // Silently fail — user can still manually open the chat
      }
    };

    createAndOpenChat();
  }, [userId, order]);

  const openChat = () => {
    window.dispatchEvent(new CustomEvent("chat:open", { detail: {} }));
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-24 text-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto mb-4" />
        <p className="text-[var(--text-muted)]">Processing order...</p>
      </div>
    );
  }

  if (error || !orderId) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-24 text-center">
        <AlertCircle className="h-12 w-12 text-orange-400 mx-auto mb-4" />
        <h1 className="font-heading text-2xl font-semibold mb-2">Order not found</h1>
        <p className="text-[var(--text-muted)] mb-6">
          Your payment may have been processed. Check your email or view your orders.
        </p>
        <div className="flex gap-3 justify-center">
          {userId && (
            <Link
              href="/orders"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white font-medium hover:bg-primary/90 transition-colors"
            >
              My orders
            </Link>
          )}
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-[var(--border-default)] font-medium hover:bg-white/5 transition-colors"
          >
            Go home
          </Link>
        </div>
      </div>
    );
  }

  const cryptoPending = isCryptoOrder && order?.status === "pending_payment";
  const cryptoPaid = isCryptoOrder && order?.status === "paid";
  const trackHref = order?.track_token ? `/track?token=${order.track_token}` : orderId ? `/orders/${orderId}` : "/orders";

  return (
    <div className="max-w-2xl mx-auto px-4 py-16 text-center">
      {/* Icon — changes based on state */}
      <div className="relative w-24 h-24 mx-auto mb-6">
        {cryptoPending ? (
          <>
            <div className="absolute inset-0 rounded-full bg-orange-400/10 animate-ping" />
            <div className="relative w-24 h-24 rounded-full bg-orange-400/10 border border-orange-400/20 flex items-center justify-center">
              <Clock className="h-12 w-12 text-orange-400 animate-pulse" />
            </div>
          </>
        ) : (
          <>
            <div className="absolute inset-0 rounded-full bg-green-400/10 animate-ping" />
            <div className="relative w-24 h-24 rounded-full bg-green-400/10 border border-green-400/20 flex items-center justify-center">
              <CheckCircle2 className="h-12 w-12 text-green-400" />
            </div>
          </>
        )}
      </div>

      <h1 className="font-heading text-3xl sm:text-4xl font-semibold text-white mb-3">
        {isGoldOrder ? "Order placed!" : cryptoPending ? "Awaiting crypto confirmation..." : "Payment successful!"}
      </h1>
      <p className="text-[var(--text-secondary)] text-lg mb-8">
        {isGoldOrder
          ? "Trade the gold in-game to activate your order."
          : cryptoPending
          ? "Your crypto payment is being confirmed on the blockchain. This page updates automatically."
          : cryptoPaid
          ? "Your crypto payment has been confirmed. Your order is in the queue."
          : "Your order has been confirmed and is in the queue."}
      </p>

      {/* Crypto pending notice */}
      {cryptoPending && (
        <div className="mb-8 p-4 rounded-2xl bg-orange-400/10 border border-orange-400/20 flex items-start gap-3 text-left">
          <Loader2 className="h-5 w-5 text-orange-400 animate-spin shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-orange-400">Waiting for blockchain confirmation</p>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              Crypto transactions typically confirm within a few minutes. Do not close this page — it will update automatically once confirmed.
            </p>
          </div>
        </div>
      )}


      {/* Gold payment instructions */}
      {isGoldOrder && goldAmount > 0 && (
        <div className="p-5 rounded-2xl bg-orange-400/10 border border-orange-400/20 text-left mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Coins className="h-5 w-5 text-orange-400" />
            <h2 className="font-semibold text-orange-400">Gold payment required</h2>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between items-center p-3 rounded-xl bg-orange-400/10 border border-orange-400/20">
              <span className="text-[var(--text-muted)]">Amount to send</span>
              <span className="font-bold text-orange-400 text-base">{formatGold(goldAmount, goldLabel)}</span>
            </div>
            {goldInstructions ? (
              <div className="p-3 rounded-xl bg-[var(--bg-card)] border border-[var(--border-default)]">
                <p className="text-xs font-medium text-[var(--text-muted)] mb-1">Where to trade</p>
                <p className="text-sm whitespace-pre-line">{goldInstructions}</p>
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-[var(--bg-card)] border border-[var(--border-default)]">
                <p className="text-xs font-medium text-[var(--text-muted)] mb-1">Where to trade</p>
                <p className="text-sm text-[var(--text-secondary)]">
                  Check the chat below — we will send you the exact account name and world to trade your gold to.
                </p>
              </div>
            )}
            <p className="text-xs text-[var(--text-muted)] pt-1">
              Your order will be activated once we have confirmed receipt of the gold. This usually takes up to 30 minutes.
            </p>
          </div>
        </div>
      )}

      {/* Order card */}
      {order && (
        <div className="p-5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-default)] text-left mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Package className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-semibold">Order #{order.order_number}</p>
              <p className="text-xs text-[var(--text-muted)]">
                {order.game_name && order.service_name
                  ? `${order.game_name} — ${order.service_name}`
                  : "Boosting service"}
              </p>
            </div>
            <div className="ml-auto text-right">
              <p className="font-bold text-primary">{formatUSD(order.total)}</p>
              <span className={`text-xs px-2 py-0.5 rounded-full border ${
                isGoldOrder ? "bg-orange-400/10 text-orange-400 border-orange-400/20"
                : cryptoPending ? "bg-orange-400/10 text-orange-400 border-orange-400/20"
                : "bg-green-400/10 text-green-400 border-green-400/20"
              }`}>
                {isGoldOrder ? "Awaiting gold" : cryptoPending ? "Awaiting crypto" : "In queue"}
              </span>
            </div>
          </div>

          <div className="space-y-2 text-sm text-[var(--text-muted)]">
            <div className="flex items-center gap-2">
              <div className={`w-1.5 h-1.5 rounded-full ${isGoldOrder || cryptoPending ? "bg-orange-400 animate-pulse" : "bg-green-400"}`} />
              {isGoldOrder ? "Awaiting gold payment" : cryptoPending ? "Awaiting crypto confirmation" : "Payment received"}
            </div>
            <div className={`flex items-center gap-2 ${isGoldOrder || cryptoPending ? "opacity-40" : ""}`}>
              <div className={`w-1.5 h-1.5 rounded-full ${isGoldOrder || cryptoPending ? "bg-[var(--border-default)]" : "bg-primary animate-pulse"}`} />
              Waiting for available booster
            </div>
            <div className="flex items-center gap-2 opacity-40">
              <div className="w-1.5 h-1.5 rounded-full bg-[var(--border-default)]" />
              Booster started
            </div>
            <div className="flex items-center gap-2 opacity-40">
              <div className="w-1.5 h-1.5 rounded-full bg-[var(--border-default)]" />
              Completed
            </div>
          </div>
        </div>
      )}

      {/* Next steps */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
        <div className="p-4 rounded-xl bg-[var(--bg-card)] border border-[var(--border-default)] text-left">
          <p className="text-sm font-medium mb-1">📧 Confirmation email</p>
          <p className="text-xs text-[var(--text-muted)]">You will receive an email with all the details of your order.</p>
        </div>
        <div className="p-4 rounded-xl bg-[var(--bg-card)] border border-[var(--border-default)] text-left">
          <p className="text-sm font-medium mb-1">⚡ Quick start</p>
          <p className="text-xs text-[var(--text-muted)]">A booster picks up your order on average within 1 hour.</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 justify-center flex-wrap">
        {userId && (
          <Link
            href={trackHref}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-primary text-white font-semibold hover:bg-primary/90 transition-all hover:shadow-lg hover:shadow-primary/25"
          >
            Track your order
            <ArrowRight className="h-4 w-4" />
          </Link>
        )}
        <button
          type="button"
          onClick={openChat}
          className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl border border-[var(--border-default)] font-medium hover:bg-white/5 transition-colors"
        >
          <MessageCircle className="h-4 w-4" />
          Open chat
        </button>
        <Link
          href="/games"
          className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl border border-[var(--border-default)] font-medium hover:bg-white/5 transition-colors"
        >
          More services
        </Link>
      </div>
    </div>
  );
}
