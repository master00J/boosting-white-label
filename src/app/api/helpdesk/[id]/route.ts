import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { z } from "zod";
import { sendTicketResponse } from "@/lib/email/send";

const replySchema = z.object({
  content: z.string().min(1).max(5000),
  isInternalNote: z.boolean().optional().default(false),
  /** When true, message is stored as AI-generated and email sent with isAI flag; optional metadata for ticket. */
  isAiGenerated: z.boolean().optional().default(false),
  aiConfidence: z.number().min(0).max(1).optional(),
  shouldEscalate: z.boolean().optional(),
});

const updateSchema = z.object({
  status: z.enum(["open", "awaiting_reply", "in_progress", "resolved", "closed"]).optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
  assignedTo: z.string().uuid().optional().nullable(),
});

type ProfileRow = { role: string };
type TicketRow = {
  id: string;
  ticket_number: string;
  subject: string;
  status: string;
  customer_id: string;
  customer: { display_name: string | null; email: string } | null;
};

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();

  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single() as unknown as { data: ProfileRow | null };

  const isAdmin = profile?.role === "admin" || profile?.role === "super_admin";

  const { data: ticket } = await admin
    .from("tickets")
    .select("id, ticket_number, subject, status, priority, category, is_ai_handled, ai_confidence, created_at, updated_at, resolved_at, customer_id, order_id, customer:profiles!customer_id(display_name, email), assigned:profiles!assigned_to(display_name)")
    .eq("id", id)
    .single() as unknown as { data: TicketRow | null };

  if (!ticket) return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
  if (!isAdmin && ticket.customer_id !== user.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  let messagesQuery = admin
    .from("ticket_messages")
    .select("id, content, is_ai_generated, is_internal_note, created_at, sender:profiles(display_name, role)")
    .eq("ticket_id", id)
    .order("created_at", { ascending: true });

  if (!isAdmin) {
    messagesQuery = messagesQuery.eq("is_internal_note", false);
  }

  const { data: messages } = await messagesQuery;

  return NextResponse.json({ ticket, messages: messages ?? [] });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = replySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const admin = createAdminClient();

  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single() as unknown as { data: ProfileRow | null };

  const isAdmin = profile?.role === "admin" || profile?.role === "super_admin";

  const { data: ticket } = await admin
    .from("tickets")
    .select("id, ticket_number, subject, status, customer_id, customer:profiles!customer_id(display_name, email)")
    .eq("id", id)
    .single() as unknown as { data: TicketRow | null };

  if (!ticket) return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
  if (!isAdmin && ticket.customer_id !== user.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { content } = parsed.data;
  // Only admins may set these privileged fields
  const isInternalNote = isAdmin ? (parsed.data.isInternalNote ?? false) : false;
  const isAiGenerated = isAdmin ? (parsed.data.isAiGenerated ?? false) : false;
  const aiConfidence = isAdmin ? parsed.data.aiConfidence : undefined;
  const shouldEscalate = isAdmin ? parsed.data.shouldEscalate : undefined;

  await (admin.from("ticket_messages") as unknown as { insert: (v: unknown) => Promise<unknown> }).insert({
    ticket_id: id,
    sender_id: isAiGenerated ? null : user.id,
    content,
    is_internal_note: isInternalNote,
    is_ai_generated: isAiGenerated,
  });

  const newStatus = isAdmin ? "awaiting_reply" : "in_progress";
  const ticketUpdate: Record<string, unknown> = {
    status: shouldEscalate === true ? "in_progress" : newStatus,
    updated_at: new Date().toISOString(),
  };
  if (isAiGenerated) {
    ticketUpdate.is_ai_handled = true;
    if (aiConfidence != null) ticketUpdate.ai_confidence = aiConfidence;
  }
  await (admin.from("tickets") as unknown as { update: (v: unknown) => { eq: (k: string, v: string) => Promise<unknown> } }).update(ticketUpdate).eq("id", id);

  // Send email notification to customer if admin replied (not internal note)
  if (isAdmin && !isInternalNote && ticket.customer?.email) {
    await sendTicketResponse(ticket.customer.email, {
      customerName: ticket.customer.display_name ?? "Customer",
      ticketNumber: ticket.ticket_number,
      subject: ticket.subject,
      responseContent: content,
      isAI: isAiGenerated ?? false,
    }).catch(() => {});
  }

  return NextResponse.json({ success: true });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
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
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (parsed.data.status) updateData.status = parsed.data.status;
  if (parsed.data.priority) updateData.priority = parsed.data.priority;
  if (parsed.data.assignedTo !== undefined) updateData.assigned_to = parsed.data.assignedTo;
  if (parsed.data.status === "resolved") updateData.resolved_at = new Date().toISOString();

  await (admin.from("tickets") as unknown as { update: (v: unknown) => { eq: (k: string, v: string) => Promise<unknown> } }).update(updateData).eq("id", id);

  return NextResponse.json({ success: true });
}
