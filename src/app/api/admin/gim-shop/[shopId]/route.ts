import { NextRequest, NextResponse } from "next/server";
import { assertAdmin } from "@/lib/auth/assert-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { z } from "zod";

export const dynamic = "force-dynamic";

const db = (admin: ReturnType<typeof createAdminClient>) =>
  admin as unknown as { from: (t: string) => ReturnType<ReturnType<typeof createAdminClient>["from"]> };

const PatchSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  slug: z.string().min(1).max(100).optional(),
  description: z.string().max(2000).nullable().optional(),
  is_active: z.boolean().optional(),
});

// PATCH /api/admin/gim-shop/[shopId] — update shop
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ shopId: string }> }
) {
  try {
    const ctx = await assertAdmin();
    if (!ctx.ok) return ctx.response;

    const { shopId } = await params;
    const parsed = PatchSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
    }

    const { error } = await db(ctx.admin)
      .from("gim_shops")
      .update({ ...parsed.data, updated_at: new Date().toISOString() })
      .eq("id", shopId) as { error: { message: string } | null };

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("[gim-shop PATCH]", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/admin/gim-shop/[shopId] — delete shop (cascades items)
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ shopId: string }> }
) {
  try {
    const ctx = await assertAdmin();
    if (!ctx.ok) return ctx.response;

    const { shopId } = await params;

    const { error } = await db(ctx.admin)
      .from("gim_shops")
      .delete()
      .eq("id", shopId) as { error: { message: string } | null };

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("[gim-shop DELETE]", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
