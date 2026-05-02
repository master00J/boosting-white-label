import type { CartItem } from "@/stores/cart-store";

/** Thumbnail for cart rows: quest/boss line image when set, else game logo. */
export function cartItemThumbSrc(item: CartItem): string | null {
  return item.lineImageUrl || item.gameLogoUrl || null;
}

/** External wiki / arbitrary URLs from price_matrix — skip optimizer restrictions. */
export function cartThumbUnoptimized(item: CartItem): boolean {
  return !!item.lineImageUrl;
}
