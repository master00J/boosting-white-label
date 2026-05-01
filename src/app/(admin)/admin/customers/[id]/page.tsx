import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import CustomerDetailClient from "./customer-detail-client";

export const metadata: Metadata = { title: "Customer details" };
export const dynamic = "force-dynamic";

export default async function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const admin = createAdminClient();
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  const { data: currentProfile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user?.id ?? "")
    .single<{ role: string }>();

  const { data: customer } = await admin
    .from("profiles")
    .select("*")
    .eq("id", id)
    .single();

  if (!customer) notFound();

  const { data: ordersRaw } = await admin
    .from("orders")
    .select("id, created_at, status, payment_status, total, payment_method, games(slug), services(name)")
    .eq("customer_id", id)
    .order("created_at", { ascending: false })
    .limit(50);

  const orders = ordersRaw?.map((o) => ({
    id: o.id,
    created_at: o.created_at,
    status: o.status,
    payment_status: o.payment_status,
    total: o.total,
    payment_method: o.payment_method,
    game_slug: (o.games as { slug: string } | null)?.slug ?? null,
    service_name: (o.services as { name: string } | null)?.name ?? null,
  })) ?? [];

  const { data: loyaltyPointsRaw } = await admin
    .from("loyalty_points")
    .select("points, lifetime_points, tier_id")
    .eq("profile_id", id)
    .single();

  const loyaltyPoints = loyaltyPointsRaw
    ? { current_points: loyaltyPointsRaw.points, lifetime_points: loyaltyPointsRaw.lifetime_points, tier_id: loyaltyPointsRaw.tier_id }
    : null;

  const { data: loyaltyTransactions } = await admin
    .from("loyalty_transactions")
    .select("id, points, reason, created_at")
    .eq("profile_id", id)
    .order("created_at", { ascending: false })
    .limit(10);

  const { data: activityLogRaw } = await admin
    .from("activity_log")
    .select("id, action, metadata, created_at")
    .eq("actor_id", id)
    .order("created_at", { ascending: false })
    .limit(20);

  const activityLog = activityLogRaw?.map((e) => ({
    id: e.id,
    action: e.action,
    details: e.metadata ? JSON.stringify(e.metadata) : null,
    created_at: e.created_at,
  })) ?? [];

  return (
    <CustomerDetailClient
      customer={customer}
      orders={orders}
      loyaltyPoints={loyaltyPoints}
      loyaltyTransactions={loyaltyTransactions ?? []}
      activityLog={activityLog}
      isSuperAdmin={currentProfile?.role === "super_admin"}
    />
  );
}
