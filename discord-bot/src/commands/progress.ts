import { SlashCommandBuilder } from "discord.js";
import type { BotCommand } from "./index.js";
import { supabase } from "../services/supabase.js";
import { requireWorker } from "../lib/permissions.js";
import { buildSuccessEmbed, buildErrorEmbed } from "../lib/embeds.js";

export const progressCommand: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("progress")
    .setDescription("Update the progress of an order")
    .addStringOption((opt) =>
      opt.setName("ordernummer").setDescription("The order number").setRequired(true)
    )
    .addIntegerOption((opt) =>
      opt.setName("percentage").setDescription("Progress in percent (0-100)").setRequired(true).setMinValue(0).setMaxValue(100)
    )
    .addStringOption((opt) =>
      opt.setName("notitie").setDescription("Optional progress note").setRequired(false)
    ),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const worker = await requireWorker(interaction);
    if (!worker) return;

    const orderNumber = interaction.options.getString("ordernummer", true).toUpperCase();
    const percentage = interaction.options.getInteger("percentage", true);
    const notes = interaction.options.getString("notitie");

    const { data: order } = await supabase
      .from("orders")
      .select("id, order_number, worker_id, status")
      .eq("order_number", orderNumber)
      .single();

    if (!order) {
      await interaction.editReply({ embeds: [buildErrorEmbed(`Order ${orderNumber} not found.`)] });
      return;
    }

    // worker_id references workers.id (not profiles.id)
    if (order.worker_id !== worker.workerId) {
      await interaction.editReply({ embeds: [buildErrorEmbed("You do not have access to this order.")] });
      return;
    }

    if (!["claimed", "in_progress", "paused"].includes(order.status)) {
      await interaction.editReply({ embeds: [buildErrorEmbed(`Order cannot be updated (status: ${order.status}).`)] });
      return;
    }

    const updateData: Record<string, unknown> = {
      progress: percentage,
      status: "in_progress",
    };
    if (notes) updateData.progress_notes = notes;

    await supabase.from("orders").update(updateData).eq("id", order.id);

    await interaction.editReply({
      embeds: [buildSuccessEmbed(
        `Progress updated — ${percentage}%`,
        `Order ${orderNumber} is now at ${percentage}%.${notes ? `\n📝 ${notes}` : ""}`,
      )],
    });
  },
};
