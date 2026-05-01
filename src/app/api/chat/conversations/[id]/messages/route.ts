import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendPushToAgents } from "@/lib/push/send";

export const dynamic = "force-dynamic";

// POST /api/chat/conversations/[id]/messages — customer sends a message
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: conversationId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as { body: string };
  if (!body.body?.trim()) return NextResponse.json({ error: "Empty message" }, { status: 400 });

  const admin = createAdminClient();

  // Verify the conversation belongs to this user and is open
  const { data: conv } = await admin
    .from("chat_conversations")
    .select("id, status, customer_id, unread_count")
    .eq("id", conversationId)
    .eq("customer_id", user.id)
    .single() as { data: { id: string; status: string; customer_id: string; unread_count: number } | null };

  if (!conv) return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
  if (conv.status === "closed") return NextResponse.json({ error: "Conversation is closed" }, { status: 400 });

  const { data: profile } = await admin
    .from("profiles")
    .select("display_name")
    .eq("id", user.id)
    .single() as { data: { display_name: string | null } | null };

  const { data: message, error } = await admin
    .from("chat_messages")
    .insert({
      conversation_id: conversationId,
      sender_id: user.id,
      sender_role: "customer",
      sender_name: profile?.display_name ?? "Customer",
      body: body.body.trim(),
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: "Failed to send message" }, { status: 500 });

  // Update conversation metadata
  await admin
    .from("chat_conversations")
    .update({
      last_message_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      unread_count: conv.unread_count + 1,
    })
    .eq("id", conversationId);

  // Notify agents (fire-and-forget) — include conversationId so notification groups correctly
  const senderName = profile?.display_name ?? "Customer";
  const preview = body.body.trim().slice(0, 100);
  sendPushToAgents({
    title: senderName,
    body: preview,
    url: `/admin/chat?conversation=${conversationId}`,
    conversationId,
  }).catch(() => {});

  return NextResponse.json({ message });
}

// GET /api/chat/conversations/[id]/messages — load messages for customer
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: conversationId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();

  // Verify ownership
  const { data: conv } = await admin
    .from("chat_conversations")
    .select("id, status, order_number, game_name, service_name")
    .eq("id", conversationId)
    .eq("customer_id", user.id)
    .single();

  if (!conv) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data: messages } = await admin
    .from("chat_messages")
    .select("id, sender_role, sender_name, body, created_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  return NextResponse.json({ conversation: conv, messages: messages ?? [] });
}
