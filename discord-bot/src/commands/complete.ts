import { SlashCommandBuilder } from "discord.js";
import type { BotCommand } from "./index.js";
import { supabase } from "../services/supabase.js";
import { requireWorker } from "../lib/permissions.js";
import { buildSuccessEmbed, buildErrorEmbed } from "../lib/embeds.js";

export const completeCommand: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("complete")
    .setDescription("Mark an order as completed")
    .addStringOption((opt) =>
      opt.setName("ordernummer").setDescription("The order number").setRequired(true)
    ),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const worker = await requireWorker(interaction);
    if (!worker) return;

    const orderNumber = interaction.options.getString("ordernummer", true).toUpperCase();

    const { data: order } = await supabase
      .from("orders")
      .select("id, order_number, worker_id, status, worker_payout, customer_id, track_token")
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
      await interaction.editReply({ embeds: [buildErrorEmbed(`Order cannot be completed (status: ${order.status}).`)] });
      return;
    }

    await supabase.from("orders").update({
      status: "completed",
      progress: 100,
      completed_at: new Date().toISOString(),
    }).eq("id", order.id);

    // Credit worker earnings
    const { data: workerData } = await supabase
      .from("workers")
      .select("total_earned, pending_balance, total_orders_completed, current_active_orders")
      .eq("id", worker.workerId)
      .single();

    if (workerData) {
      const payout = order.worker_payout ?? 0;
      await supabase.from("workers").update({
        total_earned: workerData.total_earned + payout,
        pending_balance: workerData.pending_balance + payout,
        total_orders_completed: workerData.total_orders_completed + 1,
        current_active_orders: Math.max(0, workerData.current_active_orders - 1),
      }).eq("id", worker.workerId);
    }

    await supabase.from("order_messages").insert({
      order_id: order.id,
      content: "Your order has been completed! Thank you for choosing BoostPlatform.",
      is_system: true,
    });

    if (order.customer_id) {
      await supabase.from("notifications").insert({
        profile_id: order.customer_id,
        type: "order_completed",
        title: "Order completed!",
        message: `Your order #${order.order_number} has been completed.`,
        link: order.track_token ? `/track?token=${order.track_token}` : `/orders/${order.id}`,
      });
    }

    await supabase.from("activity_log").insert({
      actor_id: worker.profileId,
      action: "worker_completed_order",
      target_type: "order",
      target_id: order.id,
      metadata: {
        worker_id: worker.workerId,
        payout: order.worker_payout ?? 0,
        source: "discord_slash",
      },
    });

    const payout = order.worker_payout ?? 0;
    await interaction.editReply({
      embeds: [buildSuccessEmbed(
        `Order ${orderNumber} completed! 🎉`,
        `Great work! Your payout of $${payout.toFixed(2)} will be processed.`,
      )],
    });
  },
};
