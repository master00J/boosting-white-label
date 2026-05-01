import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendPushToUser } from "@/lib/push/send";

export const dynamic = "force-dynamic";

async function assertStaffChatAccess() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single() as { data: { role: string } | null };

  if (!profile || !["admin", "super_admin"].includes(profile.role)) {
    return { ok: false as const, response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  if (profile.role === "admin") {
    const { data: agentRow } = await admin
      .from("chat_agents")
      .select("id")
      .eq("profile_id", user.id)
      .maybeSingle();
    if (!agentRow) return { ok: false as const, response: NextResponse.json({ error: "No chat access" }, { status: 403 }) };
  }

  return { ok: true as const, userId: user.id, admin };
}

// GET /api/push/test — staff chat diagnostics for the current user
export async function GET() {
  const ctx = await assertStaffChatAccess();
  if (!ctx.ok) return ctx.response;

  const { admin, userId } = ctx;
  const { data: subs, error } = await admin
    .from("push_subscriptions")
    .select("id, profile_id, endpoint, created_at")
    .eq("profile_id", userId);

  const vapidPublic = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const vapidPrivate = process.env.VAPID_PRIVATE_KEY;
  const vapidEmail = process.env.VAPID_EMAIL;

  return NextResponse.json({
    subscriptions_count: subs?.length ?? 0,
    subscriptions: subs?.map(s => ({
      id: s.id,
      profile_id: s.profile_id,
      endpoint_prefix: s.endpoint?.slice(0, 60) + "...",
      created_at: s.created_at,
    })) ?? [],
    vapid_configured: !!(vapidPublic && vapidPrivate && vapidEmail),
    vapid_email: vapidEmail ?? null,
    db_error: error?.message ?? null,
  });
}

// POST /api/push/test — send a test push to the current staff user's device(s)
export async function POST() {
  const ctx = await assertStaffChatAccess();
  if (!ctx.ok) return ctx.response;

  try {
    const { data: subs } = await ctx.admin
      .from("push_subscriptions")
      .select("id")
      .eq("profile_id", ctx.userId);
    if (!subs?.length) {
      return NextResponse.json({ error: "No push subscription found for this device/account" }, { status: 400 });
    }

    await sendPushToUser(ctx.userId, {
      title: "Test notification",
      body: "Staff chat push notifications are working.",
      url: "/admin/chat",
    });
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
