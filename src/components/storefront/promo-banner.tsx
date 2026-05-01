"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { X } from "lucide-react";

export type PromoBannerData = {
  id: string;
  title: string;
  message: string;
  cta_text: string | null;
  cta_url: string | null;
  bg_color: string;
  image_url: string | null;
  created_at?: string | null;
};

export default function PromoBanner({ banner }: { banner: PromoBannerData }) {
  const [dismissed, setDismissed] = useState(false);

  // Reset dismissed when banner changes (e.g. after navigation with fresh data)
  useEffect(() => {
    setDismissed(false);
  }, [banner.id, banner.image_url, banner.message]);

  if (dismissed) return null;

  const inner = (
    <div className="relative w-full" style={{ backgroundColor: banner.bg_color }}>
      {banner.image_url ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`${banner.image_url}${banner.image_url.includes("?") ? "&" : "?"}v=${banner.created_at ?? banner.id}`}
            alt={banner.title}
            className="w-full block"
            style={{ maxHeight: "320px", objectFit: "cover", objectPosition: "center" }}
          />
          {/* close button over image */}
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setDismissed(true); }}
            className="absolute right-3 top-3 z-10 p-1.5 rounded-full bg-black/40 hover:bg-black/60 text-white transition-colors"
            aria-label="Dismiss banner"
          >
            <X className="h-4 w-4" />
          </button>
        </>
      ) : (
        <div className="relative flex items-center justify-center gap-3 px-10 py-4 text-white text-sm font-medium min-h-[52px]">
          <div className="flex items-center gap-2 flex-wrap justify-center">
            {banner.title && <span className="font-bold">{banner.title}:</span>}
            <span>{banner.message}</span>
            {banner.cta_text && (
              <span className="underline font-semibold opacity-90 hover:opacity-100">
                {banner.cta_text} →
              </span>
            )}
          </div>
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setDismissed(true); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 z-10 p-1.5 rounded-full hover:bg-white/20 transition-colors"
            aria-label="Dismiss banner"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div style={{ backgroundColor: banner.bg_color }} className="overflow-hidden">
      {banner.cta_url ? (
        <Link href={banner.cta_url} className="block hover:opacity-95 transition-opacity">
          {inner}
        </Link>
      ) : inner}
    </div>
  );
}
