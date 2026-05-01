import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import SupportClient from "./support-client";

export const dynamic = "force-dynamic";

type TicketRow = {
  id: string;
  ticket_number: string;
  subject: string;
  status: string;
  priority: string;
  category: string | null;
  is_ai_handled: boolean;
  created_at: string;
  updated_at: string;
};

export default async function SupportPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: tickets, error } = await supabase
    .from("tickets")
    .select("id, ticket_number, subject, status, priority, category, is_ai_handled, created_at, updated_at")
    .eq("customer_id", user.id)
    .order("created_at", { ascending: false });

  if (error) throw error;

  return <SupportClient tickets={(tickets as TicketRow[] | null) ?? []} />;
}
