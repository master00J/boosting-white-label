/**
 * OSRS equipment slots and items with Wiki icon URLs
 * Direct image path: /images/Filename.png
 */
const WIKI_IMG = "https://oldschool.runescape.wiki/images";

function img(name: string) {
  const filename = name.replace(/ /g, "_").replace(/'/g, "%27");
  return `${WIKI_IMG}/${filename}.png`;
}

/** Bank item icon URL from OSRS Wiki (item name from RuneLite export) */
export function getBankItemIcon(itemName: string): string {
  if (!itemName?.trim()) return "";
  const filename = itemName.replace(/ /g, "_").replace(/'/g, "%27");
  return `${WIKI_IMG}/${filename}.png`;
}

export type EquipmentSlotId =
  | "head"
  | "cape"
  | "neck"
  | "ammo"
  | "weapon"
  | "shield"
  | "body"
  | "legs"
  | "hands"
  | "feet"
  | "ring";

export interface EquipmentItem {
  id: string;
  label: string;
  icon: string;
}

export interface EquipmentSlot {
  id: EquipmentSlotId;
  label: string;
  items: EquipmentItem[];
}

const EMPTY: EquipmentItem = { id: "", label: "— None —", icon: "" };

const HEADS: EquipmentItem[] = [
  EMPTY,
  // High tier
  { id: "torva_full_helm", label: "Torva full helm", icon: img("Torva full helm") },
  { id: "neitiznot_faceguard", label: "Neitiznot faceguard", icon: img("Neitiznot faceguard") },
  { id: "justiciar_faceguard", label: "Justiciar faceguard", icon: img("Justiciar faceguard") },
  { id: "ancestral_hat", label: "Ancestral hat", icon: img("Ancestral hat") },
  { id: "armadyl_helmet", label: "Armadyl helmet", icon: img("Armadyl helmet") },
  { id: "serpentine_helm", label: "Serpentine helm", icon: img("Serpentine helm") },
  { id: "slayer_helm", label: "Slayer helmet", icon: img("Slayer helmet") },
  { id: "slayer_helm_i", label: "Slayer helmet (i)", icon: img("Slayer helmet (i)") },
  // Barrows
  { id: "ahrims_hood", label: "Ahrim's hood", icon: img("Ahrim's hood") },
  { id: "dharoks_helm", label: "Dharok's helm", icon: img("Dharok's helm") },
  { id: "guthans_helm", label: "Guthan's helm", icon: img("Guthan's helm") },
  { id: "karils_coif", label: "Karil's coif", icon: img("Karil's coif") },
  { id: "torags_helm", label: "Torag's helm", icon: img("Torag's helm") },
  { id: "veracs_helm", label: "Verac's helm", icon: img("Verac's helm") },
  // Void & misc
  { id: "void_ranger_helm", label: "Void ranger helm", icon: img("Void ranger helm") },
  { id: "void_mage_helm", label: "Void mage helm", icon: img("Void mage helm") },
  { id: "void_melee_helm", label: "Void melee helm", icon: img("Void melee helm") },
  { id: "helm_of_neitiznot", label: "Helm of neitiznot", icon: img("Helm of neitiznot") },
  { id: "armadyl_coif", label: "Armadyl coif", icon: img("Armadyl coif") },
  { id: "coif", label: "Coif", icon: img("Coif") },
];

const CAPES: EquipmentItem[] = [
  EMPTY,
  { id: "avas_assembler", label: "Ava's assembler", icon: img("Ava's assembler") },
  { id: "avas_accumulator", label: "Ava's accumulator", icon: img("Ava's accumulator") },
  { id: "infernal_cape", label: "Infernal cape", icon: img("Infernal cape") },
  { id: "fire_cape", label: "Fire cape", icon: img("Fire cape") },
  { id: "mythical_cape", label: "Mythical cape", icon: img("Mythical cape") },
  { id: "god_cape", label: "God cape", icon: img("God cape") },
  { id: "saradomin_cape", label: "Saradomin cape", icon: img("Saradomin cape") },
  { id: "obsidian_cape", label: "Obsidian cape", icon: img("Obsidian cape") },
  { id: "ardy_cape_1", label: "Ardougne cloak 1", icon: img("Ardougne cloak 1") },
  { id: "attractor", label: "Ava's attractor", icon: img("Ava's attractor") },
];

const NECKS: EquipmentItem[] = [
  EMPTY,
  { id: "amulet_of_blood_fury", label: "Amulet of blood fury", icon: img("Amulet of blood fury") },
  { id: "amulet_of_torture", label: "Amulet of torture", icon: img("Amulet of torture") },
  { id: "necklace_of_anguish", label: "Necklace of anguish", icon: img("Necklace of anguish") },
  { id: "occult_necklace", label: "Occult necklace", icon: img("Occult necklace") },
  { id: "amulet_of_fury", label: "Amulet of fury", icon: img("Amulet of fury") },
  { id: "amulet_of_glory", label: "Amulet of glory", icon: img("Amulet of glory") },
  { id: "amulet_of_strength", label: "Amulet of strength", icon: img("Amulet of strength") },
  { id: "amulet_of_power", label: "Amulet of power", icon: img("Amulet of power") },
];

/* Ammo uses _5 stack icon on wiki; parentheses encoded for URL */
function imgAmmo(name: string) {
  const base = name.replace(/ /g, "_").replace(/'/g, "%27");
  const filename = base.replace(/\(/g, "%28").replace(/\)/g, "%29");
  return `${WIKI_IMG}/${filename}_5.png`;
}
const AMMO: EquipmentItem[] = [
  EMPTY,
  // Arrows
  { id: "dragon_arrows", label: "Dragon arrows", icon: imgAmmo("Dragon arrow") },
  { id: "amethyst_arrows", label: "Amethyst arrows", icon: imgAmmo("Amethyst arrow") },
  { id: "rune_arrows", label: "Rune arrows", icon: imgAmmo("Rune arrow") },
  { id: "adamant_arrows", label: "Adamant arrows", icon: imgAmmo("Adamant arrow") },
  { id: "mithril_arrows", label: "Mithril arrows", icon: imgAmmo("Mithril arrow") },
  { id: "steel_arrows", label: "Steel arrows", icon: imgAmmo("Steel arrow") },
  { id: "iron_arrows", label: "Iron arrows", icon: imgAmmo("Iron arrow") },
  { id: "broad_arrows", label: "Broad arrows", icon: imgAmmo("Broad arrow") },
  // Bolts
  { id: "dragon_bolts", label: "Dragon bolts", icon: imgAmmo("Dragon bolt") },
  { id: "diamond_bolts_e", label: "Diamond bolts (e)", icon: imgAmmo("Diamond bolts (e)") },
  { id: "ruby_bolts_e", label: "Ruby bolts (e)", icon: imgAmmo("Ruby bolts (e)") },
  { id: "onyx_bolts_e", label: "Onyx bolts (e)", icon: imgAmmo("Onyx bolts (e)") },
  { id: "rune_bolts", label: "Rune bolts", icon: imgAmmo("Rune bolts") },
  { id: "adamant_bolts", label: "Adamant bolts", icon: imgAmmo("Adamant bolts") },
  { id: "mithril_bolts", label: "Mithril bolts", icon: imgAmmo("Mithril bolts") },
  { id: "broad_bolts", label: "Broad bolts", icon: imgAmmo("Broad bolts") },
  // Darts
  { id: "dragon_darts", label: "Dragon darts", icon: imgAmmo("Dragon dart") },
  { id: "rune_darts", label: "Rune darts", icon: imgAmmo("Rune dart") },
  { id: "amethyst_darts", label: "Amethyst darts", icon: imgAmmo("Amethyst dart") },
];

const WEAPONS: EquipmentItem[] = [
  EMPTY,
  // Melee high
  { id: "osmumtens_fang", label: "Osmumten's fang", icon: img("Osmumten's fang") },
  { id: "voidwaker", label: "Voidwaker", icon: img("Voidwaker") },
  { id: "ghrazi_rapier", label: "Ghrazi rapier", icon: img("Ghrazi rapier") },
  { id: "inquisitors_mace", label: "Inquisitor's mace", icon: img("Inquisitor's mace") },
  { id: "abyssal_tentacle", label: "Abyssal tentacle", icon: img("Abyssal tentacle") },
  { id: "abyssal_whip", label: "Abyssal whip", icon: img("Abyssal whip") },
  { id: "blade_of_saeldor", label: "Blade of saeldor", icon: img("Blade of saeldor") },
  { id: "dragon_scimitar", label: "Dragon scimitar", icon: img("Dragon scimitar") },
  { id: "dragon_claws", label: "Dragon claws", icon: img("Dragon claws") },
  { id: "dragon_dagger", label: "Dragon dagger", icon: img("Dragon dagger") },
  { id: "dragon_warhammer", label: "Dragon warhammer", icon: img("Dragon warhammer") },
  { id: "elder_maul", label: "Elder maul", icon: img("Elder maul") },
  { id: "crystal_halberd", label: "Crystal halberd", icon: img("Crystal halberd") },
  { id: "abyssal_dagger", label: "Abyssal dagger", icon: img("Abyssal dagger") },
  { id: "keris_partisan", label: "Keris partisan", icon: img("Keris partisan") },
  { id: "dragon_hasta", label: "Dragon hasta", icon: img("Dragon hasta") },
  { id: "leaf_bladed_battleaxe", label: "Leaf-bladed battleaxe", icon: img("Leaf-bladed battleaxe") },
  // Barrows melee
  { id: "ahrims_staff", label: "Ahrim's staff", icon: img("Ahrim's staff") },
  { id: "dharoks_greataxe", label: "Dharok's greataxe", icon: img("Dharok's greataxe") },
  { id: "guthans_warspear", label: "Guthan's warspear", icon: img("Guthan's warspear") },
  { id: "karils_crossbow", label: "Karil's crossbow", icon: img("Karil's crossbow") },
  { id: "torags_hammers", label: "Torag's hammers", icon: img("Torag's hammers") },
  { id: "veracs_flail", label: "Verac's flail", icon: img("Verac's flail") },
  // Godswords
  { id: "armadyl_godsword", label: "Armadyl godsword", icon: img("Armadyl godsword") },
  { id: "bandos_godsword", label: "Bandos godsword", icon: img("Bandos godsword") },
  { id: "saradomin_godsword", label: "Saradomin godsword", icon: img("Saradomin godsword") },
  { id: "zamorak_godsword", label: "Zamorak godsword", icon: img("Zamorak godsword") },
  // Range
  { id: "twisted_bow", label: "Twisted bow", icon: img("Twisted bow") },
  { id: "bow_of_faerdhinen", label: "Bow of faerdhinen", icon: img("Bow of faerdhinen") },
  { id: "crystal_bow", label: "Crystal bow", icon: img("Crystal bow") },
  { id: "toxic_blowpipe", label: "Toxic blowpipe", icon: img("Toxic blowpipe") },
  { id: "zaryte_crossbow", label: "Zaryte crossbow", icon: img("Zaryte crossbow") },
  { id: "armadyl_crossbow", label: "Armadyl crossbow", icon: img("Armadyl crossbow") },
  { id: "dragon_crossbow", label: "Dragon crossbow", icon: img("Dragon crossbow") },
  { id: "rune_crossbow", label: "Rune crossbow", icon: img("Rune crossbow") },
  { id: "heavy_ballista", label: "Heavy ballista", icon: img("Heavy ballista") },
  { id: "magic_shortbow_i", label: "Magic shortbow (i)", icon: img("Magic shortbow (i)") },
  { id: "magic_shortbow", label: "Magic shortbow", icon: img("Magic shortbow") },
  { id: "maple_shortbow", label: "Maple shortbow", icon: img("Maple shortbow") },
  { id: "oak_shortbow", label: "Oak shortbow", icon: img("Oak shortbow") },
  { id: "adamant_crossbow", label: "Adamant crossbow", icon: img("Adamant crossbow") },
  { id: "mithril_crossbow", label: "Mithril crossbow", icon: img("Mithril crossbow") },
  // Mage
  { id: "tumekens_shadow", label: "Tumeken's shadow", icon: img("Tumeken's shadow") },
  { id: "sanguinesti_staff", label: "Sanguinesti staff", icon: img("Sanguinesti staff") },
  { id: "trident_of_the_swamp", label: "Trident of the swamp", icon: img("Trident of the swamp") },
  { id: "trident_of_the_seas", label: "Trident of the seas", icon: img("Trident of the seas") },
  { id: "staff_of_the_dead", label: "Staff of the dead", icon: img("Staff of the dead") },
  { id: "ibans_staff", label: "Iban's staff", icon: img("Iban's staff") },
  { id: "ancient_staff", label: "Ancient staff", icon: img("Ancient staff") },
  { id: "slayers_staff", label: "Slayer's staff", icon: img("Slayer's staff") },
  { id: "staff_of_fire", label: "Staff of fire", icon: img("Staff of fire") },
  { id: "staff_of_water", label: "Staff of water", icon: img("Staff of water") },
  { id: "salamander", label: "Orange salamander", icon: img("Orange salamander") },
];

const SHIELDS: EquipmentItem[] = [
  EMPTY,
  { id: "elysian_spirit_shield", label: "Elysian spirit shield", icon: img("Elysian spirit shield") },
  { id: "arcane_spirit_shield", label: "Arcane spirit shield", icon: img("Arcane spirit shield") },
  { id: "dragon_defender", label: "Dragon defender", icon: img("Dragon defender") },
  { id: "avernic_defender", label: "Avernic defender", icon: img("Avernic defender") },
  { id: "ancient_dhide_shield", label: "Ancient d'hide shield", icon: img("Ancient d'hide shield") },
  { id: "book_of_the_dead", label: "Book of the dead", icon: img("Book of the dead") },
  { id: "dinhs_bulwark", label: "Dinh's bulwark", icon: img("Dinh's bulwark") },
  // Barrows
  { id: "ahrims_ward", label: "Ahrim's ward", icon: img("Ahrim's ward") },
  { id: "torags_ward", label: "Torag's ward", icon: img("Torag's ward") },
  // Lower tier
  { id: "anti_dragon_shield", label: "Anti-dragon shield", icon: img("Anti-dragon shield") },
  { id: "rune_kiteshield", label: "Rune kiteshield", icon: img("Rune kiteshield") },
  { id: "obsidian_shield", label: "Obsidian shield", icon: img("Obsidian shield") },
];

const BODIES: EquipmentItem[] = [
  EMPTY,
  // High tier
  { id: "torva_platebody", label: "Torva platebody", icon: img("Torva platebody") },
  { id: "ancestral_robe_top", label: "Ancestral robe top", icon: img("Ancestral robe top") },
  { id: "bandos_chestplate", label: "Bandos chestplate", icon: img("Bandos chestplate") },
  { id: "armadyl_chestplate", label: "Armadyl chestplate", icon: img("Armadyl chestplate") },
  { id: "fighter_torso", label: "Fighter torso", icon: img("Fighter torso") },
  // Barrows
  { id: "ahrims_robetop", label: "Ahrim's robetop", icon: img("Ahrim's robetop") },
  { id: "dharoks_platebody", label: "Dharok's platebody", icon: img("Dharok's platebody") },
  { id: "guthans_platebody", label: "Guthan's platebody", icon: img("Guthan's platebody") },
  { id: "karils_leathertop", label: "Karil's leathertop", icon: img("Karil's leathertop") },
  { id: "torags_platebody", label: "Torag's platebody", icon: img("Torag's platebody") },
  { id: "veracs_brassard", label: "Verac's brassard", icon: img("Verac's brassard") },
  // Range/Mage
  { id: "black_dhide_body", label: "Black d'hide body", icon: img("Black d'hide body") },
  { id: "blue_dhide_body", label: "Blue d'hide body", icon: img("Blue d'hide body") },
  { id: "red_dhide_body", label: "Red d'hide body", icon: img("Red d'hide body") },
  { id: "mystic_robe_top", label: "Mystic robe top", icon: img("Mystic robe top") },
  { id: "splitbark_body", label: "Splitbark body", icon: img("Splitbark body") },
];

const LEGS: EquipmentItem[] = [
  EMPTY,
  // High tier
  { id: "torva_platelegs", label: "Torva platelegs", icon: img("Torva platelegs") },
  { id: "ancestral_robe_bottom", label: "Ancestral robe bottom", icon: img("Ancestral robe bottom") },
  { id: "bandos_tassets", label: "Bandos tassets", icon: img("Bandos tassets") },
  { id: "armadyl_chainskirt", label: "Armadyl chainskirt", icon: img("Armadyl chainskirt") },
  // Barrows
  { id: "ahrims_robeskirt", label: "Ahrim's robeskirt", icon: img("Ahrim's robeskirt") },
  { id: "dharoks_platelegs", label: "Dharok's platelegs", icon: img("Dharok's platelegs") },
  { id: "guthans_chainskirt", label: "Guthan's chainskirt", icon: img("Guthan's chainskirt") },
  { id: "karils_leatherskirt", label: "Karil's leatherskirt", icon: img("Karil's leatherskirt") },
  { id: "torags_platelegs", label: "Torag's platelegs", icon: img("Torag's platelegs") },
  { id: "veracs_plateskirt", label: "Verac's plateskirt", icon: img("Verac's plateskirt") },
  // Range/Mage
  { id: "black_dhide_chaps", label: "Black d'hide chaps", icon: img("Black d'hide chaps") },
  { id: "blue_dhide_chaps", label: "Blue d'hide chaps", icon: img("Blue d'hide chaps") },
  { id: "red_dhide_chaps", label: "Red d'hide chaps", icon: img("Red d'hide chaps") },
  { id: "mystic_robe_bottom", label: "Mystic robe bottom", icon: img("Mystic robe bottom") },
];

const HANDS: EquipmentItem[] = [
  EMPTY,
  { id: "ferocious_gloves", label: "Ferocious gloves", icon: img("Ferocious gloves") },
  { id: "barrows_gloves", label: "Barrows gloves", icon: img("Barrows gloves") },
  { id: "blessed_bracers", label: "Blessed bracers", icon: img("Zamorak bracers") },
  { id: "dragon_gloves", label: "Dragon gloves", icon: img("Dragon gloves") },
  { id: "rune_gloves", label: "Rune gloves", icon: img("Rune gloves") },
  { id: "black_dhide_vambraces", label: "Black d'hide vambraces", icon: img("Black d'hide vambraces") },
  { id: "regen_bracelet", label: "Regen bracelet", icon: img("Regen bracelet") },
  { id: "mystic_gloves", label: "Mystic gloves", icon: img("Mystic gloves") },
];

const FEET: EquipmentItem[] = [
  EMPTY,
  { id: "primordial_boots", label: "Primordial boots", icon: img("Primordial boots") },
  { id: "blessed_dhide_boots", label: "Blessed d'hide boots", icon: img("Zamorak d'hide boots") },
  { id: "eternal_boots", label: "Eternal boots", icon: img("Eternal boots") },
  { id: "dragon_boots", label: "Dragon boots", icon: img("Dragon boots") },
  { id: "ranger_boots", label: "Ranger boots", icon: img("Ranger boots") },
  { id: "climbing_boots", label: "Climbing boots", icon: img("Climbing boots") },
  { id: "snakeskin_boots", label: "Snakeskin boots", icon: img("Snakeskin boots") },
  { id: "mystic_boots", label: "Mystic boots", icon: img("Mystic boots") },
];

const RINGS: EquipmentItem[] = [
  EMPTY,
  { id: "ultor_ring", label: "Ultor ring", icon: img("Ultor ring") },
  { id: "archers_ring_i", label: "Archers ring (i)", icon: img("Archers ring (i)") },
  { id: "berserker_ring_i", label: "Berserker ring (i)", icon: img("Berserker ring (i)") },
  { id: "seers_ring_i", label: "Seers ring (i)", icon: img("Seers ring (i)") },
  { id: "lightbearer", label: "Lightbearer", icon: img("Lightbearer") },
  { id: "ring_of_suffering_i", label: "Ring of suffering (i)", icon: img("Ring of suffering (i)") },
  { id: "explorers_ring", label: "Explorer's ring", icon: img("Explorer's ring") },
  { id: "warriors_ring_i", label: "Warrior ring (i)", icon: img("Warrior ring (i)") },
];

export const EQUIPMENT_SLOTS: EquipmentSlot[] = [
  { id: "head", label: "Head", items: HEADS },
  { id: "cape", label: "Cape", items: CAPES },
  { id: "neck", label: "Amulet", items: NECKS },
  { id: "ammo", label: "Ammunition", items: AMMO },
  { id: "weapon", label: "Weapon", items: WEAPONS },
  { id: "shield", label: "Shield", items: SHIELDS },
  { id: "body", label: "Body", items: BODIES },
  { id: "legs", label: "Legs", items: LEGS },
  { id: "hands", label: "Gloves", items: HANDS },
  { id: "feet", label: "Boots", items: FEET },
  { id: "ring", label: "Ring", items: RINGS },
];

/** In-game OSRS equipment screen layout - slot positions */
export const EQUIPMENT_LAYOUT: { id: EquipmentSlotId; gridArea: string }[] = [
  { id: "head", gridArea: "1 / 2 / 2 / 3" },
  { id: "cape", gridArea: "2 / 1 / 3 / 2" },
  { id: "neck", gridArea: "2 / 2 / 3 / 3" },
  { id: "ammo", gridArea: "2 / 3 / 3 / 4" },
  { id: "weapon", gridArea: "3 / 1 / 4 / 2" },
  { id: "body", gridArea: "3 / 2 / 4 / 3" },
  { id: "shield", gridArea: "3 / 3 / 4 / 4" },
  { id: "legs", gridArea: "4 / 2 / 5 / 3" },
  { id: "hands", gridArea: "5 / 1 / 6 / 2" },
  { id: "feet", gridArea: "5 / 2 / 6 / 3" },
  { id: "ring", gridArea: "5 / 3 / 6 / 4" },
];

export type CombatStyle = "melee" | "range" | "mage";

export const COMBAT_STYLES: { id: CombatStyle; label: string }[] = [
  { id: "melee", label: "Melee" },
  { id: "range", label: "Range" },
  { id: "mage", label: "Mage" },
];

export const DEFAULT_EQUIPMENT: Record<EquipmentSlotId, string> = {
  head: "",
  cape: "",
  neck: "",
  ammo: "",
  weapon: "",
  shield: "",
  body: "",
  legs: "",
  hands: "",
  feet: "",
  ring: "",
};

export type EquipmentByStyle = Record<CombatStyle, Record<EquipmentSlotId, string>>;

export const DEFAULT_EQUIPMENT_BY_STYLE: EquipmentByStyle = {
  melee: { ...DEFAULT_EQUIPMENT },
  range: { ...DEFAULT_EQUIPMENT },
  mage: { ...DEFAULT_EQUIPMENT },
};

export function getItemIcon(slot: EquipmentSlot, itemId: string): string {
  if (!itemId) return "";
  const item = slot.items.find((i) => i.id === itemId);
  return item?.icon ?? "";
}

/** Normalise stored equipment (flat or by-style) to EquipmentByStyle */
export function normaliseEquipmentByStyle(
  raw: Record<string, unknown> | null | undefined
): EquipmentByStyle {
  if (!raw) return { ...DEFAULT_EQUIPMENT_BY_STYLE };
  const hasMelee = typeof (raw as Record<string, unknown>).melee === "object";
  if (hasMelee) {
    const m = (raw as EquipmentByStyle).melee ?? {};
    const r = (raw as EquipmentByStyle).range ?? {};
    const g = (raw as EquipmentByStyle).mage ?? {};
    return {
      melee: { ...DEFAULT_EQUIPMENT, ...m } as Record<EquipmentSlotId, string>,
      range: { ...DEFAULT_EQUIPMENT, ...r } as Record<EquipmentSlotId, string>,
      mage: { ...DEFAULT_EQUIPMENT, ...g } as Record<EquipmentSlotId, string>,
    };
  }
  const flat = raw as Record<EquipmentSlotId, string>;
  const merged = { ...DEFAULT_EQUIPMENT, ...flat };
  return {
    melee: { ...merged },
    range: { ...merged },
    mage: { ...merged },
  };
}
