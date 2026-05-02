import { SlashCommandBuilder } from "discord.js";
import type { BotCommand } from "./index.js";
import { supabase } from "../services/supabase.js";
import { requireWorker } from "../lib/permissions.js";
import { buildSuccessEmbed, buildErrorEmbed } from "../lib/embeds.js";

export const unclaimCommand: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("unclaim")
    .setDescription("Return a claimed order back to the queue")
    .addStringOption((opt) =>
      opt.setName("order_number").setDescription("The order number").setRequired(true),
    ),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const worker = await requireWorker(interaction);
    if (!worker) return;

    const orderNumber = interaction.options.getString("order_number", true).toUpperCase();

    const { data: order } = await supabase
      .from("orders")
      .select("id, order_number, status, worker_id")
      .eq("order_number", orderNumber)
      .single();

    if (!order) {
      await interaction.editReply({ embeds: [buildErrorEmbed(`Order ${orderNumber} not found.`)] });
      return;
    }

    // worker_id references workers.id (not profiles.id)
    if (order.worker_id !== worker.workerId) {
      await interaction.editReply({ embeds: [buildErrorEmbed("You have not claimed this order.")] });
      return;
    }

    if (!["claimed", "paused"].includes(order.status)) {
      await interaction.editReply({ embeds: [buildErrorEmbed(`Order cannot be returned (status: ${order.status}).`)] });
      return;
    }

    await supabase
      .from("orders")
      .update({ worker_id: null, status: "queued", claimed_at: null })
      .eq("id", order.id);

    const { data: workerData } = await supabase
      .from("workers")
      .select("current_active_orders")
      .eq("id", worker.workerId)
      .single();

    await supabase
      .from("workers")
      .update({ current_active_orders: Math.max(0, (workerData?.current_active_orders ?? 1) - 1) })
      .eq("id", worker.workerId);

    await supabase.from("order_messages").insert({
      order_id: order.id,
      content: `Booster ${worker.displayName} has returned the order to the queue.`,
      is_system: true,
    });

    await interaction.editReply({ embeds: [buildSuccessEmbed(`Order ${orderNumber} returned`, "The order is back in the queue.")] });
  },
};
