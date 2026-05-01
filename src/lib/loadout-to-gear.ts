/**
 * Converts a stored loadout's EquipmentByStyle to a list of item names
 * that the gear optimizer API can look up in the osrs_items database.
 */

import { EQUIPMENT_SLOTS } from "./osrs-equipment";
import type { EquipmentByStyle, CombatStyle } from "./osrs-equipment";
import type { BankItem } from "./gear-optimizer";

// Build a fast lookup map: item ID → item label
const ITEM_LABEL_MAP = new Map<string, string>();
for (const slot of EQUIPMENT_SLOTS) {
  for (const item of slot.items) {
    if (item.id) ITEM_LABEL_MAP.set(item.id, item.label);
  }
}

/**
 * Converts all equipment items from an EquipmentByStyle loadout
 * to BankItem format (with name = OSRS in-game item name).
 *
 * All three combat styles are included so the optimizer has
 * the full pool of gear to choose from.
 */
export function loadoutEquipmentToBankItems(
  equipment: EquipmentByStyle | null | undefined,
): BankItem[] {
  if (!equipment) return [];

  const seen = new Set<string>();
  const result: BankItem[] = [];

  const styles: CombatStyle[] = ["melee", "range", "mage"];
  for (const style of styles) {
    const slots = equipment[style];
    if (!slots) continue;

    for (const [, itemId] of Object.entries(slots)) {
      if (!itemId || seen.has(itemId)) continue;
      seen.add(itemId);

      // First try legacy slug lookup; if not found, treat the value as the item name directly
      const name = ITEM_LABEL_MAP.get(itemId) ?? (itemId.includes(" ") || /[A-Z]/.test(itemId) ? itemId : undefined);
      if (!name || name === "— None —") continue;

      result.push({ itemId: "", name, qty: 1 });
    }
  }

  return result;
}

/**
 * Converts a flat array of item IDs (e.g. from loadoutItems prop in ExtrasCard)
 * to BankItem format.
 */
export function itemIdsToBankItems(itemIds: string[]): BankItem[] {
  const seen = new Set<string>();
  const result: BankItem[] = [];

  for (const itemId of itemIds) {
    if (!itemId || seen.has(itemId)) continue;
    seen.add(itemId);

    // First try legacy slug lookup; if not found, treat the value as the item name directly
    const name = ITEM_LABEL_MAP.get(itemId) ?? (itemId.includes(" ") || /[A-Z]/.test(itemId) ? itemId : undefined);
    if (!name || name === "— None —") continue;

    result.push({ itemId: "", name, qty: 1 });
  }

  return result;
}
