/**
 * Builds a short human-readable summary of a cart/order item configuration
 * for display in cart and checkout (e.g. "1–70 Attack (3 segments)", "Boss X · 100 kills").
 */
export function formatConfigurationSummary(config: Record<string, unknown>): string {
  if (!config || typeof config !== "object") return "";

  // XP-based: skill + route_segments
  const skill = config.skill as string | undefined;
  const segments = config.route_segments as Array<{ from_level?: number; to_level?: number }> | undefined;
  if (skill && Array.isArray(segments) && segments.length > 0) {
    const first = segments[0];
    const last = segments[segments.length - 1];
    const from = first?.from_level ?? "?";
    const to = last?.to_level ?? "?";
    const skillLabel = String(skill).replace(/^([a-z])/, (_, c) => c.toUpperCase());
    return `${from}–${to} ${skillLabel} (${segments.length} segment${segments.length !== 1 ? "s" : ""})`;
  }
  if (skill) return String(skill).replace(/^([a-z])/, (_, c: string) => c.toUpperCase());

  // Boss tiered: boss + kills + any active upcharge labels
  const boss = config.boss as string | undefined;
  const kills = config.kills as number | undefined;
  const bossModLabels = config._mod_labels as Record<string, string> | undefined;
  const bossModSummary = bossModLabels ? Object.values(bossModLabels).join(", ") : "";
  if (boss != null && kills != null) {
    const bossLabel = String(boss).replace(/^([a-z])/, (_, c: string) => c.toUpperCase());
    const base = `${bossLabel} · ${kills} kills`;
    return bossModSummary ? `${base} · ${bossModSummary}` : base;
  }
  if (boss) return String(boss).replace(/^([a-z])/, (_, c: string) => c.toUpperCase());

  // Per-unit quantity
  const quantity = config.quantity as number | undefined;
  if (typeof quantity === "number" && quantity > 1) return `Qty: ${quantity}`;

  // Per-item (item id/label) — underscores naar spaties, woorden kapitaliseren
  const item = config.item as string | undefined;
  const packageId = config.package_id as string | undefined;
  const modLabels = config._mod_labels as Record<string, string> | undefined;
  const modSummary = modLabels ? Object.values(modLabels).join(", ") : "";
  if (item) {
    const label = String(item)
      .replace(/_/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase())
      .trim();
    const base = label.slice(0, 40);
    return modSummary ? `${base} · ${modSummary}` : base;
  }
  if (packageId) {
    // Service name already includes the package label; only show upcharges here
    return modSummary;
  }
  if (modSummary) return modSummary;

  // Stat-based: list stat values briefly (e.g. "Prayer 70, Range 99")
  const statKeys = Object.keys(config).filter((k) => k.startsWith("stat_"));
  if (statKeys.length > 0) {
    const parts = statKeys
      .map((k) => {
        const label = k.replace("stat_", "").replace(/^([a-z])/, (_, c: string) => c.toUpperCase());
        return `${label} ${config[k]}`;
      })
      .slice(0, 3);
    return parts.join(", ");
  }

  return "";
}
