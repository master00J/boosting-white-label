import { createAdminClient } from "@/lib/supabase/admin";
import LootboxesClient from "./lootboxes-client";

export const dynamic = "force-dynamic";

interface Lootbox {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  cost_points: number;
  is_active: boolean;
  sort_order: number;
  layer_closed:    string | null;
  layer_base:      string | null;
  layer_lid:       string | null;
  layer_open:      string | null;
  layer_glow:      string | null;
  layer_particles: string | null;
  layer_beam:      string | null;
  lootbox_prizes: {
    id: string;
    lootbox_id: string;
    name: string;
    description: string | null;
    prize_type: "balance_credit" | "coupon" | "osrs_item";
    prize_value: number;
    weight: number;
    image_url: string | null;
    rarity: "common" | "uncommon" | "rare" | "legendary";
    coupon_config: Record<string, unknown>;
    is_active: boolean;
    sort_order: number;
    osrs_item_id: string | null;
  }[];
}

export default async function LootboxesPage() {
  const admin = createAdminClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = admin as any;

  const [lootboxesRes, settingsRes, statsRes] = await Promise.all([
    db
      .from("lootboxes")
      .select("*, lootbox_prizes(*)")
      .order("sort_order") as Promise<{ data: Lootbox[] | null }>,
    admin
      .from("site_settings")
      .select("key, value")
      .in("key", ["lootbox_enabled"]) as unknown as Promise<{
      data: { key: string; value: string }[] | null;
    }>,
    db
      .from("lootbox_opens")
      .select("prize_snapshot") as Promise<{
      data: { prize_snapshot: Record<string, unknown> }[] | null;
    }>,
  ]);

  const lootboxes = (lootboxesRes.data ?? []) as Lootbox[];
  const settingsMap = Object.fromEntries(
    (settingsRes.data ?? []).map((s: { key: string; value: string }) => [s.key, s.value])
  );

  const opens = (statsRes.data ?? []) as { prize_snapshot: Record<string, unknown> }[];
  const totalOpens = opens.length;
  const totalPaidOut = opens.reduce((sum: number, o) => {
    const snap = o.prize_snapshot;
    if (snap?.prize_type === "balance_credit") return sum + Number(snap.prize_value || 0);
    return sum;
  }, 0);

  return (
    <LootboxesClient
      initialLootboxes={lootboxes}
      initialSettings={settingsMap}
      stats={{ totalOpens, totalPaidOut }}
    />
  );
}
