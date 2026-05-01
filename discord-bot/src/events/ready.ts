import { REST, Routes } from "discord.js";
import type { Client } from "discord.js";
import { logger } from "../lib/logger.js";
import { syncWorkerRoles } from "../services/role-sync.js";
import { startOrderSync } from "../services/order-sync.js";
import { startReviewSync } from "../services/review-sync.js";
import { startTierSync } from "../services/tier-sync.js";
import { allCommands } from "../commands/index.js";
import { getConfig } from "../services/config.js";

async function registerCommands(client: Client): Promise<void> {
  const token = getConfig("discord_bot_token");
  const clientId = client.user?.id;
  const guildId = getConfig("discord_guild_id");

  if (!token || !clientId) {
    logger.warn("Cannot register commands — missing token or client ID");
    return;
  }

  try {
    const rest = new REST({ version: "10" }).setToken(token);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const commandData = allCommands.map((cmd) => (cmd.data as any).toJSON());

    if (guildId) {
      await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: commandData });
      logger.info(`${commandData.length} slash commands registered for guild ${guildId}`);
    } else {
      await rest.put(Routes.applicationCommands(clientId), { body: commandData });
      logger.info(`${commandData.length} slash commands registered globally`);
    }
  } catch (err) {
    logger.error("Failed to register slash commands", err);
  }
}

export async function onReady(client: Client): Promise<void> {
  logger.info(`Bot logged in as ${client.user?.tag}`);
  logger.info(`Connected to ${client.guilds.cache.size} server(s)`);

  await registerCommands(client);

  startOrderSync(client);
  startReviewSync(client);
  startTierSync(client);
  await syncWorkerRoles(client);

  logger.info("Bot fully started ✅");
}
