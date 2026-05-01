/**
 * OSRS Items Import Script
 *
 * Fetches all gear items from the OSRS Wiki Cargo API and upserts them
 * into the osrs_items Supabase table.
 *
 * Run with:
 *   npx tsx scripts/import-osrs-items.ts
 *
 * Requires env vars:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from "@supabase/supabase-js";

// ─── Config ──────────────────────────────────────────────────────────────────

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const WIKI_API = "https://oldschool.runescape.wiki/api.php";
const USER_AGENT = "OSRSGearImporter/1.0 (boost-platform gear optimizer)";
const BATCH_SIZE = 500; // Wiki API max per request
const UPSERT_BATCH = 100; // Supabase upsert batch size

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

function normaliseSlot(raw: string | null): string | null {
  if (!raw) return null;
  const lower = raw.toLowerCase().trim();
  return SLOT_MAP[lower] ?? lower;
}

// ─── Set bonus detection ──────────────────────────────────────────────────────

const SET_PATTERNS: [RegExp, string][] = [
  [/\bvoid\b/i, "void"],
  [/\bdharok/i, "dharoks"],
  [/\bverac/i, "veracs"],
  [/\bkaril/i, "karils"],
  [/\bguthan/i, "guthans"],
  [/\btorag/i, "torags"],
  [/\bahrims/i, "ahrims"],
  [/\btorva\b/i, "torva"],
  [/\bnex\b/i, "torva"],
  [/\bancestral\b/i, "ancestral"],
  [/\binquisitor/i, "inquisitor"],
  [/\bjusticiar/i, "justiciar"],
  [/\bceremonial/i, "cerberus_ceremonial"],
  [/\bcrystal\s*(body|helm|legs)/i, "crystal_armour"],
  [/\bblessed\s*dragonhide/i, "blessed_dhide"],
  [/\bgraceful\b/i, "graceful"],
  [/\bobsidian\b/i, "obsidian"],
  [/\bberserker\s*necklace|berserker\s*ring/i, "berserker"],
  [/\bslayer\s*helm/i, "slayer_helm"],
  [/\bblack\s*mask/i, "slayer_helm"],
  [/\bsalve\s*amulet/i, "salve"],
  [/\bsmoke\s*battlestaff|occult/i, "trident_set"],
  [/\bsanguinesti/i, "sang"],
  [/\bscythe/i, "scythe"],
  [/\btwisted\s*bow/i, "tbow"],
  [/\binfernal\s*cape/i, "infernal"],
];

function detectSet(name: string): string | null {
  for (const [pattern, setName] of SET_PATTERNS) {
    if (pattern.test(name)) return setName;
  }
  return null;
}

// ─── Icon URL builder ─────────────────────────────────────────────────────────

function iconUrl(name: string): string {
  const encoded = encodeURIComponent(name.replace(/ /g, "_"));
  return `https://oldschool.runescape.wiki/images/${encoded}_detail.png`;
}

// ─── Wiki Cargo query ─────────────────────────────────────────────────────────

interface WikiItem {
  name: string;
  id: string;
  slot: string;
  astab: string; aslash: string; acrush: string; amagic: string; arange: string;
  dstab: string; dslash: string; dcrush: string; dmagic: string; drange: string;
  str: string; rstr: string; mdmg: string; prayer: string; weight: string;
  // Level requirements
  attack_level: string; strength_level: string; defence_level: string;
  ranged_level: string; magic_level: string; prayer_level: string;
  is_members: string;
}

async function fetchPage(offset: number): Promise<WikiItem[]> {
  const params = new URLSearchParams({
    action: "cargoquery",
    format: "json",
    tables: "items",
    fields: [
      "items.name", "items.id", "items.slot",
      "items.astab", "items.aslash", "items.acrush", "items.amagic", "items.arange",
      "items.dstab", "items.dslash", "items.dcrush", "items.dmagic", "items.drange",
      "items.str", "items.rstr", "items.mdmg", "items.prayer", "items.weight",
      "items.attack_level", "items.strength_level", "items.defence_level",
      "items.ranged_level", "items.magic_level", "items.prayer_level",
      "items.is_members",
    ].join(","),
    where: "items.slot IS NOT NULL AND items.slot != '' AND items.id IS NOT NULL",
    order_by: "items.id",
    limit: String(BATCH_SIZE),
    offset: String(offset),
  });

  const res = await fetch(`${WIKI_API}?${params}`, {
    headers: { "User-Agent": USER_AGENT },
  });

  if (!res.ok) throw new Error(`Wiki API error ${res.status}: ${await res.text()}`);

  const json = await res.json();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (json?.cargoquery ?? []).map((row: any) => row.title as WikiItem);
}

// ─── Transform ────────────────────────────────────────────────────────────────

function n(v: string | undefined | null): number {
  const parsed = parseFloat(v ?? "0");
  return isNaN(parsed) ? 0 : parsed;
}

function bool(v: string | undefined | null): boolean {
  return v === "1" || v?.toLowerCase() === "true" || v?.toLowerCase() === "yes";
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function transform(raw: WikiItem): Record<string, any> | null {
  const slot = normaliseSlot(raw.slot);
  if (!slot) return null;

  // Skip non-gear slots
  const GEAR_SLOTS = ["head","cape","neck","ammo","weapon","2h","shield","body","legs","hands","feet","ring"];
  if (!GEAR_SLOTS.includes(slot)) return null;

  const is2h = slot === "2h";

  return {
    id:           raw.id,
    name:         raw.name,
    slot:         is2h ? "weapon" : slot,
    is_2h:        is2h,
    is_members:   bool(raw.is_members),

    a_stab:       n(raw.astab),
    a_slash:      n(raw.aslash),
    a_crush:      n(raw.acrush),
    a_magic:      n(raw.amagic),
    a_ranged:     n(raw.arange),

    d_stab:       n(raw.dstab),
    d_slash:      n(raw.dslash),
    d_crush:      n(raw.dcrush),
    d_magic:      n(raw.dmagic),
    d_ranged:     n(raw.drange),

    melee_str:    n(raw.str),
    ranged_str:   n(raw.rstr),
    magic_dmg:    n(raw.mdmg),
    prayer:       n(raw.prayer),
    weight:       n(raw.weight),

    req_attack:   Math.max(1, n(raw.attack_level)),
    req_strength: Math.max(1, n(raw.strength_level)),
    req_defence:  Math.max(1, n(raw.defence_level)),
    req_ranged:   Math.max(1, n(raw.ranged_level)),
    req_magic:    Math.max(1, n(raw.magic_level)),
    req_prayer:   Math.max(1, n(raw.prayer_level)),

    set_name:     detectSet(raw.name),
    icon_url:     iconUrl(raw.name),
    last_updated: new Date().toISOString(),
  };
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error("❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

  console.log("🔍 Fetching all gear items from OSRS Wiki Cargo API...");

  let offset = 0;
  let totalFetched = 0;
  let totalUpserted = 0;
  const allItems: ReturnType<typeof transform>[] = [];

  while (true) {
    process.stdout.write(`  Fetching offset ${offset}...`);
    const page = await fetchPage(offset);

    if (page.length === 0) {
      console.log(" done.");
      break;
    }

    const transformed = page
      .map(transform)
      .filter((item): item is NonNullable<typeof item> => item !== null);

    allItems.push(...transformed);
    totalFetched += page.length;
    console.log(` got ${page.length} rows (${transformed.length} gear items)`);

    if (page.length < BATCH_SIZE) break;
    offset += BATCH_SIZE;

    // Small delay to be respectful to the Wiki API
    await new Promise((r) => setTimeout(r, 300));
  }

  console.log(`\n📦 Total fetched: ${totalFetched} rows → ${allItems.length} valid gear items`);
  console.log("💾 Upserting to Supabase...");

  for (let i = 0; i < allItems.length; i += UPSERT_BATCH) {
    const batch = allItems.slice(i, i + UPSERT_BATCH);
    const { error } = await supabase
      .from("osrs_items")
      .upsert(batch, { onConflict: "id" });

    if (error) {
      console.error(`❌ Upsert error at batch ${i / UPSERT_BATCH}:`, error.message);
    } else {
      totalUpserted += batch.length;
      process.stdout.write(`\r  Upserted ${totalUpserted}/${allItems.length} items...`);
    }
  }

  console.log(`\n✅ Done! ${totalUpserted} items in osrs_items table.`);
}

main().catch((err) => {
  console.error("❌ Fatal:", err);
  process.exit(1);
});
