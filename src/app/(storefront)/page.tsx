import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/types/database";
import HomepageClient from "./homepage-client";

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://boosting-self.vercel.app";

export const metadata: Metadata = {
  title: { absolute: "BoostPlatform — OSRS Boosting & Carry Services" },
  description:
    "Professional OSRS boosting by verified players. Skilling, questing, bossing, infernal cape and more. Fast start, full refund guarantee, 24/7 support.",
  alternates: { canonical: appUrl },
  openGraph: {
    title: "BoostPlatform — OSRS Boosting & Carry Services",
    description:
      "Professional OSRS boosting by verified players. Skilling, questing, bossing, infernal cape and more. Fast start, full refund guarantee, 24/7 support.",
    url: appUrl,
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "BoostPlatform" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "BoostPlatform — OSRS Boosting & Carry Services",
    description:
      "Professional OSRS boosting by verified players. Skilling, questing, bossing, infernal cape and more.",
    images: ["/og-image.png"],
  },
};

type GameRow = Pick<
  Database["public"]["Tables"]["games"]["Row"],
  "id" | "name" | "slug" | "logo_url" | "banner_url" | "short_description" | "is_featured"
>;

type ReviewResult = {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  reviewer: { display_name: string | null; avatar_url: string | null } | null;
};

type FeaturedWorker = {
  id: string;
  profile_photo_url: string | null;
  profile: { display_name: string | null; avatar_url: string | null } | null;
};

export type StorefrontStats = {
  completed_orders: number;
  review_count: number;
  avg_rating: number;
};

export const dynamic = "force-dynamic";

function unpack<T>(result: PromiseSettledResult<{ data: T | null }>) {
  return result.status === "fulfilled" ? result.value.data : null;
}

export default async function HomePage() {
  let supabase;
  try {
    supabase = createAdminClient();
  } catch {
    return (
      <HomepageClient
        games={[]}
        reviews={[]}
        featuredWorkers={[]}
        discordInviteUrl=""
        stats={{ completed_orders: 0, review_count: 0, avg_rating: 0 }}
        heroImages={[]}
        heroVideoSlides={[]}
        heroOverlayOpacity={0.75}
        heroHeight={65}
        heroMobileLogo=""
        heroMobileLogoOnly={false}
      />
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;
  const [gamesResult, reviewsResult, workersResult, settingsResult, statsResult] = await Promise.allSettled([
    supabase
      .from("games")
      .select("id, name, slug, logo_url, banner_url, short_description, is_featured")
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .limit(8),
    db
      .from("order_reviews")
      .select("id, rating, comment, created_at, reviewer:profiles(display_name, avatar_url)")
      .eq("is_public", true)
      .gte("rating", 4)
      .order("created_at", { ascending: false })
      .limit(6),
    supabase
      .from("workers")
      .select("id, slug, profile_photo_url, show_on_boosters_page, profile:profiles(display_name, avatar_url)")
      .eq("is_verified", true)
      .eq("is_active", true)
      .limit(20),
    supabase
      .from("site_settings")
      .select("key, value")
      .in("key", ["discord_invite_url", "homepage_config"]),
    supabase.rpc("get_storefront_stats").single(),
  ]);

  const gamesData = unpack(gamesResult) as GameRow[] | null;
  const reviewsData = unpack(reviewsResult) as ReviewResult[] | null;
  const workersData = unpack(workersResult) as (FeaturedWorker & { show_on_boosters_page?: boolean })[] | null;
  const settingsData = unpack(settingsResult) as { key: string; value: unknown }[] | null;
  const statsData = unpack(statsResult) as { completed_orders?: number; review_count?: number; avg_rating?: number } | null;

  const workersList = workersData ?? [];
  const featuredWorkers = workersList.filter((w) => w.show_on_boosters_page !== false);

  const discordInviteUrl =
    (settingsData?.find((s) => s.key === "discord_invite_url")?.value as string | undefined) ||
    process.env.NEXT_PUBLIC_DISCORD_INVITE_URL ||
    "";

  type HomepageConfig = {
    hero_bg_url?: string;
    hero_bg_overlay?: number;
    hero_slides?: string[];
    hero_height?: number;
    hero_mobile_logo?: string;
    hero_mobile_logo_only?: boolean;
  };
  const homepageConfig = settingsData?.find(
    (s) => s.key === "homepage_config"
  )?.value as HomepageConfig | undefined;
  const heroSlides = homepageConfig?.hero_slides?.filter(Boolean) ?? [];
  const heroBgUrl = (homepageConfig?.hero_bg_url || "").trim();
  const heroOverlayOpacity = Math.min(
    1,
    Math.max(0, Number(homepageConfig?.hero_bg_overlay) || 0.75)
  );
  const rawHeight = homepageConfig?.hero_height;
  const heroHeight = (() => {
    const n = typeof rawHeight === "number" ? rawHeight : Number(rawHeight);
    return n >= 30 && n <= 100 ? Math.round(n) : 65;
  })();
  const heroMobileLogo = (homepageConfig?.hero_mobile_logo || "").trim();
  const heroMobileLogoOnly = Boolean(homepageConfig?.hero_mobile_logo_only);
  // Gebruik alleen de expliciet ingestelde hero afbeelding uit de admin.
  // Geen automatische fallback naar game banners — die horen niet in de hero thuis.
  const heroImages: string[] =
    heroSlides.length > 0
      ? heroSlides
      : heroBgUrl
        ? [heroBgUrl]
        : [];

  const stats: StorefrontStats = statsData
    ? {
        completed_orders: Number(statsData.completed_orders) || 0,
        review_count: Number(statsData.review_count) || 0,
        avg_rating: Number(statsData.avg_rating) || 0,
      }
    : { completed_orders: 0, review_count: 0, avg_rating: 0 };

  return (
    <HomepageClient
      games={gamesData ?? []}
      reviews={reviewsData ?? []}
      featuredWorkers={featuredWorkers}
      discordInviteUrl={discordInviteUrl}
      stats={stats}
      heroImages={heroImages}
      heroVideoSlides={[]}
      heroOverlayOpacity={heroOverlayOpacity}
      heroHeight={heroHeight}
      heroMobileLogo={heroMobileLogo}
      heroMobileLogoOnly={heroMobileLogoOnly}
    />
  );
}
