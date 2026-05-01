/** Shared utility functions for service configurator components */

export function formatMultiplier(multiplier: number): string {
  const rounded = multiplier.toFixed(2).replace(/\.00$/, "").replace(/(\.\d)0$/, "$1");
  return `×${rounded}`;
}

export function formatMultiplierDelta(multiplier: number): string {
  const delta = Math.round(Math.abs(1 - multiplier) * 100);
  if (delta === 0) return "no change";
  return multiplier < 1 ? `-${delta}%` : `+${delta}%`;
}

export function resolveStatMultiplier(
  statValue: number,
  thresholds: { max: number; multiplier: number }[],
): number {
  const sorted = [...thresholds].sort((a, b) => a.max - b.max);
  for (const threshold of sorted) {
    if (statValue <= threshold.max) return threshold.multiplier;
  }
  return 1;
}
