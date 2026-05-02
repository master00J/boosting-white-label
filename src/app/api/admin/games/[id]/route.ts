import { NextResponse } from "next/server";
import { assertAdmin } from "@/lib/auth/assert-admin";
import { z } from "zod";

export const dynamic = "force-dynamic";

const PatchSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  slug: z.string().min(1).max(100).optional(),
  order_code: z.string().max(20).nullable().optional(),
  description: z.string().max(2000).nullable().optional(),
  short_description: z.string().max(500).nullable().optional(),
  is_active: z.boolean().optional(),
  is_featured: z.boolean().optional(),
  logo_url: z.string().max(500).nullable().optional(),
  banner_url: z.string().max(500).nullable().optional(),
  icon_url: z.string().max(500).nullable().optional(),
  sort_order: z.number().int().optional(),
  meta_title: z.string().max(200).nullable().optional(),
  meta_description: z.string().max(500).nullable().optional(),
  config: z.record(z.string(), z.unknown()).optional(),
});

function isMissingOrderCodeColumn(error: { message?: string; details?: string } | null) {
  const text = `${error?.message ?? ""} ${error?.details ?? ""}`.toLowerCase();
  return text.includes("order_code") && (text.includes("column") || text.includes("schema cache"));
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await assertAdmin();
  if (!ctx.ok) return ctx.response;

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }

  let payload = parsed.data;
  let { data, error } = await ctx.admin.from("games").update(payload as never).eq("id", id).select().single();

  if (error && isMissingOrderCodeColumn(error)) {
    const legacyPayload = { ...payload };
    delete legacyPayload.order_code;
    payload = legacyPayload;
    const retry = await ctx.admin.from("games").update(payload as never).eq("id", id).select().single();
    data = retry.data;
    error = retry.error;
  }

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await assertAdmin();
  if (!ctx.ok) return ctx.response;

  const { id } = await params;
  const { error } = await ctx.admin.from("games").delete().eq("id", id);
  if (error) {
    const msg = error.message ?? "";
    if (
      msg.includes("orders_game_id_fkey") ||
      msg.includes("reviews_game_id_fkey") ||
      msg.includes("orders_service_id_fkey") ||
      msg.includes("reviews_service_id_fkey")
    ) {
      return NextResponse.json(
        {
          error:
            "Deleting this game is blocked by a foreign key. Apply migration 00079_orders_reviews_game_delete_set_null.sql on Supabase, or archive the game (set inactive) instead of deleting.",
        },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
