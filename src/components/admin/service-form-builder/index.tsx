"use client";

import PricingTypeSelector from "./PricingTypeSelector";
import XpBasedConfig from "./XpBasedConfig";
import PerItemConfig from "./PerItemConfig";
import PerUnitConfig from "./PerUnitConfig";
import StatBasedConfig from "./StatBasedConfig";
import PerItemStatBasedConfig from "./PerItemStatBasedConfig";
import BossTieredConfig from "./BossTieredConfig";
import GoldTieredConfig from "./GoldTieredConfig";
import ModifiersConfig from "./ModifiersConfig";
import type {
  FormConfig,
  PriceMatrix,
  PricingType,
  FormField,
  XpBasedPriceMatrix,
  PerItemPriceMatrix,
  PerUnitPriceMatrix,
  StatBasedPriceMatrix,
  PerItemStatBasedPriceMatrix,
  BossTieredPriceMatrix,
  GoldTieredPriceMatrix,
} from "@/types/service-config";
import type { GameSkill, GameMethod } from "@/app/(admin)/admin/games/[gameId]/setup/setup-client";

interface Props {
  formConfig: FormConfig | null;
  priceMatrix: PriceMatrix | null;
  onChange: (formConfig: FormConfig, priceMatrix: PriceMatrix) => void;
  gameSkills?: GameSkill[];
  gameMethods?: GameMethod[];
  gameId?: string;
}

function defaultMatrix(type: PricingType): PriceMatrix {
  if (type === "xp_based") {
    return { type: "xp_based", xp_table: "osrs", skills: [] };
  }
  if (type === "per_item") return { type: "per_item", items: [] };
  if (type === "per_unit") return { type: "per_unit", unit_label: "kills", price_per_unit: 1, minimum_units: 1 };
  if (type === "per_item_stat_based") return { type: "per_item_stat_based", items: [], stats: [] };
  if (type === "boss_tiered") return {
    type: "boss_tiered", bosses: [], stats: [], modifiers: [],
    minimum_kills: 1, maximum_kills: 1000,
  };
  if (type === "gold_tiered") return {
    type: "gold_tiered", unit_label: "M GP", minimum_units: 1,
    tiers: [{ min_amount: 1, price_per_unit: 1 }],
  };
  return { type: "stat_based", base_price: 10, stats: [] };
}

function BuilderSection({
  step,
  title,
  description,
  aside,
  children,
}: {
  step: string;
  title: string;
  description: string;
  aside?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-white/10 bg-[#0f172a] p-5 shadow-[0_10px_24px_rgba(0,0,0,0.22)] space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground shadow-sm">
              {step}
            </span>
            <p className="text-sm font-semibold text-white">{title}</p>
          </div>
          <p className="text-sm text-white/65">{description}</p>
        </div>
        {aside}
      </div>
      {children}
    </section>
  );
}

// ─── Main ServiceFormBuilder ──────────────────────────────────────────────────

export default function ServiceFormBuilder({ formConfig, priceMatrix, onChange, gameSkills = [], gameMethods = [], gameId }: Props) {
  const pricingType: PricingType = priceMatrix?.type ?? "xp_based";
  const fields: FormField[] = formConfig?.fields.filter((f) => f.type !== "skill_range") ?? [];

  const emit = (newFields: FormField[], newMatrix: PriceMatrix) => {
    // For xp_based: auto-generate a skill_range field so the storefront knows to render it
    const allFields: FormField[] =
      newMatrix.type === "xp_based"
        ? [{ id: "skill_range", type: "skill_range", label: "Skill & levels", required: true }, ...newFields]
        : newFields;
    // stat_based uses its own stat inputs — no skill_range needed

    onChange(
      { pricing_type: newMatrix.type, fields: allFields },
      newMatrix
    );
  };

  const handleTypeChange = (type: PricingType) => emit(fields, defaultMatrix(type));
  const handleMatrixChange = (m: PriceMatrix) => emit(fields, m);
  const handleFieldsChange = (f: FormField[]) => emit(f, priceMatrix ?? defaultMatrix(pricingType));

  const currentMatrix = priceMatrix ?? defaultMatrix(pricingType);
  const selectedOption = {
    xp_based: {
      label: "XP Based",
      description: "Use level ranges and optional methods to price skilling or powerleveling services.",
    },
    per_item: {
      label: "Per Item",
      description: "Let customers choose a fixed-price item such as a quest or unlock.",
    },
    per_unit: {
      label: "Per Unit",
      description: "Charge by a single countable unit like kills, runs, or points.",
    },
    stat_based: {
      label: "Stat Based",
      description: "Apply pricing multipliers from account stats such as Combat or Prayer.",
    },
    per_item_stat_based: {
      label: "Quest + Stats",
      description: "Combine a per-item list with account-stat adjustments and optional modifiers.",
    },
    boss_tiered: {
      label: "Boss Tiered",
      description: "Configure boss-specific kill tiers with shared stats, modifiers, and gear rules.",
    },
    gold_tiered: {
      label: "Gold Sales",
      description: "Sell in-game gold with volume discount tiers.",
    },
  }[pricingType];

  return (
    <div className="space-y-5">
      <BuilderSection
        step="1"
        title="Choose pricing model"
        description="Start by selecting the pricing structure that best matches how this service is sold."
      >
        <PricingTypeSelector value={pricingType} onChange={handleTypeChange} />
      </BuilderSection>

      <BuilderSection
        step="2"
        title={selectedOption.label}
        description={selectedOption.description}
        aside={
          <span className="rounded-full border border-primary/20 bg-primary/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-primary">
            Active model
          </span>
        }
      >
        {pricingType === "xp_based" && (
          <XpBasedConfig
            matrix={currentMatrix as XpBasedPriceMatrix}
            onChange={handleMatrixChange}
            gameSkills={gameSkills}
            gameMethods={gameMethods}
            gameId={gameId}
          />
        )}
        {pricingType === "per_item" && (
          <PerItemConfig
            matrix={currentMatrix as PerItemPriceMatrix}
            onChange={handleMatrixChange}
          />
        )}
        {pricingType === "per_unit" && (
          <PerUnitConfig
            matrix={currentMatrix as PerUnitPriceMatrix}
            onChange={handleMatrixChange}
          />
        )}
        {pricingType === "stat_based" && (
          <StatBasedConfig
            matrix={currentMatrix as StatBasedPriceMatrix}
            onChange={handleMatrixChange}
          />
        )}
        {pricingType === "per_item_stat_based" && (
          <PerItemStatBasedConfig
            matrix={currentMatrix as PerItemStatBasedPriceMatrix}
            onChange={handleMatrixChange}
            gameId={gameId}
          />
        )}
        {pricingType === "boss_tiered" && (
          <BossTieredConfig
            matrix={currentMatrix as BossTieredPriceMatrix}
            onChange={handleMatrixChange}
          />
        )}
        {pricingType === "gold_tiered" && (
          <GoldTieredConfig
            matrix={currentMatrix as GoldTieredPriceMatrix}
            onChange={handleMatrixChange}
          />
        )}
      </BuilderSection>

      {pricingType !== "boss_tiered" && pricingType !== "per_item_stat_based" && pricingType !== "gold_tiered" && (
        <BuilderSection
          step="3"
          title="Extra modifiers"
          description="Add optional form fields that adjust pricing or capture extra customer choices."
        >
          <ModifiersConfig fields={fields} onChange={handleFieldsChange} />
        </BuilderSection>
      )}
    </div>
  );
}
