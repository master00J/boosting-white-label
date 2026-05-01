"use client";

import { useEffect } from "react";

/** Lazy-load Tawk.to after a short delay to avoid blocking LCP; gives DOM time to settle (reduces $el errors). */
const TAWK_LOAD_DELAY_MS = 3500;

declare global {
  interface Window {
    Tawk_API?: Record<string, unknown>;
    Tawk_LoadStart?: Date;
    __tawkReady?: boolean;
  }
}

export default function TawkToWidget({
  propertyId,
  widgetId,
}: {
  propertyId: string;
  widgetId: string;
}) {
  useEffect(() => {
    if (!propertyId) return;

    window.Tawk_API = window.Tawk_API ?? {};
    window.Tawk_LoadStart = new Date();
    (window.Tawk_API as Record<string, unknown>).onLoad = function () {
      if (typeof window !== "undefined") {
        window.__tawkReady = true;
        window.dispatchEvent(new CustomEvent("tawk-widget-loaded"));
      }
    };

    const scriptId = "tawkto-script";
    if (document.getElementById(scriptId)) return;

    const timeout = window.setTimeout(() => {
      const s = document.createElement("script");
      s.id = scriptId;
      s.async = true;
      s.src = `https://embed.tawk.to/${propertyId}/${widgetId}`;
      s.charset = "UTF-8";
      document.head.appendChild(s);
    }, TAWK_LOAD_DELAY_MS);

    return () => {
      window.clearTimeout(timeout);
      const existing = document.getElementById(scriptId);
      if (existing) existing.remove();
    };
  }, [propertyId, widgetId]);

  return null;
}
