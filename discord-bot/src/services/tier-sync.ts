import type { Client } from "discord.js";
import { supabase } from "./supabase.js";
import { getConfig } from "./config.js";
import { logger } from "../lib/logger.js";

type TierRow = {
  id: string;
  name: string;
  color: string | null;
  discord_role_id: string | null;
};

/**
 * Listens for new tiers created on the website via Supabase realtime.
 * When a tier without a discord_role_id is inserted, a matching Discord role is created automatically.
 */
export function startTierSync(client: Client): void {
  let failures = 0;
  const subscribe = (attempt = 0) => {
    supabase
      .channel(`tier-changes-${Date.now()}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "worker_tiers" },
        async (payload) => {
          const tier = payload.new as TierRow;
          if (tier.discord_role_id) {
            logger.debug(`Tier "${tier.name}" already has discord_role_id, skipping`);
            return;
          }
          logger.info(`New tier detected: "${tier.name}" — creating Discord role...`);
          await createDiscordRoleForTier(client, tier);
        },
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          failures = 0;
          logger.info("Tier sync realtime connected ✅");
        } else if (status === "TIMED_OUT" || status === "CHANNEL_ERROR" || status === "CLOSED") {
          failures++;
          if (failures >= 5) {
            logger.warn("Tier sync realtime failed 5x — giving up");
            return;
          }
          const delay = Math.min(10_000 * Math.pow(2, attempt), 300_000);
          setTimeout(() => subscribe(attempt + 1), delay);
        }
      });
  };
  subscribe();

  logger.info("Tier sync started — listening for new tiers on the website");
}

async function createDiscordRoleForTier(
  client: Client,
  tier: TierRow,
): Promise<void> {
  const guildId = getConfig("discord_guild_id");
  if (!guildId) {
    logger.warn("DISCORD_GUILD_ID not configured — cannot create Discord role for tier");
    return;
  }

  const guild = await client.guilds.fetch(guildId).catch(() => null);
  if (!guild) {
    logger.warn(`Guild ${guildId} not found`);
    return;
  }

  try {
    const colorNum =
      tier.color && tier.color !== "#000000"
        ? parseInt(tier.color.replace("#", ""), 16)
        : 0x6366f1;

    const role = await guild.roles.create({
      name: tier.name,
      color: colorNum,
      hoist: false,
      mentionable: false,
      reason: `Auto-created for website tier: ${tier.name}`,
    });

    await supabase
      .from("worker_tiers")
      .update({ discord_role_id: role.id })
      .eq("id", tier.id);

    logger.info(`Discord role "${tier.name}" created (${role.id}) for tier ${tier.id}`);
  } catch (err) {
    logger.error(`Failed to create Discord role for tier "${tier.name}"`, err);
  }
}

/**
 * Imports existing Discord roles as worker tiers on the website.
 * Only roles not yet linked to any tier are imported.
 * Returns the number of tiers created.
 */
export async function importDiscordRolesAsTiers(client: Client): Promise<{ created: number; skipped: number; errors: number }> {
  const guildId = getConfig("discord_guild_id");
  if (!guildId) throw new Error("DISCORD_GUILD_ID not configured");

  const guild = await client.guilds.fetch(guildId).catch(() => null);
  if (!guild) throw new Error(`Guild ${guildId} not found`);

  // Fetch all non-managed, non-everyone roles
  const allRoles = guild.roles.cache
    .filter((r) => !r.managed && r.id !== guild.roles.everyone.id)
    .sort((a, b) => b.position - a.position);

  // Get already-linked role IDs from the database
  const { data: existingTiers } = await supabase
    .from("worker_tiers")
    .select("discord_role_id");

  const linkedIds = new Set(
    (existingTiers ?? []).map((t) => t.discord_role_id).filter(Boolean),
  );

  // Get current highest sort_order
  const { data: maxOrderRow } = await supabase
    .from("worker_tiers")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .single();
  let sortOrder = (maxOrderRow?.sort_order ?? -1) + 1;

  let created = 0;
  let skipped = 0;
  let errors = 0;

  for (const [, role] of allRoles) {
    if (linkedIds.has(role.id)) {
      skipped++;
      continue;
    }

    const colorHex =
      role.hexColor && role.hexColor !== "#000000" ? role.hexColor : "#6366f1";

    // Strip emoji and special chars — fall back to role ID slice if result is empty
    const rawSlug = role.name
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "")
      .replace(/^-+|-+$/g, "")
      .slice(0, 50);
    const slug = rawSlug.length > 0 ? rawSlug : `role-${role.id.slice(-8)}`;

    const insertData = {
      name: role.name,
      slug,
      color: colorHex,
      icon: "⭐",
      commission_rate: 0.70,
      max_active_orders: 5,
      min_completed_orders: 0,
      min_rating: 0.00,
      is_invite_only: false,
      is_default: false,
      discord_role_id: role.id,
      sort_order: sortOrder++,
    };
    logger.debug(`Inserting tier: ${JSON.stringify(insertData)}`);

    const { error } = await supabase.from("worker_tiers").insert(insertData);

    if (error) {
      logger.error(`Failed to insert tier for role "${role.name}": ${error.message} | code: ${error.code} | details: ${error.details} | hint: ${error.hint}`);
      errors++;
    } else {
      logger.info(`Tier created from Discord role "${role.name}" (${role.id})`);
      created++;
    }
  }

  return { created, skipped, errors };
}
