import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

type SubscriptionBody = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
};

// POST /api/push/subscribe — save a push subscription for the current user
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as SubscriptionBody;
  if (!body.endpoint || !body.keys?.p256dh || !body.keys?.auth) {
    return NextResponse.json({ error: "Invalid subscription data" }, { status: 400 });
  }

  const admin = createAdminClient();

  // Prevent endpoint hijacking: if this endpoint already belongs to another user, reject
  const { data: existing } = await admin
    .from("push_subscriptions")
    .select("profile_id")
    .eq("endpoint", body.endpoint)
    .maybeSingle() as unknown as { data: { profile_id: string } | null };

  if (existing && existing.profile_id !== user.id) {
    return NextResponse.json({ error: "Endpoint already registered to another account" }, { status: 403 });
  }

  const { error } = await admin
    .from("push_subscriptions")
    .upsert(
      { profile_id: user.id, endpoint: body.endpoint, keys: body.keys },
      { onConflict: "endpoint" }
    );

  if (error) {
    return NextResponse.json({ error: "Failed to save subscription" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

// DELETE /api/push/subscribe — remove a push subscription
export async function DELETE(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as { endpoint: string };
  if (!body.endpoint) return NextResponse.json({ error: "Missing endpoint" }, { status: 400 });

  const admin = createAdminClient();
  await admin
    .from("push_subscriptions")
    .delete()
    .eq("profile_id", user.id)
    .eq("endpoint", body.endpoint);

  return NextResponse.json({ success: true });
}

// GET /api/push/subscribe — return the VAPID public key
export async function GET() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!publicKey) {
    return NextResponse.json({ error: "Push not configured" }, { status: 503 });
  }
  return NextResponse.json({ publicKey });
}
