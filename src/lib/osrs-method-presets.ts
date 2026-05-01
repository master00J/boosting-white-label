/**
 * OSRS training method presets per skill.
 * Used to quickly populate methods in the service form builder.
 */

export interface MethodPreset {
  id: string;
  name: string;
  description: string;
  multiplier: number;
}

export const OSRS_METHOD_PRESETS: Record<string, MethodPreset[]> = {
  attack: [
    { id: "attack_controlled", name: "Controlled", description: "Shared XP across Attack, Strength, Defence", multiplier: 1.0 },
    { id: "attack_accurate", name: "Accurate", description: "XP focused on Attack", multiplier: 1.0 },
    { id: "attack_nmz", name: "Nightmare Zone (AFK)", description: "AFK training at NMZ with absorption potions", multiplier: 0.9 },
    { id: "attack_slayer", name: "Slayer tasks", description: "Training via Slayer assignments", multiplier: 1.2 },
  ],
  strength: [
    { id: "strength_aggressive", name: "Aggressive", description: "XP focused on Strength", multiplier: 1.0 },
    { id: "strength_nmz", name: "Nightmare Zone (AFK)", description: "AFK training at NMZ with absorption potions", multiplier: 0.9 },
    { id: "strength_crabs", name: "Sand/Ammonite Crabs", description: "AFK training at crabs", multiplier: 0.85 },
    { id: "strength_slayer", name: "Slayer tasks", description: "Training via Slayer assignments", multiplier: 1.2 },
    { id: "strength_chinchompas", name: "Chinchompas", description: "Chinchompa method for fast XP", multiplier: 1.5 },
  ],
  defence: [
    { id: "defence_defensive", name: "Defensive", description: "XP focused on Defence", multiplier: 1.0 },
    { id: "defence_nmz", name: "Nightmare Zone (AFK)", description: "AFK training at NMZ", multiplier: 0.9 },
    { id: "defence_crabs", name: "Sand/Ammonite Crabs", description: "AFK training at crabs", multiplier: 0.85 },
  ],
  ranged: [
    { id: "ranged_chinchompas", name: "Chinchompas (MM2)", description: "Maniacal monkeys with chinchompas — fastest ranged XP", multiplier: 1.6 },
    { id: "ranged_crabs", name: "Sand/Ammonite Crabs", description: "AFK ranging at crabs", multiplier: 0.85 },
    { id: "ranged_nmz", name: "Nightmare Zone", description: "AFK ranging at NMZ", multiplier: 0.9 },
    { id: "ranged_slayer", name: "Slayer tasks", description: "Ranging via Slayer assignments", multiplier: 1.2 },
    { id: "ranged_cannon", name: "Dwarf Cannon", description: "Using cannon for fast XP — expensive", multiplier: 1.8 },
  ],
  magic: [
    { id: "magic_alching", name: "High Alchemy", description: "Alching items for magic XP", multiplier: 1.0 },
    { id: "magic_splashing", name: "Splashing (AFK)", description: "AFK splashing spells", multiplier: 0.7 },
    { id: "magic_bursting", name: "Bursting (MM2)", description: "Burst spells on maniacal monkeys — fast XP", multiplier: 1.5 },
    { id: "magic_barraging", name: "Barraging (MM2)", description: "Barrage spells on maniacal monkeys — fastest XP", multiplier: 1.8 },
    { id: "magic_slayer", name: "Slayer tasks", description: "Magic via Slayer assignments", multiplier: 1.2 },
  ],
  prayer: [
    { id: "prayer_bones_altar", name: "Bones at Gilded Altar", description: "Offering bones at player-owned house altar — fastest XP", multiplier: 1.3 },
    { id: "prayer_ectofuntus", name: "Ectofuntus", description: "Offering bones at Ectofuntus", multiplier: 1.1 },
    { id: "prayer_chaos_altar", name: "Chaos Altar (Wildy)", description: "Offering bones at Chaos Altar — risky but cheap", multiplier: 1.0 },
    { id: "prayer_ensouled_heads", name: "Ensouled Heads", description: "Reanimating ensouled heads", multiplier: 0.9 },
  ],
  hitpoints: [
    { id: "hitpoints_crabs", name: "Sand/Ammonite Crabs", description: "AFK training at crabs", multiplier: 0.85 },
    { id: "hitpoints_nmz", name: "Nightmare Zone (AFK)", description: "AFK training at NMZ", multiplier: 0.9 },
  ],
  slayer: [
    { id: "slayer_cannon", name: "With Cannon", description: "Using dwarf cannon on tasks — faster but expensive", multiplier: 1.5 },
    { id: "slayer_no_cannon", name: "No Cannon", description: "Standard slayer without cannon", multiplier: 1.0 },
    { id: "slayer_block_skip", name: "Block/Skip optimised", description: "Optimised task list with blocks and skips", multiplier: 1.2 },
  ],
  mining: [
    { id: "mining_3tick", name: "3-Tick Mining", description: "Tick manipulation for maximum XP/hr", multiplier: 1.4 },
    { id: "mining_afk", name: "AFK Mining", description: "AFK methods like Motherlode Mine", multiplier: 0.85 },
    { id: "mining_iron", name: "Iron Ore (Power)", description: "Power mining iron ore — fast XP", multiplier: 1.2 },
    { id: "mining_blast_furnace", name: "Blast Furnace", description: "Mining via Blast Furnace route", multiplier: 1.1 },
  ],
  smithing: [
    { id: "smithing_blast_furnace", name: "Blast Furnace", description: "Smelting bars at Blast Furnace — fastest XP", multiplier: 1.3 },
    { id: "smithing_platebodies", name: "Platebodies", description: "Smithing platebodies at anvil", multiplier: 1.0 },
    { id: "smithing_dart_tips", name: "Dart Tips", description: "Smithing dart tips — good XP/GP", multiplier: 1.1 },
  ],
  fishing: [
    { id: "fishing_powerfishing", name: "Powerfishing", description: "Drop fish immediately — fastest XP", multiplier: 1.0 },
    { id: "fishing_banking", name: "Banking", description: "Bank fish for profit — slower XP", multiplier: 1.3 },
    { id: "fishing_3tick", name: "3-Tick Fishing", description: "Tick manipulation for maximum XP/hr", multiplier: 1.5 },
    { id: "fishing_barbarian", name: "Barbarian Fishing", description: "Barbarian fishing at Otto's Grotto", multiplier: 1.2 },
    { id: "fishing_infernal_harpoon", name: "Infernal Harpoon", description: "Using infernal harpoon (auto-cooks fish)", multiplier: 1.1 },
  ],
  cooking: [
    { id: "cooking_range", name: "Range", description: "Cooking on a range — lower burn rate", multiplier: 1.0 },
    { id: "cooking_fire", name: "Bonfire/Fire", description: "Cooking on fires", multiplier: 0.95 },
    { id: "cooking_wines", name: "Jugs of Wine", description: "Making wine — fast XP, no burn", multiplier: 1.2 },
    { id: "cooking_karambwans", name: "Karambwans (1-tick)", description: "1-tick cooking karambwans — fastest XP", multiplier: 1.4 },
  ],
  firemaking: [
    { id: "firemaking_wintertodt", name: "Wintertodt", description: "Skilling boss — great rewards", multiplier: 1.1 },
    { id: "firemaking_logs", name: "Burning Logs", description: "Standard log burning", multiplier: 1.0 },
    { id: "firemaking_sorceress_garden", name: "Sorceress's Garden", description: "Collecting herbs/sq'irks", multiplier: 0.9 },
  ],
  woodcutting: [
    { id: "woodcutting_powerchopping", name: "Powerchopping", description: "Drop logs immediately — fastest XP", multiplier: 1.0 },
    { id: "woodcutting_banking", name: "Banking logs", description: "Bank logs for profit — slower XP", multiplier: 1.2 },
    { id: "woodcutting_2tick", name: "2-Tick Teaks", description: "Tick manipulation at teak trees — fastest XP", multiplier: 1.5 },
  ],
  fletching: [
    { id: "fletching_darts", name: "Darts", description: "Fletching darts — fast XP", multiplier: 1.0 },
    { id: "fletching_bows", name: "Bows (u)", description: "Stringing bows — slower but profitable", multiplier: 1.1 },
    { id: "fletching_bolts", name: "Bolt tips", description: "Fletching bolt tips", multiplier: 0.95 },
  ],
  crafting: [
    { id: "crafting_battlestaves", name: "Battlestaves", description: "Crafting battlestaves — fast XP", multiplier: 1.2 },
    { id: "crafting_dhide", name: "D'hide Bodies", description: "Crafting dragonhide bodies", multiplier: 1.1 },
    { id: "crafting_glassblowing", name: "Glassblowing", description: "Blowing molten glass", multiplier: 1.0 },
    { id: "crafting_gems", name: "Cutting Gems", description: "Cutting uncut gems", multiplier: 0.9 },
  ],
  herblore: [
    { id: "herblore_potions", name: "Standard Potions", description: "Making combat potions", multiplier: 1.0 },
    { id: "herblore_overloads", name: "Overloads (CoX)", description: "Making overloads for Chambers of Xeric", multiplier: 1.3 },
  ],
  agility: [
    { id: "agility_rooftop", name: "Rooftop Courses", description: "Rooftop agility courses — marks of grace", multiplier: 1.0 },
    { id: "agility_gnome", name: "Gnome Stronghold", description: "Gnome Stronghold course (low level)", multiplier: 0.9 },
    { id: "agility_werewolf", name: "Werewolf Course", description: "Werewolf agility course", multiplier: 1.0 },
    { id: "agility_hallowed_sepulchre", name: "Hallowed Sepulchre", description: "Hallowed Sepulchre — best XP + rewards", multiplier: 1.3 },
  ],
  thieving: [
    { id: "thieving_blackjacking", name: "Blackjacking", description: "Blackjacking Bandits — fastest XP", multiplier: 1.4 },
    { id: "thieving_pickpocketing", name: "Pickpocketing", description: "Pickpocketing NPCs", multiplier: 1.0 },
    { id: "thieving_pyramid_plunder", name: "Pyramid Plunder", description: "Pyramid Plunder minigame", multiplier: 1.2 },
  ],
  farming: [
    { id: "farming_trees", name: "Tree Runs", description: "Standard tree runs", multiplier: 1.0 },
    { id: "farming_fruit_trees", name: "Fruit Tree Runs", description: "Fruit tree runs alongside tree runs", multiplier: 1.1 },
    { id: "farming_contracts", name: "Farming Contracts", description: "Hosidius farming contracts", multiplier: 1.2 },
  ],
  runecraft: [
    { id: "runecraft_lavas", name: "Lava Runes", description: "Crafting lava runes — fastest XP", multiplier: 1.5 },
    { id: "runecraft_abyss", name: "Abyss", description: "Running through the Abyss", multiplier: 1.2 },
    { id: "runecraft_zeah", name: "Zeah (Blood/Soul)", description: "Crafting blood/soul runes at Zeah", multiplier: 1.0 },
    { id: "runecraft_ourania", name: "Ourania Altar", description: "Crafting mixed runes at Ourania", multiplier: 0.9 },
  ],
  construction: [
    { id: "construction_mahogany_homes", name: "Mahogany Homes", description: "Mahogany Homes minigame — efficient XP", multiplier: 1.0 },
    { id: "construction_mahogany_tables", name: "Mahogany Tables", description: "Building mahogany tables — fastest XP", multiplier: 1.3 },
    { id: "construction_larder", name: "Oak Larder", description: "Building oak larders — mid-level fast XP", multiplier: 1.1 },
  ],
  hunter: [
    { id: "hunter_birdhouses", name: "Birdhouses", description: "Passive XP via birdhouse runs", multiplier: 0.8 },
    { id: "hunter_chinchompas", name: "Chinchompas", description: "Catching chinchompas — profitable", multiplier: 1.0 },
    { id: "hunter_maniacal_monkeys", name: "Maniacal Monkeys", description: "Catching maniacal monkeys — fastest XP", multiplier: 1.3 },
  ],
};

/**
 * Returns method presets for a given skill slug.
 * Falls back to an empty array if the skill has no presets.
 */
export function getMethodPresets(skillId: string): MethodPreset[] {
  return OSRS_METHOD_PRESETS[skillId] ?? [];
}
