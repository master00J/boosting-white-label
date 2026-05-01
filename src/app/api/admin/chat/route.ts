import { NextResponse } from "next/server";
import { assertAdmin } from "@/lib/auth/assert-admin";

export const dynamic = "force-dynamic";

// GET /api/admin/chat — list all conversations for agents/super_admin
export async function GET() {
  const ctx = await assertAdmin();
  if (!ctx.ok) return ctx.response;

  const { admin, userId, role } = ctx;
  const isAdmin = role === "admin";

  // Check chat_agents if regular admin
  if (isAdmin) {
    const { data: agentRow } = await admin
      .from("chat_agents")
      .select("id")
      .eq("profile_id", userId)
      .single();
    if (!agentRow) return NextResponse.json({ error: "No chat access" }, { status: 403 });
  }

  const { data: conversations } = await admin
    .from("chat_conversations")
    .select(`
      id, customer_name, customer_email, order_number, game_name, service_name,
      status, unread_count, created_at, updated_at, last_message_at, customer_id
    `)
    .order("last_message_at", { ascending: false })
    .limit(200);

  return NextResponse.json({ conversations: conversations ?? [] });
}
