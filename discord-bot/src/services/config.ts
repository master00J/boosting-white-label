/**
 * Config loader — reads bot credentials and settings from site_settings table.
 * Env vars always take priority over database values.
 */
import { supabase } from "./supabase.js";
import { logger } from "../lib/logger.js";

type ConfigKeys =
  | "discord_bot_token"
  | "discord_client_id"
  | "discord_guild_id"
  | "site_url";

const cache = new Map<string, string>();

export async function loadConfigFromDatabase(): Promise<void> {
  const keys: ConfigKeys[] = ["discord_bot_token", "discord_client_id", "discord_guild_id", "site_url"];

  const { data, error } = await supabase
    .from("site_settings")
    .select("key, value")
    .in("key", keys);

  if (error) {
    logger.warn("Could not load config from database", error.message);
    return;
  }

  for (const row of data ?? []) {
    if (row.value) {
      cache.set(row.key, row.value);
    }
  }

  logger.info(`Loaded ${data?.length ?? 0} config values from database`);
}

/**
 * Get a config value — env var takes priority, then database, then undefined.
 */
export function getConfig(key: ConfigKeys): string | undefined {
  const envMap: Record<ConfigKeys, string> = {
    discord_bot_token: "DISCORD_BOT_TOKEN",
    discord_client_id: "DISCORD_CLIENT_ID",
    discord_guild_id: "DISCORD_GUILD_ID",
    site_url: "SITE_URL",
  };

  return process.env[envMap[key]] ?? cache.get(key);
}
