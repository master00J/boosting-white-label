import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import TicketDetailClient from "./ticket-detail-client";

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
};

type MessageRow = {
  id: string;
  content: string;
  is_ai_generated: boolean;
  is_internal_note: boolean;
  created_at: string;
  sender: { display_name: string | null; role: string } | null;
};

export default async function TicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: ticket, error: ticketError } = await supabase
    .from("tickets")
    .select("id, ticket_number, subject, status, priority, category, is_ai_handled, ai_confidence, created_at, updated_at, resolved_at, customer_id, order_id")
    .eq("id", id)
    .eq("customer_id", user.id)
    .single();

  if (ticketError || !ticket) notFound();

  const { data: messages, error: messagesError } = await supabase
    .from("ticket_messages")
    .select("id, content, is_ai_generated, is_internal_note, created_at, sender:profiles(display_name, role)")
    .eq("ticket_id", id)
    .eq("is_internal_note", false)
    .order("created_at", { ascending: true });

  if (messagesError) throw messagesError;

  return (
    <TicketDetailClient
      ticket={ticket as TicketRow}
      messages={(messages as MessageRow[] | null) ?? []}
      currentUserId={user.id}
    />
  );
}
