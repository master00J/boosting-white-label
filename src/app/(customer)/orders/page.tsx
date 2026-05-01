import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import OrdersClient from "./orders-client";

export const metadata: Metadata = { title: "Orders" };
export const dynamic = "force-dynamic";

type OrderRow = {
  id: string;
  order_number: string;
  status: string;
  total: number;
  progress: number;
  payment_method: string | null;
  created_at: string;
  items: Array<{ serviceName: string; gameName: string }> | null;
  item_count: number | null;
  service: { name: string } | null;
  game: { name: string; logo_url: string | null } | null;
};

export default async function OrdersPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirect=/orders");

  const { data: orders, error } = await supabase
    .from("orders")
    .select("id, order_number, status, total, progress, payment_method, created_at, items, item_count, service:services(name), game:games(name, logo_url)")
    .eq("customer_id", user.id)
    .order("created_at", { ascending: false }) as unknown as { data: OrderRow[] | null; error: unknown };

  if (error) throw error;

  return <OrdersClient initialOrders={orders ?? []} />;
}
