import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import OrderDetailClient from "./order-detail-client";

export const metadata: Metadata = { title: "Order" };
export const dynamic = "force-dynamic";

type OrderItem = {
  serviceId: string;
  serviceName: string;
  gameName: string;
  gameId: string;
  quantity: number;
  finalPrice: number;
  configuration: Record<string, unknown>;
};

type SubOrder = {
  id: string;
  order_number: string;
  status: string;
  progress: number;
  progress_notes: string | null;
  configuration: Record<string, unknown> | null;
  items: Array<{ serviceId: string; serviceName: string; gameName: string; quantity: number; finalPrice: number; configuration: Record<string, unknown> }> | null;
  service: { name: string } | null;
};

type OrderDetail = {
  id: string;
  order_number: string;
  status: string;
  total: number;
  subtotal: number;
  discount_amount: number;
  tax_amount: number;
  progress: number;
  progress_current: number | null;
  progress_notes: string | null;
  payment_method: string | null;
  payment_status: string | null;
  gold_amount: number | null;
  gold_received: boolean | null;
  configuration: Record<string, unknown>;
  items: OrderItem[] | null;
  item_count: number | null;
  customer_notes: string | null;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  estimated_completion: string | null;
  loyalty_points_earned: number;
  customer_id: string | null;
  service: { name: string; description: string | null } | null;
  game: { name: string; logo_url: string | null } | null;
};

type Message = {
  id: string;
  content: string;
  is_system: boolean;
  created_at: string;
  sender_id: string | null;
  sender: { display_name: string | null; avatar_url: string | null; role: string } | null;
};

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?redirect=/orders/${id}`);

  const [orderResult, messagesResult, reviewResult] = await Promise.all([
    supabase
      .from("orders")
      .select("id, order_number, status, total, subtotal, discount_amount, tax_amount, progress, progress_current, progress_notes, payment_method, payment_status, gold_amount, gold_received, configuration, items, item_count, customer_notes, created_at, started_at, completed_at, estimated_completion, loyalty_points_earned, customer_id, service_id, service:services(name, description), game:games(name, logo_url)")
      .eq("id", id)
      .eq("customer_id", user.id)
      .single(),
    supabase
      .from("order_messages")
      .select("id, content, is_system, created_at, sender_id, sender:profiles(display_name, avatar_url, role)")
      .eq("order_id", id)
      .order("created_at", { ascending: true }),
    supabase
      .from("reviews")
      .select("id, rating, comment")
      .eq("order_id", id)
      .maybeSingle() as unknown as Promise<{ data: { id: string; rating: number; comment: string | null } | null; error: unknown }>,
  ]);

  const order = orderResult.data as (OrderDetail & { service_id: string | null }) | null;
  if (!order) notFound();

  // Build method_id/boss_id/quest_id -> name map + modifier field labels
  const methodNames: Record<string, string> = {};
  // modifierMeta: field_id -> { label, options: { value -> label } }
  const modifierMeta: Record<string, { label: string; options: Record<string, string> }> = {};

  // Collect all service IDs to fetch price matrices
  const serviceIds = new Set<string>();
  if (order.service_id) serviceIds.add(order.service_id);
  for (const item of order.items ?? []) if (item.serviceId) serviceIds.add(item.serviceId);

  if (serviceIds.size > 0) {
    const { data: services } = await supabase
      .from("services")
      .select("id, price_matrix")
      .in("id", [...serviceIds]) as unknown as { data: { id: string; price_matrix: Record<string, unknown> | null }[] | null };

    for (const svc of services ?? []) {
      const pm = svc.price_matrix;
      if (!pm) continue;
      // xp_based: skills[].methods[]
      for (const skill of (pm.skills ?? []) as Array<{ methods?: Array<{ id: string; name: string }> }>) {
        for (const m of skill.methods ?? []) if (m.id && m.name) methodNames[m.id] = m.name;
      }
      // boss_tiered: bosses[].id -> label + per-boss modifiers/stats
      for (const boss of (pm.bosses ?? []) as Array<{ id: string; label: string; modifiers?: Array<{ id: string; label: string; options?: Array<{ value: string; label: string }> }> }>) {
        if (boss.id && boss.label) methodNames[boss.id] = boss.label;
        for (const f of boss.modifiers ?? []) {
          const opts: Record<string, string> = {};
          for (const o of f.options ?? []) opts[o.value] = o.label;
          modifierMeta[f.id] = { label: f.label, options: opts };
          modifierMeta[`boss_mod_${f.id}`] = { label: f.label, options: opts };
        }
      }
      // global modifiers / form_fields
      const globalFields = [...((pm.modifiers as unknown[]) ?? []), ...((pm.form_fields as unknown[]) ?? [])] as Array<{ id: string; label: string; options?: Array<{ value: string; label: string }> }>;
      for (const f of globalFields) {
        const opts: Record<string, string> = {};
        for (const o of f.options ?? []) opts[o.value] = o.label;
        modifierMeta[f.id] = { label: f.label, options: opts };
        modifierMeta[`boss_mod_${f.id}`] = { label: f.label, options: opts };
      }
      // per_item / per_item_stat_based items modifiers
      for (const it of (pm.items ?? []) as Array<{ id: string; label: string; modifiers?: Array<{ id: string; label: string; options?: Array<{ value: string; label: string }> }> }>) {
        for (const f of it.modifiers ?? []) {
          const opts: Record<string, string> = {};
          for (const o of f.options ?? []) opts[o.value] = o.label;
          modifierMeta[f.id] = { label: f.label, options: opts };
        }
      }
    }
  }

  // Collect quest IDs from config and items, fetch names
  const questIds = new Set<string>();
  const collectQuestIds = (cfg: Record<string, unknown>) => {
    if (typeof cfg.item === "string" && cfg.item) questIds.add(cfg.item);
    if (Array.isArray(cfg.quests)) for (const q of cfg.quests as string[]) if (q) questIds.add(q);
  };
  collectQuestIds(order.configuration);
  for (const item of order.items ?? []) collectQuestIds(item.configuration ?? {});

  if (questIds.size > 0) {
    const { data: questRows } = await supabase
      .from("game_quests" as never)
      .select("id, name")
      .in("id", [...questIds]) as unknown as { data: { id: string; name: string }[] | null };
    for (const q of questRows ?? []) methodNames[q.id] = q.name;
  }

  // Fetch sub-orders if this is a split order
  let subOrders: SubOrder[] = [];
  try {
    const { data: subRows } = await supabase
      .from("orders" as never)
      .select("id, order_number, status, progress, progress_notes, configuration, items, service:services(name)")
      .eq("parent_order_id", id)
      .order("created_at", { ascending: true }) as unknown as { data: SubOrder[] | null };
    subOrders = subRows ?? [];

    // Collect extra service IDs from sub-orders for methodNames/modifierMeta
    for (const sub of subOrders) {
      for (const item of sub.items ?? []) if (item.serviceId) serviceIds.add(item.serviceId);
      collectQuestIds(sub.configuration ?? {});
      for (const item of sub.items ?? []) collectQuestIds(item.configuration ?? {});
    }
    // Re-fetch services if new IDs were added
    const newIds = [...serviceIds];
    if (newIds.length > 0) {
      const { data: extraSvcs } = await supabase
        .from("services")
        .select("id, price_matrix")
        .in("id", newIds) as unknown as { data: { id: string; price_matrix: Record<string, unknown> | null }[] | null };
      for (const svc of extraSvcs ?? []) {
        const pm = svc.price_matrix;
        if (!pm) continue;
        for (const skill of (pm.skills ?? []) as Array<{ methods?: Array<{ id: string; name: string }> }>) {
          for (const m of skill.methods ?? []) if (m.id && m.name) methodNames[m.id] = m.name;
        }
        for (const boss of (pm.bosses ?? []) as Array<{ id: string; label: string; modifiers?: Array<{ id: string; label: string; options?: Array<{ value: string; label: string }> }> }>) {
          if (boss.id && boss.label) methodNames[boss.id] = boss.label;
          for (const f of boss.modifiers ?? []) {
            const opts: Record<string, string> = {};
            for (const o of f.options ?? []) opts[o.value] = o.label;
            modifierMeta[f.id] = { label: f.label, options: opts };
            modifierMeta[`boss_mod_${f.id}`] = { label: f.label, options: opts };
          }
        }
        const gf = [...((pm.modifiers as unknown[]) ?? []), ...((pm.form_fields as unknown[]) ?? [])] as Array<{ id: string; label: string; options?: Array<{ value: string; label: string }> }>;
        for (const f of gf) {
          const opts: Record<string, string> = {};
          for (const o of f.options ?? []) opts[o.value] = o.label;
          modifierMeta[f.id] = { label: f.label, options: opts };
          modifierMeta[`boss_mod_${f.id}`] = { label: f.label, options: opts };
        }
      }
    }
    // Fetch any new quest IDs from sub-orders
    const allQuestIds = new Set<string>();
    for (const sub of subOrders) {
      collectQuestIds(sub.configuration ?? {});
      for (const item of sub.items ?? []) collectQuestIds(item.configuration ?? {});
    }
    const newQuestIds = [...allQuestIds].filter(q => !methodNames[q]);
    if (newQuestIds.length > 0) {
      const { data: qRows } = await supabase
        .from("game_quests" as never)
        .select("id, name")
        .in("id", newQuestIds) as unknown as { data: { id: string; name: string }[] | null };
      for (const q of qRows ?? []) methodNames[q.id] = q.name;
    }
  } catch { /* parent_order_id column may not exist yet */ }

  return (
    <OrderDetailClient
      order={order}
      initialMessages={(messagesResult.data as Message[] | null) ?? []}
      existingReview={reviewResult.data as { id: string; rating: number; comment: string | null } | null}
      userId={user.id}
      methodNames={methodNames}
      modifierMeta={modifierMeta}
      subOrders={subOrders}
    />
  );
}
