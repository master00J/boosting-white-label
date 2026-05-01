import { NextRequest, NextResponse } from "next/server";
import { assertAdmin } from "@/lib/auth/assert-admin";

export const dynamic = "force-dynamic";

// GET /api/admin/chat/[id] — get conversation + all messages
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const ctx = await assertAdmin();
  if (!ctx.ok) return ctx.response;

  const { admin, userId, role } = ctx;

  if (role === "admin") {
    const { data: agentRow } = await admin
      .from("chat_agents")
      .select("id")
      .eq("profile_id", userId)
      .single();
    if (!agentRow) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: conv } = await admin
    .from("chat_conversations")
    .select("*")
    .eq("id", id)
    .single();

  if (!conv) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data: messages } = await admin
    .from("chat_messages")
    .select("id, sender_role, sender_name, sender_id, body, created_at")
    .eq("conversation_id", id)
    .order("created_at", { ascending: true });

  // Reset unread count when agent views
  await admin
    .from("chat_conversations")
    .update({ unread_count: 0 })
    .eq("id", id);

  return NextResponse.json({ conversation: conv, messages: messages ?? [] });
}

// PATCH /api/admin/chat/[id] — close or reopen conversation
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const ctx = await assertAdmin();
  if (!ctx.ok) return ctx.response;

  const { admin, userId, role } = ctx;

  if (role === "admin") {
    const { data: agentRow } = await admin
      .from("chat_agents")
      .select("id")
      .eq("profile_id", userId)
      .single();
    if (!agentRow) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json() as { status: "open" | "closed" };

  const { data: conv, error } = await admin
    .from("chat_conversations")
    .update({ status: body.status, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: "Update failed" }, { status: 500 });
  return NextResponse.json({ conversation: conv });
}
