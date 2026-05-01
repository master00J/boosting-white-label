import { createAdminClient } from "@/lib/supabase/admin";
import DeliveriesClient from "./deliveries-client";

export const dynamic = "force-dynamic";

export interface ItemDelivery {
  id: string;
  created_at: string;
  delivery_status: "pending" | "in_progress" | "delivered" | "cancelled";
  delivery_notes: string | null;
  delivered_at: string | null;
  prize_snapshot: Record<string, unknown>;
  profile_id: string;
  profiles: {
    email: string;
    username: string | null;
  } | null;
  lootboxes: {
    name: string;
  } | null;
}

export default async function DeliveriesPage() {
  const admin = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = admin as any;

  const { data: deliveries } = await db
    .from("lootbox_opens")
    .select(
      `id, created_at, delivery_status, delivery_notes, delivered_at, prize_snapshot, profile_id,
       profiles:profile_id ( email, username ),
       lootboxes:lootbox_id ( name )`
    )
    .in("delivery_status", ["pending", "in_progress", "delivered", "cancelled"])
    .order("created_at", { ascending: false })
    .limit(200) as { data: ItemDelivery[] | null };

  // Fetch all-time counts for stats
  const { count: pendingCount } = await db
    .from("lootbox_opens")
    .select("id", { count: "exact", head: true })
    .eq("delivery_status", "pending");

  const { count: inProgressCount } = await db
    .from("lootbox_opens")
    .select("id", { count: "exact", head: true })
    .eq("delivery_status", "in_progress");

  const { count: deliveredCount } = await db
    .from("lootbox_opens")
    .select("id", { count: "exact", head: true })
    .eq("delivery_status", "delivered");

  return (
    <DeliveriesClient
      initialDeliveries={deliveries ?? []}
      stats={{
        pending: pendingCount ?? 0,
        in_progress: inProgressCount ?? 0,
        delivered: deliveredCount ?? 0,
      }}
    />
  );
}
