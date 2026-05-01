import { NextRequest, NextResponse } from "next/server";
import { assertAdminSection } from "@/lib/auth/assert-admin";
import { insertActivityLog } from "@/lib/supabase/db-helpers";
import { z } from "zod";

const schema = z.object({
  code: z.string().min(2).max(50).toUpperCase(),
  discount_type: z.enum(["percentage", "fixed"]),
  discount_value: z.number().positive(),
  min_order_amount: z.number().positive().nullable().optional(),
  max_uses: z.number().int().positive().nullable().optional(),
  expires_at: z.string().nullable().optional(),
});

export async function POST(req: NextRequest) {
  const ctx = await assertAdminSection("marketing");
  if (!ctx.ok) return ctx.response;
  const { admin } = ctx;

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  type CouponRow = { id: string; code: string };
  const { data: coupon } = await admin.from("coupons").insert(parsed.data as never).select("*").single() as unknown as { data: CouponRow | null };

  if (coupon) {
    await insertActivityLog(admin, {
      actor_id: ctx.userId,
      action: "admin_coupon_create",
      target_type: "coupon",
      target_id: coupon.id,
      metadata: { code: coupon.code },
    });
  }

  return NextResponse.json({ coupon }, { status: 201 });
}
