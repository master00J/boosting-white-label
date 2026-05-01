import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createServiceClient } from "@/lib/supabase/server";
import { ADMIN_SECTION_KEYS } from "@/lib/admin-sections";
import AdminDashboardClient from "./dashboard-client";

export const metadata: Metadata = { title: "Staff Overview" };

async function getAllowedSections(userId: string) {
  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("role, admin_rank_id")
    .eq("id", userId)
    .single() as { data: { role: string | null; admin_rank_id: string | null } | null };

  if (!profile || !["admin", "super_admin"].includes(profile.role ?? "")) return [];
  if (profile.role === "super_admin") return [...ADMIN_SECTION_KEYS];
  if (!profile.admin_rank_id) return ADMIN_SECTION_KEYS.filter((k) => k !== "ranks");

  const { data: perms } = await admin
    .from("admin_rank_permissions")
    .select("section_key")
    .eq("rank_id", profile.admin_rank_id) as { data: { section_key: string }[] | null };
  return (perms ?? []).map((p) => p.section_key);
}

export default async function AdminDashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const allowedSections = user ? await getAllowedSections(user.id) : [];
  const canSeeFinance = allowedSections.includes("finance");

  const db = createServiceClient();
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const sevenMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, 1).toISOString();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - 6);
  startOfWeek.setHours(0, 0, 0, 0);

  const recentOrdersSelect = canSeeFinance
    ? "order_number, total, status, created_at, profiles!customer_id(display_name), services(name)"
    : "order_number, status, created_at, profiles!customer_id(display_name), services(name)";

  const [
    { count: totalOrders },
    { count: activeOrders },
    { count: totalCustomers },
    { count: totalWorkers },
    revenueResult,
    { data: recentOrders },
    { data: weekOrders },
    { count: openTicketsCount },
  ] = await Promise.all([
    db.from("orders").select("*", { count: "exact", head: true }),
    db.from("orders").select("*", { count: "exact", head: true }).in("status", ["paid", "queued", "claimed", "in_progress"]),
    db.from("profiles").select("*", { count: "exact", head: true }).eq("role", "customer"),
    db.from("workers").select("*", { count: "exact", head: true }).eq("is_active", true),
    canSeeFinance
      ? db.from("orders").select("total, created_at").eq("payment_status", "completed").gte("created_at", sevenMonthsAgo)
      : Promise.resolve({ data: [] as { total: number; created_at: string }[] }),
    db.from("orders").select(recentOrdersSelect).order("created_at", { ascending: false }).limit(5),
    db.from("orders").select("created_at").gte("created_at", startOfWeek.toISOString()),
    db.from("tickets").select("*", { count: "exact", head: true }).in("status", ["open", "awaiting_reply"]),
  ]);

  const revenueData = canSeeFinance && revenueResult && "data" in revenueResult ? (revenueResult as { data: { total: number; created_at: string }[] }).data : null;

  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const revenueByMonth: Record<string, number> = {};
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    revenueByMonth[`${d.getFullYear()}-${d.getMonth()}`] = 0;
  }
  for (const order of revenueData ?? []) {
    const d = new Date(order.created_at);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    if (key in revenueByMonth) revenueByMonth[key] += Number(order.total);
  }
  const revenueChart = Object.entries(revenueByMonth).map(([key, revenue]) => {
    const [, month] = key.split("-").map(Number);
    return { month: monthNames[month], revenue: Math.round(revenue) };
  });

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const ordersByDay: Record<string, number> = {};
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    ordersByDay[d.toDateString()] = 0;
  }
  for (const order of weekOrders ?? []) {
    const d = new Date(order.created_at).toDateString();
    if (d in ordersByDay) ordersByDay[d]++;
  }
  const ordersChart = Object.entries(ordersByDay).map(([dateStr, orders]) => ({
    day: dayNames[new Date(dateStr).getDay()],
    orders,
  }));

  const revenueThisMonth = (revenueData ?? [])
    .filter((o: { created_at: string; total: number }) => o.created_at >= startOfMonth)
    .reduce((sum: number, o: { created_at: string; total: number }) => sum + Number(o.total), 0);

  const stats = {
    totalOrders: totalOrders ?? 0,
    activeOrders: activeOrders ?? 0,
    totalCustomers: totalCustomers ?? 0,
    totalWorkers: totalWorkers ?? 0,
    revenueThisMonth,
    revenueChart,
    ordersChart,
    openTicketsCount: openTicketsCount ?? 0,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recentOrders: (recentOrders ?? []) as any[],
  };

  return <AdminDashboardClient stats={stats} canSeeFinance={canSeeFinance} />;
}
