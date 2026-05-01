try { require("dotenv").config(); } catch { /* not available in production — env vars set by host */ }

import { Client, GatewayIntentBits, Partials } from "discord.js";
import { logger } from "./lib/logger.js";
import { onReady } from "./events/ready.js";
import { onInteractionCreate } from "./events/interaction-create.js";
import { onMemberJoin } from "./events/member-join.js";
import { loadConfigFromDatabase, getConfig } from "./services/config.js";

async function main() {
  logger.info("Starting bot...");

  // Load credentials from database (fallback if env vars are not set)
  await loadConfigFromDatabase();

  const token = getConfig("discord_bot_token");
  if (!token) {
    logger.error("DISCORD_BOT_TOKEN is not configured (set it in /admin/discord or as an env var)");
    process.exit(1);
  }

  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMembers,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.DirectMessages,
    ],
    partials: [Partials.Channel, Partials.Message],
  });

  client.once("clientReady", () => onReady(client));
  client.on("interactionCreate", (interaction) => onInteractionCreate(client, interaction));
  client.on("guildMemberAdd", (member) => onMemberJoin(member));
  client.on("error", (err) => logger.error("Discord client error", err));

  process.on("unhandledRejection", (err) => logger.error("Unhandled rejection", err));
  process.on("uncaughtException", (err) => {
    logger.error("Uncaught exception", err);
    process.exit(1);
  });

  await client.login(token).catch((err) => {
    logger.error("Login failed — check your bot token in /admin/discord", err);
    process.exit(1);
  });
}

main();
