"use client";

import { useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { X, ShoppingCart, Trash2, Plus, Minus, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { formatUSD } from "@/lib/format";
import { formatConfigurationSummary } from "@/lib/utils/configuration-summary";
import { useCartStore } from "@/stores/cart-store";
import { cartItemThumbSrc, cartThumbUnoptimized } from "@/lib/cart-item-image";
import { useUIStore } from "@/stores/ui-store";

export default function CartDrawer() {
  const { items, removeItem, updateQuantity, getSubtotal, getTotal, couponDiscount } = useCartStore();
  const { cartOpen, setCartOpen } = useUIStore();

  useEffect(() => {
    const isDesktop = window.innerWidth >= 1024;
    if (cartOpen && !isDesktop) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [cartOpen]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setCartOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [setCartOpen]);

  const subtotal = getSubtotal();
  const total = getTotal();

  return (
    <>
      {/* Backdrop — mobile only */}
      <div
        className={cn(
          "fixed inset-0 z-50 bg-black/60 backdrop-blur-sm transition-opacity duration-300 lg:hidden",
          cartOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
        onClick={() => setCartOpen(false)}
      />

      {/* Drawer — slides in from right; on desktop no overlay, stays in flow visually */}
      <div
        className={cn(
          "fixed right-0 bottom-0 z-50 w-full max-w-sm bg-[var(--bg-card)] border-l border-[var(--border-default)] flex flex-col transition-transform duration-300 ease-out",
          "top-0 lg:top-16",
          cartOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-default)]">
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-primary" />
            <h2 className="font-heading font-semibold text-lg">Cart</h2>
            {items.length > 0 && (
              <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                {items.length}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={() => setCartOpen(false)}
            className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-white/5 transition-colors"
            aria-label="Close cart"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-16">
              <div className="w-16 h-16 rounded-2xl bg-[var(--bg-elevated)] flex items-center justify-center mb-4">
                <ShoppingCart className="h-7 w-7 text-[var(--text-muted)]" />
              </div>
              <p className="font-medium text-[var(--text-secondary)]">Your cart is empty</p>
              <p className="text-sm text-[var(--text-muted)] mt-1">Add a service to get started</p>
              <Link
                href="/games"
                onClick={() => setCartOpen(false)}
                className="mt-4 px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                Browse games
              </Link>
            </div>
          ) : (
            items.map((item) => {
              const thumb = cartItemThumbSrc(item);
              return (
              <div
                key={item.id}
                className="flex gap-3 p-3 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)]"
              >
                {/* Game logo / line icon */}
                <div className="w-12 h-12 rounded-lg bg-[var(--bg-card)] flex items-center justify-center flex-shrink-0 overflow-hidden">
                  {thumb ? (
                    <Image
                      src={thumb}
                      alt={item.lineImageUrl ? item.serviceName : item.gameName}
                      width={48}
                      height={48}
                      className={item.lineImageUrl ? "object-contain p-0.5" : "object-cover"}
                      unoptimized={cartThumbUnoptimized(item)}
                    />
                  ) : (
                    <span className="text-xl">🎮</span>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-[var(--text-muted)] truncate">{item.gameName}</p>
                  <p className="text-sm font-medium truncate">{item.serviceName}</p>
                  {formatConfigurationSummary(item.configuration) && (
                    <p className="text-xs text-[var(--text-muted)] truncate mt-0.5">
                      {formatConfigurationSummary(item.configuration)}
                    </p>
                  )}
                  <p className="text-sm font-bold text-primary mt-0.5">
                    {formatUSD(item.finalPrice * item.quantity)}
                  </p>
                </div>

                {/* Quantity + delete */}
                <div className="flex flex-col items-end gap-2">
                  <button
                    type="button"
                    onClick={() => removeItem(item.id)}
                    className="p-1 rounded-md text-[var(--text-muted)] hover:text-red-400 hover:bg-red-400/10 transition-colors"
                    aria-label={`Remove ${item.serviceName} from cart`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      className="w-6 h-6 rounded-md bg-[var(--bg-card)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                      aria-label="Decrease quantity"
                    >
                      <Minus className="h-3 w-3" />
                    </button>
                    <span className="text-sm font-medium w-5 text-center">{item.quantity}</span>
                    <button
                      type="button"
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      className="w-6 h-6 rounded-md bg-[var(--bg-card)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                      aria-label="Increase quantity"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="border-t border-[var(--border-default)] px-5 py-4 space-y-3">
            <div className="space-y-1.5">
              <div className="flex justify-between text-sm">
                <span className="text-[var(--text-muted)]">Subtotal</span>
                <span>{formatUSD(subtotal)}</span>
              </div>
              {couponDiscount > 0 && (
                <div className="flex justify-between text-sm text-green-400">
                  <span>Discount</span>
                  <span>-{formatUSD(couponDiscount)}</span>
                </div>
              )}
              <div className="flex justify-between font-semibold pt-1 border-t border-[var(--border-subtle)]">
                <span>Total</span>
                <span className="text-primary">{formatUSD(total)}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Link
                href="/cart"
                onClick={() => setCartOpen(false)}
                className="text-center px-4 py-2.5 rounded-lg border border-[var(--border-default)] text-sm font-medium hover:bg-white/5 transition-colors"
              >
                View cart
              </Link>
              <Link
                href="/checkout"
                onClick={() => setCartOpen(false)}
                className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                Checkout
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
