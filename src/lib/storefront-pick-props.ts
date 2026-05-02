/** Spread onto elements that should forward clicks to the Visual builder (iframe pick mode). */
export function storefrontPickProps(
  pick: string,
  enabled: boolean
): { "data-storefront-pick"?: string } {
  if (!enabled || !pick) return {};
  return { "data-storefront-pick": pick };
}
