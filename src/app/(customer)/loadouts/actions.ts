"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { normaliseEquipmentByStyle } from "@/lib/osrs-equipment";
import { normalisePrayers } from "@/lib/osrs-prayers";
import { OSRS_SKILLS } from "@/lib/osrs-skills";

const DEFAULT_STATS: Record<string, number> = Object.fromEntries(
  OSRS_SKILLS.map((s) => [s.id, 1])
);

type LoadoutPayload = {
  id: string;
  name: string;
  stats: Record<string, number>;
  equipment?: unknown;
  prayers?: unknown;
  special_weapons?: string[];
  account_type?: string;
  sort_order: number;
};

export type SavedLoadout = {
  id: string;
  name: string;
  stats: Record<string, number>;
  equipment?: Record<string, unknown>;
  prayers?: Record<string, unknown>;
  special_weapons?: string[];
  account_type?: string;
  sort_order: number;
};

export async function saveLoadouts(
  loadouts: LoadoutPayload[],
  activeLoadoutId: string | null
): Promise<
  | { success: true; loadouts: SavedLoadout[]; activeLoadoutId: string | null }
  | { success: false; error: string }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not logged in" };

  const newIds: Record<string, string> = {};
  const toInsert = loadouts.filter((l) => l.id.startsWith("new"));
  const toUpdate = loadouts.filter((l) => !l.id.startsWith("new"));

  try {
    for (const loadout of toInsert) {
      const stats = { ...DEFAULT_STATS, ...loadout.stats };
      const equipment = normaliseEquipmentByStyle((loadout.equipment ?? null) as Record<string, unknown> | null);
      const prayers = normalisePrayers((loadout.prayers ?? null) as Record<string, unknown> | null);
      const special_weapons = Array.isArray(loadout.special_weapons) ? loadout.special_weapons : [];
      const account_type = loadout.account_type || "normal";

      const { data: inserted, error: insErr } = await supabase
        .from("account_loadouts")
        .insert({
          profile_id: user.id,
          name: loadout.name,
          stats,
          equipment,
          prayers,
          special_weapons,
          account_type,
          sort_order: loadout.sort_order,
        } as never)
        .select("id")
        .single();

      if (insErr) throw new Error(insErr.message);
      const newId = (inserted as { id: string } | null)?.id;
      if (!newId) throw new Error("Insert failed");
      newIds[loadout.id] = newId;
    }

    for (const loadout of toUpdate) {
      const stats = { ...DEFAULT_STATS, ...loadout.stats };
      const equipment = normaliseEquipmentByStyle((loadout.equipment ?? null) as Record<string, unknown> | null);
      const prayers = normalisePrayers((loadout.prayers ?? null) as Record<string, unknown> | null);
      const special_weapons = Array.isArray(loadout.special_weapons) ? loadout.special_weapons : [];
      const account_type = loadout.account_type || "normal";

      const { error: updErr } = await supabase
        .from("account_loadouts")
        .update({
          name: loadout.name,
          stats,
          equipment,
          prayers,
          special_weapons,
          account_type,
          sort_order: loadout.sort_order,
        } as never)
        .eq("id", loadout.id)
        .eq("profile_id", user.id);

      if (updErr) throw new Error(updErr.message);
    }

    let finalActiveId: string | null = activeLoadoutId;
    if (activeLoadoutId && activeLoadoutId.startsWith("new") && newIds[activeLoadoutId]) {
      finalActiveId = newIds[activeLoadoutId];
    }
    if (finalActiveId) {
      await supabase
        .from("profiles")
        .update({ active_loadout_id: finalActiveId } as never)
        .eq("id", user.id);
    }

    const { data: savedRows, error: fetchErr } = await supabase
      .from("account_loadouts")
      .select("id, name, stats, equipment, prayers, special_weapons, account_type, sort_order")
      .eq("profile_id", user.id)
      .order("sort_order", { ascending: true });

    if (fetchErr) throw new Error(`Save ok but fetch failed: ${fetchErr.message}`);

    const savedLoadouts: SavedLoadout[] = (savedRows ?? []).map((r) => ({
      id: (r as { id: string }).id,
      name: (r as { name: string }).name,
      stats: (r as { stats: Record<string, number> }).stats ?? {},
      equipment: (r as { equipment?: Record<string, unknown> }).equipment ?? undefined,
      prayers: (r as { prayers?: Record<string, unknown> }).prayers ?? undefined,
      special_weapons: (r as { special_weapons?: string[] }).special_weapons ?? undefined,
      account_type: (r as { account_type?: string }).account_type ?? undefined,
      sort_order: (r as { sort_order: number }).sort_order ?? 0,
    }));

    revalidatePath("/loadouts");
    return { success: true, loadouts: savedLoadouts, activeLoadoutId: finalActiveId };
  } catch (e) {
    return {
      success: false,
      error: (e instanceof Error ? e.message : String(e)) ?? "Save failed",
    };
  }
}
