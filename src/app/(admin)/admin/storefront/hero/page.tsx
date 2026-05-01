import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import HeroClient from "./hero-client";

export const metadata: Metadata = { title: "Hero Banners" };
export const dynamic = "force-dynamic";

type HomepageConfig = {
  hero_slides?: string[];
  hero_video_slides?: string[];
  hero_video_url?: string;
  hero_bg_url?: string;
  hero_bg_overlay?: number;
  hero_height?: number;
  hero_mobile_logo?: string;
  hero_mobile_logo_only?: boolean;
};

export default async function HeroPage() {
  const admin = createAdminClient();
  const { data } = await admin
    .from("site_settings")
    .select("value")
    .eq("key", "homepage_config")
    .maybeSingle();

  const raw = data as { value: HomepageConfig } | null;
  const config: HomepageConfig = raw?.value ?? {};
  const heroSlides = Array.isArray(config.hero_slides) ? config.hero_slides : [];
  const heroVideoSlides = Array.isArray(config.hero_video_slides)
    ? config.hero_video_slides.filter((u) => typeof u === "string" && u.trim())
    : [];
  const heroVideoUrl = typeof config.hero_video_url === "string" ? config.hero_video_url.trim() : "";
  const videoSlides = heroVideoSlides.length > 0
    ? heroVideoSlides
    : heroVideoUrl
      ? [heroVideoUrl]
      : [];
  const heroOverlay = typeof config.hero_bg_overlay === "number" ? config.hero_bg_overlay : 0.75;
  const heroHeight = typeof config.hero_height === "number" && config.hero_height >= 30 && config.hero_height <= 100
    ? config.hero_height
    : 65;
  const heroMobileLogo = typeof config.hero_mobile_logo === "string" ? config.hero_mobile_logo.trim() : "";
  const heroMobileLogoOnly = Boolean(config.hero_mobile_logo_only);

  return (
    <HeroClient
      initialSlides={heroSlides}
      initialVideoSlides={videoSlides}
      initialOverlay={heroOverlay}
      initialHeight={heroHeight}
      initialMobileLogo={heroMobileLogo}
      initialMobileLogoOnly={heroMobileLogoOnly}
    />
  );
}
