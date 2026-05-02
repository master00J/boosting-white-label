import { NextResponse } from "next/server";
import { assertAdmin } from "@/lib/auth/assert-admin";
import { seedOsrsCatalogForGame } from "@/lib/osrs-catalog-seed";
import { z } from "zod";

export const dynamic = "force-dynamic";

const GameSchema = z.object({
  name: z.string().min(1).max(200),
  slug: z.string().min(1).max(100),
  order_code: z.string().max(20).nullable().optional(),
  description: z.string().max(2000).nullable().optional(),
  short_description: z.string().max(500).nullable().optional(),
  logo_url: z.string().max(500).nullable().optional(),
  banner_url: z.string().max(500).nullable().optional(),
  icon_url: z.string().max(500).nullable().optional(),
  is_active: z.boolean().optional(),
  is_featured: z.boolean().optional(),
  sort_order: z.number().int().optional(),
  meta_title: z.string().max(200).nullable().optional(),
  meta_description: z.string().max(500).nullable().optional(),
  config: z.record(z.string(), z.unknown()).optional(),
});

function isMissingOrderCodeColumn(error: { message?: string; details?: string } | null) {
  const text = `${error?.message ?? ""} ${error?.details ?? ""}`.toLowerCase();
  return text.includes("order_code") && (text.includes("column") || text.includes("schema cache"));
}

export async function GET() {
  const ctx = await assertAdmin();
  if (!ctx.ok) return ctx.response;
  const { admin } = ctx;

  const { data, error } = await admin.from("games").select("*").order("sort_order");
  if (error) return NextResponse.json({ error: "Database query failed" }, { status: 500 });
  return NextResponse.json(data, {
    headers: { "Cache-Control": "private, no-store, max-age=0, must-revalidate" },
  });
}

export async function POST(request: Request) {
  const ctx = await assertAdmin();
  if (!ctx.ok) return ctx.response;
  const { admin } = ctx;

  const body = await request.json().catch(() => null);
  const parsed = GameSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }

  let payload = parsed.data;
  let { data, error } = await admin.from("games").insert(payload as never).select().single();

  if (error && isMissingOrderCodeColumn(error)) {
    const legacyPayload = { ...payload };
    delete legacyPayload.order_code;
    payload = legacyPayload;
    const retry = await admin.from("games").insert(payload as never).select().single();
    data = retry.data;
    error = retry.error;
  }

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (data) {
    try {
      await seedOsrsCatalogForGame(admin, data.id, data.slug);
    } catch (e) {
      console.error("[admin/games POST] OSRS catalog preload failed:", e);
    }
  }

  return NextResponse.json(data);
}
