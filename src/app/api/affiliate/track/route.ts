import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getRateLimitIdentifier, checkRateLimit } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  const rl = await checkRateLimit(getRateLimitIdentifier(req), { windowMs: 60_000, limit: 30 });
  if (rl) return rl;

  const { code, referrer } = await req.json().catch(() => ({ code: null, referrer: null })) as { code: string | null; referrer: string | null };
  if (!code) return NextResponse.json({ error: "Missing code" }, { status: 400 });

  const admin = createAdminClient();

  const { data: affiliate } = await admin
    .from("affiliates")
    .select("id, is_active")
    .eq("affiliate_code", code)
    .single() as unknown as { data: { id: string; is_active: boolean } | null };

  if (!affiliate || !affiliate.is_active) {
    return NextResponse.json({ error: "Invalid affiliate code" }, { status: 404 });
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  const userAgent = req.headers.get("user-agent") ?? null;

  // Insert click record
  await admin.from("affiliate_clicks").insert({
    affiliate_id: affiliate.id,
    ip_address: ip,
    user_agent: userAgent,
    referrer: referrer ?? null,
  });

  // Increment total_clicks counter
  const { data: affData } = await admin
    .from("affiliates")
    .select("total_clicks")
    .eq("id", affiliate.id)
    .single() as unknown as { data: { total_clicks: number } | null };

  await admin
    .from("affiliates")
    .update({ total_clicks: (affData?.total_clicks ?? 0) + 1 } as never)
    .eq("id", affiliate.id);

  return NextResponse.json({ ok: true });
}
