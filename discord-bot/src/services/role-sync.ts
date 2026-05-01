import type { Client, Guild } from "discord.js";
import { supabase } from "./supabase.js";
import { logger } from "../lib/logger.js";

export async function syncWorkerRoles(client: Client): Promise<void> {
  const { getConfig } = await import("./config.js");
  const guildId = getConfig("discord_guild_id");
  if (!guildId) {
    logger.warn("DISCORD_GUILD_ID not configured — role sync skipped");
    return;
  }

  const guild = await client.guilds.fetch(guildId).catch(() => null);
  if (!guild) {
    logger.warn(`Guild ${guildId} not found`);
    return;
  }

  logger.info("Worker role sync started...");

  // Fetch all tier discord_role_ids so we can clean up stale ones
  const { data: allTiers } = await supabase
    .from("worker_tiers")
    .select("id, discord_role_id");
  const allTierRoleIds = new Set(
    (allTiers ?? []).map((t) => t.discord_role_id).filter(Boolean) as string[]
  );

  const { data: workers } = await supabase
    .from("workers")
    .select("profile_id, tier_id, is_active, tier:worker_tiers(discord_role_id)");

  if (!workers) return;

  for (const worker of workers) {
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("discord_id")
        .eq("id", worker.profile_id)
        .single();

      if (!profile?.discord_id) continue;

      const member = await guild.members.fetch(profile.discord_id).catch(() => null);
      if (!member) continue;

      const tierData = (Array.isArray(worker.tier) ? worker.tier[0] : worker.tier) as { discord_role_id: string | null } | null;
      const correctRoleId = tierData?.discord_role_id ?? null;

      // Remove any stale tier roles (roles that belong to OTHER tiers)
      for (const roleId of allTierRoleIds) {
        if (roleId === correctRoleId) continue;
        if (member.roles.cache.has(roleId)) {
          await member.roles.remove(roleId).catch(() => {});
          logger.debug(`Removed stale tier role ${roleId} from ${profile.discord_id}`);
        }
      }

      // Add the correct tier role if not already present (skip inactive workers)
      if (correctRoleId && worker.is_active) {
        if (!member.roles.cache.has(correctRoleId)) {
          await member.roles.add(correctRoleId);
          logger.debug(`Added role ${correctRoleId} to ${profile.discord_id}`);
        }
      }
    } catch (err) {
      logger.error(`Error during role sync for worker ${worker.profile_id}`, err);
    }
  }

  logger.info(`Role sync completed for ${workers.length} workers`);
}

export async function assignRoleToMember(
  guild: Guild,
  discordId: string,
  roleId: string,
): Promise<void> {
  try {
    const member = await guild.members.fetch(discordId).catch(() => null);
    if (!member) return;
    if (!member.roles.cache.has(roleId)) {
      await member.roles.add(roleId);
    }
  } catch (err) {
    logger.error(`Error assigning role ${roleId} to ${discordId}`, err);
  }
}
