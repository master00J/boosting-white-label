import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect, notFound } from "next/navigation";
import WorkerOrderClient from "./worker-order-client";

export const metadata: Metadata = { title: "Execute order" };

type ModifierOption = { value: string; label: string };
type FormField = { id: string; label: string; type: string; options?: ModifierOption[]; multiplier?: number; price_add?: number };
type StatConfig = { id: string; label: string; min: number; max: number };
type BossConfig = { id: string; label: string; modifiers?: FormField[]; stats?: StatConfig[] };

type PriceMatrix = {
  type?: string;
  methods?: { id: string; name: string }[];
  bosses?: BossConfig[];
  tiers?: { boss_id?: string; boss_name?: string; method_id?: string; method_name?: string }[];
  stats?: StatConfig[];
  modifiers?: FormField[];
  // xp_based
  skills?: { id: string; label: string; tier_modifier_fields?: { id: string; label: string; options: ModifierOption[] }[] }[];
  // per_item / per_item_stat_based
  items?: { id: string; label: string; modifiers?: FormField[]; stats?: StatConfig[] }[];
  // per_unit
  unit_label?: string;
  // form_fields (top-level for some matrix types)
  form_fields?: FormField[];
};

// Flat map of field_id -> { label, options } for resolving config values
export type ConfigMeta = {
  stats: Record<string, string>;           // stat_id -> label
  modifiers: Record<string, { label: string; options: Record<string, string> }>; // field_id -> { label, optionValue -> optionLabel }
};

type OrderItem = {
  serviceId: string;
  serviceName: string;
  gameName: string;
  gameId: string;
  quantity: number;
  finalPrice: number;
  configuration: Record<string, unknown>;
};

type ItemProgressEntry = {
  index: number;
  serviceName: string;
  type: "level" | "kills" | "quest" | "percent";
  skillId?: string;
  startLevel?: number;
  goal?: number;
  current?: number;
  bossId?: string;
  questIds?: string[];
  completedQuestIds?: string[];
  completed: boolean;
};

type OrderDetail = {
  id: string;
  order_number: string;
  status: string;
  total: number;
  worker_payout: number | null;
  progress: number;
  progress_current: number | null;
  progress_notes: string | null;
  item_progress: ItemProgressEntry[] | null;
  configuration: Record<string, unknown>;
  items: OrderItem[] | null;
  item_count: number | null;
  customer_notes: string | null;
  created_at: string;
  claimed_at: string | null;
  estimated_completion: string | null;
  worker_id: string | null;
  track_token: string;
  vpn_country_code: string | null;
  service: { name: string; description: string | null; estimated_hours: number | null; price_matrix: PriceMatrix | null } | null;
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

export default async function WorkerOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?redirect=/booster/orders/${id}`);

  const admin = createAdminClient();

  const [orderResult, messagesResult] = await Promise.all([
    admin
      .from("orders")
      .select("id, order_number, status, total, worker_payout, progress, progress_current, progress_notes, item_progress, configuration, items, item_count, customer_notes, created_at, claimed_at, estimated_completion, worker_id, track_token, vpn_country_code, service:services(name, description, estimated_hours, price_matrix), game:games(name, logo_url)")
      .eq("id", id)
      .single(),
    admin
      .from("order_messages")
      .select("id, content, is_system, created_at, sender_id, sender:profiles(display_name, avatar_url, role)")
      .eq("order_id", id)
      .order("created_at", { ascending: true }),
  ]);

  const order = orderResult.data as OrderDetail | null;
  if (!order) notFound();

  // Check profile role to allow super_admin full access
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single() as unknown as { data: { role: string } | null };

  // Resolve worker.id — orders.worker_id references workers.id, not profiles.id
  const { data: workerRow } = await admin
    .from("workers")
    .select("id")
    .eq("profile_id", user.id)
    .single() as unknown as { data: { id: string } | null };

  const isSuperAdmin = profile?.role === "super_admin" || profile?.role === "admin";
  // Worker can view: their own orders (any status) + queued orders (to claim) + admins see all
  const isAssigned = !!workerRow && order.worker_id === workerRow.id;
  const canView = isAssigned || order.status === "queued" || isSuperAdmin;
  if (!canView) notFound();
  // isAssigned for UI purposes — history orders are "assigned" even if completed
  const isActivelyAssigned = isAssigned && ["claimed", "in_progress", "paused"].includes(order.status);

  // Build a name map from price_matrix (method/boss id -> display name)
  const methodNames: Record<string, string> = {};
  const pm = order.service?.price_matrix;
  if (pm) {
    for (const m of pm.methods ?? []) if (m.id && m.name) methodNames[m.id] = m.name;
    for (const b of pm.bosses ?? []) if (b.id && b.label) methodNames[b.id] = b.label;
    for (const t of pm.tiers ?? []) {
      if (t.boss_id && t.boss_name) methodNames[t.boss_id] = t.boss_name;
      if (t.method_id && t.method_name) methodNames[t.method_id] = t.method_name;
    }
  }

  // Also build names from per-item services (multi-item orders)
  if (order.items && order.items.length > 1) {
    const serviceIds = [...new Set(order.items.map((it) => it.serviceId).filter(Boolean))];
    if (serviceIds.length > 0) {
      const { data: extraServices } = await admin
        .from("services")
        .select("id, price_matrix")
        .in("id", serviceIds) as unknown as { data: { id: string; price_matrix: PriceMatrix | null }[] | null };
      for (const svc of extraServices ?? []) {
        const epm = svc.price_matrix;
        if (!epm) continue;
        for (const m of epm.methods ?? []) if (m.id && m.name) methodNames[m.id] = m.name;
        for (const b of epm.bosses ?? []) if (b.id && b.label) methodNames[b.id] = b.label;
        for (const t of epm.tiers ?? []) {
          if (t.boss_id && t.boss_name) methodNames[t.boss_id] = t.boss_name;
          if (t.method_id && t.method_name) methodNames[t.method_id] = t.method_name;
        }
      }
    }
  }

  // Collect quest IDs from all items and top-level config, fetch names
  const questIds = new Set<string>();
  const collectQuestIds = (cfg: Record<string, unknown>) => {
    if (typeof cfg.item === "string" && cfg.item) questIds.add(cfg.item);
    if (Array.isArray(cfg.quests)) for (const q of cfg.quests as string[]) if (q) questIds.add(q);
  };
  collectQuestIds(order.configuration);
  for (const item of order.items ?? []) collectQuestIds(item.configuration ?? {});

  if (questIds.size > 0) {
    const { data: questRows } = await admin
      .from("game_quests" as never)
      .select("id, name")
      .in("id", [...questIds]) as unknown as { data: { id: string; name: string }[] | null };
    for (const q of questRows ?? []) methodNames[q.id] = q.name;
  }

  // Build configMeta: labels for stats and modifier fields from all relevant price matrices
  const configMeta: ConfigMeta = { stats: {}, modifiers: {} };

  const extractMeta = (matrix: PriceMatrix | null | undefined) => {
    if (!matrix) return;
    // Stats
    for (const s of matrix.stats ?? []) configMeta.stats[s.id] = s.label;
    // Global modifiers / form_fields
    const fields = [...(matrix.modifiers ?? []), ...(matrix.form_fields ?? [])];
    for (const f of fields) {
      const opts: Record<string, string> = {};
      for (const o of f.options ?? []) opts[o.value] = o.label;
      configMeta.modifiers[f.id] = { label: f.label, options: opts };
      // Also register boss_mod_ prefixed version
      configMeta.modifiers[`boss_mod_${f.id}`] = { label: f.label, options: opts };
    }
    // Per-boss modifiers and stats
    for (const b of matrix.bosses ?? []) {
      for (const s of b.stats ?? []) configMeta.stats[s.id] = s.label;
      for (const f of b.modifiers ?? []) {
        const opts: Record<string, string> = {};
        for (const o of f.options ?? []) opts[o.value] = o.label;
        configMeta.modifiers[f.id] = { label: f.label, options: opts };
        configMeta.modifiers[`boss_mod_${f.id}`] = { label: f.label, options: opts };
      }
    }
    // Per-item modifiers and stats (quests etc.)
    for (const it of matrix.items ?? []) {
      for (const s of it.stats ?? []) configMeta.stats[s.id] = s.label;
      for (const f of it.modifiers ?? []) {
        const opts: Record<string, string> = {};
        for (const o of f.options ?? []) opts[o.value] = o.label;
        configMeta.modifiers[f.id] = { label: f.label, options: opts };
      }
    }
  };

  extractMeta(pm);
  // Also extract from extra services fetched above
  if (order.items && order.items.length > 1) {
    const serviceIds = [...new Set(order.items.map((it) => it.serviceId).filter(Boolean))];
    if (serviceIds.length > 0) {
      const { data: metaServices } = await admin
        .from("services")
        .select("id, price_matrix")
        .in("id", serviceIds) as unknown as { data: { id: string; price_matrix: PriceMatrix | null }[] | null };
      for (const svc of metaServices ?? []) extractMeta(svc.price_matrix);
    }
  }

  return (
    <WorkerOrderClient
      order={order}
      initialMessages={(messagesResult.data as Message[] | null) ?? []}
      userId={user.id}
      isAssigned={isActivelyAssigned}
      methodNames={methodNames}
      configMeta={configMeta}
    />
  );
}
