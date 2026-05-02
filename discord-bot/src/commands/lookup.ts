import { SlashCommandBuilder } from "discord.js";
import type { BotCommand } from "./index.js";
import { supabase } from "../services/supabase.js";
import { requireAdmin } from "../lib/permissions.js";
import { buildOrderEmbed, buildErrorEmbed } from "../lib/embeds.js";

export const lookupCommand: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("lookup")
    .setDescription("[Admin] Look up an order")
    .addStringOption((opt) =>
      opt.setName("order_number").setDescription("The order number").setRequired(true),
    ),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const isAdmin = await requireAdmin(interaction);
    if (!isAdmin) return;

    const orderNumber = interaction.options.getString("order_number", true).toUpperCase();

    const { data: rawOrder } = await supabase
      .from("orders")
      .select(
        "id, order_number, status, total, worker_payout, progress, progress_notes, created_at, payment_method, " +
        "service:services(name), game:games(name), " +
        "worker:workers(profile:profiles(display_name)), " +
        "customer:profiles!orders_customer_id_fkey(display_name, discord_username)"
      )
      .eq("order_number", orderNumber)
      .single();

    if (!rawOrder) {
      await interaction.editReply({ embeds: [buildErrorEmbed(`Order ${orderNumber} not found.`)] });
      return;
    }

    // Normalize worker join: workers → profile → display_name
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
      customer: Array.isArray(raw.customer) ? raw.customer[0] ?? null : raw.customer,
    };

    await interaction.editReply({ embeds: [buildOrderEmbed(order, `🔍 Admin Lookup — #${orderNumber}`)] });
  },
};
