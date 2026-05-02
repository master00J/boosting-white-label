"use client";

import type { ThemeSettings } from "@/components/providers/theme-provider";
import {
  STOREFRONT_THEME_PREVIEW_STORAGE_KEY,
  STOREFRONT_BUILDER_BROADCAST,
} from "@/lib/storefront-theme-preview";

export const STOREFRONT_BUILDER_CHANNEL_NAME = STOREFRONT_BUILDER_BROADCAST;

export type StorefrontBuilderBroadcastMessage = {
  type: "storefront_builder_theme";
  theme: ThemeSettings;
  site_name: string;
  site_tagline: string;
};

function normalizedTheme(theme: ThemeSettings): ThemeSettings {
  return {
    ...theme,
    logo_url: theme.logo_url?.trim() ?? "",
    favicon_url: theme.favicon_url?.trim() ?? "",
    hero_bg_url: theme.hero_bg_url?.trim() ?? "",
  };
}

/** Persist draft for iframe initial load + optional broadcast for live updates. */
export function writeStorefrontPreviewSession(payload: {
  theme: ThemeSettings;
  site_name: string;
  site_tagline: string;
}) {
  const theme = normalizedTheme(payload.theme);
  sessionStorage.setItem(
    STOREFRONT_THEME_PREVIEW_STORAGE_KEY,
    JSON.stringify({
      theme,
      site_name: payload.site_name.trim(),
      site_tagline: payload.site_tagline.trim(),
    })
  );
}

export function broadcastStorefrontBuilderTheme(
  channel: BroadcastChannel | null,
  payload: { theme: ThemeSettings; site_name: string; site_tagline: string }
) {
  writeStorefrontPreviewSession(payload);
  const msg: StorefrontBuilderBroadcastMessage = {
    type: "storefront_builder_theme",
    theme: normalizedTheme(payload.theme),
    site_name: payload.site_name.trim(),
    site_tagline: payload.site_tagline.trim(),
  };
  try {
    channel?.postMessage(msg);
  } catch {
    /* ignore */
  }
}

export function openStorefrontBuilderBroadcastChannel(): BroadcastChannel {
  return new BroadcastChannel(STOREFRONT_BUILDER_CHANNEL_NAME);
}
