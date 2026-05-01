// ─── Modifier option (used in select / radio fields) ─────────────────────────

export interface ModifierOption {
  value: string;
  label: string;
  /** Price multiplier, e.g. 1.3 = 30% more expensive */
  multiplier?: number;
  /** Flat price addition (applied after multipliers) */
  price_add?: number;
}

// ─── Form fields ──────────────────────────────────────────────────────────────

export interface SkillOption {
  id: string;
  label: string;
  icon?: string;
}

export type FormFieldType =
  | "skill_range"   // start/end level picker with XP-based pricing
  | "select"        // dropdown with modifier options
  | "radio"         // button group with modifier options (single select)
  | "multi_select"  // checkbox group with modifier options (multiple select, all multipliers stack)
  | "checkbox"      // single toggle with optional price_add
  | "text"          // free text (no pricing impact)
  | "textarea"      // multiline text (no pricing impact)
  | "number"        // numeric input (used for per_unit quantity)
  | "item_select";  // pick one item from per_item price list

export interface FormField {
  id: string;
  type: FormFieldType;
  label: string;
  required?: boolean;
  placeholder?: string;
  /** For skill_range: list of available skills */
  skills?: SkillOption[];
  /** For select / radio / item_select */
  options?: ModifierOption[];
  /** For checkbox: price modifier when checked */
  multiplier?: number;
  price_add?: number;
  /** For number: min/max */
  min?: number;
  max?: number;
}

export interface FormConfig {
  /** Which pricing model this service uses */
  pricing_type: PricingType;
  fields: FormField[];
}

// ─── Price matrix ─────────────────────────────────────────────────────────────

export type PricingType = "xp_based" | "per_item" | "per_unit" | "stat_based" | "per_item_stat_based" | "boss_tiered" | "gold_tiered";
export type XpTableKey = "osrs" | "rs3";

export interface QuestModifierOption {
  value: string;
  label: string;
  multiplier?: number;
  price_add?: number;
}

export interface QuestModifierField {
  id: string;
  label: string;
  type: "select" | "radio" | "multi_select" | "checkbox";
  required?: boolean;
  options?: QuestModifierOption[];
  /** For checkbox: multiplier when checked */
  multiplier?: number;
  price_add?: number;
}

export interface PriceItem {
  id: string;
  label: string;
  price: number;
  description?: string;
  /** Per-quest stat configs — overrides the global stats when set */
  stats?: StatConfig[];
  /** Per-quest modifier fields — shown after quest is selected */
  modifiers?: QuestModifierField[];
}

export interface PriceMatrixBase {
  type: PricingType;
  minimum_price?: number;
}

// ─── Stat-based pricing ───────────────────────────────────────────────────────

/**
 * A single price threshold for a stat.
 * If the customer's stat value is <= max, this multiplier applies.
 * Thresholds should be sorted ascending by max.
 * e.g. { max: 43, multiplier: 2.5 } means "stat ≤ 43 → price ×2.5"
 */
export interface StatThreshold {
  max: number;
  multiplier: number;
}

/**
 * Configuration for a single stat input (e.g. Prayer Level).
 * The admin defines which thresholds apply and what multiplier each band gets.
 */
export interface StatConfig {
  /** Unique identifier, e.g. "prayer", "range" */
  id: string;
  /** Display label shown to the customer, e.g. "Prayer Level" */
  label: string;
  /** Minimum allowed value (usually 1) */
  min: number;
  /** Maximum allowed value (usually 99) */
  max: number;
  /** Ordered thresholds (ascending by max). Last threshold should cover the stat's max. */
  thresholds: StatThreshold[];
}

/**
 * A modifier field scoped to a skill.
 * e.g. "Fish type" with options Shrimp (×0.9), Lobster (×1.0), Shark (×1.2)
 * The customer selects a value per route segment in the storefront.
 */
export interface TierModifierField {
  id: string;
  label: string;
  options: ModifierOption[];
}

/** A single price tier within a level range */
export interface XpTier {
  from_level: number;
  to_level: number;
  /** Price per single XP, e.g. 0.0000020 */
  price_per_xp: number;
  /**
   * Optional: pin a specific training method to this tier.
   * Pre-fills the route planner default for segments in this range.
   */
  method_id?: string | null;
}

/** A skill with its own tiered pricing and available training methods */
export interface SkillConfig extends SkillOption {
  tiers: XpTier[];
  /** Training methods specific to this skill (e.g. Fishing: Powerfishing, Banking) */
  methods?: MethodOption[];
  /**
   * Modifier fields available per tier for this skill.
   * e.g. "Fish type": [Shrimp ×0.9, Lobster ×1.0, Shark ×1.2]
   * Each tier can independently select a value.
   */
  tier_modifier_fields?: TierModifierField[];
}

/**
 * A training method available for a skill.
 * Sourced from game_service_methods in the DB, embedded in the price matrix
 * so the storefront can render it without an extra DB call.
 */
export interface MethodOption {
  id: string;
  name: string;
  description?: string | null;
  /**
   * Fixed price per XP for this method.
   * When set, this completely overrides the skill's tier pricing for any segment using this method.
   * e.g. 0.0000025 = $2.50 per 1M XP regardless of level range.
   */
  price_per_xp?: number | null;
  /**
   * Multiplier applied on top of the skill's tier pricing.
   * Only used when price_per_xp is not set.
   * e.g. 1.3 = 30% more expensive than the base tier price.
   * Defaults to 1 (no change).
   */
  multiplier: number;
}

/**
 * A single segment in a customer's training route.
 * e.g. "Fishing 1→40 via Powerfishing, Fish type: Shrimp"
 */
export interface RouteSegment {
  /** Unique client-side id (nanoid / Date.now) */
  id: string;
  from_level: number;
  to_level: number;
  /** method id from MethodOption, or null = default/no method */
  method_id: string | null;
  /**
   * Customer-selected values for tier modifier fields (from SkillConfig.tier_modifier_fields).
   * Key = TierModifierField.id, value = ModifierOption.value (or label as fallback)
   */
  modifier_selections?: Record<string, string>;
  /**
   * Customer-selected values for regular form fields in route mode.
   * Key = FormField.id, value = selected option value (or array for multi_select)
   */
  form_field_selections?: Record<string, string | string[]>;
}

/** Breakdown of a single route segment for display */
export interface SegmentBreakdown {
  segment: RouteSegment;
  methodName: string;
  multiplier: number;
  xpDiff: number;
  baseCost: number;
  finalCost: number;
}

export interface XpBasedPriceMatrix extends PriceMatrixBase {
  type: "xp_based";
  /** Which game's XP table to use */
  xp_table: XpTableKey;
  /** Per-skill tiered pricing — each skill has its own level ranges, price_per_xp and methods */
  skills: SkillConfig[];
}

export interface PerItemPriceMatrix extends PriceMatrixBase {
  type: "per_item";
  /** Individual items (quests, dungeons, etc.) with their own prices */
  items: PriceItem[];
}

export interface PerUnitPriceMatrix extends PriceMatrixBase {
  type: "per_unit";
  /** Label shown to the customer, e.g. "kills", "runs", "points" */
  unit_label: string;
  price_per_unit: number;
  minimum_units?: number;
  maximum_units?: number;
}

export interface StatBasedPriceMatrix extends PriceMatrixBase {
  type: "stat_based";
  /** Base price before any stat multipliers are applied */
  base_price: number;
  /** Stats the customer must fill in; each has its own threshold bands */
  stats: StatConfig[];
  /** Optional loadout modifiers applied after stat multipliers */
  loadout_modifiers?: LoadoutModifier[];
}

/**
 * A quest package: multiple quests sold as one bundle (e.g. "Starter Pack", "Quest Cape Bundle").
 * Can have its own base price and optional stat/modifier overrides.
 */
export interface QuestPackageItem {
  id: string;
  label: string;
  description?: string;
  /** Fixed base price for the whole package */
  base_price: number;
  /** Quest IDs (game_quests) included in this package */
  quest_ids: string[];
  /** Per-package stat configs — overrides global stats when set */
  stats?: StatConfig[];
  /** Per-package modifier fields — override global modifiers when set */
  modifiers?: QuestModifierField[];
}

/**
 * Per-item pricing with stat-based sub-pricing.
 * The customer picks an item (e.g. a quest) or a package, then account stats apply multipliers.
 * Higher stats = lower multiplier = cheaper price.
 */
export interface PerItemStatBasedPriceMatrix extends PriceMatrixBase {
  type: "per_item_stat_based";
  /** Individual items (quests, etc.) each with their own base price */
  items: PriceItem[];
  /**
   * Optional quest packages (multiple quests in one). Shown alongside single quests.
   */
  packages?: QuestPackageItem[];
  /**
   * Global stats applied to all quests/packages that don't have their own stats.
   * If a quest has item.stats defined, those override these global stats.
   */
  stats: StatConfig[];
  /**
   * Global modifier fields applied to all quests that don't have their own modifiers.
   * If a quest has item.modifiers defined, those override these global modifiers.
   */
  modifiers?: QuestModifierField[];
}

/**
 * A loadout-based price modifier.
 * Checks if the customer has any of the listed items equipped or as a special weapon.
 * When the condition is met the modifier's multiplier is applied to the price.
 * e.g. "Twisted bow equipped → 0.85×" (player can complete the boss faster)
 */
export interface LoadoutModifier {
  id: string;
  /** Short label shown to the customer, e.g. "Twisted bow" */
  label: string;
  /** Optional description shown in a tooltip */
  description?: string;
  /**
   * The customer must have at least one of these item IDs in their loadout
   * (any equipment slot across any style, or in special_weapons).
   */
  item_ids: string[];
  /**
   * Optional: only match items in this specific slot (e.g. "weapon", "body").
   * When omitted, all slots are checked.
   */
  slot?: string;
  /**
   * Optional: only match items equipped in this combat style ("melee", "range", "mage").
   * When omitted, all styles are checked.
   */
  style?: string;
  /** Multiplier applied when condition is met, e.g. 0.9 = −10%, 1.1 = +10% */
  multiplier: number;
}

/**
 * A single kill-count tier for boss pricing.
 * e.g. { min_kills: 1, max_kills: 49, price_per_kill: 0.50 }
 */
export interface KillTier {
  min_kills: number;
  max_kills: number;
  price_per_kill: number;
}

/**
 * Configuration for a single boss.
 * Each boss has its own kill tiers, and optionally its own stats and modifiers
 * that override the global ones on the matrix.
 */
export interface BossConfig {
  id: string;
  label: string;
  description?: string;
  /** Optional image URL shown on the boss selector card */
  image_url?: string;
  /** Tiered kill pricing for this boss */
  kill_tiers: KillTier[];
  /** Per-boss stat configs (e.g. Combat level). Overrides global stats when set. */
  stats?: StatConfig[];
  /** Per-boss modifier fields. Overrides global modifiers when set. */
  modifiers?: QuestModifierField[];
  /** Per-boss loadout modifiers. Overrides global loadout_modifiers when set. */
  loadout_modifiers?: LoadoutModifier[];
}

/**
 * Boss tiered pricing: customer picks a boss, enters kill count, price per kill
 * decreases at higher quantities. Combat level (or other stats) apply multipliers.
 * Global modifiers (loot split, account type) stack on top.
 */
export interface BossTieredPriceMatrix extends PriceMatrixBase {
  type: "boss_tiered";
  bosses: BossConfig[];
  /** Global stats (e.g. Combat level) — fallback if boss has no own stats */
  stats?: StatConfig[];
  /** Global modifiers (e.g. Loot split) — fallback if boss has no own modifiers */
  modifiers?: QuestModifierField[];
  /** Global loadout modifiers — fallback if boss has no own loadout_modifiers */
  loadout_modifiers?: LoadoutModifier[];
  minimum_kills?: number;
  maximum_kills?: number;
  /** Label for the countable unit, e.g. "kills", "points", "runs". Defaults to "kills". */
  unit_label?: string;
}

/**
 * A single volume tier for gold pricing.
 * e.g. { min_amount: 50, price_per_unit: 0.40 } means "buy 50+ units → $0.40/unit"
 */
export interface GoldTier {
  /** Minimum amount (in units) to qualify for this tier. First tier should be 1 (or min). */
  min_amount: number;
  /** Price per unit at this tier, e.g. 0.50 = $0.50 per M GP */
  price_per_unit: number;
}

/**
 * Gold sales pricing: customer picks an amount, volume tiers give discounts at higher quantities.
 * e.g. 1–9M GP at $0.50/M, 10–49M at $0.45/M, 50M+ at $0.40/M
 */
export interface GoldTieredPriceMatrix extends PriceMatrixBase {
  type: "gold_tiered";
  /** Label for one unit, e.g. "M GP", "K GP" */
  unit_label: string;
  /** Volume tiers sorted ascending by min_amount */
  tiers: GoldTier[];
  /** Minimum purchasable amount (in units) */
  minimum_units: number;
  /** Maximum purchasable amount (in units), optional */
  maximum_units?: number;
  /** Optional modifiers, e.g. delivery method, rush order */
  modifiers?: QuestModifierField[];
}

export type PriceMatrix =
  | XpBasedPriceMatrix
  | PerItemPriceMatrix
  | PerUnitPriceMatrix
  | StatBasedPriceMatrix
  | PerItemStatBasedPriceMatrix
  | BossTieredPriceMatrix
  | GoldTieredPriceMatrix;

// ─── Calculation result ───────────────────────────────────────────────────────

export interface PriceBreakdown {
  base: number;
  afterMultipliers: number;
  afterAddons: number;
  final: number;
  xpDiff?: number;
  unitCount?: number;
  /** Per-segment breakdown when route planner is used */
  segments?: SegmentBreakdown[];
  /** Active loadout modifiers that were applied to this price */
  loadout_modifiers_active?: { id: string; label: string; multiplier: number }[];
}
