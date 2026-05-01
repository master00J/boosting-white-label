"use client";

import { createContext, useContext, useEffect, useState } from "react";

export interface ThemeSettings {
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  success_color: string;
  border_radius: string;
  logo_url: string;
  favicon_url: string;
  hero_title: string;
  hero_subtitle: string;
  hero_cta_text: string;
  hero_bg_url: string;
  hero_bg_overlay: number;
}

export const defaultTheme: ThemeSettings = {
  primary_color: "#6366f1",
  secondary_color: "#8b5cf6",
  accent_color: "#f59e0b",
  success_color: "#22c55e",
  border_radius: "0.5rem",
  logo_url: "",
  favicon_url: "",
  hero_title: "Level Up Without the Grind",
  hero_subtitle: "Professional boosting services for your favorite games",
  hero_cta_text: "Browse Services",
  hero_bg_url: "",
  hero_bg_overlay: 0.6,
};

const ThemeContext = createContext<ThemeSettings>(defaultTheme);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<ThemeSettings>(defaultTheme);

  useEffect(() => {
    const loadTheme = async () => {
      // Guard: only run in browser with env vars present
      if (
        !process.env.NEXT_PUBLIC_SUPABASE_URL ||
        !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      ) {
        return;
      }

      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();

      const { data, error } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", "theme")
        .maybeSingle();

      if (!error && data) {
        const themeValue = (data as { value: Partial<ThemeSettings> }).value;
        if (themeValue) {
          setTheme({ ...defaultTheme, ...themeValue });
        }
      }
    };

    loadTheme();
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--color-primary", theme.primary_color);
    root.style.setProperty("--color-secondary", theme.secondary_color);
    root.style.setProperty("--color-accent", theme.accent_color);
    root.style.setProperty("--color-success", theme.success_color);
    root.style.setProperty("--border-radius", theme.border_radius);
  }, [theme]);

  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);
