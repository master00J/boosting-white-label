"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Star, ChevronRight, Search, X, ShoppingBag } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import ServiceConfigurator from "./[serviceSlug]/service-configurator";
import CartPreview from "@/components/storefront/CartPreview";

type ServiceData = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  base_price: number;
  price_per_unit: number | null;
  min_quantity: number | null;
  max_quantity: number | null;
  form_config: unknown;
  price_matrix: unknown;
  is_featured: boolean | null;
  image_url: string | null;
};

type GameData = {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
};

type CategoryData = {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  image_url: string | null;
};

interface Props {
  game: GameData;
  category: CategoryData;
  services: ServiceData[];
  initialServiceSlug?: string;
}

// ─── Starting price helper ────────────────────────────────────────────────────

function getStartingPrice(service: ServiceData): { price: number; prefix: string } | null {
  const base = service.base_price;

  try {
    const matrix = service.price_matrix as Record<string, unknown> | null;
    if (!matrix?.type) {
      // Fallback: per_unit style using price_per_unit × min_quantity
      if (service.price_per_unit && service.price_per_unit > 0) {
        const min = service.min_quantity ?? 1;
        return { price: service.price_per_unit * min, prefix: "from" };
      }
      return base > 0 ? { price: base, prefix: "" } : null;
    }

    const type = matrix.type as string;

    if (type === "boss_tiered") {
      const bosses = (matrix.bosses as Array<{ kill_tiers: Array<{ min_kills: number; price_per_kill: number }> }>) ?? [];
      const minKills = (matrix.minimum_kills as number) ?? 1;
      let cheapest = Infinity;
      for (const boss of bosses) {
        for (const tier of boss.kill_tiers ?? []) {
          const p = tier.price_per_kill * minKills;
          if (p < cheapest) cheapest = p;
        }
      }
      return isFinite(cheapest) ? { price: cheapest, prefix: "from" } : null;
    }

    if (type === "per_item" || type === "per_item_stat_based") {
      const items = (matrix.items as Array<{ price: number }>) ?? [];
      const prices = items.map((i) => i.price).filter((p) => p > 0);
      if (prices.length === 0) return null;
      return { price: Math.min(...prices), prefix: "from" };
    }

    if (type === "per_unit") {
      const ppu = (matrix.price_per_unit as number) ?? 0;
      const minU = (matrix.minimum_units as number) ?? 1;
      return ppu > 0 ? { price: ppu * minU, prefix: "from" } : null;
    }

    if (type === "xp_based" || type === "stat_based") {
      return base > 0 ? { price: base, prefix: "from" } : null;
    }

    if (type === "gold_tiered") {
      const tiers = (matrix.tiers as Array<{ price_per_unit: number }>) ?? [];
      if (tiers.length > 0 && tiers[0].price_per_unit > 0) {
        return { price: tiers[0].price_per_unit, prefix: "from" };
      }
    }
  } catch {
    // ignore parse errors
  }

  return base > 0 ? { price: base, prefix: "" } : null;
}

export default function CategoryClient({ game, category, services, initialServiceSlug }: Props) {
  const initial = services.find((s) => s.slug === initialServiceSlug) ?? services[0] ?? null;
  const [selected, setSelected] = useState<ServiceData | null>(initial);
  const [serviceSearch, setServiceSearch] = useState("");
  const hasSingleService = services.length === 1;

  const filteredServices = useMemo(() => {
    if (!serviceSearch.trim()) return services;
    const q = serviceSearch.toLowerCase();
    return services.filter((s) => s.name.toLowerCase().includes(q) || s.description?.toLowerCase().includes(q));
  }, [services, serviceSearch]);

  if (services.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 text-center text-[var(--text-muted)]">
        <p className="font-medium">No services available yet.</p>
        <p className="text-sm mt-1">Check back soon.</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-[var(--text-muted)] mb-6 flex-wrap">
        <Link href="/games" className="hover:text-[var(--text-primary)] transition-colors">Games</Link>
        <ChevronRight className="h-3.5 w-3.5 opacity-40" />
        <Link href={`/games/${game.slug}`} className="hover:text-[var(--text-primary)] transition-colors">{game.name}</Link>
        <ChevronRight className="h-3.5 w-3.5 opacity-40" />
        <span className="text-[var(--text-primary)]">{category.name}</span>
      </div>

      {/* Category header */}
      <div className="flex items-center gap-4 mb-8">
        <Link
          href={`/games/${game.slug}`}
          className="p-2 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card)] border border-transparent hover:border-[var(--border-default)] transition-all"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        {(category.image_url || game.logo_url) && (
          <div className="w-12 h-12 rounded-2xl overflow-hidden border border-[var(--border-default)] flex-shrink-0 bg-[var(--bg-elevated)] shadow-md shadow-black/20">
            <Image
              src={category.image_url ?? game.logo_url!}
              alt={category.image_url ? category.name : game.name}
              width={48}
              height={48}
              className={category.image_url ? "object-contain w-full h-full p-1" : "object-cover"}
            />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-xs text-[var(--text-muted)] font-medium">{game.name}</p>
          <h1 className="font-heading text-2xl font-bold text-white leading-tight tracking-tight">
            {category.name}
          </h1>
        </div>
        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--bg-elevated)] border border-[var(--border-default)] text-xs text-[var(--text-muted)]">
          <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
          {services.length} available
        </div>
      </div>

      <div className={cn("items-start", hasSingleService ? "block" : "flex flex-col lg:flex-row gap-6")}>
        {/* ── Service selector: product card grid ── */}
        {!hasSingleService && (
          <div className="w-full lg:w-[340px] xl:w-[380px] flex-shrink-0">
            <div className="rounded-3xl border border-[var(--border-default)] bg-[var(--bg-card)]/80 shadow-xl shadow-black/20 overflow-hidden">
              <div className="px-4 py-3.5 border-b border-[var(--border-subtle)] bg-gradient-to-r from-primary/[0.08] to-transparent">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-[var(--text-primary)]">Choose a service</p>
                    <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                      Pick what you want to configure.
                    </p>
                  </div>
                  <span className="text-[10px] rounded-full border border-primary/20 bg-primary/10 px-2 py-1 text-primary font-medium">
                    {filteredServices.length}/{services.length}
                  </span>
                </div>
              </div>

              <div className="p-3 space-y-3">
            {/* Search bar */}
            {services.length > 5 && (
              <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-elevated)]">
                <Search className="h-4 w-4 text-[var(--text-muted)] shrink-0" />
                <input
                  type="text"
                  value={serviceSearch}
                  onChange={(e) => setServiceSearch(e.target.value)}
                  placeholder={`Search ${services.length} services…`}
                  className="flex-1 bg-transparent text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none"
                />
                {serviceSearch && (
                  <button
                    type="button"
                    onClick={() => setServiceSearch("")}
                    className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            )}

            {/* Product card grid */}
            <div className="grid grid-cols-2 gap-2.5">
              {filteredServices.map((service) => {
                const isActive = selected?.id === service.id;
                const imgSrc = service.image_url ?? game.logo_url;
                return (
                  <button
                    key={service.id}
                    type="button"
                    onClick={() => setSelected(service)}
                    className={cn(
                      "relative rounded-2xl border text-left transition-all duration-200 overflow-hidden group",
                      isActive
                        ? "border-primary bg-primary/[0.055] shadow-lg shadow-primary/20 -translate-y-0.5"
                        : "border-[var(--border-default)] bg-[var(--bg-elevated)]/45 hover:border-primary/35 hover:bg-[var(--bg-elevated)] hover:shadow-lg hover:shadow-primary/10 hover:-translate-y-0.5"
                    )}
                  >
                    {/* Orange accent bar when active */}
                    {isActive && (
                      <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary via-[var(--color-accent)] to-primary rounded-t-2xl" />
                    )}

                    {/* Image area */}
                    <div className={cn(
                      "relative flex items-center justify-center py-4 transition-colors",
                      isActive
                        ? "bg-gradient-to-b from-primary/8 to-[var(--bg-card)]"
                        : "bg-gradient-to-b from-[var(--bg-elevated)] to-[var(--bg-card)] group-hover:from-primary/5"
                    )}>
                      {imgSrc ? (
                        <Image
                          src={imgSrc}
                          alt={service.name}
                          width={64}
                          height={64}
                          className="object-contain w-14 h-14 drop-shadow-sm transition-transform duration-200 group-hover:scale-105"
                        />
                      ) : (
                        <div className={cn(
                          "w-14 h-14 rounded-xl flex items-center justify-center text-2xl transition-transform duration-200 group-hover:scale-105",
                          isActive ? "bg-primary/15" : "bg-[var(--bg-elevated)]"
                        )}>
                          {category.icon ?? "🎮"}
                        </div>
                      )}
                      {service.is_featured && (
                        <div className="absolute top-2 right-2">
                          <Star className="h-3.5 w-3.5 text-yellow-400 fill-yellow-400 drop-shadow-sm" />
                        </div>
                      )}
                    </div>

                    {/* Card content */}
                    <div className="px-3 pb-3 space-y-2">
                      <p className={cn(
                        "text-[13px] font-semibold leading-tight line-clamp-2 min-h-[2.5rem]",
                        isActive
                          ? "text-primary"
                          : "text-[var(--text-primary)] group-hover:text-primary transition-colors"
                      )}>
                        {service.name}
                      </p>

                      <div className="flex items-center justify-between gap-1">
                        {(() => {
                          const sp = getStartingPrice(service);
                          return sp ? (
                            <span className="leading-tight">
                              <span className="block text-[9px] uppercase tracking-wide text-[var(--text-muted)]">
                                {sp.prefix ? "Starts at" : "Price"}
                              </span>
                              <span className="text-sm font-bold text-primary">${sp.price.toFixed(2)}</span>
                            </span>
                          ) : (
                            <span className="text-xs text-[var(--text-muted)]">Configure</span>
                          );
                        })()}
                        <span className={cn(
                          "text-[10px] font-semibold px-2 py-1 rounded-full border transition-all shrink-0",
                          isActive
                            ? "border-primary/50 bg-primary text-white shadow-sm shadow-primary/25"
                            : "border-[var(--border-subtle)] text-[var(--text-muted)] group-hover:border-primary/30 group-hover:text-[var(--text-secondary)]"
                        )}>
                          {isActive ? "✓ Selected" : "Select"}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}

              {filteredServices.length === 0 && (
                <div className="col-span-2 flex flex-col items-center justify-center py-10 text-center text-[var(--text-muted)]">
                  <ShoppingBag className="h-8 w-8 mb-2 opacity-30" />
                  <p className="text-sm">No services match &ldquo;{serviceSearch}&rdquo;</p>
                  <button
                    type="button"
                    onClick={() => setServiceSearch("")}
                    className="text-xs text-primary hover:underline mt-1"
                  >
                    Clear search
                  </button>
                </div>
              )}
            </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Main + cart: cart rechts vanaf lg ── */}
        <div className={cn("min-w-0 w-full", !hasSingleService && "flex-1")}>
          {selected ? (
            <div className="grid gap-6 lg:gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(280px,340px)] xl:grid-cols-[minmax(0,1fr)_minmax(300px,360px)] lg:items-start">
              <div className="min-w-0 space-y-5">
                {/* Service title above configurator */}
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-heading text-2xl font-semibold text-white">{selected.name}</h2>
                    {selected.description && (
                      <p className="text-sm text-[var(--text-muted)] mt-1 leading-relaxed max-w-xl">
                        {selected.description}
                      </p>
                    )}
                  </div>
                  {!hasSingleService && (
                    <Link
                      href={`/games/${game.slug}/${category.slug}/${selected.slug}`}
                      className="text-xs text-[var(--text-muted)] hover:text-primary transition-colors flex-shrink-0 mt-1"
                    >
                      Full page →
                    </Link>
                  )}
                </div>

                {/* Trust badges */}
                <div className="flex flex-wrap gap-2">
                  {[
                    { label: "Safe & Discreet", icon: "🔒" },
                    { label: "Fast Start", icon: "⚡" },
                    { label: "24/7 Support", icon: "💬" },
                  ].map((f) => (
                    <div key={f.label} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)] text-xs font-medium">
                      <span>{f.icon}</span>
                      <span className="text-[var(--text-secondary)]">{f.label}</span>
                    </div>
                  ))}
                </div>

                <ServiceConfigurator key={selected.id} service={selected} game={game} categorySlug={category.slug} />
              </div>

              <aside className="min-w-0 lg:sticky lg:top-24 lg:self-start">
                <CartPreview />
              </aside>
            </div>
          ) : (
            <div className="flex items-center justify-center h-64 rounded-2xl border border-dashed border-[var(--border-default)] text-[var(--text-muted)]">
              <p className="text-sm">Select a service to get started</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
