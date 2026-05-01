/**
 * POST/GET /api/admin/import-osrs-items
 *
 * One-time admin route to import all OSRS gear items from the OSRS Wiki
 * Cargo API into the osrs_items Supabase table.
 *
 * Protected with IMPORT_SECRET env var.
 *
 * Usage:
 *   curl -X POST https://your-domain.com/api/admin/import-osrs-items \
 *     -H "Authorization: Bearer YOUR_IMPORT_SECRET"
 */

import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";

// Allow up to 5 minutes for the full Wiki import
export const maxDuration = 300;
import { createClient } from "@supabase/supabase-js";

const WIKI_API    = "https://oldschool.runescape.wiki/api.php";
const USER_AGENT  = "Mozilla/5.0 (compatible; OSRSGearImporter/1.0; +https://boosting-self.vercel.app)";
const BATCH_SIZE  = 500;
const UPSERT_BATCH = 100;

// ─── Slot normalisation ───────────────────────────────────────────────────────

const SLOT_MAP: Record<string, string> = {
  head: "head", helm: "head", hat: "head",
  cape: "cape", back: "cape",
  neck: "neck", amulet: "neck",
  ammo: "ammo", arrow: "ammo", bolt: "ammo",
  weapon: "weapon", "2h": "2h",
  shield: "shield", offhand: "shield",
  body: "body", chest: "body", top: "body",
  legs: "legs", bottom: "legs", skirt: "legs",
  hands: "hands", gloves: "hands",
  feet: "feet", boots: "feet",
  ring: "ring",
};

const GEAR_SLOTS = ["head","cape","neck","ammo","weapon","2h","shield","body","legs","hands","feet","ring"];

function normaliseSlot(raw: string | null): string | null {
  if (!raw) return null;
  const lower = raw.toLowerCase().trim();
  return SLOT_MAP[lower] ?? (GEAR_SLOTS.includes(lower) ? lower : null);
}

// ─── Set detection ────────────────────────────────────────────────────────────

const SET_PATTERNS: [RegExp, string][] = [
  [/\btorva\b/i,                "torva"],
  [/\bancestral\b/i,            "ancestral"],
  [/\barmadyl\b/i,              "armadyl"],
  [/\bjusticiar\b/i,            "justiciar"],
  [/\bvoid knight\b|\bvoid\s+\w+\s+top\b/i, "void"],
  [/\belite void\b/i,           "elite_void"],
  [/\bdharoks?\b/i,             "dharoks"],
  [/\bveracs?\b/i,              "veracs"],
  [/\bahrims?\b/i,              "ahrims"],
  [/\bkarils?\b/i,              "karils"],
  [/\bguthans?\b/i,             "guthans"],
  [/\btorag\b/i,                "torags"],
  [/\bbandos\b/i,               "bandos"],
  [/\bnightmare zone\b/i,       "nmz"],
  [/\bblack d'hide\b/i,         "black_dhide"],
  [/\bblue d'hide\b/i,          "blue_dhide"],
  [/\bred d'hide\b/i,           "red_dhide"],
  [/\bneitizot\b|\bfaceguard\b/i,"neitiznot"],
  [/\binquisitor\b/i,           "inquisitor"],
  [/\bobsidian\b/i,             "obsidian"],
  [/\bserpentine\b|\bserp\b/i,  "serpentine"],
  [/\bslayer helm/i,            "slayer_helm"],
];

function detectSet(name: string): string | null {
  for (const [re, set] of SET_PATTERNS) {
    if (re.test(name)) return set;
  }
  return null;
}

function iconUrl(name: string): string {
  const filename = name.replace(/ /g, "_").replace(/'/g, "%27");
  return `https://oldschool.runiscape.wiki/images/${filename}.png`;
}

// ─── Wiki item type ────────────────────────────────────────────────────────────

interface WikiItem {
  name: string; id: string; slot: string;
  astab: string; aslash: string; acrush: string; amagic: string; arange: string;
  dstab: string; dslash: string; dcrush: string; dmagic: string; drange: string;
  str: string; rstr: string; mdmg: string; prayer: string; weight: string;
  attack_level: string; strength_level: string; defence_level: string;
  ranged_level: string; magic_level: string; prayer_level: string;
  is_members: string;
}

async function fetchPage(offset: number): Promise<WikiItem[]> {
  const params = new URLSearchParams({
    action:   "cargoquery",
    format:   "json",
    tables:   "items",
    fields:   [
      "items.name","items.id","items.slot",
      "items.astab","items.aslash","items.acrush","items.amagic","items.arange",
      "items.dstab","items.dslash","items.dcrush","items.dmagic","items.drange",
      "items.str","items.rstr","items.mdmg","items.prayer","items.weight",
      "items.attack_level","items.strength_level","items.defence_level",
      "items.ranged_level","items.magic_level","items.prayer_level",
      "items.is_members",
    ].join(","),
    where:    "items.slot IS NOT NULL AND items.slot != '' AND items.id IS NOT NULL",
    order_by: "items.id",
    limit:    String(BATCH_SIZE),
    offset:   String(offset),
  });

  const res = await fetch(`${WIKI_API}?${params}`, {
    headers: { "User-Agent": USER_AGENT },
  });

  if (!res.ok) throw new Error(`Wiki API ${res.status}: ${await res.text()}`);

  const json = await res.json();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (json?.cargoquery ?? []).map((row: any) => row.title as WikiItem);
}

function n(v: string | undefined | null): number {
  const p = parseFloat(v ?? "0");
  return isNaN(p) ? 0 : p;
}

function bool(v: string | undefined | null): boolean {
  return v === "1" || v?.toLowerCase() === "true" || v?.toLowerCase() === "yes";
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function transform(raw: WikiItem): Record<string, any> | null {
  const slot = normaliseSlot(raw.slot);
  if (!slot) return null;
  const is2h = slot === "2h";

  return {
    id: raw.id, name: raw.name,
    slot: is2h ? "weapon" : slot, is_2h: is2h,
    is_members: bool(raw.is_members),
    a_stab: n(raw.astab), a_slash: n(raw.aslash), a_crush: n(raw.acrush),
    a_magic: n(raw.amagic), a_ranged: n(raw.arange),
    d_stab: n(raw.dstab), d_slash: n(raw.dslash), d_crush: n(raw.dcrush),
    d_magic: n(raw.dmagic), d_ranged: n(raw.drange),
    melee_str: n(raw.str), ranged_str: n(raw.rstr),
    magic_dmg: n(raw.mdmg), prayer: n(raw.prayer), weight: n(raw.weight),
    req_attack:   Math.max(1, n(raw.attack_level)),
    req_strength: Math.max(1, n(raw.strength_level)),
    req_defence:  Math.max(1, n(raw.defence_level)),
    req_ranged:   Math.max(1, n(raw.ranged_level)),
    req_magic:    Math.max(1, n(raw.magic_level)),
    req_prayer:   Math.max(1, n(raw.prayer_level)),
    set_name: detectSet(raw.name), icon_url: iconUrl(raw.name),
    last_updated: new Date().toISOString(),
  };
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  return handleImport(req);
}

export async function POST(req: NextRequest) {
  return handleImport(req);
}

async function handleImport(req: NextRequest) {
  // ── Auth check ──
  const importSecret = process.env.IMPORT_SECRET;
  if (!importSecret) {
    return NextResponse.json(
      { error: "IMPORT_SECRET env var not set — add it to Vercel environment variables" },
      { status: 503 }
    );
  }

  const authHeader = req.headers.get("authorization");
  const provided = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!provided || provided.length !== importSecret.length
    || !timingSafeEqual(Buffer.from(provided), Buffer.from(importSecret))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ── Supabase ──
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    return NextResponse.json({ error: "Missing Supabase env vars" }, { status: 503 });
  }
  const supabase = createClient(url, key);

  // ── Fetch all items from OSRS Wiki ──
  const allItems: ReturnType<typeof transform>[] = [];
  let offset = 0;
  let totalFetched = 0;

  try {
    while (true) {
      const page = await fetchPage(offset);
      if (page.length === 0) break;

      const transformed = page
        .map(transform)
        .filter((item): item is NonNullable<typeof item> => item !== null);

      allItems.push(...transformed);
      totalFetched += page.length;

      if (page.length < BATCH_SIZE) break;
      offset += BATCH_SIZE;

      // Respectful delay for the Wiki API
      await new Promise((r) => setTimeout(r, 300));
    }
  } catch (err) {
    return NextResponse.json(
      { error: `Wiki API fetch failed: ${err instanceof Error ? err.message : String(err)}` },
      { status: 502 }
    );
  }

  // ── Upsert to Supabase ──
  let totalUpserted = 0;
  const errors: string[] = [];

  for (let i = 0; i < allItems.length; i += UPSERT_BATCH) {
    const batch = allItems.slice(i, i + UPSERT_BATCH);
    const { error } = await supabase
      .from("osrs_items")
      .upsert(batch, { onConflict: "id" });

    if (error) {
      errors.push(`Batch ${Math.floor(i / UPSERT_BATCH)}: ${error.message}`);
    } else {
      totalUpserted += batch.length;
    }
  }

  return NextResponse.json({
    success:       true,
    totalFetched,
    totalGearItems: allItems.length,
    totalUpserted,
    errors:        errors.length > 0 ? errors : undefined,
    message:       `Imported ${totalUpserted} OSRS gear items into osrs_items table.`,
  });
}
