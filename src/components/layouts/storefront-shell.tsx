"use client";

import { useTransition } from "react";
import { usePathname } from "next/navigation";
import StorefrontNavbar from "@/components/layouts/storefront-navbar";
import StorefrontFooter from "@/components/layouts/storefront-footer";
import CartDrawer from "@/components/storefront/cart-drawer";
// Pages that have their own hero/banner — hide promo banners there
const HERO_PATHS = ["/"];

export type StorefrontStats = {
  completed_orders: number;
  review_count: number;
  avg_rating: number;
};

export default function StorefrontShell({
  children,
  stats = { completed_orders: 0, review_count: 0, avg_rating: 0 },
  topBanners,
}: {
  children: React.ReactNode;
  stats?: StorefrontStats;
  topBanners?: React.ReactNode;
}) {
  const pathname = usePathname();
  const [isPending] = useTransition();
  // Hide banners during route transition — voorkomt flash van oude/verwijderde banner
  const showBanners = topBanners && !HERO_PATHS.includes(pathname) && !isPending;

  return (
    <div className="flex flex-col min-h-screen" style={{ backgroundColor: "#09090b" }}>
      <StorefrontNavbar />
      <main className="flex-1 pt-16">
        {showBanners && topBanners}
        {children}
      </main>
      <StorefrontFooter stats={stats} />
      <CartDrawer />
    </div>
  );
}
