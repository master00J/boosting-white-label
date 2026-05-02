"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { Trash2, Plus, Minus, ArrowRight, ShoppingCart, Tag, X, Pencil } from "lucide-react";
import { useCartStore } from "@/stores/cart-store";
import { formatUSD } from "@/lib/format";
import { formatConfigurationSummary } from "@/lib/utils/configuration-summary";
import { cartItemThumbSrc, cartThumbUnoptimized } from "@/lib/cart-item-image";
import { isBossTieredCartItem } from "@/lib/cart-boss-line-price";
import BossCartKillsControl from "@/components/storefront/BossCartKillsControl";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/types/database";

type CouponRow = Database["public"]["Tables"]["coupons"]["Row"];

export default function CartPage() {
  const {
    items,
    removeItem,
    updateQuantity,
    clearCart,
    getSubtotal,
    getTotal,
    couponCode,
    couponDiscount,
    applyCoupon,
    removeCoupon,
  } = useCartStore();

  const [couponInput, setCouponInput] = useState("");
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);

  const subtotal = getSubtotal();
  const total = getTotal();

  const handleApplyCoupon = async () => {
    if (!couponInput.trim()) return;
    setCouponLoading(true);
    setCouponError(null);

    try {
      const supabase = createClient();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: couponRaw } = await (supabase as any)
        .from("coupons")
        .select("*")
        .eq("code", couponInput.trim().toUpperCase())
        .eq("is_active", true)
        .single();
      const coupon = couponRaw as CouponRow | null;

      if (!coupon) {
        setCouponError("Invalid or expired coupon code.");
        return;
      }

      const now = new Date();
      if (coupon.expires_at && new Date(coupon.expires_at) < now) {
        setCouponError("This coupon code has expired.");
        return;
      }
      if (coupon.max_uses && (coupon.current_uses ?? 0) >= coupon.max_uses) {
        setCouponError("This coupon code is no longer valid.");
        return;
      }
      if (coupon.min_order_amount && subtotal < coupon.min_order_amount) {
        setCouponError(`Minimum order of $${coupon.min_order_amount.toFixed(2)} required.`);
        return;
      }

      let discount = 0;
      if (coupon.discount_type === "percentage") {
        discount = subtotal * (coupon.discount_value / 100);
        if (coupon.max_discount) discount = Math.min(discount, coupon.max_discount);
      } else {
        discount = coupon.discount_value;
      }

      applyCoupon(couponInput.trim().toUpperCase(), discount);
      setCouponInput("");
    } finally {
      setCouponLoading(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-24 text-center">
        <div className="w-20 h-20 rounded-3xl bg-[var(--bg-card)] border border-[var(--border-default)] flex items-center justify-center mx-auto mb-6">
          <ShoppingCart className="h-9 w-9 text-[var(--text-muted)]" />
        </div>
        <h1 className="font-heading text-2xl font-semibold mb-2">Your cart is empty</h1>
        <p className="text-[var(--text-muted)] mb-8">
          Add a boosting service to get started.
        </p>
        <Link
          href="/games"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-white font-semibold hover:bg-primary/90 transition-colors"
        >
          Browse games
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-heading text-3xl font-semibold">Cart</h1>
        <button
          type="button"
          onClick={clearCart}
          className="text-sm text-[var(--text-muted)] hover:text-red-400 transition-colors"
          aria-label="Remove all items from cart"
        >
          Remove all
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Items */}
        <div className="lg:col-span-2 space-y-4">
          {items.map((item) => {
            const thumb = cartItemThumbSrc(item);
            return (
            <div
              key={item.id}
              className="flex gap-4 p-5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-default)]"
            >
              {/* Logo / quest icon */}
              <div className="w-14 h-14 rounded-xl bg-[var(--bg-elevated)] flex items-center justify-center flex-shrink-0 overflow-hidden">
                {thumb ? (
                  <Image
                    src={thumb}
                    alt={item.lineImageUrl ? item.serviceName : item.gameName}
                    width={56}
                    height={56}
                    className={item.lineImageUrl ? "object-contain p-1" : "object-cover"}
                    unoptimized={cartThumbUnoptimized(item)}
                  />
                ) : (
                  <span className="text-2xl">🎮</span>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-xs text-[var(--text-muted)]">{item.gameName}</p>
                <p className="font-semibold">{item.serviceName}</p>
                {formatConfigurationSummary(item.configuration) && (
                  <p className="text-xs text-[var(--text-muted)] mt-0.5">
                    {formatConfigurationSummary(item.configuration)}
                  </p>
                )}
                <p className="text-sm font-bold text-primary mt-0.5">
                  {formatUSD(item.finalPrice * item.quantity)}
                </p>
              </div>

              {/* Controls */}
              <div className="flex flex-col items-end gap-3">
                {item.categorySlug && (
                  <Link
                    href={`/games/${item.gameSlug}/${item.categorySlug}/${item.serviceSlug}?edit=${encodeURIComponent(item.id)}`}
                    className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-primary hover:bg-primary/10 transition-colors flex items-center gap-1 text-xs"
                    aria-label={`Edit ${item.serviceName}`}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Edit
                  </Link>
                )}
                <button
                  type="button"
                  onClick={() => removeItem(item.id)}
                  className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-red-400 hover:bg-red-400/10 transition-colors"
                  aria-label={`Remove ${item.serviceName} from cart`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
                {isBossTieredCartItem(item) ? (
                  <BossCartKillsControl item={item} />
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      className="w-7 h-7 rounded-lg border border-[var(--border-default)] flex items-center justify-center hover:border-primary/40 transition-colors"
                      aria-label="Decrease quantity"
                    >
                      <Minus className="h-3 w-3" />
                    </button>
                    <span className="font-medium w-6 text-center">{item.quantity}</span>
                    <button
                      type="button"
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      className="w-7 h-7 rounded-lg border border-[var(--border-default)] flex items-center justify-center hover:border-primary/40 transition-colors"
                      aria-label="Increase quantity"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>
                )}
              </div>
            </div>
            );
          })}
        </div>

        {/* Summary */}
        <div className="space-y-4">
          {/* Coupon */}
          <div className="p-5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-default)]">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Tag className="h-4 w-4 text-primary" />
              Coupon code
            </h3>
            {couponCode ? (
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-green-400/10 border border-green-400/20">
                <div>
                  <p className="text-sm font-medium text-green-400">{couponCode}</p>
                  <p className="text-xs text-green-400/70">-{formatUSD(couponDiscount)} discount</p>
                </div>
                <button type="button" onClick={removeCoupon} className="text-green-400/70 hover:text-green-400 transition-colors" aria-label="Remove coupon">
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={couponInput}
                  onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                  onKeyDown={(e) => e.key === "Enter" && handleApplyCoupon()}
                  placeholder="COUPONCODE"
                  className="flex-1 h-9 rounded-lg border border-[var(--border-default)] bg-[var(--bg-elevated)] px-3 text-sm font-mono focus:outline-none focus:border-primary transition-colors uppercase"
                />
                <button
                  type="button"
                  onClick={handleApplyCoupon}
                  disabled={couponLoading || !couponInput.trim()}
                  className="px-3 py-1.5 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
                  aria-label="Apply coupon code"
                >
                  {couponLoading ? "..." : "Apply"}
                </button>
              </div>
            )}
            {couponError && (
              <p className="text-xs text-red-400 mt-2">{couponError}</p>
            )}
          </div>

          {/* Order summary */}
          <div className="p-5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-default)]">
            <h3 className="font-semibold mb-4">Overview</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">Subtotal</span>
                <span>{formatUSD(subtotal)}</span>
              </div>
              {couponDiscount > 0 && (
                <div className="flex justify-between text-green-400">
                  <span>Discount ({couponCode})</span>
                  <span>-{formatUSD(couponDiscount)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-base pt-2 border-t border-[var(--border-subtle)]">
                <span>Total</span>
                <span className="text-primary">{formatUSD(total)}</span>
              </div>
            </div>

            <Link
              href="/checkout"
              className="mt-4 w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-primary text-white font-semibold hover:bg-primary/90 transition-all hover:shadow-lg hover:shadow-primary/25"
            >
              Checkout
              <ArrowRight className="h-4 w-4" />
            </Link>

            <p className="text-xs text-center text-[var(--text-muted)] mt-3">
              🔒 Secure payment via SSL
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
