/**
 * Static OSRS gear stats for all items in osrs-equipment.ts.
 * Stats sourced from the OSRS Wiki. This file is the primary data source
 * for the gear optimizer — no database import needed.
 */
import type { GearItem } from "./gear-optimizer";

const W = "https://oldschool.runescape.wiki/images";
function icon(name: string) {
  return `${W}/${name.replace(/ /g, "_").replace(/'/g, "%27")}.png`;
}

// Shorthand builder
function item(
  id: string, name: string, slot: string,
  atk: [number,number,number,number,number],   // stab slash crush magic ranged
  def: [number,number,number,number,number],   // stab slash crush magic ranged
  other: [number,number,number,number],         // mstr rstr mdmg prayer
  reqs: [number,number,number,number,number,number], // atk str def rng mag pray
  set_name?: string,
  is_2h = false,
  is_members = true,
): GearItem {
  return {
    id, name, slot, is_2h, is_members,
    a_stab:atk[0], a_slash:atk[1], a_crush:atk[2], a_magic:atk[3], a_ranged:atk[4],
    d_stab:def[0], d_slash:def[1], d_crush:def[2], d_magic:def[3], d_ranged:def[4],
    melee_str:other[0], ranged_str:other[1], magic_dmg:other[2], prayer:other[3],
    req_attack:reqs[0], req_strength:reqs[1], req_defence:reqs[2],
    req_ranged:reqs[3], req_magic:reqs[4], req_prayer:reqs[5],
    set_name: set_name ?? null,
    icon_url: icon(name),
  };
}

const _ = [0,0,0,0,0] as [number,number,number,number,number];
const r1: [number,number,number,number,number,number] = [1,1,1,1,1,1];

export const STATIC_GEAR_ITEMS: GearItem[] = [

  // ══════════════════════════ HEAD ══════════════════════════
  item("torva_full_helm",        "Torva full helm",        "head", [0,0,0,-3,0],  [57,59,57,-3,60],  [0,0,0,1], [1,1,70,1,1,1], "torva"),
  item("neitiznot_faceguard",    "Neitiznot faceguard",    "head", [0,7,7,0,0],   [30,32,27,-3,28],  [6,0,0,3], [1,1,70,1,1,1]),
  item("justiciar_faceguard",    "Justiciar faceguard",    "head", [0,0,0,0,0],   [25,27,23,5,27],   [0,0,0,0], [1,1,70,1,1,1], "justiciar"),
  item("ancestral_hat",          "Ancestral hat",          "head", [0,0,0,6,0],   [4,4,4,6,4],       [0,0,2,0], [1,1,65,1,75,1], "ancestral"),
  item("armadyl_helmet",         "Armadyl helmet",         "head", [0,0,0,0,10],  [7,9,7,11,16],     [0,0,0,0], [1,1,70,70,1,1], "armadyl"),
  item("serpentine_helm",        "Serpentine helm",        "head", [7,7,7,0,0],   [15,13,14,13,15],  [0,0,0,0], [1,1,75,1,1,1]),
  item("slayer_helm",            "Slayer helmet",          "head", [3,3,3,-3,3],  [10,11,9,-3,10],   [0,0,0,0], [1,1,10,1,1,1]),
  item("slayer_helm_i",          "Slayer helmet (i)",      "head", [3,3,3,-3,3],  [10,11,9,-3,10],   [0,0,0,0], [1,1,10,1,1,1], "slayer_helm"),
  item("ahrims_hood",            "Ahrim's hood",           "head", [0,0,0,6,0],   [0,0,0,12,0],      [0,0,0,0], [1,1,70,1,70,1], "ahrims"),
  item("dharoks_helm",           "Dharok's helm",          "head", [6,8,6,-3,0],  [23,25,21,-3,20],  [0,0,0,0], [70,1,70,1,1,1], "dharoks"),
  item("guthans_helm",           "Guthan's helm",          "head", [6,6,7,0,0],   [24,24,22,-3,21],  [0,0,0,0], [70,1,70,1,1,1], "guthans"),
  item("karils_coif",            "Karil's coif",           "head", [0,0,0,0,8],   [7,9,7,11,16],     [0,0,0,0], [1,1,70,70,1,1], "karils"),
  item("torags_helm",            "Torag's helm",           "head", [0,0,0,-3,0],  [33,35,31,-3,28],  [0,0,0,0], [70,1,70,1,1,1], "torags"),
  item("veracs_helm",            "Verac's helm",           "head", [5,5,6,-3,0],  [25,27,23,-3,24],  [0,0,0,0], [70,1,70,1,1,1], "veracs"),
  item("void_ranger_helm",       "Void ranger helm",       "head", [0,0,0,0,0],   [0,0,0,0,0],       [0,0,0,0], [42,42,42,42,42,22], "void"),
  item("void_mage_helm",         "Void mage helm",         "head", [0,0,0,0,0],   [0,0,0,0,0],       [0,0,0,0], [42,42,42,42,42,22], "void"),
  item("void_melee_helm",        "Void melee helm",        "head", [0,0,0,0,0],   [0,0,0,0,0],       [0,0,0,0], [42,42,42,42,42,22], "void"),
  item("helm_of_neitiznot",      "Helm of neitiznot",      "head", [0,5,5,-3,0],  [17,19,16,-3,16],  [3,0,0,3], [1,1,55,1,1,1]),
  item("armadyl_coif",           "Armadyl coif",           "head", [0,0,0,0,2],   [1,1,1,2,4],       [0,0,0,0], [1,1,1,50,1,1]),
  item("coif",                   "Coif",                   "head", [0,0,0,0,2],   [0,0,0,0,1],       [0,0,0,0], [1,1,1,20,1,1]),

  // ══════════════════════════ CAPE ══════════════════════════
  item("avas_assembler",    "Ava's assembler",    "cape", [0,0,0,0,8],  [0,0,0,0,2],  [0,2,0,1], [1,1,1,70,1,1]),
  item("avas_accumulator",  "Ava's accumulator",  "cape", [0,0,0,0,4],  [0,0,0,0,1],  [0,1,0,0], [1,1,1,30,1,1]),
  item("infernal_cape",     "Infernal cape",      "cape", [7,7,7,7,7],  [12,12,12,12,12], [8,0,0,0], r1),
  item("fire_cape",         "Fire cape",          "cape", [2,2,2,2,2],  [11,11,11,11,11], [4,0,0,2], r1),
  item("mythical_cape",     "Mythical cape",      "cape", [5,5,5,5,5],  [10,10,10,10,10], [5,0,0,0], r1),
  item("god_cape",          "God cape",           "cape", [0,0,0,10,0], [0,0,0,10,0], [0,0,0,0], r1),
  item("saradomin_cape",    "Saradomin cape",     "cape", [0,0,0,10,0], [0,0,0,10,0], [0,0,0,0], r1),
  item("obsidian_cape",     "Obsidian cape",      "cape", [0,0,0,0,0],  [9,9,9,9,9],  [0,0,0,0], r1),
  item("ardy_cape_1",       "Ardougne cloak 1",   "cape", [0,0,0,0,0],  [0,0,0,0,0],  [0,0,0,1], r1),
  item("attractor",         "Ava's attractor",    "cape", [0,0,0,0,2],  [0,0,0,0,0],  [0,0,0,0], [1,1,1,30,1,1]),

  // ══════════════════════════ NECK ══════════════════════════
  item("amulet_of_blood_fury",  "Amulet of blood fury",  "neck", [10,10,10,0,0],  [15,15,15,15,15], [8,0,0,0],  r1),
  item("amulet_of_torture",     "Amulet of torture",     "neck", [10,10,10,-4,0], [0,0,0,-1,0],     [15,0,0,0], r1),
  item("necklace_of_anguish",   "Necklace of anguish",   "neck", [0,0,0,-10,5],   [0,0,0,-5,0],     [0,5,0,0],  r1),
  item("occult_necklace",       "Occult necklace",       "neck", [0,0,0,12,-5],   [0,0,0,-3,0],     [0,0,10,0], r1),
  item("amulet_of_fury",        "Amulet of fury",        "neck", [10,10,10,10,10],[15,15,15,15,15], [8,0,0,0],  r1),
  item("amulet_of_glory",       "Amulet of glory",       "neck", [10,10,10,10,3], [3,3,3,3,3],      [6,0,0,0],  r1),
  item("amulet_of_strength",    "Amulet of strength",    "neck", [0,0,3,0,0],     [0,0,0,0,0],      [12,0,0,0], r1),
  item("amulet_of_power",       "Amulet of power",       "neck", [6,6,6,6,6],     [6,6,6,6,6],      [6,0,0,0],  r1),

  // ══════════════════════════ AMMO ══════════════════════════
  item("dragon_arrows",    "Dragon arrows",      "ammo", [0,0,0,0,0], _, [0,60,0,0], r1),
  item("amethyst_arrows",  "Amethyst arrows",    "ammo", [0,0,0,0,0], _, [0,55,0,0], r1),
  item("rune_arrows",      "Rune arrows",        "ammo", [0,0,0,0,0], _, [0,49,0,0], r1),
  item("adamant_arrows",   "Adamant arrows",     "ammo", [0,0,0,0,0], _, [0,42,0,0], r1),
  item("mithril_arrows",   "Mithril arrows",     "ammo", [0,0,0,0,0], _, [0,31,0,0], r1),
  item("steel_arrows",     "Steel arrows",       "ammo", [0,0,0,0,0], _, [0,20,0,0], r1),
  item("iron_arrows",      "Iron arrows",        "ammo", [0,0,0,0,0], _, [0,10,0,0], r1),
  item("broad_arrows",     "Broad arrows",       "ammo", [0,0,0,0,0], _, [0,35,0,0], r1),
  item("dragon_bolts",     "Dragon bolts",       "ammo", [0,0,0,0,0], _, [0,122,0,0], r1),
  item("diamond_bolts_e",  "Diamond bolts (e)",  "ammo", [0,0,0,0,0], _, [0,105,0,0], r1),
  item("ruby_bolts_e",     "Ruby bolts (e)",     "ammo", [0,0,0,0,0], _, [0,103,0,0], r1),
  item("onyx_bolts_e",     "Onyx bolts (e)",     "ammo", [0,0,0,0,0], _, [0,120,0,0], r1),
  item("rune_bolts",       "Rune bolts",         "ammo", [0,0,0,0,0], _, [0,115,0,0], r1),
  item("adamant_bolts",    "Adamant bolts",       "ammo", [0,0,0,0,0], _, [0,100,0,0], r1),
  item("mithril_bolts",    "Mithril bolts",      "ammo", [0,0,0,0,0], _, [0,78,0,0],  r1),
  item("broad_bolts",      "Broad bolts",        "ammo", [0,0,0,0,0], _, [0,100,0,0], r1),
  item("dragon_darts",     "Dragon darts",       "ammo", [0,0,0,0,0], _, [0,35,0,0], r1),
  item("rune_darts",       "Rune darts",         "ammo", [0,0,0,0,0], _, [0,26,0,0], r1),
  item("amethyst_darts",   "Amethyst darts",     "ammo", [0,0,0,0,0], _, [0,28,0,0], r1),

  // ══════════════════════════ WEAPON (1H) ══════════════════════════
  item("osmumtens_fang",      "Osmumten's fang",       "weapon", [105,0,0,0,0],  [105,0,0,0,0], [56,0,0,0], [82,1,1,1,1,1]),
  item("voidwaker",           "Voidwaker",             "weapon", [102,0,0,0,0],  [0,0,0,0,0],   [55,0,0,0], [75,1,1,1,1,1]),
  item("ghrazi_rapier",       "Ghrazi rapier",         "weapon", [94,0,0,0,0],   [0,0,0,0,0],   [55,0,0,0], [75,1,1,1,1,1]),
  item("inquisitors_mace",    "Inquisitor's mace",     "weapon", [0,0,95,0,0],   [0,0,0,0,0],   [55,0,0,0], [80,1,1,1,1,1], "inquisitor"),
  item("abyssal_tentacle",    "Abyssal tentacle",      "weapon", [0,90,0,0,0],   [0,0,0,0,0],   [87,0,0,0], [75,1,1,1,1,1]),
  item("abyssal_whip",        "Abyssal whip",          "weapon", [0,82,0,0,0],   [0,0,0,0,0],   [82,0,0,0], [70,1,1,1,1,1]),
  item("blade_of_saeldor",    "Blade of saeldor",      "weapon", [0,94,0,0,0],   [0,0,0,0,0],   [55,0,0,0], [75,1,1,1,1,1]),
  item("dragon_scimitar",     "Dragon scimitar",       "weapon", [0,67,0,0,0],   [0,0,0,0,0],   [66,0,0,0], [60,1,1,1,1,1]),
  item("dragon_claws",        "Dragon claws",          "weapon", [57,41,0,0,0],  [0,0,0,0,0],   [56,0,0,0], [60,1,1,1,1,1]),
  item("dragon_dagger",       "Dragon dagger",         "weapon", [40,25,0,0,0],  [0,0,0,0,0],   [40,0,0,0], [60,1,1,1,1,1]),
  item("dragon_warhammer",    "Dragon warhammer",      "weapon", [0,0,95,0,0],   [0,0,0,0,0],   [85,0,0,0], [60,1,1,1,1,1]),
  item("elder_maul",          "Elder maul",            "weapon", [0,0,135,0,0],  [0,0,0,0,0],   [147,0,0,0],[75,1,1,1,1,1], undefined, true),
  item("crystal_halberd",     "Crystal halberd",       "weapon", [0,110,0,0,0],  [0,0,0,0,0],   [89,0,0,0], [70,1,1,1,1,1], undefined, true),
  item("abyssal_dagger",      "Abyssal dagger",        "weapon", [75,40,0,0,0],  [0,0,0,0,0],   [75,0,0,0], [70,1,1,1,1,1]),
  item("keris_partisan",      "Keris partisan",        "weapon", [76,30,0,0,0],  [0,0,0,0,0],   [70,0,0,0], [65,1,1,1,1,1]),
  item("dragon_hasta",        "Dragon hasta",          "weapon", [60,20,0,0,0],  [0,0,0,0,0],   [55,0,0,0], [60,1,1,1,1,1]),
  item("leaf_bladed_battleaxe","Leaf-bladed battleaxe","weapon", [0,8,22,0,0],   [0,0,0,0,0],   [87,0,0,0], [65,1,1,1,1,1]),
  // Barrows melee
  item("dharoks_greataxe",    "Dharok's greataxe",     "weapon", [0,105,80,0,0], [0,0,0,0,0],   [93,0,0,0], [70,70,1,1,1,1], "dharoks", true),
  item("guthans_warspear",    "Guthan's warspear",     "weapon", [85,80,85,0,0], [0,0,0,0,0],   [82,0,0,0], [70,70,1,1,1,1], "guthans"),
  item("torags_hammers",      "Torag's hammers",       "weapon", [0,0,90,0,0],   [0,0,0,0,0],   [85,0,0,0], [70,70,1,1,1,1], "torags"),
  item("veracs_flail",        "Verac's flail",         "weapon", [0,82,82,0,0],  [0,0,0,0,0],   [82,0,0,0], [70,70,1,1,1,1], "veracs"),
  // Godswords (2H)
  item("armadyl_godsword",    "Armadyl godsword",      "weapon", [0,132,80,0,0], [0,0,0,0,0],   [132,0,0,0],[75,1,1,1,1,1], undefined, true),
  item("bandos_godsword",     "Bandos godsword",       "weapon", [0,132,80,0,0], [0,0,0,0,0],   [132,0,0,0],[75,1,1,1,1,1], undefined, true),
  item("saradomin_godsword",  "Saradomin godsword",    "weapon", [0,132,80,0,0], [0,0,0,0,0],   [132,0,0,0],[75,1,1,1,1,1], undefined, true),
  item("zamorak_godsword",    "Zamorak godsword",      "weapon", [0,132,80,0,0], [0,0,0,0,0],   [132,0,0,0],[75,1,1,1,1,1], undefined, true),
  // Ranged
  item("twisted_bow",         "Twisted bow",           "weapon", [0,0,0,0,70],   [0,0,0,0,0],   [0,20,0,0], [75,1,1,75,1,1], undefined, true),
  item("bow_of_faerdhinen",   "Bow of faerdhinen",     "weapon", [0,0,0,0,128],  [0,0,0,0,0],   [0,106,0,0],[75,1,1,80,1,1], undefined, true),
  item("crystal_bow",         "Crystal bow",           "weapon", [0,0,0,0,100],  [0,0,0,0,0],   [0,70,0,0], [70,1,1,70,1,1], undefined, true),
  item("toxic_blowpipe",      "Toxic blowpipe",        "weapon", [0,0,0,0,30],   [0,0,0,0,0],   [0,40,0,0], [1,1,1,75,1,1]),
  item("zaryte_crossbow",     "Zaryte crossbow",       "weapon", [0,0,0,0,110],  [0,0,0,0,0],   [0,0,0,0],  [80,1,1,80,1,1]),
  item("armadyl_crossbow",    "Armadyl crossbow",      "weapon", [0,0,0,0,100],  [0,0,0,0,0],   [0,0,0,0],  [70,1,1,70,1,1]),
  item("dragon_crossbow",     "Dragon crossbow",       "weapon", [0,0,0,0,94],   [0,0,0,0,0],   [0,0,0,0],  [64,1,1,64,1,1]),
  item("rune_crossbow",       "Rune crossbow",         "weapon", [0,0,0,0,90],   [0,0,0,0,0],   [0,0,0,0],  [61,1,1,61,1,1]),
  item("heavy_ballista",      "Heavy ballista",        "weapon", [0,0,0,0,110],  [0,0,0,0,0],   [0,15,0,0], [65,1,1,75,1,1], undefined, true),
  item("magic_shortbow_i",    "Magic shortbow (i)",    "weapon", [0,0,0,0,75],   [0,0,0,0,0],   [0,69,0,0], [50,1,1,50,1,1], undefined, true),
  item("magic_shortbow",      "Magic shortbow",        "weapon", [0,0,0,0,69],   [0,0,0,0,0],   [0,69,0,0], [50,1,1,50,1,1], undefined, true),
  item("maple_shortbow",      "Maple shortbow",        "weapon", [0,0,0,0,29],   [0,0,0,0,0],   [0,29,0,0], [30,1,1,30,1,1], undefined, true),
  item("oak_shortbow",        "Oak shortbow",          "weapon", [0,0,0,0,14],   [0,0,0,0,0],   [0,14,0,0], [1,1,1,1,1,1], undefined, true),
  item("adamant_crossbow",    "Adamant crossbow",      "weapon", [0,0,0,0,79],   [0,0,0,0,0],   [0,0,0,0],  [46,1,1,46,1,1]),
  item("mithril_crossbow",    "Mithril crossbow",      "weapon", [0,0,0,0,57],   [0,0,0,0,0],   [0,0,0,0],  [36,1,1,36,1,1]),
  // Mage (2H staves)
  item("tumekens_shadow",     "Tumeken's shadow",      "weapon", [0,0,0,35,0],   [0,0,0,0,0],   [0,0,15,0], [75,1,1,1,85,1], undefined, true),
  item("sanguinesti_staff",   "Sanguinesti staff",     "weapon", [0,0,0,25,0],   [0,0,0,0,0],   [0,0,12,0], [75,1,1,1,82,1], undefined, true),
  item("trident_of_the_swamp","Trident of the swamp",  "weapon", [0,0,0,25,0],   [0,0,0,0,0],   [0,0,2,0],  [75,1,1,1,78,1]),
  item("trident_of_the_seas", "Trident of the seas",   "weapon", [0,0,0,25,0],   [0,0,0,0,0],   [0,0,0,0],  [75,1,1,1,75,1]),
  item("staff_of_the_dead",   "Staff of the dead",     "weapon", [0,0,0,17,0],   [0,0,0,0,0],   [0,0,0,0],  [75,1,1,1,75,1]),
  item("ibans_staff",         "Iban's staff",          "weapon", [0,0,0,10,0],   [0,0,0,0,0],   [0,0,0,0],  [50,1,1,1,50,1]),
  item("ancient_staff",       "Ancient staff",         "weapon", [0,0,0,10,0],   [0,0,0,0,0],   [0,0,0,0],  [50,1,1,1,50,1]),
  item("slayers_staff",       "Slayer's staff",        "weapon", [0,0,0,12,0],   [0,0,0,0,0],   [0,0,0,0],  [55,1,1,1,55,1]),
  item("staff_of_fire",       "Staff of fire",         "weapon", [0,0,0,10,0],   [0,0,0,0,0],   [0,0,0,0],  [30,1,1,1,30,1]),
  item("staff_of_water",      "Staff of water",        "weapon", [0,0,0,10,0],   [0,0,0,0,0],   [0,0,0,0],  [30,1,1,1,30,1]),
  item("salamander",          "Orange salamander",     "weapon", [0,28,0,0,0],   [0,0,0,0,0],   [0,0,0,0],  [30,1,1,30,30,1]),
  // Barrows ranged/mage
  item("karils_crossbow",     "Karil's crossbow",      "weapon", [0,0,0,0,84],   [0,0,0,0,0],   [0,0,0,0],  [70,1,70,70,1,1], "karils"),
  item("ahrims_staff",        "Ahrim's staff",         "weapon", [0,0,0,15,0],   [0,0,0,0,0],   [0,0,5,0],  [70,1,70,1,70,1], "ahrims"),

  // ══════════════════════════ SHIELD ══════════════════════════
  item("elysian_spirit_shield", "Elysian spirit shield",  "shield", [0,0,0,0,0],  [80,75,72,83,76], [0,0,0,3], [1,1,75,1,1,1]),
  item("arcane_spirit_shield",  "Arcane spirit shield",   "shield", [0,0,0,20,0], [80,75,72,83,76], [0,0,5,3], [1,1,75,1,1,1]),
  item("dragon_defender",       "Dragon defender",        "shield", [25,24,23,0,0],[29,28,27,0,29], [6,0,0,0], [60,1,1,1,1,1]),
  item("avernic_defender",      "Avernic defender",       "shield", [30,29,28,0,0],[35,33,32,0,34], [8,0,0,0], [70,1,1,1,1,1]),
  item("ancient_dhide_shield",  "Ancient d'hide shield",  "shield", [0,0,0,0,10], [0,10,10,10,15], [0,0,0,1], [1,1,70,70,1,1]),
  item("book_of_the_dead",      "Book of the dead",       "shield", [6,6,6,6,6],  [3,3,3,3,3],     [6,0,0,3], r1),
  item("dinhs_bulwark",         "Dinh's bulwark",         "shield", [0,0,-8,0,0], [113,115,113,5,110],[0,0,0,0],[1,1,65,1,1,1]),
  item("ahrims_ward",           "Ahrim's ward",           "shield", [0,0,0,0,0],  [10,10,10,12,10], [0,0,0,0], [70,1,70,1,70,1], "ahrims"),
  item("torags_ward",           "Torag's ward",           "shield", [0,0,0,-8,0], [40,42,38,-8,35], [0,0,0,0], [70,1,70,1,1,1], "torags"),
  item("anti_dragon_shield",    "Anti-dragon shield",     "shield", [0,0,0,8,0],  [0,0,0,8,4],      [0,0,0,0], r1),
  item("rune_kiteshield",       "Rune kiteshield",        "shield", [0,0,0,-8,0], [47,49,44,-8,42], [0,0,0,0], [1,1,40,1,1,1]),
  item("obsidian_shield",       "Obsidian shield",        "shield", [0,0,0,0,0],  [15,18,18,14,17], [0,0,0,0], r1, "obsidian"),

  // ══════════════════════════ BODY ══════════════════════════
  item("torva_platebody",      "Torva platebody",       "body", [0,0,0,-6,0],  [82,80,72,-15,80], [0,0,0,1], [1,1,70,1,1,1], "torva"),
  item("ancestral_robe_top",   "Ancestral robe top",    "body", [0,0,0,22,0],  [10,10,10,28,10],  [0,0,5,1], [1,1,65,1,75,1], "ancestral"),
  item("bandos_chestplate",    "Bandos chestplate",     "body", [0,0,0,-6,0],  [76,79,71,-15,77], [0,0,0,1], [1,1,65,1,1,1], "bandos"),
  item("armadyl_chestplate",   "Armadyl chestplate",    "body", [0,0,0,0,33],  [33,38,37,27,47],  [0,0,0,1], [1,1,70,70,1,1], "armadyl"),
  item("fighter_torso",        "Fighter torso",         "body", [0,0,0,-6,0],  [47,49,44,-12,46], [4,0,0,0], [1,1,40,1,1,1]),
  item("ahrims_robetop",       "Ahrim's robetop",       "body", [0,0,0,22,0],  [18,21,20,30,20],  [0,0,0,0], [70,1,70,1,70,1], "ahrims"),
  item("dharoks_platebody",    "Dharok's platebody",    "body", [0,0,0,-6,0],  [82,85,76,-15,78], [0,0,0,0], [70,1,70,1,1,1], "dharoks"),
  item("guthans_platebody",    "Guthan's platebody",    "body", [0,0,0,-6,0],  [81,84,76,-15,77], [0,0,0,0], [70,1,70,1,1,1], "guthans"),
  item("karils_leathertop",    "Karil's leathertop",    "body", [0,0,0,0,20],  [33,38,37,27,47],  [0,0,0,0], [70,1,70,70,1,1], "karils"),
  item("torags_platebody",     "Torag's platebody",     "body", [0,0,0,-6,0],  [87,90,82,-15,83], [0,0,0,0], [70,1,70,1,1,1], "torags"),
  item("veracs_brassard",      "Verac's brassard",      "body", [0,0,0,-6,0],  [81,84,76,-15,77], [0,0,0,0], [70,1,70,1,1,1], "veracs"),
  item("black_dhide_body",     "Black d'hide body",     "body", [0,0,0,0,15],  [30,35,33,25,45],  [0,0,0,0], [1,1,40,70,1,1], "black_dhide"),
  item("blue_dhide_body",      "Blue d'hide body",      "body", [0,0,0,0,15],  [24,29,27,19,39],  [0,0,0,0], [1,1,40,50,1,1], "blue_dhide"),
  item("red_dhide_body",       "Red d'hide body",       "body", [0,0,0,0,15],  [27,32,30,22,42],  [0,0,0,0], [1,1,40,60,1,1], "red_dhide"),
  item("mystic_robe_top",      "Mystic robe top",       "body", [0,0,0,20,0],  [20,20,20,25,18],  [0,0,0,0], [1,1,20,1,40,1]),
  item("splitbark_body",       "Splitbark body",        "body", [0,0,0,8,0],   [30,28,25,16,30],  [0,0,0,0], [1,1,40,1,40,1]),

  // ══════════════════════════ LEGS ══════════════════════════
  item("torva_platelegs",       "Torva platelegs",       "legs", [0,0,0,-4,0],  [47,49,45,-11,47], [0,0,0,0], [1,1,70,1,1,1], "torva"),
  item("ancestral_robe_bottom", "Ancestral robe bottom", "legs", [0,0,0,13,0],  [6,6,6,17,6],      [0,0,3,1], [1,1,65,1,75,1], "ancestral"),
  item("bandos_tassets",        "Bandos tassets",        "legs", [0,0,0,-4,0],  [36,38,35,-7,41],  [2,0,0,0], [1,1,65,1,1,1], "bandos"),
  item("armadyl_chainskirt",    "Armadyl chainskirt",    "legs", [0,0,0,0,20],  [18,24,22,18,28],  [0,0,0,1], [1,1,70,70,1,1], "armadyl"),
  item("ahrims_robeskirt",      "Ahrim's robeskirt",     "legs", [0,0,0,13,0],  [10,12,12,20,11],  [0,0,0,0], [70,1,70,1,70,1], "ahrims"),
  item("dharoks_platelegs",     "Dharok's platelegs",    "legs", [0,0,0,-4,0],  [53,55,51,-10,53], [0,0,0,0], [70,1,70,1,1,1], "dharoks"),
  item("guthans_chainskirt",    "Guthan's chainskirt",   "legs", [0,0,0,-4,0],  [50,52,48,-10,48], [0,0,0,0], [70,1,70,1,1,1], "guthans"),
  item("karils_leatherskirt",   "Karil's leatherskirt",  "legs", [0,0,0,0,17],  [18,24,22,18,28],  [0,0,0,0], [70,1,70,70,1,1], "karils"),
  item("torags_platelegs",      "Torag's platelegs",     "legs", [0,0,0,-4,0],  [56,58,54,-11,56], [0,0,0,0], [70,1,70,1,1,1], "torags"),
  item("veracs_plateskirt",     "Verac's plateskirt",    "legs", [0,0,0,-4,0],  [51,53,49,-10,50], [0,0,0,0], [70,1,70,1,1,1], "veracs"),
  item("black_dhide_chaps",     "Black d'hide chaps",    "legs", [0,0,0,0,11],  [15,19,17,15,22],  [0,0,0,0], [1,1,40,70,1,1], "black_dhide"),
  item("blue_dhide_chaps",      "Blue d'hide chaps",     "legs", [0,0,0,0,11],  [12,15,14,12,18],  [0,0,0,0], [1,1,40,50,1,1], "blue_dhide"),
  item("red_dhide_chaps",       "Red d'hide chaps",      "legs", [0,0,0,0,11],  [14,17,16,13,20],  [0,0,0,0], [1,1,40,60,1,1], "red_dhide"),
  item("mystic_robe_bottom",    "Mystic robe bottom",    "legs", [0,0,0,14,0],  [14,14,14,18,12],  [0,0,0,0], [1,1,20,1,40,1]),

  // ══════════════════════════ HANDS ══════════════════════════
  item("ferocious_gloves",     "Ferocious gloves",      "hands", [16,14,14,0,0], [6,7,6,-4,6],    [14,0,0,0], [80,80,1,1,1,1]),
  item("barrows_gloves",       "Barrows gloves",        "hands", [12,12,12,6,12],[12,12,12,6,12], [12,0,0,0], [1,1,1,1,1,1]),
  item("blessed_bracers",      "Blessed bracers",       "hands", [0,0,0,0,7],   [5,5,5,6,6],     [0,0,0,1],  [1,1,1,70,1,1]),
  item("dragon_gloves",        "Dragon gloves",         "hands", [9,9,9,0,9],   [9,9,9,0,9],     [9,0,0,0],  [1,1,1,1,1,1]),
  item("rune_gloves",          "Rune gloves",           "hands", [8,8,8,0,8],   [8,8,8,0,8],     [8,0,0,0],  [1,1,1,1,1,1]),
  item("black_dhide_vambraces","Black d'hide vambraces","hands", [0,0,0,0,6],   [0,4,3,4,5],     [0,0,0,0],  [1,1,1,40,1,1]),
  item("regen_bracelet",       "Regen bracelet",        "hands", [0,0,0,0,0],   [0,0,0,0,0],     [0,0,0,0],  r1),
  item("mystic_gloves",        "Mystic gloves",         "hands", [0,0,0,7,0],   [6,6,6,8,5],     [0,0,0,0],  [1,1,1,1,20,1]),

  // ══════════════════════════ FEET ══════════════════════════
  item("primordial_boots",    "Primordial boots",      "feet", [0,0,0,-4,0],  [5,4,6,-4,6],  [4,0,0,0], [1,1,75,1,1,1]),
  item("blessed_dhide_boots", "Blessed d'hide boots",  "feet", [0,0,0,0,3],   [1,3,2,2,5],   [0,0,0,1], [1,1,1,70,1,1]),
  item("eternal_boots",       "Eternal boots",         "feet", [0,0,0,6,-4],  [2,2,2,7,2],   [0,0,0,0], [1,1,1,1,75,1]),
  item("dragon_boots",        "Dragon boots",          "feet", [0,0,0,-4,0],  [4,3,5,-4,5],  [4,0,0,0], [1,1,60,1,1,1]),
  item("ranger_boots",        "Ranger boots",          "feet", [0,0,0,0,4],   [0,2,2,2,4],   [0,0,0,0], [1,1,1,40,1,1]),
  item("climbing_boots",      "Climbing boots",        "feet", [0,0,0,-3,0],  [2,1,2,-3,2],  [2,0,0,0], r1),
  item("snakeskin_boots",     "Snakeskin boots",       "feet", [0,0,0,0,3],   [0,2,2,2,3],   [0,0,0,0], [1,1,1,30,1,1]),
  item("mystic_boots",        "Mystic boots",          "feet", [0,0,0,5,0],   [5,5,5,7,4],   [0,0,0,0], [1,1,1,1,20,1]),

  // ══════════════════════════ RING ══════════════════════════
  item("ultor_ring",          "Ultor ring",            "ring", [0,8,8,0,0],   [0,0,0,0,0],   [12,0,0,0], r1),
  item("archers_ring_i",      "Archers ring (i)",      "ring", [0,0,0,0,8],   [0,0,0,0,8],   [0,0,0,0],  r1),
  item("berserker_ring_i",    "Berserker ring (i)",    "ring", [0,8,0,0,0],   [0,8,0,0,0],   [8,0,0,0],  r1),
  item("seers_ring_i",        "Seers ring (i)",        "ring", [0,0,0,12,0],  [0,0,0,12,0],  [0,0,0,0],  r1),
  item("lightbearer",         "Lightbearer",           "ring", [0,0,0,0,0],   [0,0,0,0,0],   [0,0,0,0],  r1),
  item("ring_of_suffering_i", "Ring of suffering (i)", "ring", [0,0,0,0,0],   [20,20,20,20,20], [0,0,0,4], r1),
  item("explorers_ring",      "Explorer's ring",       "ring", [0,0,0,0,0],   [0,0,0,0,0],   [0,0,0,1],  r1),
  item("warriors_ring_i",     "Warrior ring (i)",      "ring", [8,0,0,0,0],   [8,0,0,0,0],   [0,0,0,0],  r1),
];

/** Fast lookup by item ID */
export const STATIC_GEAR_MAP = new Map<string, GearItem>(
  STATIC_GEAR_ITEMS.map((i) => [i.id, i])
);

/** Fast lookup by item name (lowercase) */
export const STATIC_GEAR_BY_NAME = new Map<string, GearItem>(
  STATIC_GEAR_ITEMS.map((i) => [i.name.toLowerCase(), i])
);
