"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Search,
  ShoppingCart,
  ArrowLeft,
  Store,
  Plus,
  Minus,
  Check,
  X,
} from "lucide-react";
import { getBankItemIcon } from "@/lib/osrs-equipment";
import { useCartStore } from "@/stores/cart-store";

type Shop = {
  id: string;
  game_id: string;
  name: string;
  slug: string;
  description: string | null;
};

type ShopItem = {
  id: string;
  item_id: string;
  item_name: string;
  quantity: number;
  price_each: number;
  sort_order: number;
};

function ItemIcon({ name }: { name: string }) {
  const [failed, setFailed] = useState(false);
  const icon = getBankItemIcon(name);
  if (failed || !icon) {
    return (
      <div className="w-8 h-8 rounded bg-white/5 flex items-center justify-center">
        <Store className="h-3.5 w-3.5 text-muted-foreground/40" />
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={icon}
      alt={name}
      width={32}
      height={32}
      className="object-contain"
      onError={() => setFailed(true)}
    />
  );
}

/** Small quantity stepper used on the item card */
function QtyInput({
  value,
  max,
  onChange,
}: {
  value: number;
  max: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() => onChange(Math.max(1, value - 1))}
        className="w-6 h-6 rounded-md bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
      >
        <Minus className="h-3 w-3" />
      </button>
      <span className="w-8 text-center text-xs font-mono tabular-nums">{value}</span>
      <button
        onClick={() => onChange(Math.min(max, value + 1))}
        className="w-6 h-6 rounded-md bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
      >
        <Plus className="h-3 w-3" />
      </button>
    </div>
  );
}

export default function ShopDetailClient({
  shop,
  items,
}: {
  shop: Shop;
  items: ShopItem[];
}) {
  const [search, setSearch] = useState("");
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());

  const addItem = useCartStore((s) => s.addItem);
  const cartItems = useCartStore((s) => s.items);

  const filtered = useMemo(() => {
    if (!search.trim()) return items;
    const q = search.toLowerCase();
    return items.filter((i) => i.item_name.toLowerCase().includes(q));
  }, [items, search]);

  const getQty = (itemId: string) => quantities[itemId] ?? 1;

  const handleAddToCart = (item: ShopItem) => {
    const qty = getQty(item.id);
    const cartId = `gim-${item.id}-${Date.now()}`;
    addItem({
      id: cartId,
      serviceId: item.id,
      gameId: shop.game_id,
      gameName: shop.name,
      gameSlug: shop.slug,
      serviceName: item.item_name,
      serviceSlug: `gim-item-${item.item_id}`,
      gameLogoUrl: null,
      configuration: {
        shop_id: shop.id,
        item_id: item.item_id,
        item_name: item.item_name,
        quantity: qty,
        type: "gim_shop_item",
      },
      basePrice: item.price_each,
      finalPrice: item.price_each * qty,
      quantity: qty,
    });
    setAddedIds((prev) => new Set(prev).add(item.id));
    setTimeout(() => setAddedIds((prev) => { const n = new Set(prev); n.delete(item.id); return n; }), 2000);
  };

  const cartCount = cartItems.reduce((s, i) => s + i.quantity, 0);

  return (
    <main className="max-w-5xl mx-auto px-4 py-8 sm:py-12 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="space-y-1">
          <Link
            href="/shop"
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors mb-1"
          >
            <ArrowLeft className="h-3 w-3" /> All shops
          </Link>
          <h1 className="font-heading text-2xl sm:text-3xl font-bold">{shop.name}</h1>
          {shop.description && (
            <p className="text-muted-foreground max-w-xl">{shop.description}</p>
          )}
        </div>

        <Link
          href="/cart"
          className="relative flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <ShoppingCart className="h-4 w-4" />
          Cart
          {cartCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] rounded-full bg-white text-primary text-[10px] font-bold flex items-center justify-center px-1">
              {cartCount}
            </span>
          )}
        </Link>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <input
          type="search"
          placeholder="Search items…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full h-10 pl-10 pr-4 rounded-xl bg-[var(--bg-card)] border border-[var(--border-default)] text-sm focus:outline-none focus:border-primary transition-colors"
        />
        {search && (
          <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2">
            <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Store className="h-4 w-4" />
        <span>
          {filtered.length} item{filtered.length !== 1 ? "s" : ""}
          {search ? " found" : " available"}
        </span>
      </div>

      {/* Items */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
          <Store className="h-10 w-10 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">
            {items.length === 0 ? "This shop has no items yet." : "No items match your search."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((item) => {
            const qty = getQty(item.id);
            const added = addedIds.has(item.id);
            const totalPrice = item.price_each * qty;

            return (
              <div
                key={item.id}
                className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] p-4 flex flex-col gap-3 hover:border-primary/30 transition-colors"
              >
                {/* Item info */}
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-[#1a1a2e] flex items-center justify-center shrink-0">
                    <ItemIcon name={item.item_name} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{item.item_name}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {item.quantity.toLocaleString()} in stock
                    </p>
                  </div>
                </div>

                {/* Price per unit */}
                <div className="flex items-baseline justify-between">
                  <span className="text-xs text-muted-foreground">Price each</span>
                  <span className="text-sm font-semibold font-mono">
                    ${item.price_each.toFixed(2)}
                  </span>
                </div>

                {/* Quantity + add to cart */}
                <div className="flex items-center justify-between gap-2 pt-1 border-t border-[var(--border-default)]">
                  <QtyInput
                    value={qty}
                    max={item.quantity}
                    onChange={(v) => setQuantities((prev) => ({ ...prev, [item.id]: v }))}
                  />

                  <div className="flex items-center gap-2">
                    {qty > 1 && (
                      <span className="text-xs font-mono text-muted-foreground">
                        ${totalPrice.toFixed(2)}
                      </span>
                    )}
                    <button
                      onClick={() => handleAddToCart(item)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        added
                          ? "bg-green-500/15 text-green-400 border border-green-500/30"
                          : "bg-primary text-white hover:bg-primary/90"
                      }`}
                    >
                      {added ? (
                        <>
                          <Check className="h-3.5 w-3.5" /> Added
                        </>
                      ) : (
                        <>
                          <ShoppingCart className="h-3.5 w-3.5" /> Add to cart
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
