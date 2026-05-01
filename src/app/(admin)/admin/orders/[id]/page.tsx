import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import { notFound } from "next/navigation";
import AdminOrderDetailClient from "./admin-order-detail-client";

export const metadata: Metadata = { title: "Order Detail" };
export const dynamic = "force-dynamic";

export default async function AdminOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const admin = createAdminClient();

  const { data: order, error: orderError } = await admin
    .from("orders")
    .select(`
      id, order_number, status, payment_method, payment_status,
      gold_amount, gold_received, total, subtotal, discount_amount,
      currency, configuration, items, item_count, customer_notes, admin_notes,
      progress, progress_notes, created_at, started_at, completed_at,
      expires_at, ip_address, worker_payout, worker_commission_rate,
      customer:profiles!customer_id(id, display_name, email, avatar_url),
      service:services(id, name, price_matrix),
      game:games(name, logo_url),
      worker:workers(id, profile:profiles!profile_id(display_name, email))
    `)
    .eq("id", id)
    .single() as unknown as { data: AdminOrderDetail | null; error: unknown };

  // Try to also fetch split columns (gracefully fails if migration hasn't run yet)
  let parentOrderId: string | null = null;
  let isSplit: boolean | null = null;
  if (!orderError && order) {
    try {
      const { data: splitData } = await admin
        .from("orders")
        .select("parent_order_id, is_split")
        .eq("id", id)
        .single() as unknown as { data: { parent_order_id: string | null; is_split: boolean | null } | null };
      if (splitData) {
        parentOrderId = splitData.parent_order_id;
        isSplit = splitData.is_split;
      }
    } catch {
      // Columns don't exist yet — migration pending
    }
  }

  if (!order) notFound();

  // Merge split columns (null if migration not yet applied)
  const orderWithSplit: AdminOrderDetail = {
    ...order,
    parent_order_id: parentOrderId,
    is_split: isSplit,
  };

  // Build method/boss name map from price_matrix
  const nameMap: Record<string, string> = {};
  const pm = (order.service as { price_matrix?: Record<string, unknown> } | null)?.price_matrix ?? null;
  if (pm) {
    const skills = (pm.skills ?? []) as Array<{ methods?: Array<{ id: string; name: string }> }>;
    for (const skill of skills) {
      for (const method of (skill.methods ?? [])) {
        if (method.id && method.name) nameMap[method.id] = method.name;
      }
    }
    const bosses = (pm.bosses ?? []) as Array<{ id: string; label: string }>;
    for (const boss of bosses) {
      if (boss.id && boss.label) nameMap[boss.id] = boss.label;
    }
  }

  // Collect all quest IDs from all items and fetch their names
  // Quest config can be: { item: "quest_id" } (single) or { quests: ["id1","id2"] } (multi)
  const allItems = orderWithSplit.items ?? [];
  const questIds = new Set<string>();

  const collectQuestIds = (cfg: Record<string, unknown>) => {
    // Single quest: { item: "quest_id" }
    if (typeof cfg.item === "string" && cfg.item) questIds.add(cfg.item);
    // Multi quest: { quests: ["id1", "id2"] }
    if (Array.isArray(cfg.quests)) {
      for (const q of cfg.quests as string[]) if (q) questIds.add(q);
    }
  };

  for (const item of allItems) {
    collectQuestIds((item.configuration ?? {}) as Record<string, unknown>);
  }
  collectQuestIds((orderWithSplit.configuration ?? {}) as Record<string, unknown>);

  if (questIds.size > 0) {
    const { data: questRows } = await admin
      .from("game_quests" as never)
      .select("id, name")
      .in("id", [...questIds]) as unknown as { data: Array<{ id: string; name: string }> | null };
    if (questRows) {
      for (const q of questRows) nameMap[q.id] = q.name;
    }
  }

  const messages = await admin
    .from("order_messages")
    .select("id, content, is_system, created_at, sender:profiles(display_name, role)")
    .eq("order_id", id)
    .order("created_at", { ascending: true }) as unknown as { data: AdminMessage[] | null };

  return (
    <AdminOrderDetailClient
      order={orderWithSplit}
      messages={messages.data ?? []}
      nameMap={nameMap}
    />
  );
}

export interface OrderItem {
  serviceId: string;
  serviceName: string;
  gameName: string;
  gameId: string;
  quantity: number;
  finalPrice: number;
  configuration: Record<string, unknown>;
}

export interface AdminOrderDetail {
  id: string;
  order_number: string;
  status: string;
  payment_method: string | null;
  payment_status: string;
  gold_amount: number | null;
  gold_received: boolean | null;
  total: number;
  subtotal: number;
  discount_amount: number;
  currency: string;
  configuration: Record<string, unknown>;
  items: OrderItem[] | null;
  item_count: number | null;
  customer_notes: string | null;
  admin_notes: string | null;
  progress: number;
  progress_notes: string | null;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  expires_at: string | null;
  ip_address: string | null;
  worker_payout: number | null;
  worker_commission_rate: number | null;
  parent_order_id: string | null;
  is_split: boolean | null;
  customer: { id: string; display_name: string | null; email: string; avatar_url: string | null } | null;
  service: { id: string; name: string; price_matrix: unknown } | null;
  game: { name: string; logo_url: string | null } | null;
  worker: { id: string; profile: { display_name: string | null; email: string } | null } | null;
}

export interface AdminMessage {
  id: string;
  content: string;
  is_system: boolean;
  created_at: string;
  sender: { display_name: string | null; role: string } | null;
}
