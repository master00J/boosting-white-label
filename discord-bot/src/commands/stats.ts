import { SlashCommandBuilder } from "discord.js";
import type { BotCommand } from "./index.js";
import { supabase } from "../services/supabase.js";
import { requireWorker } from "../lib/permissions.js";
import { buildWorkerStatsEmbed, buildErrorEmbed } from "../lib/embeds.js";

export const statsCommand: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("stats")
    .setDescription("Bekijk jouw booster statistieken"),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const worker = await requireWorker(interaction);
    if (!worker) return;

    const { data: workerData } = await supabase
      .from("workers")
      .select("total_earned, total_orders_completed, average_rating, current_active_orders, tier_id")
      .eq("id", worker.workerId)
      .single();

    if (!workerData) {
      await interaction.editReply({ embeds: [buildErrorEmbed("Kon je stats niet ophalen.")] });
      return;
    }

    let tier = null;
    if (workerData.tier_id) {
      const { data: tierData } = await supabase
        .from("worker_tiers")
        .select("name, icon, color")
        .eq("id", workerData.tier_id)
        .single();
      tier = tierData;
    }

    await interaction.editReply({
      embeds: [buildWorkerStatsEmbed({
        display_name: worker.displayName,
        total_earned: workerData.total_earned,
        total_orders_completed: workerData.total_orders_completed,
        average_rating: workerData.average_rating,
        current_active_orders: workerData.current_active_orders,
        tier,
      })],
    });
  },
};
