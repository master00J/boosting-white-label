import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getRateLimitIdentifier, checkRateLimit } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  const rl = await checkRateLimit(getRateLimitIdentifier(req), { windowMs: 60_000, limit: 5 });
  if (rl) return rl;

  try {
    const { discord_username, rsn, games, motivation } = await req.json() as {
      discord_username: string;
      rsn?: string;
      games: string[];
      motivation: string;
    };

    if (!discord_username?.trim() || !motivation?.trim() || !games?.length) {
      return NextResponse.json({ error: "Please fill in all required fields." }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "You must be logged in to apply." }, { status: 401 });
    }

    // Check if already applied
    const { data: existing } = await supabase
      .from("workers")
      .select("id")
      .eq("profile_id", user.id)
      .single();

    if (existing) {
      return NextResponse.json({ error: "You have already submitted an application." }, { status: 409 });
    }

    const admin = createAdminClient();

    // Update Discord username on profile
    await admin
      .from("profiles")
      .update({ discord_username: discord_username.trim() })
      .eq("id", user.id);

    // Create worker record (pending review)
    const { error } = await admin.from("workers").insert({
      profile_id: user.id,
      is_active: false,
      is_verified: false,
      application_text: motivation.trim(),
      games: games,
      applied_at: new Date().toISOString(),
      notes: rsn ? `RSN: ${rsn.trim()}` : null,
    });

    if (error) {
      console.error("Worker insert error:", error);
      return NextResponse.json({ error: "Failed to submit application." }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
