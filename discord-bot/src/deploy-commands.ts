try { require("dotenv").config(); } catch { /* not available in production — env vars set by host */ }

import { REST, Routes } from "discord.js";
import { allCommands } from "./commands/index.js";
import { logger } from "./lib/logger.js";
import { loadConfigFromDatabase, getConfig } from "./services/config.js";

async function deploy() {
  // Only load from database if Supabase credentials are available
  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    await loadConfigFromDatabase();
  }

  const token = getConfig("discord_bot_token");
  const clientId = getConfig("discord_client_id");
  const guildId = getConfig("discord_guild_id");

  if (!token || !clientId) {
    logger.error("DISCORD_BOT_TOKEN and DISCORD_CLIENT_ID are required (set them in /admin/discord or as env vars)");
    process.exit(1);
  }

  const rest = new REST({ version: "10" }).setToken(token);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const commandData = allCommands.map((cmd) => (cmd.data as any).toJSON());

  logger.info(`Registering ${commandData.length} commands...`);

  try {
    if (guildId) {
      await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: commandData });
      logger.info(`Commands registered for guild ${guildId}`);
    } else {
      await rest.put(Routes.applicationCommands(clientId), { body: commandData });
      logger.info("Commands registered globally");
    }
  } catch (err) {
    logger.error("Error registering commands", err);
    process.exit(1);
  }
}

deploy();
