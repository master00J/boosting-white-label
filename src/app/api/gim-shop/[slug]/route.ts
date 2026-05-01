import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

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

// GET /api/gim-shop/[slug] — public: fetch shop with available items
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const admin = createAdminClient();

    const { data: shop, error: shopErr } = await (admin as unknown as { from: (t: string) => ReturnType<ReturnType<typeof createAdminClient>["from"]> })
      .from("gim_shops")
      .select("id, game_id, name, slug, description, is_active")
      .eq("slug", slug)
      .eq("is_active", true)
      .single() as { data: ShopRow | null; error: { message: string } | null };

    if (shopErr || !shop) {
      return NextResponse.json({ error: "Shop not found" }, { status: 404 });
    }

    const { data: items, error: itemsErr } = await (admin as unknown as { from: (t: string) => ReturnType<ReturnType<typeof createAdminClient>["from"]> })
      .from("gim_shop_items")
      .select("id, item_id, item_name, quantity, price_each, is_available, sort_order")
      .eq("shop_id", shop.id)
      .eq("is_available", true)
      .order("sort_order", { ascending: true }) as { data: ItemRow[] | null; error: { message: string } | null };

    if (itemsErr) return NextResponse.json({ error: itemsErr.message }, { status: 500 });

    return NextResponse.json({ shop, items: items ?? [] });
  } catch (e) {
    console.error("[gim-shop public GET]", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
