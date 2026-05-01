import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import AdminHelpdeskClient from "./admin-helpdesk-client";

export const metadata: Metadata = { title: "Helpdesk" };
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
  customer: { display_name: string | null; email: string } | null;
  assigned: { display_name: string | null } | null;
};

export default async function AdminHelpdeskPage() {
  const admin = createAdminClient();

  const { data: tickets } = await admin
    .from("tickets")
    .select("id, ticket_number, subject, status, priority, category, is_ai_handled, ai_confidence, created_at, updated_at, customer:profiles!customer_id(display_name, email), assigned:profiles!assigned_to(display_name)")
    .order("created_at", { ascending: false })
    .limit(100) as unknown as { data: TicketRow[] | null };

  // Stats
  const all = tickets ?? [];
  const stats = {
    open: all.filter((t) => t.status === "open").length,
    inProgress: all.filter((t) => t.status === "in_progress").length,
    awaitingReply: all.filter((t) => t.status === "awaiting_reply").length,
    resolved: all.filter((t) => t.status === "resolved").length,
    aiHandled: all.filter((t) => t.is_ai_handled).length,
  };

  return <AdminHelpdeskClient tickets={all} stats={stats} />;
}
