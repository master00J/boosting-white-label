import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export type PromoBannerApi = {
  id: string;
  title: string;
  message: string;
  cta_text: string | null;
  cta_url: string | null;
  bg_color: string;
  image_url: string | null;
  created_at: string | null;
  starts_at: string | null;
  ends_at: string | null;
};

export async function GET() {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("promo_banners")
      .select("id, title, message, cta_text, cta_url, bg_color, image_url, created_at, starts_at, ends_at")
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (error) {
      if (error.code === "42703") {
        const { data: fallback } = await supabase
          .from("promo_banners")
          .select("id, title, message, cta_text, cta_url, bg_color, created_at, starts_at, ends_at")
          .eq("is_active", true)
          .order("created_at", { ascending: false });
        return NextResponse.json(
          filterActiveBanners((fallback ?? []) as PromoBannerApi[])
        );
      }
      return NextResponse.json([]);
    }

    return NextResponse.json(filterActiveBanners((data ?? []) as PromoBannerApi[]));
  } catch {
    return NextResponse.json([]);
  }
}

function filterActiveBanners(banners: PromoBannerApi[]) {
  const now = new Date();
  return banners
    .filter((b) => {
      if (b.starts_at && new Date(b.starts_at) > now) return false;
      if (b.ends_at && new Date(b.ends_at) < now) return false;
      return true;
    })
    .map((b) => ({
      id: b.id,
      title: b.title,
      message: b.message,
      cta_text: b.cta_text,
      cta_url: b.cta_url,
      bg_color: b.bg_color,
      image_url: b.image_url ?? null,
      created_at: b.created_at ?? null,
    }));
}
