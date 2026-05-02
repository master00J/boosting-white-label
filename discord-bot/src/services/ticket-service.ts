import {
  Client,
  ChannelType,
  PermissionFlagsBits,
  TextChannel,
  CategoryChannel,
  EmbedBuilder,
} from "discord.js";
import { supabase } from "./supabase.js";
import { getConfig } from "./config.js";
import { logger } from "../lib/logger.js";
import { buildOrderEmbed } from "../lib/embeds.js";
import { COLORS } from "../lib/constants.js";

type OrderData = {
  id: string;
  order_number: string;
  status: string;
  total: number;
  worker_payout?: number | null;
  progress?: number;
  created_at: string;
  discord_ticket_channel_id?: string | null;
  service?: { name: string } | null;
  game?: { name: string } | null;
  worker?: { display_name: string | null } | null;
  customer?: { display_name: string | null; discord_id: string | null; discord_username: string | null } | null;
};

async function getTicketsCategoryId(): Promise<string | null> {
  const envVal = process.env.DISCORD_CATEGORY_TICKETS;
  if (envVal) return envVal;

  const { data } = await supabase
    .from("site_settings")
    .select("value")
    .eq("key", "discord_category_tickets")
    .single();

  return (data?.value as string) ?? null;
}

async function getAdminRoleId(): Promise<string | null> {
  const envVal = process.env.DISCORD_ROLE_ADMIN;
  if (envVal) return envVal;

  const { data } = await supabase
    .from("site_settings")
    .select("value")
    .eq("key", "discord_role_admin")
    .single();

  return (data?.value as string) ?? null;
}

/**
 * Creates a private ticket channel for an order.
 * Only created when the customer has a discord_id linked.
 * Returns the channel ID or null if not created.
 */
export async function createOrderTicket(client: Client, order: OrderData): Promise<string | null> {
  if (!order.customer?.discord_id) {
    logger.debug(`Order #${order.order_number}: customer has no Discord account linked, skipping ticket`);
    return null;
  }

  const guildId = getConfig("discord_guild_id");
  if (!guildId) {
    logger.warn("DISCORD_GUILD_ID not configured, cannot create ticket");
    return null;
  }

  const channelName = `order-${order.order_number.toLowerCase().replace(/[^a-z0-9-]/g, "-")}`;

  try {
    // ── Already linked and channel still exists (avoids duplicates after bot restart) ──
    if (order.discord_ticket_channel_id) {
      const linked = await client.channels.fetch(order.discord_ticket_channel_id).catch(() => null);
      if (linked?.isTextBased()) {
        logger.debug(`Order #${order.order_number}: ticket ${linked.id} already exists, skipping create`);
        return linked.id;
      }
      await supabase.from("orders").update({ discord_ticket_channel_id: null } as never).eq("id", order.id);
      logger.debug(`Order #${order.order_number}: stale discord_ticket_channel_id cleared`);
    }

    const guild = await client.guilds.fetch(guildId).catch(() => null);
    if (!guild) {
      logger.warn(`Guild ${guildId} not found`);
      return null;
    }

    const categoryId = await getTicketsCategoryId();
    const adminRoleId = await getAdminRoleId();

    // Fetch the customer Discord member
    const member = await guild.members.fetch(order.customer.discord_id).catch(() => null);
    if (!member) {
      logger.debug(`Customer ${order.customer.discord_id} is not in the guild, skipping ticket`);
      return null;
    }

    // ── Repair: DB lost ID but channel still exists (same name + topic references order) ──
    const ticketCategoryId = categoryId ?? undefined;
    const candidates = guild.channels.cache.filter(
      (ch) =>
        ch.type === ChannelType.GuildText &&
        ch.name === channelName &&
        (!ticketCategoryId || ch.parentId === ticketCategoryId),
    );
    if (candidates.size > 0) {
      let repair = [...candidates.values()].find((ch) => {
        const topic = "topic" in ch ? (ch.topic ?? "") : "";
        return topic.includes(order.order_number) || topic.includes(order.id);
      });
      if (!repair && candidates.size === 1) repair = [...candidates.values()][0];
      if (repair?.isTextBased()) {
        const { error: repairErr } = await supabase
          .from("orders")
          .update({ discord_ticket_channel_id: repair.id } as never)
          .eq("id", order.id);
        if (repairErr) {
          logger.warn(`Order #${order.order_number}: could not save repaired ticket id: ${repairErr.message}`);
        } else {
          logger.info(`Order #${order.order_number}: linked existing Discord channel ${repair.id} (repair)`);
        }
        return repair.id;
      }
      if (candidates.size > 1) {
        logger.warn(
          `Order #${order.order_number}: multiple channels named "${channelName}" — cannot pick one safely; create skipped until resolved`,
        );
        return null;
      }
    }

    // Permission overwrites: private by default, visible to customer + admins
    const permissionOverwrites = [
      {
        id: guild.roles.everyone.id,
        deny: [PermissionFlagsBits.ViewChannel],
      },
      {
        id: order.customer.discord_id,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ReadMessageHistory,
          PermissionFlagsBits.AttachFiles,
        ],
      },
      ...(adminRoleId ? [{
        id: adminRoleId,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ReadMessageHistory,
          PermissionFlagsBits.ManageMessages,
        ],
      }] : []),
    ];

    const channelOptions: Parameters<typeof guild.channels.create>[0] = {
      name: channelName,
      type: ChannelType.GuildText,
      topic: `Order #${order.order_number} | ${order.game?.name ?? ""} — ${order.service?.name ?? ""} | Customer: ${order.customer.display_name ?? order.customer.discord_username ?? "Unknown"}`,
      permissionOverwrites,
    };

    if (categoryId) {
      const category = await guild.channels.fetch(categoryId).catch(() => null) as CategoryChannel | null;
      if (category) {
        channelOptions.parent = category.id;
      }
    }

    const channel = await guild.channels.create(channelOptions) as TextChannel;

    // Send the order details embed in the ticket — hide payout info from customer
    const embed = buildOrderEmbed(order, `🎫 Order #${order.order_number} — Your ticket`, false);
    embed.setDescription(
      `Welcome ${member.toString()}! 👋\n\n` +
      `This is your private channel for order **#${order.order_number}**.\n` +
      `Here you will receive live updates from your booster and can chat directly with the team.`
    );

    await channel.send({ content: `${member.toString()} Your order ticket has been created!`, embeds: [embed] });

    // Store the channel ID in the order for future updates
    const { error: saveErr } = await supabase
      .from("orders")
      .update({ discord_ticket_channel_id: channel.id } as never)
      .eq("id", order.id);

    if (saveErr) {
      logger.error(`Order #${order.order_number}: ticket created but failed to save channel id — duplicates may occur on restart: ${saveErr.message}`);
    }

    logger.info(`Ticket channel created for order #${order.order_number}: ${channel.id}`);
    return channel.id;
  } catch (err) {
    logger.error(`Failed to create ticket for order #${order.order_number}`, err);
    return null;
  }
}

/**
 * Sends an update message to the order's ticket channel.
 */
/**
 * After a worker claims an order: grant them access to the order ticket and post dashboard + tracking links.
 */
export async function notifyTicketWorkerClaimed(
  client: Client,
  params: {
    orderId: string;
    orderNumber: string;
    workerDiscordUserId: string;
    workerDisplayName: string;
    siteOrigin: string;
  },
): Promise<void> {
  const { orderId, orderNumber, workerDiscordUserId, siteOrigin } = params;

  const { data: row } = await supabase
    .from("orders")
    .select("discord_ticket_channel_id, track_token")
    .eq("id", orderId)
    .maybeSingle();

  const ticketId = row?.discord_ticket_channel_id as string | null | undefined;
  if (!ticketId) {
    logger.debug(`notifyTicketWorkerClaimed: no ticket channel for order #${orderNumber}`);
    return;
  }

  const channel = await client.channels.fetch(ticketId).catch(() => null);
  if (!channel?.isTextBased()) {
    logger.warn(`notifyTicketWorkerClaimed: ticket channel ${ticketId} missing or not text`);
    return;
  }

  const textCh = channel as TextChannel;

  try {
    await textCh.permissionOverwrites.edit(workerDiscordUserId, {
      ViewChannel: true,
      SendMessages: true,
      ReadMessageHistory: true,
      AttachFiles: true,
    });
  } catch (err) {
    logger.warn(
      `notifyTicketWorkerClaimed: could not grant ticket access to ${workerDiscordUserId} — is this user in the server?`,
      err,
    );
  }

  const base = siteOrigin.replace(/\/$/, "");
  const workerUrl = `${base}/booster/orders/${orderId}`;
  const trackTok = row?.track_token as string | null | undefined;
  const customerUrl = trackTok
    ? `${base}/track?token=${encodeURIComponent(trackTok)}`
    : `${base}/orders/${orderId}`;

  const embed = new EmbedBuilder()
    .setColor(COLORS.success)
    .setTitle(`🤝 Booster toegevoegd — #${orderNumber}`)
    .setDescription(
      `<@${workerDiscordUserId}> heeft deze order geclaimd en heeft nu toegang tot dit ticket.\n\n` +
        `**🔗 Booster (dashboard)**\n${workerUrl}\n\n` +
        `**🔗 Klant (order volgen)**\n${customerUrl}`,
    )
    .setFooter({ text: params.workerDisplayName })
    .setTimestamp();

  try {
    await textCh.send({ embeds: [embed] });
  } catch (err) {
    logger.error(`notifyTicketWorkerClaimed: failed to send ticket message for #${orderNumber}`, err);
  }
}

export async function sendTicketUpdate(
  client: Client,
  ticketChannelId: string,
  content: string,
  imageUrl?: string,
): Promise<void> {
  try {
    const channel = await client.channels.fetch(ticketChannelId).catch(() => null);
    if (!channel || !channel.isTextBased()) return;

    const { EmbedBuilder } = await import("discord.js");
    const { COLORS } = await import("../lib/constants.js");

    const embed = new EmbedBuilder()
      .setColor(COLORS.info)
      .setDescription(content.replace(/\*\*(.*?)\*\*/g, "**$1**"))
      .setTimestamp()
      .setFooter({ text: "BoostPlatform update" });

    if (imageUrl) {
      embed.setImage(imageUrl);
    }

    await (channel as TextChannel).send({ embeds: [embed] });
  } catch (err) {
    logger.error(`Failed to send ticket update to channel ${ticketChannelId}`, err);
  }
}

/**
 * Archives/closes a ticket channel when an order is completed.
 */
export async function closeOrderTicket(client: Client, ticketChannelId: string, orderNumber: string): Promise<void> {
  try {
    const channel = await client.channels.fetch(ticketChannelId).catch(() => null) as TextChannel | null;
    if (!channel || !channel.isTextBased()) return;

    const { EmbedBuilder } = await import("discord.js");
    const { COLORS } = await import("../lib/constants.js");

    const embed = new EmbedBuilder()
      .setColor(COLORS.success)
      .setTitle(`✅ Order #${orderNumber} completed!`)
      .setDescription(
        "Your order has been completed! 🎉\n\n" +
        "This ticket will remain open for 24 hours in case you have any questions.\n" +
        "Please leave a review on the website — it helps us a lot!"
      )
      .setTimestamp()
      .setFooter({ text: "BoostPlatform" });

    await channel.send({ embeds: [embed] });

    // Rename channel to indicate it's closed
    await channel.setName(`closed-${channel.name}`).catch(() => null);
  } catch (err) {
    logger.error(`Failed to close ticket channel ${ticketChannelId}`, err);
  }
}
