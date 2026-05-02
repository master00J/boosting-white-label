"use client";

import Link from "next/link";
import Image from "next/image";
import { ShoppingCart, X, ChevronRight, Zap } from "lucide-react";
import { useCartStore } from "@/stores/cart-store";
import { formatConfigurationSummary } from "@/lib/utils/configuration-summary";
import { cartItemThumbSrc, cartThumbUnoptimized } from "@/lib/cart-item-image";

function formatUSD(n: number) {
  return `$${n.toFixed(2)}`;
}

export default function CartPreview() {
  const { items, removeItem, getSubtotal, getTotal, couponDiscount } = useCartStore();

  const subtotal = getSubtotal();
  const total = getTotal();
  const hasDiscount = couponDiscount > 0;
  const empty = items.length === 0;

  return (
    <div className="rounded-xl border border-[var(--border-default)] overflow-hidden bg-[var(--bg-card)]">
      {/* Header */}
      <div className="px-4 py-3 border-b border-[var(--border-subtle)] flex items-center justify-between bg-[var(--bg-elevated)]">
        <div className="flex items-center gap-2">
          <ShoppingCart className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold text-[var(--text-primary)]">
            Cart{" "}
            <span className="text-primary">({items.length})</span>
          </span>
        </div>
        <Link
          href="/cart"
          className="text-xs text-[var(--text-muted)] hover:text-primary transition-colors flex items-center gap-0.5"
        >
          View all <ChevronRight className="h-3 w-3" />
        </Link>
      </div>

      {/* Items */}
      {empty ? (
        <div className="px-4 py-3 text-xs text-[var(--text-muted)] leading-relaxed">
          No items yet — add a configuration below; your running total appears here.
        </div>
      ) : (
      <div className="divide-y divide-[var(--border-subtle)] max-h-72 overflow-y-auto">
        {items.map((item) => {
          const summary = formatConfigurationSummary(item.configuration);
          const thumb = cartItemThumbSrc(item);
          return (
            <div key={item.id} className="flex items-start gap-3 px-4 py-3">
              {/* Quest line icon or game logo */}
              {thumb && (
                <div className="h-8 w-8 shrink-0 rounded-md overflow-hidden border border-[var(--border-subtle)] bg-[var(--bg-elevated)] flex items-center justify-center">
                  <Image
                    src={thumb}
                    alt={item.lineImageUrl ? item.serviceName : item.gameName}
                    width={32}
                    height={32}
                    className={item.lineImageUrl ? "object-contain h-7 w-7 p-0.5" : "object-contain h-6 w-6"}
                    unoptimized={cartThumbUnoptimized(item)}
                  />
                </div>
              )}

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-[var(--text-primary)] leading-tight truncate">
                  {item.serviceName}
                </p>
                {summary && (
                  <p className="text-[11px] text-[var(--text-muted)] mt-0.5 truncate">{summary}</p>
                )}
                <p className="text-xs font-semibold text-primary mt-0.5">
                  {formatUSD(item.finalPrice * item.quantity)}
                  {item.quantity > 1 && (
                    <span className="text-[10px] text-[var(--text-muted)] font-normal ml-1">×{item.quantity}</span>
                  )}
                </p>
              </div>

              {/* Remove */}
              <button
                type="button"
                onClick={() => removeItem(item.id)}
                className="text-[var(--text-muted)] hover:text-red-400 transition-colors shrink-0 mt-0.5"
                title="Remove"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          );
        })}
      </div>
      )}

      {/* Footer */}
      <div className="px-4 py-3 border-t border-[var(--border-default)] bg-[var(--bg-elevated)] space-y-3">
        {/* Totaal */}
        <div className="space-y-1">
          {hasDiscount && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-[var(--text-muted)]">Subtotal</span>
              <span className="text-[var(--text-muted)]">{formatUSD(subtotal)}</span>
            </div>
          )}
          {hasDiscount && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-green-400">Discount</span>
              <span className="text-green-400">−{formatUSD(couponDiscount)}</span>
            </div>
          )}
          <div className="flex items-center justify-between">
            <span className="text-sm text-[var(--text-muted)]">Total</span>
            <span className="text-sm font-semibold text-[var(--text-primary)]">{formatUSD(total)}</span>
          </div>
        </div>

        {/* CTA knoppen */}
        <div className="grid grid-cols-2 gap-2">
          <Link
            href="/cart"
            className="flex items-center justify-center gap-1.5 py-2 rounded-lg border border-[var(--border-default)] text-xs font-medium text-[var(--text-secondary)] hover:border-primary/40 hover:text-[var(--text-primary)] transition-colors"
          >
            <ShoppingCart className="h-3.5 w-3.5" />
            Cart
          </Link>
          <Link
            href="/checkout"
            className="flex items-center justify-center gap-1.5 py-2 rounded-lg bg-primary text-white text-xs font-semibold hover:bg-primary/90 transition-colors"
          >
            <Zap className="h-3.5 w-3.5" />
            Checkout
          </Link>
        </div>
      </div>
    </div>
  );
}
