import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateHelpdeskResponse } from "@/lib/ai/helpdesk-agent";
import { z } from "zod";

const schema = z.object({
  ticketId: z.string().uuid(),
});

type ProfileRow = { role: string };
type TicketRow = {
  id: string;
  ticket_number: string;
  subject: string;
  status: string;
  customer_id: string;
  order_id: string | null;
  customer: { display_name: string | null; email: string } | null;
  order: { order_number: string } | null;
};
type MessageRow = {
  content: string;
  is_ai_generated: boolean;
  sender: { role: string } | null;
};

/** POST: Generate AI response for a ticket without saving or sending. For preview/review before sending. */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single() as unknown as { data: ProfileRow | null };

  if (!["admin", "super_admin"].includes(profile?.role ?? "")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { ticketId } = parsed.data;

  const { data: ticket } = await admin
    .from("tickets")
    .select("id, ticket_number, subject, status, customer_id, order_id, customer:profiles!customer_id(display_name, email), order:orders(order_number)")
    .eq("id", ticketId)
    .single() as unknown as { data: TicketRow | null };

  if (!ticket) return NextResponse.json({ error: "Ticket not found" }, { status: 404 });

  const { data: messages } = await admin
    .from("ticket_messages")
    .select("content, is_ai_generated, sender:profiles(role)")
    .eq("ticket_id", ticketId)
    .order("created_at", { ascending: true }) as unknown as { data: MessageRow[] | null };

  const lastUserMessage = [...(messages ?? [])].reverse().find(
    (m) => m.sender?.role === "customer" || !m.is_ai_generated,
  );

  if (!lastUserMessage) {
    return NextResponse.json({ error: "No customer message found" }, { status: 400 });
  }

  const previousMessages = (messages ?? []).slice(0, -1).map((m) => ({
    role: (m.sender?.role === "customer" ? "user" : "assistant") as "user" | "assistant",
    content: m.content,
  }));

  const aiResponse = await generateHelpdeskResponse(lastUserMessage.content, {
    ticketSubject: ticket.subject,
    previousMessages,
    orderNumber: ticket.order?.order_number,
    customerName: ticket.customer?.display_name ?? undefined,
  });

  if (!aiResponse) {
    return NextResponse.json({ error: "AI not configured" }, { status: 503 });
  }

  return NextResponse.json({
    content: aiResponse.content,
    shouldEscalate: aiResponse.shouldEscalate,
    confidence: aiResponse.confidence,
  });
}
