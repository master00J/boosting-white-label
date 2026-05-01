import { NextRequest, NextResponse } from "next/server";
import { assertAdminSection } from "@/lib/auth/assert-admin";
import { insertActivityLog } from "@/lib/supabase/db-helpers";
import { z } from "zod";

export const dynamic = "force-dynamic";

const PatchSchema = z.object({
  code: z.string().min(1).max(50).optional(),
  discount_type: z.enum(["percentage", "fixed"]).optional(),
  discount_value: z.number().positive().optional(),
  min_order_amount: z.number().nonnegative().nullable().optional(),
  max_uses: z.number().int().positive().nullable().optional(),
  expires_at: z.string().datetime().nullable().optional(),
  is_active: z.boolean().optional(),
  description: z.string().max(500).nullable().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await assertAdminSection("marketing");
  if (!ctx.ok) return ctx.response;

  const { id } = await params;

  const parsed = PatchSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }

  const { data, error } = await ctx.admin
    .from("coupons")
    .update(parsed.data)
    .eq("id", id)
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await insertActivityLog(ctx.admin, {
    actor_id: ctx.userId,
    action: "admin_coupon_update",
    target_type: "coupon",
    target_id: id,
    metadata: { fields: Object.keys(parsed.data) },
  });
  return NextResponse.json({ data });
}
