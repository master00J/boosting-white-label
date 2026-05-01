import type { Metadata } from "next";
import StorefrontShell from "@/components/layouts/storefront-shell";
import PageTransition from "@/components/layouts/page-transition";
import PromoBannersClient from "@/components/storefront/promo-banners-client";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata: Metadata = {
  title: {
    template: "%s | BoostPlatform",
    default: "BoostPlatform — Professional Game Boosting",
  },
  description:
    "The premium platform for game boosting services. Fast, safe, and by verified boosters.",
};

export type StorefrontStats = {
  completed_orders: number;
  review_count: number;
  avg_rating: number;
};

export const revalidate = 60;

export default async function StorefrontLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let stats: StorefrontStats = { completed_orders: 0, review_count: 0, avg_rating: 0 };
  try {
    const supabase = createAdminClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any;
    const { data } = await db.rpc("get_storefront_stats").single();
    if (data) {
      stats = {
        completed_orders: Number(data.completed_orders) ?? 0,
        review_count: Number(data.review_count) ?? 0,
        avg_rating: Number(data.avg_rating) ?? 0,
      };
    }
  } catch {
    // Fallback when DB fails
  }

  return (
    <StorefrontShell stats={stats} topBanners={<PromoBannersClient />}>
      <PageTransition>{children}</PageTransition>
    </StorefrontShell>
  );
}
