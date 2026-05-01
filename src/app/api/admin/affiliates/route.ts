import { NextResponse } from "next/server";
import { assertAdmin } from "@/lib/auth/assert-admin";
import { z } from "zod";

const createSchema = z.object({
  email: z.string().email(),
  company_name: z.string().max(100).optional().nullable(),
  website_url: z.string().url().optional().nullable().or(z.literal("")),
  commission_rate: z.number().min(0).max(1),
  cookie_days: z.number().int().min(1).max(365),
  payout_minimum: z.number().min(0),
  notes: z.string().max(500).optional().nullable(),
});

export async function POST(req: Request) {
  const ctx = await assertAdmin();
  if (!ctx.ok) return ctx.response;
  const { admin, userId: user_id } = ctx;

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request" }, { status: 400 });

  // Find the profile by email
  const { data: targetProfile } = await admin
    .from("profiles")
    .select("id, display_name, email")
    .eq("email", parsed.data.email)
    .single() as unknown as { data: { id: string; display_name: string | null; email: string } | null };

  if (!targetProfile) {
    return NextResponse.json({ error: "No user found with that email address." }, { status: 404 });
  }

  // Check if already an affiliate
  const { data: existing } = await admin
    .from("affiliates")
    .select("id")
    .eq("profile_id", targetProfile.id)
    .single() as unknown as { data: { id: string } | null };

  if (existing) {
    return NextResponse.json({ error: "This user is already an affiliate." }, { status: 409 });
  }

  const { data: affiliate, error } = await admin
    .from("affiliates")
    .insert({
      profile_id: targetProfile.id,
      company_name: parsed.data.company_name ?? null,
      website_url: parsed.data.website_url || null,
      commission_rate: parsed.data.commission_rate,
      cookie_days: parsed.data.cookie_days,
      payout_minimum: parsed.data.payout_minimum,
      notes: parsed.data.notes ?? null,
      approved_at: new Date().toISOString(),
      approved_by: user_id,
    })
    .select("*, profile:profiles(display_name, email)")
    .single() as unknown as { data: unknown; error: { message: string } | null };

  if (error) {
    console.error("[admin/affiliates] insert error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(affiliate, { status: 201 });
}
