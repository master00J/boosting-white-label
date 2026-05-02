"use client";

import { useEffect } from "react";
import { useStorefrontBuilderPickMode } from "@/hooks/use-storefront-builder-pick-mode";
import { STOREFRONT_BUILDER_PICK_MSG } from "@/lib/storefront-builder-pick-bridge";

/**
 * When the storefront runs inside the builder iframe, captures clicks on [data-storefront-pick]
 * and notifies the parent window (Visual builder focuses the matching field).
 */
export default function StorefrontBuilderPickCapture() {
  const enabled = useStorefrontBuilderPickMode();

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;

    const style = document.createElement("style");
    style.setAttribute("data-storefront-builder-pick-style", "");
    style.textContent = `
      [data-storefront-pick] { cursor: crosshair !important; }
      [data-storefront-pick]:hover {
        outline: 2px solid rgba(129, 140, 248, 0.75);
        outline-offset: 3px;
        border-radius: 4px;
      }
    `;
    document.head.appendChild(style);

    const onPointerDown = (e: MouseEvent) => {
      const t = e.target as Element | null;
      const hit = t?.closest("[data-storefront-pick]");
      if (!hit) return;
      const pick = hit.getAttribute("data-storefront-pick");
      if (!pick) return;
      e.preventDefault();
      e.stopPropagation();
      window.parent.postMessage({ type: STOREFRONT_BUILDER_PICK_MSG, pick }, window.location.origin);
    };

    document.addEventListener("click", onPointerDown, true);
    return () => {
      document.removeEventListener("click", onPointerDown, true);
      style.remove();
    };
  }, [enabled]);

  return null;
}
