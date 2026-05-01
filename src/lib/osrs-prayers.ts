/**
 * OSRS combat prayers for loadout configuration
 * Used for melee/range/mage setups
 */

import type { CombatStyle } from "./osrs-equipment";

export interface Prayer {
  id: string;
  label: string;
  level: number;
  style: CombatStyle;
  description?: string;
}

/** Combat prayers by style (most relevant for PvM) */
export const PRAYERS: Prayer[] = [
  // Melee
  { id: "ultimate_strength", label: "Ultimate Strength", level: 13, style: "melee" },
  { id: "incredible_reflexes", label: "Incredible Reflexes", level: 22, style: "melee" },
  { id: "chivalry", label: "Chivalry", level: 60, style: "melee" },
  { id: "piety", label: "Piety", level: 70, style: "melee" },
  // Range
  { id: "sharp_eye", label: "Sharp Eye", level: 8, style: "range" },
  { id: "hawk_eye", label: "Hawk Eye", level: 26, style: "range" },
  { id: "eagle_eye", label: "Eagle Eye", level: 44, style: "range" },
  { id: "rigour", label: "Rigour", level: 74, style: "range", description: "Scroll" },
  // Mage
  { id: "mystic_will", label: "Mystic Will", level: 9, style: "mage" },
  { id: "mystic_might", label: "Mystic Might", level: 27, style: "mage" },
  { id: "augury", label: "Augury", level: 77, style: "mage", description: "Scroll" },
];

export const PRAYERS_BY_STYLE: Record<CombatStyle, Prayer[]> = {
  melee: PRAYERS.filter((p) => p.style === "melee"),
  range: PRAYERS.filter((p) => p.style === "range"),
  mage: PRAYERS.filter((p) => p.style === "mage"),
};

export type PrayersByStyle = Record<CombatStyle, string[]>;

export const DEFAULT_PRAYERS_BY_STYLE: PrayersByStyle = {
  melee: [],
  range: [],
  mage: [],
};

/** Normalise stored prayers to PrayersByStyle */
export function normalisePrayers(
  raw: Record<string, unknown> | null | undefined
): PrayersByStyle {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_PRAYERS_BY_STYLE };
  const m = Array.isArray((raw as PrayersByStyle).melee)
    ? (raw as PrayersByStyle).melee.filter((x) => typeof x === "string")
    : [];
  const r = Array.isArray((raw as PrayersByStyle).range)
    ? (raw as PrayersByStyle).range.filter((x) => typeof x === "string")
    : [];
  const g = Array.isArray((raw as PrayersByStyle).mage)
    ? (raw as PrayersByStyle).mage.filter((x) => typeof x === "string")
    : [];
  return { melee: m, range: r, mage: g };
}
