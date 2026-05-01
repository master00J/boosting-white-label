import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import BannersClient from "./banners-client";

export const metadata: Metadata = { title: "Banners" };
export const dynamic = "force-dynamic";

type BannerRow = { id: string; title: string; message: string; cta_text: string | null; cta_url: string | null; bg_color: string; image_url: string | null; is_active: boolean; starts_at: string | null; ends_at: string | null; created_at: string };

export default async function BannersPage() {
  const admin = createAdminClient();
  const { data: banners } = await admin
    .from("promo_banners")
    .select("id, title, message, cta_text, cta_url, bg_color, image_url, is_active, starts_at, ends_at, created_at")
    .order("created_at", { ascending: false }) as unknown as { data: BannerRow[] | null };

  return <BannersClient banners={banners ?? []} />;
}
