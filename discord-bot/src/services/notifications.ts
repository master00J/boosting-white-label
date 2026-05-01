import type { Client, TextChannel } from "discord.js";
import type { EmbedBuilder } from "discord.js";
import { logger } from "../lib/logger.js";
import { supabase } from "./supabase.js";

export type ChannelKey =
  | "new_orders"
  | "completed_orders"
  | "worker_notifications"
  | "admin_alerts"
  | "reviews"
  | "tickets_category";

const CHANNEL_SETTING_KEYS: Record<ChannelKey, string> = {
  new_orders: "discord_channel_new_orders",
  completed_orders: "discord_channel_completed_orders",
  worker_notifications: "discord_channel_worker_notifications",
  admin_alerts: "discord_channel_admin_alerts",
  reviews: "discord_channel_reviews",
  tickets_category: "discord_category_tickets",
};

async function getChannelId(key: ChannelKey): Promise<string | null> {
  const envMap: Record<ChannelKey, string> = {
    new_orders: "DISCORD_CHANNEL_NEW_ORDERS",
    completed_orders: "DISCORD_CHANNEL_COMPLETED_ORDERS",
    worker_notifications: "DISCORD_CHANNEL_WORKER_NOTIFICATIONS",
    admin_alerts: "DISCORD_CHANNEL_ADMIN_ALERTS",
    reviews: "DISCORD_CHANNEL_REVIEWS",
    tickets_category: "DISCORD_CATEGORY_TICKETS",
  };
  const envVal = process.env[envMap[key]];
  if (envVal) return envVal;

  // Fall back to site_settings table (value is JSONB, may be string or number)
  const { data, error } = await supabase
    .from("site_settings")
    .select("value")
    .eq("key", CHANNEL_SETTING_KEYS[key])
    .single();

  if (error || data?.value == null) return null;
  const raw = data.value;
  const channelId = typeof raw === "string" ? raw.trim() : String(raw).trim();
  return channelId || null;
}

export async function sendToChannel(
  client: Client,
  channelKey: ChannelKey,
  embed: EmbedBuilder,
  content?: string,
): Promise<void> {
  try {
    const channelId = await getChannelId(channelKey);
    if (!channelId) {
      logger.warn(`No channel configured for "${channelKey}". Set it in Admin → Discord or env DISCORD_CHANNEL_NEW_ORDERS.`);
      return;
    }

    const idPreview = channelId.length > 8 ? `${channelId.slice(0, 4)}...${channelId.slice(-4)}` : "***";
    logger.info(`Posting to "${channelKey}" (channel id: ${idPreview}).`);
    const channel = await client.channels.fetch(channelId).catch((e) => {
      logger.warn(`Failed to fetch channel ${channelId} for "${channelKey}": ${String(e?.message ?? e)}`);
      return null;
    });
    if (!channel || !channel.isTextBased()) {
      logger.warn(`Channel ${channelId} for "${channelKey}" not found or not a text channel.`);
      return;
    }

    await (channel as TextChannel).send({ content, embeds: [embed] });
    logger.info(`Message sent to ${channelKey}`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error(`Error sending to channel ${channelKey}: ${msg}`, err);
  }
}

export async function sendDmToUser(
  client: Client,
  discordId: string,
  embed: EmbedBuilder,
  content?: string,
): Promise<void> {
  try {
    const user = await client.users.fetch(discordId).catch(() => null);
    if (!user) return;
    await user.send({ content, embeds: [embed] }).catch(() => {
      logger.debug(`Kan geen DM sturen naar ${discordId} (DMs uitgeschakeld?)`);
    });
  } catch (err) {
    logger.error(`Fout bij sturen DM naar ${discordId}`, err);
  }
}
