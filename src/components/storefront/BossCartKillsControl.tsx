"use client";

import { useState, useCallback } from "react";
import { Plus, Minus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useCartStore, type CartItem } from "@/stores/cart-store";
import {
  isBossTieredCartLine,
  computeBossTieredCartPrice,
  rebuildBossCartServiceName,
  deriveCartServiceBaseName,
  type ServicePricingSnapshot,
} from "@/lib/cart-boss-line-price";
import type { FormConfig, PriceMatrix } from "@/types/service-config";

const pricingCache = new Map<string, ServicePricingSnapshot>();

async function fetchServicePricing(serviceId: string): Promise<ServicePricingSnapshot | null> {
  if (pricingCache.has(serviceId)) return pricingCache.get(serviceId)!;

  const supabase = createClient();
  const { data, error } = await supabase
    .from("services")
    .select("price_matrix, form_config")
    .eq("id", serviceId)
    .maybeSingle();

  if (error || !data) return null;

  const row = data as { price_matrix: unknown; form_config: unknown };

  let priceMatrix: PriceMatrix;
  let formConfig: FormConfig;
  try {
    priceMatrix = row.price_matrix as PriceMatrix;
    const raw = row.form_config as Partial<FormConfig> | null | undefined;
    formConfig = {
      pricing_type: "boss_tiered",
      fields: raw?.fields ?? [],
    };
  } catch {
    return null;
  }

  if (priceMatrix.type !== "boss_tiered") return null;

  const snapshot = { priceMatrix, formConfig };
  pricingCache.set(serviceId, snapshot);
  return snapshot;
}

interface Props {
  item: CartItem;
  compact?: boolean;
}

export default function BossCartKillsControl({ item, compact }: Props) {
  const updateItem = useCartStore((s) => s.updateItem);
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState<string | null>(null);

  const cfg = item.configuration;
  const isBossLine = isBossTieredCartLine(cfg);

  const minKillsConfigured = isBossLine
    ? Math.max(1, Math.floor(Number(cfg.minimum_kills ?? 1)))
    : 1;
  const maxKillsConfigured = isBossLine
    ? Math.max(minKillsConfigured, Math.floor(Number(cfg.maximum_kills ?? 100_000)))
    : 100_000;

  const kills = isBossLine
    ? Math.max(minKillsConfigured, Math.min(maxKillsConfigured, Math.floor(Number(cfg.kills))))
    : 1;
  const displayValue = draft ?? String(kills);

  const applyKills = useCallback(
    async (nextKills: number) => {
      const configuration = item.configuration;
      if (!isBossTieredCartLine(configuration)) return;

      setBusy(true);
      setDraft(null);
      try {
        const pricing = await fetchServicePricing(item.serviceId);
        if (!pricing) return;

        const bm = pricing.priceMatrix;
        if (bm.type !== "boss_tiered") return;

        const minK = bm.minimum_kills ?? 1;
        const maxK = bm.maximum_kills ?? 100_000;
        const clamped = Math.max(minK, Math.min(maxK, Math.floor(nextKills)));

        const price = computeBossTieredCartPrice(pricing.priceMatrix, pricing.formConfig, configuration, clamped);

        const base =
          (configuration.cart_service_name as string | undefined)?.trim()
          || deriveCartServiceBaseName(item.serviceName, configuration.boss_label as string | undefined);
        const bossLabel = (configuration.boss_label as string | undefined) || String(configuration.boss);
        const unitLabel = (configuration.unit_label as string | undefined) || "kills";

        const nextConfig = {
          ...configuration,
          kills: clamped,
          minimum_kills: minK,
          maximum_kills: maxK,
        };

        updateItem(item.id, {
          ...item,
          quantity: 1,
          configuration: nextConfig,
          finalPrice: price,
          basePrice: price,
          serviceName: rebuildBossCartServiceName(base, bossLabel, clamped, unitLabel),
        });
      } finally {
        setBusy(false);
      }
    },
    [item, updateItem]
  );

  if (!isBossLine) return null;

  const btnClass = compact
    ? "w-6 h-6 rounded-md bg-[var(--bg-card)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors disabled:opacity-40"
    : "w-7 h-7 rounded-lg border border-[var(--border-default)] flex items-center justify-center hover:border-primary/40 transition-colors disabled:opacity-40";

  const commitInput = () => {
    const parsed = parseInt(displayValue, 10);
    if (!Number.isFinite(parsed)) {
      setDraft(null);
      return;
    }
    applyKills(Math.max(minKillsConfigured, Math.min(maxKillsConfigured, parsed)));
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <span className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">
        {compact ? "Kills" : "Ordered kills"}
      </span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={busy || kills <= minKillsConfigured}
          onClick={() => applyKills(kills - 1)}
          className={btnClass}
          aria-label="Decrease kills by one"
        >
          <Minus className="h-3 w-3" />
        </button>
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          disabled={busy}
          value={displayValue}
          onChange={(e) => setDraft(e.target.value.replace(/\D/g, ""))}
          onBlur={() => {
            commitInput();
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              (e.target as HTMLInputElement).blur();
            }
          }}
          className={
            compact
              ? "w-11 text-center text-sm font-medium bg-transparent border border-[var(--border-subtle)] rounded-md py-0.5 text-[var(--text-primary)] focus:outline-none focus:border-primary/50"
              : "w-14 text-center font-medium tabular-nums rounded-lg border border-[var(--border-default)] bg-[var(--bg-elevated)] py-1 text-sm text-[var(--text-primary)] focus:outline-none focus:border-primary"
          }
          aria-label="Number of kills"
        />
        <button
          type="button"
          disabled={busy || kills >= maxKillsConfigured}
          onClick={() => applyKills(kills + 1)}
          className={btnClass}
          aria-label="Increase kills by one"
        >
          <Plus className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}

