import { NextRequest, NextResponse } from "next/server";
import { assertAdmin } from "@/lib/auth/assert-admin";
import { sendPushToCustomer } from "@/lib/push/send";

export const dynamic = "force-dynamic";

// POST /api/admin/chat/[id]/messages — agent sends a message
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: conversationId } = await params;
  const ctx = await assertAdmin();
  if (!ctx.ok) return ctx.response;

  const { admin, userId, role } = ctx;

  if (role === "admin") {
    const { data: agentRow } = await admin
      .from("chat_agents")
      .select("id")
      .eq("profile_id", userId)
      .single();
    if (!agentRow) return NextResponse.json({ error: "No chat access" }, { status: 403 });
  }

  const { data: profile } = await admin
    .from("profiles")
    .select("display_name")
    .eq("id", userId)
    .single() as { data: { display_name: string | null } | null };

  const body = await req.json() as { body: string };
  if (!body.body?.trim()) return NextResponse.json({ error: "Empty message" }, { status: 400 });

  // Verify conversation exists and get customer_id for push notification
  const { data: conv } = await admin
    .from("chat_conversations")
    .select("id, status, customer_id")
    .eq("id", conversationId)
    .single() as { data: { id: string; status: string; customer_id: string } | null };

  if (!conv) return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
  if (conv.status === "closed") return NextResponse.json({ error: "Conversation is closed" }, { status: 400 });

  const agentName = profile?.display_name ?? "Support";

  const { data: message, error } = await admin
    .from("chat_messages")
    .insert({
      conversation_id: conversationId,
      sender_id: userId,
      sender_role: "agent",
      sender_name: agentName,
      body: body.body.trim(),
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: "Failed to send message" }, { status: 500 });

  await admin
    .from("chat_conversations")
    .update({
      last_message_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      unread_count: 0,
    })
    .eq("id", conversationId);

  // Push notification to customer (fire-and-forget)
  if (conv.customer_id) {
    const preview = body.body.trim().slice(0, 100);
    sendPushToCustomer(conv.customer_id, {
      title: `${agentName} replied`,
      body: preview,
      url: `/orders`,
      conversationId,
    }).catch(() => {});
  }

  return NextResponse.json({ message });
}
