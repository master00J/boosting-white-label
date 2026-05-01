"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import PromoBanner, { type PromoBannerData } from "./promo-banner";

const HERO_PATHS = ["/"];

/** Fetches banners client-side — toont niets tot data geladen is, voorkomt flash van oude banner */
export default function PromoBannersClient() {
  const pathname = usePathname();
  const [banners, setBanners] = useState<PromoBannerData[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (HERO_PATHS.includes(pathname)) {
      setBanners([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    fetch("/api/promo-banners")
      .then((res) => res.json())
      .then((data) => {
        setBanners(Array.isArray(data) ? data : []);
      })
      .catch(() => setBanners([]))
      .finally(() => setLoading(false));
  }, [pathname]);

  if (loading || !banners || banners.length === 0) return null;

  return (
    <>
      {banners.map((banner) => (
        <PromoBanner key={banner.id} banner={banner} />
      ))}
    </>
  );
}
