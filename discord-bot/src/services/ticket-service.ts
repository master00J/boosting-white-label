import {
  Client,
  ChannelType,
  PermissionFlagsBits,
  TextChannel,
  CategoryChannel,
} from "discord.js";
import { supabase } from "./supabase.js";
import { getConfig } from "./config.js";
import { logger } from "../lib/logger.js";
import { buildOrderEmbed } from "../lib/embeds.js";

type OrderData = {
  id: string;
  order_number: string;
  status: string;
  total: number;
  worker_payout?: number | null;
  progress?: number;
  created_at: string;
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

  try {
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

    // Channel name: order-bp-12345
    const channelName = `order-${order.order_number.toLowerCase().replace(/[^a-z0-9-]/g, "-")}`;

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
    await supabase
      .from("orders")
      .update({ discord_ticket_channel_id: channel.id } as never)
      .eq("id", order.id);

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
