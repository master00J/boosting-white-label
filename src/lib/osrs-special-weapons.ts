/**
 * OSRS extra equipment & special weapons for loadout
 * Quick-select grid + configurable weapon slots
 */

const WIKI_IMG = "https://oldschool.runescape.wiki/images";

function img(name: string) {
  const filename = name.replace(/ /g, "_").replace(/'/g, "%27");
  return `${WIKI_IMG}/${filename}.png`;
}

export interface SpecialWeapon {
  id: string;
  label: string;
  icon: string;
}

/** Quick Select – populaire spec/switch wapens (5×3 grid) */
export const QUICK_SELECT_WEAPONS: SpecialWeapon[] = [
  { id: "dragon_warhammer", label: "Dragon warhammer", icon: img("Dragon warhammer") },
  { id: "toxic_blowpipe", label: "Toxic blowpipe", icon: img("Toxic blowpipe") },
  { id: "dragon_pickaxe", label: "Dragon pickaxe", icon: img("Dragon pickaxe") },
  { id: "sanguinesti_staff", label: "Sanguinesti staff", icon: img("Sanguinesti staff") },
  { id: "zaryte_crossbow", label: "Zaryte crossbow", icon: img("Zaryte crossbow") },
  { id: "voidwaker", label: "Voidwaker", icon: img("Voidwaker") },
  { id: "twisted_bow", label: "Twisted bow", icon: img("Twisted bow") },
  { id: "elder_maul", label: "Elder maul", icon: img("Elder maul") },
  { id: "armadyl_crossbow", label: "Armadyl crossbow", icon: img("Armadyl crossbow") },
  { id: "dragon_claws", label: "Dragon claws", icon: img("Dragon claws") },
  { id: "crystal_halberd", label: "Crystal halberd", icon: img("Crystal halberd") },
  { id: "heavy_ballista", label: "Heavy ballista", icon: img("Heavy ballista") },
  { id: "dragon_dagger", label: "Dragon dagger", icon: img("Dragon dagger") },
  { id: "trident_of_the_seas", label: "Trident of the seas", icon: img("Trident of the seas") },
  { id: "", label: "— None —", icon: "" },
];

/** Alle overige spec/switch wapens voor dropdown */
const EXTRA_SPECIAL_WEAPONS: SpecialWeapon[] = [
  { id: "abyssal_dagger", label: "Abyssal dagger", icon: img("Abyssal dagger") },
  { id: "dragon_scimitar", label: "Dragon scimitar", icon: img("Dragon scimitar") },
  { id: "blade_of_saeldor", label: "Blade of saeldor", icon: img("Blade of saeldor") },
  { id: "abyssal_tentacle", label: "Abyssal tentacle", icon: img("Abyssal tentacle") },
  { id: "abyssal_whip", label: "Abyssal whip", icon: img("Abyssal whip") },
  { id: "bone_crusher", label: "Bone crusher", icon: img("Bone crusher") },
  { id: "keris_partisan", label: "Keris partisan", icon: img("Keris partisan") },
  { id: "armadyl_godsword", label: "Armadyl godsword", icon: img("Armadyl godsword") },
  { id: "bandos_godsword", label: "Bandos godsword", icon: img("Bandos godsword") },
  { id: "saradomin_godsword", label: "Saradomin godsword", icon: img("Saradomin godsword") },
  { id: "zamorak_godsword", label: "Zamorak godsword", icon: img("Zamorak godsword") },
  { id: "trident_of_the_swamp", label: "Trident of the swamp", icon: img("Trident of the swamp") },
  { id: "staff_of_the_dead", label: "Staff of the dead", icon: img("Staff of the dead") },
  { id: "dragon_crossbow", label: "Dragon crossbow", icon: img("Dragon crossbow") },
  { id: "rune_crossbow", label: "Rune crossbow", icon: img("Rune crossbow") },
  { id: "bow_of_faerdhinen", label: "Bow of faerdhinen", icon: img("Bow of faerdhinen") },
  { id: "crystal_bow", label: "Crystal bow", icon: img("Crystal bow") },
  { id: "osmumtens_fang", label: "Osmumten's fang", icon: img("Osmumten's fang") },
  { id: "ghrazi_rapier", label: "Ghrazi rapier", icon: img("Ghrazi rapier") },
  { id: "inquisitors_mace", label: "Inquisitor's mace", icon: img("Inquisitor's mace") },
  { id: "tumekens_shadow", label: "Tumeken's shadow", icon: img("Tumeken's shadow") },
  { id: "dragon_hasta", label: "Dragon hasta", icon: img("Dragon hasta") },
  { id: "leaf_bladed_battleaxe", label: "Leaf-bladed battleaxe", icon: img("Leaf-bladed battleaxe") },
];

const _quickIds = new Set(QUICK_SELECT_WEAPONS.filter((w) => w.id).map((w) => w.id));
/** Alle speciale wapens voor dropdown (quick select + extra, alfabetisch, geen duplicaten) */
export const ALL_SPECIAL_WEAPONS: SpecialWeapon[] = [
  { id: "", label: "— None —", icon: "" },
  ...QUICK_SELECT_WEAPONS.filter((w) => w.id),
  ...EXTRA_SPECIAL_WEAPONS.filter((w) => !_quickIds.has(w.id)),
];

export function getSpecialWeaponIcon(itemId: string): string {
  if (!itemId) return "";
  const w = ALL_SPECIAL_WEAPONS.find((x) => x.id === itemId);
  return w?.icon ?? "";
}

export function getSpecialWeaponLabel(itemId: string): string {
  if (!itemId) return "— None —";
  const w = ALL_SPECIAL_WEAPONS.find((x) => x.id === itemId);
  return w?.label ?? itemId;
}
