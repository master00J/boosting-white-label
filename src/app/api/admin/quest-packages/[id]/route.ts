import { NextRequest, NextResponse } from "next/server";
import { assertAdmin } from "@/lib/auth/assert-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { z } from "zod";

export const dynamic = "force-dynamic";

function questPackagesTable(admin: ReturnType<typeof createAdminClient>) {
  return (admin as unknown as { from: (table: string) => ReturnType<ReturnType<typeof createAdminClient>["from"]> }).from("quest_packages");
}

const PatchSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  slug: z.string().min(1).max(100).optional(),
  description: z.string().max(2000).nullable().optional(),
  base_price: z.number().nonnegative().optional(),
  sort_order: z.number().int().optional(),
  is_active: z.boolean().optional(),
  quest_ids: z.array(z.string().min(1)).min(1).optional(),
});

// PATCH /api/admin/quest-packages/[id]
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await assertAdmin();
    if (!ctx.ok) return ctx.response;

    const { id } = await params;
    const parsed = PatchSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const admin = ctx.admin;
    const { error: updateErr } = await questPackagesTable(admin)
      .update(parsed.data)
      .eq("id", id);
    if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("[quest-packages PATCH]", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/admin/quest-packages/[id]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await assertAdmin();
    if (!ctx.ok) return ctx.response;

    const { id } = await params;
    const admin = ctx.admin;

    const { error } = await questPackagesTable(admin).delete().eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("[quest-packages DELETE]", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
