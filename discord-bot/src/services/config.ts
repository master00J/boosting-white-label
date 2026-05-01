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
  | "site_url"
  | "custom_domain";

const cache = new Map<string, string>();

/** Reload only shop URL keys (cheap) so Discord messages pick up admin changes without full bot restart. */
export async function refreshSiteOriginKeysFromDatabase(): Promise<void> {
  const keys = ["site_url", "custom_domain"] as const;
  const { data, error } = await supabase
    .from("site_settings")
    .select("key, value")
    .in("key", [...keys]);

  if (error) {
    logger.warn("Could not refresh site URL from database", error.message);
    return;
  }

  for (const row of data ?? []) {
    const v = row.value as unknown;
    if (v == null || v === "") continue;
    const str = typeof v === "string" ? v : typeof v === "number" ? String(v) : null;
    if (str) cache.set(row.key, str);
  }
}

export async function loadConfigFromDatabase(): Promise<void> {
  const keys: ConfigKeys[] = [
    "discord_bot_token",
    "discord_client_id",
    "discord_guild_id",
    "site_url",
    "custom_domain",
  ];

  const { data, error } = await supabase
    .from("site_settings")
    .select("key, value")
    .in("key", keys);

  if (error) {
    logger.warn("Could not load config from database", error.message);
    return;
  }

  for (const row of data ?? []) {
    const v = row.value as unknown;
    if (v == null || v === "") continue;
    const str = typeof v === "string" ? v : typeof v === "number" ? String(v) : null;
    if (str) cache.set(row.key, str);
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
    custom_domain: "CUSTOM_DOMAIN",
  };

  return process.env[envMap[key]] ?? cache.get(key);
}

/** Public shop origin (https://host) for links in Discord — env, then site_url, then custom_domain. */
export function getResolvedSiteOrigin(): string {
  const trim = (s: string) => s.trim().replace(/\/$/, "");
  const fromEnv =
    process.env.SITE_URL?.trim() ||
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    "";
  if (fromEnv) return trim(fromEnv);

  const siteUrl = getConfig("site_url")?.trim() ?? "";
  if (siteUrl) return trim(siteUrl);

  const custom = getConfig("custom_domain")?.trim() ?? "";
  if (custom) {
    const host = custom.replace(/^https?:\/\//i, "").split("/")[0]?.trim();
    if (host) return trim(`https://${host}`);
  }

  return "";
}
