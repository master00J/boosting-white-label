import { SlashCommandBuilder } from "discord.js";
import type { BotCommand } from "./index.js";
import { supabase } from "../services/supabase.js";
import { buildOrderEmbed, buildErrorEmbed } from "../lib/embeds.js";

export const statusCommand: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("status")
    .setDescription("Check the status of an order")
    .addStringOption((opt) =>
      opt.setName("ordernummer").setDescription("The order number").setRequired(true)
    ),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const orderNumber = interaction.options.getString("ordernummer", true).toUpperCase();

    const { data: rawOrder } = await supabase
      .from("orders")
      .select(
        "id, order_number, status, total, worker_payout, progress, progress_notes, created_at, " +
        "service:services(name), game:games(name), " +
        "worker:workers(profile:profiles(display_name))"
      )
      .eq("order_number", orderNumber)
      .single();

    if (!rawOrder) {
      await interaction.editReply({ embeds: [buildErrorEmbed(`Order ${orderNumber} not found.`)] });
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const raw = rawOrder as any;
    const workerRow = Array.isArray(raw.worker) ? raw.worker[0] : raw.worker;
    const workerProfile = workerRow?.profile;
    const workerDisplayName = Array.isArray(workerProfile) ? workerProfile[0]?.display_name : workerProfile?.display_name;

    const order = {
      ...raw,
      service: Array.isArray(raw.service) ? raw.service[0] ?? null : raw.service,
      game: Array.isArray(raw.game) ? raw.game[0] ?? null : raw.game,
      worker: workerRow ? { display_name: workerDisplayName ?? null } : null,
    };

    await interaction.editReply({ embeds: [buildOrderEmbed(order)] });
  },
};
