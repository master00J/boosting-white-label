/**
 * OSRS quest and skill requirements for AI context (helpdesk, order-from-description).
 * Source: OSRS Wiki. Update when game requirements change.
 */

export interface QuestRequirement {
  questSlug: string;
  questName: string;
  requiredQuestSlugs: string[];
  requiredSkills: { skillId: string; skillName: string; minLevel: number }[];
  questPoints?: number;
  notes?: string;
}

export interface BuildGoal {
  id: string;
  name: string;
  questSlug?: string;
  /** Suggested order: early QP quests → skill grinds → main goal */
  suggestedOrder: string[];
  notes?: string;
}

/** Skill IDs matching common OSRS naming (align with your game_skills if used) */
export const OSRS_SKILL_IDS = [
  "attack", "hitpoints", "mining", "strength", "agility", "smithing", "defence", "herblore",
  "fishing", "ranged", "thieving", "cooking", "prayer", "crafting", "firemaking", "magic",
  "fletching", "woodcutting", "runecraft", "slayer", "farming", "construction", "hunter",
] as const;

const SKILL_NAMES: Record<string, string> = {
  attack: "Attack", strength: "Strength", defence: "Defence", hitpoints: "Hitpoints",
  ranged: "Ranged", prayer: "Prayer", magic: "Magic", cooking: "Cooking", woodcutting: "Woodcutting",
  fletching: "Fletching", fishing: "Fishing", firemaking: "Firemaking", crafting: "Crafting",
  smithing: "Smithing", mining: "Mining", herblore: "Herblore", agility: "Agility", thieving: "Thieving",
  slayer: "Slayer", farming: "Farming", runecraft: "Runecraft", hunter: "Hunter", construction: "Construction",
};

/** Key quest requirements (subset; extend as needed) */
export const OSRS_QUEST_REQUIREMENTS: QuestRequirement[] = [
  {
    questSlug: "dragon_slayer_2",
    questName: "Dragon Slayer II",
    requiredQuestSlugs: [
      "dragon_slayer_1", "the_corsair_curse", "bone_voyage", "animal_magnetism",
      "a_tail_of_two_cats", "heroes_quest", "family_crest", "legends_quest",
    ],
    requiredSkills: [
      { skillId: "magic", skillName: "Magic", minLevel: 75 },
      { skillId: "smithing", skillName: "Smithing", minLevel: 70 },
      { skillId: "mining", skillName: "Mining", minLevel: 68 },
      { skillId: "crafting", skillName: "Crafting", minLevel: 62 },
      { skillId: "agility", skillName: "Agility", minLevel: 60 },
      { skillId: "thieving", skillName: "Thieving", minLevel: 60 },
      { skillId: "herblore", skillName: "Herblore", minLevel: 60 },
      { skillId: "construction", skillName: "Construction", minLevel: 50 },
      { skillId: "prayer", skillName: "Prayer", minLevel: 43 },
      { skillId: "defence", skillName: "Defence", minLevel: 60 },
      { skillId: "strength", skillName: "Strength", minLevel: 60 },
      { skillId: "attack", skillName: "Attack", minLevel: 60 },
    ],
    questPoints: 200,
    notes: "Grandmaster quest. Unlocks Myths' Guild and Vorkath.",
  },
  {
    questSlug: "song_of_the_elves",
    questName: "Song of the Elves",
    requiredQuestSlugs: [
      "making_history", "regicide", "underground_pass", "biohazard", "plague_city",
      "waterfall_quest", "mournings_end_part_ii", "mournings_end_part_i", "big_chompy_bird_hunting",
      "sheep_herder", "sheep_shearer", "the_fremennik_trials", "lost_city", "the_eyes_of_glouphrie",
      "cathedral", "eagle_eyrie", "tower_of_life", "murder_mystery", "nature_spirit",
      "the_restless_ghost", "priest_in_peril", "runescape_mysteries", "the_fremennik_isles",
    ],
    requiredSkills: [
      { skillId: "agility", skillName: "Agility", minLevel: 75 },
      { skillId: "construction", skillName: "Construction", minLevel: 70 },
      { skillId: "mining", skillName: "Mining", minLevel: 70 },
      { skillId: "hunter", skillName: "Hunter", minLevel: 70 },
      { skillId: "woodcutting", skillName: "Woodcutting", minLevel: 70 },
      { skillId: "crafting", skillName: "Crafting", minLevel: 70 },
      { skillId: "farming", skillName: "Farming", minLevel: 70 },
      { skillId: "herblore", skillName: "Herblore", minLevel: 70 },
      { skillId: "magic", skillName: "Magic", minLevel: 70 },
      { skillId: "attack", skillName: "Attack", minLevel: 70 },
      { skillId: "hitpoints", skillName: "Hitpoints", minLevel: 70 },
      { skillId: "defence", skillName: "Defence", minLevel: 70 },
      { skillId: "strength", skillName: "Strength", minLevel: 70 },
      { skillId: "ranged", skillName: "Ranged", minLevel: 70 },
      { skillId: "thieving", skillName: "Thieving", minLevel: 70 },
      { skillId: "slayer", skillName: "Slayer", minLevel: 70 },
      { skillId: "cooking", skillName: "Cooking", minLevel: 70 },
      { skillId: "smithing", skillName: "Smithing", minLevel: 70 },
      { skillId: "fletching", skillName: "Fletching", minLevel: 70 },
      { skillId: "runecraft", skillName: "Runecraft", minLevel: 70 },
      { skillId: "fishing", skillName: "Fishing", minLevel: 70 },
      { skillId: "firemaking", skillName: "Firemaking", minLevel: 70 },
      { skillId: "prayer", skillName: "Prayer", minLevel: 70 },
    ],
    questPoints: 0,
    notes: "Elf quest line. Unlocks Prifddinas. All skills 70+ (except Prayer 70).",
  },
  {
    questSlug: "fire_cape",
    questName: "Fire Cape (TzHaar)",
    requiredQuestSlugs: [],
    requiredSkills: [
      { skillId: "attack", skillName: "Attack", minLevel: 40 },
      { skillId: "strength", skillName: "Strength", minLevel: 40 },
      { skillId: "defence", skillName: "Defence", minLevel: 40 },
      { skillId: "ranged", skillName: "Ranged", minLevel: 40 },
      { skillId: "prayer", skillName: "Prayer", minLevel: 43 },
      { skillId: "hitpoints", skillName: "Hitpoints", minLevel: 40 },
    ],
    questPoints: 0,
    notes: "Fight Caves minigame. No quest required; combat stats recommended 70+ for safe completion.",
  },
  {
    questSlug: "infernal_cape",
    questName: "Infernal Cape",
    requiredQuestSlugs: [],
    requiredSkills: [
      { skillId: "attack", skillName: "Attack", minLevel: 75 },
      { skillId: "strength", skillName: "Strength", minLevel: 99 },
      { skillId: "defence", skillName: "Defence", minLevel: 75 },
      { skillId: "ranged", skillName: "Ranged", minLevel: 99 },
      { skillId: "prayer", skillName: "Prayer", minLevel: 77 },
      { skillId: "magic", skillName: "Magic", minLevel: 94 },
      { skillId: "hitpoints", skillName: "Hitpoints", minLevel: 99 },
    ],
    questPoints: 0,
    notes: "Inferno minigame. Very high combat and prayer recommended.",
  },
];

/** Build goals for "from scratch" or goal-based orders */
export const OSRS_BUILD_GOALS: BuildGoal[] = [
  {
    id: "ds2",
    name: "Dragon Slayer 2 from scratch",
    questSlug: "dragon_slayer_2",
    suggestedOrder: [
      "qp_quests",
      "skills_for_ds2",
      "prerequisite_quests",
      "dragon_slayer_2",
    ],
    notes: "Efficient: do high-QP quests first to reach 200 QP, train required skills (75 Magic, 70 Smithing, 68 Mining, 62 Crafting, 60 Agility/Thieving/Herblore, 50 Construction, 43 Prayer, 60 Atk/Str/Def), complete prerequisite quests, then DS2.",
  },
  {
    id: "quest_cape",
    name: "Quest cape",
    suggestedOrder: ["all_quests_by_release", "skill_grinds_as_needed"],
    notes: "Complete all quests. Efficient order follows quest release and prerequisite chains; train skills when required.",
  },
  {
    id: "fire_cape",
    name: "Fire cape",
    questSlug: "fire_cape",
    suggestedOrder: ["combat_70", "fire_cape"],
    notes: "No quests required. Recommend 70+ Ranged and 43+ Prayer (or 70+ melee for melee method).",
  },
  {
    id: "infernal_cape",
    name: "Infernal cape",
    questSlug: "infernal_cape",
    suggestedOrder: ["max_combat_prayer", "infernal_cape"],
    notes: "Inferno. Max/near-max combat and high Prayer (77+) recommended.",
  },
];

/** Returns a short text summary of OSRS knowledge for use in AI prompts (helpdesk, order-from-description). */
export function getOsrsKnowledgeForPrompt(): string {
  const lines: string[] = [
    "## OSRS knowledge (quest & build goals)",
    "",
    "Use this when customers ask about requirements for a goal (e.g. Dragon Slayer 2, Fire cape, Inferno, Quest cape).",
    "",
  ];

  for (const q of OSRS_QUEST_REQUIREMENTS) {
    lines.push(`### ${q.questName}`);
    if (q.questPoints) lines.push(`- Quest points: ${q.questPoints}`);
    lines.push("- Required skills: " + q.requiredSkills.map((s) => `${s.skillName} ${s.minLevel}`).join(", "));
    if (q.requiredQuestSlugs.length) {
      lines.push("- Required quests (examples): " + q.requiredQuestSlugs.slice(0, 6).join(", ") + (q.requiredQuestSlugs.length > 6 ? " (+ more)" : ""));
    }
    if (q.notes) lines.push(`- ${q.notes}`);
    lines.push("");
  }

  lines.push("### Efficient builds");
  for (const g of OSRS_BUILD_GOALS) {
    lines.push(`- **${g.name}**: ${g.notes ?? g.suggestedOrder.join(" → ")}`);
  }

  return lines.join("\n").trim();
}

export function getSkillName(skillId: string): string {
  return SKILL_NAMES[skillId] ?? skillId;
}
