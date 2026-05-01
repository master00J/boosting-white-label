import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getRateLimitIdentifier, checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";
import { z } from "zod";

const schema = z.object({
  company_name: z.string().max(100).optional(),
  website_url: z.string().url("Please enter a valid URL").or(z.literal("")),
  reason: z.string().min(10, "Please tell us a bit more (min. 10 characters)").max(1000),
});

export async function POST(req: NextRequest) {
  const rl = await checkRateLimit(getRateLimitIdentifier(req), RATE_LIMITS.sensitive);
  if (rl) return rl;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "You must be logged in to apply." }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request" }, { status: 400 });

  const admin = createAdminClient();

  // Check if already an affiliate
  const { data: existing } = await admin
    .from("affiliates")
    .select("id, is_active")
    .eq("profile_id", user.id)
    .single() as unknown as { data: { id: string; is_active: boolean } | null };

  if (existing) {
    return NextResponse.json({
      error: existing.is_active
        ? "You are already an active affiliate."
        : "Your application is pending review.",
    }, { status: 409 });
  }

  // Create affiliate record (inactive until approved)
  const { error } = await admin
    .from("affiliates")
    .insert({
      profile_id: user.id,
      company_name: parsed.data.company_name || null,
      website_url: parsed.data.website_url || null,
      notes: `Application: ${parsed.data.reason}`,
      is_active: false,
    }) as unknown as { error: { message: string } | null };

  if (error) {
    console.error("[affiliate/apply] insert error:", error);
    return NextResponse.json({ error: "Failed to submit application." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
