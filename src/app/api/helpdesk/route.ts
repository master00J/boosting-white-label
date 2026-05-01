import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getRateLimitIdentifier, checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";
import { z } from "zod";
import { sendTicketCreated } from "@/lib/email/send";

const createTicketSchema = z.object({
  subject: z.string().min(5).max(200),
  message: z.string().min(10).max(5000),
  category: z.string().optional(),
  orderId: z.string().uuid().optional(),
  priority: z.enum(["low", "medium", "high"]).optional().default("medium"),
});

export async function POST(req: NextRequest) {
  const rl = await checkRateLimit(getRateLimitIdentifier(req), RATE_LIMITS.sensitive);
  if (rl) return rl;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = createTicketSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { subject, message, category, orderId, priority } = parsed.data;
  const admin = createAdminClient();

  // Verify the user owns this order
  if (orderId) {
    const { data: orderOwner } = await admin
      .from("orders")
      .select("customer_id")
      .eq("id", orderId)
      .single() as unknown as { data: { customer_id: string } | null };

    if (!orderOwner || orderOwner.customer_id !== user.id) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }
  }

  type TicketRow = { id: string; ticket_number: string };
  type AdminInsert = { insert: (v: unknown) => { select: (s: string) => { single: () => Promise<{ data: TicketRow | null; error: unknown }> } } };
  type AdminMsgInsert = { insert: (v: unknown) => Promise<unknown> };

  const { data: ticket, error } = await (admin.from("tickets") as unknown as AdminInsert)
    .insert({
      customer_id: user.id,
      subject,
      category,
      order_id: orderId ?? null,
      priority,
      status: "open",
    })
    .select("id, ticket_number")
    .single();

  if (error || !ticket) {
    return NextResponse.json({ error: "Failed to create ticket" }, { status: 500 });
  }

  // Insert first message
  await (admin.from("ticket_messages") as unknown as AdminMsgInsert).insert({
    ticket_id: ticket.id,
    sender_id: user.id,
    content: message,
  });

  // Send confirmation email
  const { data: profile } = await admin
    .from("profiles")
    .select("email, display_name")
    .eq("id", user.id)
    .single() as unknown as { data: { email: string; display_name: string | null } | null };

  if (profile?.email) {
    await sendTicketCreated(profile.email, {
      customerName: profile.display_name ?? "Klant",
      ticketNumber: ticket.ticket_number,
      subject,
    }).catch(() => {});
  }

  return NextResponse.json({ ticket }, { status: 201 });
}

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();

  type ProfileRow = { role: string };
  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single() as unknown as { data: ProfileRow | null };

  const isAdmin = profile?.role === "admin" || profile?.role === "super_admin";

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const page = parseInt(searchParams.get("page") ?? "1");
  const limit = 20;
  const offset = (page - 1) * limit;

  let query = admin
    .from("tickets")
    .select("id, ticket_number, subject, status, priority, category, is_ai_handled, created_at, updated_at, customer:profiles!customer_id(display_name, email), assigned:profiles!assigned_to(display_name)")
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (!isAdmin) {
    query = query.eq("customer_id", user.id);
  }

  if (status) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    query = query.eq("status", status as any);
  }

  const { data: tickets } = await query;

  return NextResponse.json({ tickets: tickets ?? [] });
}
