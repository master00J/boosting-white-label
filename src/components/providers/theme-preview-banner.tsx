"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { STOREFRONT_THEME_PREVIEW_QUERY } from "@/lib/storefront-theme-preview";

export default function ThemePreviewBanner() {
  const searchParams = useSearchParams();
  if (searchParams.get(STOREFRONT_THEME_PREVIEW_QUERY) !== "1") return null;

  return (
    <div
      className="sticky top-0 z-[100] flex flex-wrap items-center justify-center gap-3 px-4 py-2.5 text-center text-xs font-medium border-b shadow-lg"
      style={{
        background: "linear-gradient(90deg, rgba(99,102,241,0.25), rgba(232,114,12,0.2))",
        borderColor: "rgba(255,255,255,0.12)",
        color: "#f4f4f5",
      }}
    >
      <span>
        Theme preview — showing unsaved changes from the Visual builder (this tab only).
      </span>
      <Link
        href="/"
        className="underline underline-offset-2 hover:opacity-90"
        prefetch={false}
      >
        Exit preview
      </Link>
    </div>
  );
}
