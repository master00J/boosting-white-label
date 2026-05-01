import type { ChatInputCommandInteraction } from "discord.js";
import { Collection } from "discord.js";
import { claimCommand } from "./claim.js";
import { unclaimCommand } from "./unclaim.js";
import { progressCommand } from "./progress.js";
import { completeCommand } from "./complete.js";
import { statusCommand } from "./status.js";
import { statsCommand } from "./stats.js";
import { leaderboardCommand } from "./leaderboard.js";
import { lookupCommand } from "./lookup.js";
import { assignCommand } from "./assign.js";
import { payoutCommand } from "./payout.js";
import { syncRolesCommand } from "./syncroles.js";

export type BotCommand = {
  // Use a loose type to avoid SlashCommandOptionsOnlyBuilder vs SlashCommandBuilder mismatch
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: { name: string; toJSON: () => any };
  execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
};

export const commands = new Collection<string, BotCommand>();

const allCommands: BotCommand[] = [
  claimCommand,
  unclaimCommand,
  progressCommand,
  completeCommand,
  statusCommand,
  statsCommand,
  leaderboardCommand,
  lookupCommand,
  assignCommand,
  payoutCommand,
  syncRolesCommand,
];

for (const cmd of allCommands) {
  commands.set(cmd.data.name, cmd);
}

export { allCommands };
