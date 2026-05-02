import { SlashCommandBuilder } from "discord.js";
import type { BotCommand } from "./index.js";
import { supabase } from "../services/supabase.js";
import { requireAdmin } from "../lib/permissions.js";
import { buildSuccessEmbed, buildErrorEmbed } from "../lib/embeds.js";

export const assignCommand: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("assign")
    .setDescription("[Admin] Assign an order to a booster")
    .addStringOption((opt) =>
      opt.setName("order_number").setDescription("The order number").setRequired(true),
    )
    .addUserOption((opt) =>
      opt.setName("booster").setDescription("The Discord user of the booster").setRequired(true)
    ),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const isAdmin = await requireAdmin(interaction);
    if (!isAdmin) return;

    const orderNumber = interaction.options.getString("order_number", true).toUpperCase();
    const targetUser = interaction.options.getUser("booster", true);

    // Find profile by discord_id
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, display_name")
      .eq("discord_id", targetUser.id)
      .single();

    if (!profile) {
      await interaction.editReply({ embeds: [buildErrorEmbed(`${targetUser.username} has no linked account.`)] });
      return;
    }

    // Get the workers.id (PK) — worker_id on orders references workers.id, not profiles.id
    const { data: worker } = await supabase
      .from("workers")
      .select("id, is_active")
      .eq("profile_id", profile.id)
      .single();

    if (!worker || !worker.is_active) {
      await interaction.editReply({ embeds: [buildErrorEmbed(`${targetUser.username} is not an active booster.`)] });
      return;
    }

    const { data: order } = await supabase
      .from("orders")
      .select("id, order_number, status")
      .eq("order_number", orderNumber)
      .single();

    if (!order) {
      await interaction.editReply({ embeds: [buildErrorEmbed(`Order ${orderNumber} not found.`)] });
      return;
    }

    if (!["queued", "claimed"].includes(order.status)) {
      await interaction.editReply({ embeds: [buildErrorEmbed(`Order cannot be assigned (status: ${order.status}).`)] });
      return;
    }

    // Use workers.id as worker_id, not profiles.id
    await supabase.from("orders").update({
      worker_id: worker.id,
      status: "claimed",
      claimed_at: new Date().toISOString(),
    }).eq("id", order.id);

    await supabase.from("order_messages").insert({
      order_id: order.id,
      content: `Order assigned to booster ${profile.display_name ?? targetUser.username} by an admin.`,
      is_system: true,
    });

    await interaction.editReply({
      embeds: [buildSuccessEmbed(
        `Order ${orderNumber} assigned`,
        `Order has been assigned to ${profile.display_name ?? targetUser.username}.`,
      )],
    });
  },
};
