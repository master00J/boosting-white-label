import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import { notFound } from "next/navigation";
import AdminTicketDetailClient from "./admin-ticket-detail-client";

export const metadata: Metadata = { title: "Ticket detail" };
export const dynamic = "force-dynamic";

type TicketRow = {
  id: string;
  ticket_number: string;
  subject: string;
  status: string;
  priority: string;
  category: string | null;
  is_ai_handled: boolean;
  ai_confidence: number | null;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
  customer_id: string;
  order_id: string | null;
  customer: { display_name: string | null; email: string } | null;
  assigned: { display_name: string | null } | null;
};

type MessageRow = {
  id: string;
  content: string;
  is_ai_generated: boolean;
  is_internal_note: boolean;
  created_at: string;
  sender: { display_name: string | null; role: string } | null;
};

export default async function AdminTicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const admin = createAdminClient();

  const { data: ticket } = await admin
    .from("tickets")
    .select("id, ticket_number, subject, status, priority, category, is_ai_handled, ai_confidence, created_at, updated_at, resolved_at, customer_id, order_id, customer:profiles!customer_id(display_name, email), assigned:profiles!assigned_to(display_name)")
    .eq("id", id)
    .single() as unknown as { data: TicketRow | null };

  if (!ticket) notFound();

  const { data: messages } = await admin
    .from("ticket_messages")
    .select("id, content, is_ai_generated, is_internal_note, created_at, sender:profiles(display_name, role)")
    .eq("ticket_id", id)
    .order("created_at", { ascending: true }) as unknown as { data: MessageRow[] | null };

  return <AdminTicketDetailClient ticket={ticket} messages={messages ?? []} />;
}
