"use client";

import { useEffect } from "react";
import { useCartStore } from "@/stores/cart-store";

export function CartProvider({ children }: { children: React.ReactNode }) {
  // Hydrate the cart store from localStorage on mount
  useEffect(() => {
    useCartStore.persist.rehydrate();
  }, []);

  return <>{children}</>;
}
