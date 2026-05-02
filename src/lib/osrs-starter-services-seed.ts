import { createAdminClient } from "@/lib/supabase/admin";
import type {
  BossTieredPriceMatrix,
  FormConfig,
  PerItemStatBasedPriceMatrix,
  XpBasedPriceMatrix,
} from "@/types/service-config";

type CatalogAdmin = ReturnType<typeof createAdminClient>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ac(admin: CatalogAdmin): any {
  return admin;
}

const SEED_SERVICE_SLUGS = {
  skilling: "osrs-seed-skilling",
  quests: "osrs-seed-quests",
  bossing: "osrs-seed-bossing",
  minigames: "osrs-seed-minigames",
} as const;

async function serviceSeedExists(admin: CatalogAdmin, gameId: string, slug: string): Promise<boolean> {
  const { data } = await ac(admin).from("services").select("id").eq("game_id", gameId).eq("slug", slug).maybeSingle();
  return !!data;
}

async function resolveCategoryIds(
  admin: CatalogAdmin,
  gameId: string,
): Promise<Partial<Record<keyof typeof SEED_SERVICE_SLUGS, string>>> {
  const { data: rows } = await ac(admin).from("service_categories").select("id, slug").eq("game_id", gameId);
  const map: Partial<Record<keyof typeof SEED_SERVICE_SLUGS, string>> = {};
  for (const r of rows ?? []) {
    const slug = r.slug as string;
    if (slug === "skilling") map.skilling = r.id;
    if (slug === "quests") map.quests = r.id;
    if (slug === "bossing") map.bossing = r.id;
    if (slug === "minigames") map.minigames = r.id;
  }
  return map;
}

function buildXpSkillingMatrix(
  skills: { id: string; slug: string; name: string; icon: string | null; sort_order: number }[],
  methods: { id: string; skill_id: string; name: string; slug: string; multiplier: number | string | null }[],
): XpBasedPriceMatrix {
  const bySkill = new Map<string, typeof methods>();
  for (const m of methods) {
    const list = bySkill.get(m.skill_id) ?? [];
    list.push(m);
    bySkill.set(m.skill_id, list);
  }

  const xpSkills = [...skills]
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    .map((sk) => {
      const linked = bySkill.get(sk.id) ?? [];
      const standard = linked.find((x) => x.slug === "standard");
      const methodOpts = standard
        ? [{ id: standard.id, name: standard.name, multiplier: Number(standard.multiplier) || 1 }]
        : undefined;
      return {
        id: sk.slug,
        label: sk.name,
        icon: sk.icon ?? undefined,
        tiers: [
          {
            from_level: 1,
            to_level: 99,
            price_per_xp: 0.000001,
            method_id: standard?.id ?? null,
          },
        ],
        methods: methodOpts,
      };
    });

  return { type: "xp_based", xp_table: "osrs", skills: xpSkills };
}

function buildQuestsMatrix(
  quests: { slug: string; name: string; icon_url: string | null }[],
): PerItemStatBasedPriceMatrix {
  return {
    type: "per_item_stat_based",
    items: quests.map((q) => ({
      id: q.slug,
      label: q.name,
      price: 1,
      icon_url: q.icon_url ?? undefined,
    })),
    stats: [],
  };
}

function buildBossMatrix(
  rows: { id: string; name: string; icon_url: string | null }[],
): BossTieredPriceMatrix {
  return {
    type: "boss_tiered",
    bosses: rows.map((r) => ({
      id: r.id,
      label: r.name,
      image_url: r.icon_url ?? undefined,
      kill_tiers: [{ min_kills: 1, max_kills: 999_999, price_per_kill: 1 }],
    })),
    stats: [
      {
        id: "combat",
        label: "Combat level",
        min: 3,
        max: 126,
        thresholds: [{ max: 126, multiplier: 1 }],
      },
    ],
    modifiers: [],
    minimum_kills: 1,
    maximum_kills: 9999,
  };
}

/**
 * Creates one starter service per default OSRS category when missing (idempotent per slug).
 * Services are is_active=false until you set real prices and activate them.
 */
export async function ensureOsrsStarterServices(admin: CatalogAdmin, gameId: string): Promise<number> {
  const cats = await resolveCategoryIds(admin, gameId);
  let inserted = 0;

  const insertService = async (args: {
    slug: string;
    name: string;
    description: string;
    categoryId: string | undefined;
    sort_order: number;
    price_matrix: unknown;
    pricing_type: FormConfig["pricing_type"];
  }) => {
    if (!args.categoryId) return;
    if (await serviceSeedExists(admin, gameId, args.slug)) return;
    const form_config: FormConfig = { pricing_type: args.pricing_type, fields: [] };
    const { error } = await ac(admin).from("services").insert({
      game_id: gameId,
      category_id: args.categoryId,
      name: args.name,
      slug: args.slug,
      description: args.description,
      base_price: 0.01,
      sort_order: args.sort_order,
      is_active: false,
      is_featured: false,
      form_config,
      price_matrix: args.price_matrix,
    } as never);
    if (error) throw new Error(error.message);
    inserted += 1;
  };

  // Skilling
  const { data: skillRows } = await ac(admin)
    .from("game_skills")
    .select("id, slug, name, icon, sort_order")
    .eq("game_id", gameId)
    .order("sort_order");
  const { data: methodRows } = await ac(admin)
    .from("game_service_methods")
    .select("id, skill_id, name, slug, multiplier")
    .eq("game_id", gameId);
  if (skillRows?.length) {
    await insertService({
      slug: SEED_SERVICE_SLUGS.skilling,
      name: "Powerleveling",
      description:
        "Starter XP-based service (placeholder pricing). Adjust tiers/GP rates and activate when ready.",
      categoryId: cats.skilling,
      sort_order: 0,
      price_matrix: buildXpSkillingMatrix(skillRows, methodRows ?? []),
      pricing_type: "xp_based",
    });
  }

  // Quests
  const { data: questRows } = await ac(admin)
    .from("game_quests")
    .select("slug, name, icon_url, sort_order")
    .eq("game_id", gameId)
    .order("sort_order");
  if (questRows?.length) {
    await insertService({
      slug: SEED_SERVICE_SLUGS.quests,
      name: "Quests",
      description:
        "All imported quests with placeholder base prices ($1). Tune per quest and activate when ready.",
      categoryId: cats.quests,
      sort_order: 0,
      price_matrix: buildQuestsMatrix(questRows),
      pricing_type: "per_item_stat_based",
    });
  }

  // Boss profiles from DB (filled by OSRS catalog seed)
  const { data: profileRows } = await ac(admin)
    .from("osrs_boss_profiles")
    .select("id, name, category, icon_url")
    .order("name");
  const bossingRows = (profileRows ?? []).filter((r: { category: string }) => r.category !== "minigame");
  const minigameRows = (profileRows ?? []).filter((r: { category: string }) => r.category === "minigame");

  if (bossingRows.length) {
    await insertService({
      slug: SEED_SERVICE_SLUGS.bossing,
      name: "Bossing",
      description:
        `Boss picker with placeholder $1/kill (${bossingRows.length} bosses). Adjust kill tiers and activate when ready.`,
      categoryId: cats.bossing,
      sort_order: 0,
      price_matrix: buildBossMatrix(bossingRows),
      pricing_type: "boss_tiered",
    });
  }

  if (minigameRows.length) {
    await insertService({
      slug: SEED_SERVICE_SLUGS.minigames,
      name: "Minigames",
      description:
        `Minigame activities with placeholder $1/unit (${minigameRows.length} entries). Adjust pricing and activate when ready.`,
      categoryId: cats.minigames,
      sort_order: 0,
      price_matrix: {
        ...buildBossMatrix(minigameRows),
        unit_label: "units",
      },
      pricing_type: "boss_tiered",
    });
  }

  return inserted;
}
