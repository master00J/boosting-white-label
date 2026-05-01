import { NextRequest, NextResponse } from "next/server";
import { assertAdmin } from "@/lib/auth/assert-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { z } from "zod";

export const dynamic = "force-dynamic";

const db = (admin: ReturnType<typeof createAdminClient>) =>
  admin as unknown as { from: (t: string) => ReturnType<ReturnType<typeof createAdminClient>["from"]> };

const ItemSchema = z.object({
  item_id: z.string().min(1),
  item_name: z.string().min(1).max(200),
  quantity: z.number().int().min(0),
  price_each: z.number().nonnegative(),
  is_available: z.boolean().optional(),
  sort_order: z.number().int().optional(),
});

const BulkSchema = z.object({
  items: z.array(ItemSchema),
});

type ShopItem = {
  id: string;
  shop_id: string;
  item_id: string;
  item_name: string;
  quantity: number;
  price_each: number;
  is_available: boolean;
  sort_order: number;
};

// GET /api/admin/gim-shop/[shopId]/items — all items for shop (admin, includes unavailable)
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ shopId: string }> }
) {
  try {
    const ctx = await assertAdmin();
    if (!ctx.ok) return ctx.response;

    const { shopId } = await params;

    const { data, error } = await db(ctx.admin)
      .from("gim_shop_items")
      .select("id, shop_id, item_id, item_name, quantity, price_each, is_available, sort_order")
      .eq("shop_id", shopId)
      .order("sort_order", { ascending: true }) as { data: ShopItem[] | null; error: { message: string } | null };

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data ?? []);
  } catch (e) {
    console.error("[gim-shop items GET]", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PUT /api/admin/gim-shop/[shopId]/items — replace all items for shop (bank import)
// Deletes existing items and inserts new batch
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ shopId: string }> }
) {
  try {
    const ctx = await assertAdmin();
    if (!ctx.ok) return ctx.response;

    const { shopId } = await params;
    const parsed = BulkSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
    }

    const admin = ctx.admin;

    // Delete all existing items for this shop
    const { error: delErr } = await db(admin)
      .from("gim_shop_items")
      .delete()
      .eq("shop_id", shopId) as { error: { message: string } | null };

    if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 });

    if (parsed.data.items.length === 0) {
      return NextResponse.json({ success: true, count: 0 });
    }

    const rows = parsed.data.items.map((item, idx) => ({
      shop_id: shopId,
      item_id: item.item_id,
      item_name: item.item_name,
      quantity: item.quantity,
      price_each: item.price_each,
      is_available: item.is_available ?? true,
      sort_order: item.sort_order ?? idx,
    }));

    const { error: insertErr } = await db(admin)
      .from("gim_shop_items")
      .insert(rows) as { error: { message: string } | null };

    if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 });

    return NextResponse.json({ success: true, count: rows.length });
  } catch (e) {
    console.error("[gim-shop items PUT]", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PATCH /api/admin/gim-shop/[shopId]/items — update a single item's price/availability
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ shopId: string }> }
) {
  try {
    const ctx = await assertAdmin();
    if (!ctx.ok) return ctx.response;

    const { shopId } = await params;

    const PatchItemSchema = z.object({
      id: z.string().uuid(),
      price_each: z.number().nonnegative().optional(),
      is_available: z.boolean().optional(),
      quantity: z.number().int().min(0).optional(),
    });

    const parsed = PatchItemSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const { id, ...updates } = parsed.data;

    const { error } = await db(ctx.admin)
      .from("gim_shop_items")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("shop_id", shopId) as { error: { message: string } | null };

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("[gim-shop items PATCH]", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
