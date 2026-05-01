import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import ShopDetailClient from "./shop-detail-client";

type ShopRow = {
  id: string;
  game_id: string;
  name: string;
  slug: string;
  description: string | null;
  is_active: boolean;
};

type ItemRow = {
  id: string;
  item_id: string;
  item_name: string;
  quantity: number;
  price_each: number;
  is_available: boolean;
  sort_order: number;
};

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const admin = createAdminClient();
  const db = admin as unknown as { from: (t: string) => ReturnType<ReturnType<typeof createAdminClient>["from"]> };
  const { data: shop } = await db.from("gim_shops").select("name, description").eq("slug", slug).single() as { data: { name: string; description: string | null } | null };
  return { title: shop?.name ?? "Shop", description: shop?.description ?? undefined };
}

export default async function ShopDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const admin = createAdminClient();
  const db = admin as unknown as { from: (t: string) => ReturnType<ReturnType<typeof createAdminClient>["from"]> };

  const { data: shop } = await db
    .from("gim_shops")
    .select("id, game_id, name, slug, description, is_active")
    .eq("slug", slug)
    .eq("is_active", true)
    .single() as { data: ShopRow | null };

  if (!shop) notFound();

  const { data: items } = await db
    .from("gim_shop_items")
    .select("id, item_id, item_name, quantity, price_each, is_available, sort_order")
    .eq("shop_id", shop.id)
    .eq("is_available", true)
    .order("sort_order", { ascending: true }) as { data: ItemRow[] | null };

  return <ShopDetailClient shop={shop} items={items ?? []} />;
}
