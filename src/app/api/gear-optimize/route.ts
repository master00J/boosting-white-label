import { NextRequest, NextResponse } from "next/server";
import { getRateLimitIdentifier, checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { optimizeGear, matchBankToGear } from "@/lib/gear-optimizer";
import { getBossProfile } from "@/lib/osrs-boss-profiles";
import { STATIC_GEAR_BY_NAME, STATIC_GEAR_MAP } from "@/lib/osrs-gear-stats";
import type { BankItem, GearItem, PlayerStats } from "@/lib/gear-optimizer";
import type { CombatStyle } from "@/lib/osrs-boss-profiles";

/**
 * POST /api/gear-optimize
 *
 * Body:
 * {
 *   bossId:      string               — boss/activity ID (e.g. "bandos")
 *   bankItems:   BankItem[]           — from RuneLite bank export
 *   equippedItems?: GearItem[]        — already-equipped gear (optional extra source)
 *   stats:       PlayerStats          — { attack, strength, defence, ranged, magic, prayer }
 *   forceStyle?: CombatStyle          — override combat style
 * }
 */

export async function POST(req: NextRequest) {
  const rl = await checkRateLimit(getRateLimitIdentifier(req), RATE_LIMITS.general);
  if (rl) return rl;

  try {
    const body = await req.json();
    const { bossId, bankItems, equippedItems, stats, forceStyle } = body as {
      bossId:          string;
      bankItems:       BankItem[];
      equippedItems?:  GearItem[];
      stats:           PlayerStats;
      forceStyle?:     CombatStyle;
    };

    // ── Validate ──────────────────────────────────────────────────────────────
    if (!bossId || typeof bossId !== "string") {
      return NextResponse.json({ error: "bossId is required" }, { status: 400 });
    }

    const profile = getBossProfile(bossId);
    if (!profile) {
      return NextResponse.json(
        { error: `Unknown boss profile: "${bossId}"` },
        { status: 404 }
      );
    }

    const items: BankItem[] = Array.isArray(bankItems) ? bankItems : [];
    const playerStats: PlayerStats = stats ?? {};

    // ── Resolve gear stats from static data ───────────────────────────────────
    // Primary source: embedded static gear stats (no DB / import needed)
    const resolvedGear: GearItem[] = [];

    for (const bankItem of items) {
      // Try by item ID first (custom loadout ID e.g. "abyssal_whip")
      const byId = bankItem.itemId ? STATIC_GEAR_MAP.get(bankItem.itemId) : undefined;
      if (byId) { resolvedGear.push(byId); continue; }

      // Try by name (lowercase)
      const byName = STATIC_GEAR_BY_NAME.get(bankItem.name.toLowerCase());
      if (byName) { resolvedGear.push(byName); continue; }

      // Also try matching by item ID used as name (e.g. "torva_full_helm")
      const byIdAsName = STATIC_GEAR_MAP.get(bankItem.name.toLowerCase().replace(/ /g, "_"));
      if (byIdAsName) { resolvedGear.push(byIdAsName); }
    }

    // Deduplicate
    const seen = new Set<string>();
    const matchedGear = resolvedGear.filter((g) => {
      if (seen.has(g.id)) return false;
      seen.add(g.id);
      return true;
    });

    // Add already-equipped items if provided
    const allGear = [...matchedGear];
    if (Array.isArray(equippedItems)) {
      for (const eq of equippedItems) {
        if (!allGear.some((g) => g.id === eq.id)) {
          allGear.push(eq as GearItem);
        }
      }
    }

    // If no items could be resolved, fall back to ALL static gear
    // (optimizer will pick best regardless of "bank")
    const gearPool = allGear.length > 0 ? allGear : Array.from(STATIC_GEAR_MAP.values());

    // Also try DB lookup for any items not in static data (future-proof)
    if (allGear.length === 0 && items.length > 0) {
      try {
        const { createAdminClient } = await import("@/lib/supabase/admin");
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const supabase = createAdminClient() as any;
        const itemNames = items.map((i) => i.name);
        const { data: dbItems } = await supabase
          .from("osrs_items")
          .select("*")
          .in("name", itemNames);
        if (dbItems && dbItems.length > 0) {
          const extra = matchBankToGear(items, dbItems as GearItem[]);
          gearPool.push(...extra.filter((g) => !seen.has(g.id)));
        }
      } catch {
        // DB not available — static data is sufficient
      }
    }

    // ── Run optimizer ─────────────────────────────────────────────────────────
    const result = optimizeGear({
      availableItems: gearPool,
      stats:          playerStats,
      bossProfile:    profile,
      forceStyle:     forceStyle,
    });

    return NextResponse.json(result);
  } catch (err) {
    console.error("[gear-optimize]", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/gear-optimize/bosses
 * Returns all available boss profiles (id, name, category, primary_style)
 */
export async function GET() {
  const { BOSS_PROFILES } = await import("@/lib/osrs-boss-profiles");

  const list = BOSS_PROFILES.map((p) => ({
    id:            p.id,
    name:          p.name,
    category:      p.category,
    primary_style: p.primary_style,
    is_wilderness: p.is_wilderness ?? false,
    wiki_url:      p.wiki_url,
    notes:         p.notes,
  }));

  return NextResponse.json(list);
}
