import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendPushToAgents } from "@/lib/push/send";

export const dynamic = "force-dynamic";

// POST /api/chat/conversations — create a new conversation (customer)
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("display_name, email")
    .eq("id", user.id)
    .single() as { data: { display_name: string | null; email: string | null } | null };

  const body = await req.json() as {
    order_id?: string;
    order_number?: string;
    game_name?: string;
    service_name?: string;
    initial_message?: string;
  };

  // Verify order ownership if order_id is provided
  if (body.order_id) {
    const { data: orderOwner } = await admin
      .from("orders")
      .select("customer_id")
      .eq("id", body.order_id)
      .single() as unknown as { data: { customer_id: string } | null };

    if (!orderOwner || orderOwner.customer_id !== user.id) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const { data: existing } = await admin
      .from("chat_conversations")
      .select()
      .eq("customer_id", user.id)
      .eq("order_id", body.order_id)
      .eq("status", "open")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (existing) {
      return NextResponse.json({ conversation: existing });
    }
  }

  const { data: conv, error } = await admin
    .from("chat_conversations")
    .insert({
      customer_id: user.id,
      customer_name: profile?.display_name ?? user.email?.split("@")[0] ?? "Customer",
      customer_email: profile?.email ?? user.email ?? "",
      order_id: body.order_id ?? null,
      order_number: body.order_number ?? null,
      game_name: body.game_name ?? null,
      service_name: body.service_name ?? null,
    })
    .select()
    .single();

  if (error || !conv) {
    return NextResponse.json({ error: "Failed to create conversation" }, { status: 500 });
  }

  // Insert system message with order details if provided
  if (body.order_number) {
    const lines: string[] = [`📦 New order received: **#${body.order_number}**`];
    if (body.game_name) lines.push(`🎮 Game: ${body.game_name}`);
    if (body.service_name) lines.push(`⚡ Service: ${body.service_name}`);
    lines.push("", "A support agent will be with you shortly.");

    await admin.from("chat_messages").insert({
      conversation_id: conv.id,
      sender_role: "system",
      sender_name: "System",
      body: lines.join("\n"),
    });
  } else if (body.initial_message) {
    await admin.from("chat_messages").insert({
      conversation_id: conv.id,
      sender_id: user.id,
      sender_role: "customer",
      sender_name: profile?.display_name ?? "Customer",
      body: body.initial_message,
    });
    await admin
      .from("chat_conversations")
      .update({ unread_count: 1, last_message_at: new Date().toISOString() })
      .eq("id", conv.id);
  }

  // Notify agents about new conversation (fire-and-forget)
  const customerName = profile?.display_name ?? user.email?.split("@")[0] ?? "Customer";
  sendPushToAgents({
    title: "New support conversation",
    body: `${customerName}${body.order_number ? ` · #${body.order_number}` : ""} started a chat`,
    url: "/admin/chat",
  }).catch(() => {});

  return NextResponse.json({ conversation: conv });
}

// GET /api/chat/conversations — list own open conversations
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const { data: conversations } = await admin
    .from("chat_conversations")
    .select("id, order_id, order_number, game_name, service_name, status, created_at, last_message_at, unread_count")
    .eq("customer_id", user.id)
    .order("last_message_at", { ascending: false })
    .limit(20);

  return NextResponse.json({ conversations: conversations ?? [] });
}
