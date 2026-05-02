import { calculatePrice } from "@/lib/pricing-engine";
import type { Selections } from "@/lib/pricing-engine";
import type { FormConfig, PriceMatrix } from "@/types/service-config";

/** Cart lines die uit boss_tiered configurator komen */
export function isBossTieredCartLine(configuration: Record<string, unknown>): boolean {
  const boss = configuration.boss;
  const raw = configuration.kills;
  const kills = typeof raw === "number" ? raw : typeof raw === "string" ? parseInt(raw, 10) : NaN;
  return typeof boss === "string" && boss.length > 0 && Number.isFinite(kills) && kills >= 1;
}

export function rebuildBossCartServiceName(
  serviceBase: string,
  bossLabel: string,
  kills: number,
  unitLabel: string
): string {
  const ul = unitLabel || "kills";
  return `${serviceBase} — ${bossLabel} · ${kills} ${ul}`;
}

/** Voor oudere cart-items zonder cart_service_name */
export function deriveCartServiceBaseName(serviceName: string, bossLabel: string | undefined): string {
  if (bossLabel) {
    const needle = ` — ${bossLabel}`;
    const idx = serviceName.indexOf(needle);
    if (idx >= 0) return serviceName.slice(0, idx).trim();
  }
  return serviceName.replace(/\s*·\s*\d+\s+\S+\s*$/u, "").trim() || serviceName;
}

function configurationToSelections(configuration: Record<string, unknown>, kills: number): Selections {
  const selections: Selections = {};
  for (const [k, v] of Object.entries(configuration)) {
    if (k.startsWith("_")) continue;
    if (k === "cart_service_name") continue;
    if (v === undefined) continue;
    selections[k] = v as Selections[string];
  }
  selections.kills = kills;
  return selections;
}

export function computeBossTieredCartPrice(
  priceMatrix: PriceMatrix,
  formConfig: FormConfig,
  configuration: Record<string, unknown>,
  kills: number
): number {
  if (priceMatrix.type !== "boss_tiered") return 0;
  try {
    const selections = configurationToSelections(configuration, kills);
    return calculatePrice(priceMatrix, formConfig, selections).final;
  } catch {
    return 0;
  }
}

export type ServicePricingSnapshot = {
  priceMatrix: PriceMatrix;
  formConfig: FormConfig;
};

export function isBossTieredCartItem(item: { configuration: Record<string, unknown> }): boolean {
  return isBossTieredCartLine(item.configuration);
}
