"use client";

import { useEffect, useState } from "react";

/** True when embedded as builder live-preview iframe (same-origin, theme_preview + builder_sync). */
export function useStorefrontBuilderPickMode(): boolean {
  const [on, setOn] = useState(false);

  useEffect(() => {
    const sync = () => {
      try {
        const q = new URLSearchParams(window.location.search);
        const paramsOk =
          q.get("theme_preview") === "1" && q.get("builder_sync") === "1";
        const inIframe = window.parent !== window;
        setOn(paramsOk && inIframe);
      } catch {
        setOn(false);
      }
    };
    sync();
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, []);

  return on;
}
