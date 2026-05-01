import { SlashCommandBuilder, EmbedBuilder } from "discord.js";
import type { BotCommand } from "./index.js";
import { supabase } from "../services/supabase.js";
import { requireWorker } from "../lib/permissions.js";
import { buildSuccessEmbed, buildErrorEmbed } from "../lib/embeds.js";
import { COLORS } from "../lib/constants.js";

export const payoutCommand: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("payout")
    .setDescription("Request a payout or view your balance"),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const worker = await requireWorker(interaction);
    if (!worker) return;

    const { data: workerData } = await supabase
      .from("workers")
      .select("pending_balance, payout_minimum, payout_method")
      .eq("id", worker.workerId)
      .single();

    if (!workerData) {
      await interaction.editReply({ embeds: [buildErrorEmbed("Could not retrieve your data.")] });
      return;
    }

    if (!workerData.payout_method) {
      await interaction.editReply({
        embeds: [buildErrorEmbed("You have not set a payout method. Configure it on the website: /booster/settings")],
      });
      return;
    }

    if (workerData.pending_balance < workerData.payout_minimum) {
      const embed = new EmbedBuilder()
        .setColor(COLORS.warning)
        .setTitle("💰 Pending balance")
        .addFields(
          { name: "Current balance", value: `$${workerData.pending_balance.toFixed(2)}`, inline: true },
          { name: "Minimum payout", value: `$${workerData.payout_minimum.toFixed(2)}`, inline: true },
          { name: "Still needed", value: `$${(workerData.payout_minimum - workerData.pending_balance).toFixed(2)}`, inline: true },
        )
        .setDescription("You do not have enough balance for a payout yet.")
        .setTimestamp();
      await interaction.editReply({ embeds: [embed] });
      return;
    }

    const amount = workerData.pending_balance;

    // Create payout request
    await supabase.from("payouts").insert({
      worker_id: worker.workerId,
      amount,
      method: workerData.payout_method,
      status: "pending",
    });

    // Reset pending balance so worker can't double-request
    await supabase
      .from("workers")
      .update({ pending_balance: 0 })
      .eq("id", worker.workerId);

    await interaction.editReply({
      embeds: [buildSuccessEmbed(
        "Payout request submitted!",
        `Your request for $${amount.toFixed(2)} via ${workerData.payout_method} has been submitted. An admin will process it as soon as possible.`,
      )],
    });
  },
};
