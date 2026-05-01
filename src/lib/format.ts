/**
 * Format a price intelligently:
 * - >= 0.01  → 2 decimal places  (1.25, 0.05)
 * - >= 0.001 → 4 decimal places  (0.0034)
 * - smaller  → 6 decimal places  (0.000012)
 */
export function formatPrice(amount: number): string {
  if (amount === 0) return "0.00";
  const abs = Math.abs(amount);
  let decimals: number;
  if (abs >= 0.01) {
    decimals = 2;
  } else if (abs >= 0.001) {
    decimals = 4;
  } else {
    decimals = 6;
  }
  return amount.toFixed(decimals);
}

/** Returns "$X.XX" with smart decimal places (primary currency) */
export function formatUSD(amount: number): string {
  return `$${formatPrice(amount)}`;
}

/** Returns "$X.XX" with smart decimal places (kept for backwards compat) */
export function formatEuro(amount: number): string {
  return `$${formatPrice(amount)}`;
}

/** Returns "750,000 OSRS GP" style gold formatting */
export function formatGold(amount: number, label = "GP"): string {
  return `${Math.round(amount).toLocaleString("en-US")} ${label}`;
}
