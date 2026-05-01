import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import OrdersAdminClient from "./orders-admin-client";

export const metadata: Metadata = { title: "Orders" };
export const dynamic = "force-dynamic";

export default async function AdminOrdersPage() {
  const admin = createAdminClient();

  const { data: orders } = await admin
    .from("orders")
    .select(`
      id, order_number, status, payment_method, payment_status,
      gold_amount, gold_received, total, currency, created_at,
      items, item_count,
      customer:profiles!customer_id(id, display_name, email),
      service:services(name),
      game:games(name)
    `)
    .order("created_at", { ascending: false })
    .limit(100) as unknown as {
      data: {
        id: string;
        order_number: string;
        status: string;
        payment_method: string | null;
        payment_status: string;
        gold_amount: number | null;
        gold_received: boolean | null;
        total: number;
        currency: string;
        created_at: string;
        items: Array<{ serviceName: string; gameName: string; quantity: number; finalPrice: number }> | null;
        item_count: number | null;
        customer: { id: string; display_name: string | null; email: string } | null;
        service: { name: string } | null;
        game: { name: string } | null;
      }[] | null
    };

  // Fetch parent_order_id for all loaded orders + fetch sub-orders of any split parents
  const parentMap: Record<string, string | null> = {};
  let extraSubOrders: typeof orders = [];

  if (orders && orders.length > 0) {
    try {
      const ids = orders.map((o) => o.id);
      const { data: parentRows } = await admin
        .from("orders" as never)
        .select("id, parent_order_id")
        .in("id", ids) as unknown as { data: { id: string; parent_order_id: string | null }[] | null };
      if (parentRows) {
        for (const row of parentRows) parentMap[row.id] = row.parent_order_id ?? null;
      }

      // Find split parents in the loaded list
      const splitParentIds = orders.filter((o) => o.status === "split").map((o) => o.id);

      if (splitParentIds.length > 0) {
        // Fetch all sub-orders for these parents (they may not be in the top-100)
        const { data: subRows } = await admin
          .from("orders" as never)
          .select(`
            id, order_number, status, payment_method, payment_status,
            gold_amount, gold_received, total, currency, created_at,
            items, item_count,
            customer:profiles!customer_id(id, display_name, email),
            service:services(name),
            game:games(name),
            parent_order_id
          `)
          .in("parent_order_id", splitParentIds)
          .order("created_at", { ascending: true }) as unknown as {
            data: (typeof orders[0] & { parent_order_id: string | null })[] | null
          };

        if (subRows) {
          // Add their parent_order_id to the map and collect them
          for (const row of subRows) {
            parentMap[row.id] = (row as { parent_order_id?: string | null }).parent_order_id ?? null;
          }
          extraSubOrders = subRows.map((r) => {
            const { parent_order_id: _pid, ...rest } = r as typeof r & { parent_order_id?: string | null };
            void _pid;
            return rest;
          }) as typeof orders;
        }
      }
    } catch { /* column doesn't exist yet */ }
  }

  // Merge: loaded orders + any extra sub-orders not already in the list
  const loadedIds = new Set((orders ?? []).map((o) => o.id));
  const merged = [
    ...(orders ?? []),
    ...(extraSubOrders ?? []).filter((o) => !loadedIds.has(o.id)),
  ];

  const ordersWithParent = merged.map((o) => ({
    ...o,
    parent_order_id: parentMap[o.id] ?? null,
  }));

  return <OrdersAdminClient initialOrders={ordersWithParent} />;
}
