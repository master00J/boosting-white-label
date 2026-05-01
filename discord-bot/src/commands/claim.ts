import { SlashCommandBuilder } from "discord.js";
import type { BotCommand } from "./index.js";
import { supabase } from "../services/supabase.js";
import { requireWorker } from "../lib/permissions.js";
import { buildSuccessEmbed, buildErrorEmbed } from "../lib/embeds.js";
import { buildProgressRow } from "../lib/buttons.js";

/** Order row with items, service_id (tier check) and account_value (deposit check). */
type OrderRow = {
  id: string;
  order_number: string;
  status: string;
  worker_id: string | null;
  total: number;
  service_id: string | null;
  items: Array<{ serviceId?: string }> | null;
  account_value: number | null;
};

function getServiceIdsFromOrder(order: OrderRow): string[] {
  const ids: string[] = [];
  if (order.items && Array.isArray(order.items)) {
    for (const it of order.items) {
      if (it.serviceId && !ids.includes(it.serviceId)) ids.push(it.serviceId);
    }
  }
  if (ids.length === 0 && order.service_id) ids.push(order.service_id);
  return ids;
}

export const claimCommand: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("claim")
    .setDescription("Claim een order om te boosten")
    .addStringOption((opt) =>
      opt.setName("ordernummer").setDescription("Het ordernummer (bijv. BP-12345)").setRequired(true)
    ),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const worker = await requireWorker(interaction);
    if (!worker) return;

    const orderNumber = interaction.options.getString("ordernummer", true).toUpperCase();

    const { data: order } = await supabase
      .from("orders")
      .select("id, order_number, status, worker_id, total, service_id, items, account_value")
      .eq("order_number", orderNumber)
      .single() as { data: OrderRow | null };

    if (!order) {
      await interaction.editReply({ embeds: [buildErrorEmbed(`Order ${orderNumber} niet gevonden.`)] });
      return;
    }

    if (order.status !== "queued") {
      await interaction.editReply({ embeds: [buildErrorEmbed(`Order ${orderNumber} is niet beschikbaar (status: ${order.status}).`)] });
      return;
    }

    if (order.worker_id) {
      await interaction.editReply({ embeds: [buildErrorEmbed(`Order ${orderNumber} is al geclaimd.`)] });
      return;
    }

    // Check active orders limit, tier and deposit
    const { data: workerData } = await supabase
      .from("workers")
      .select("current_active_orders, max_active_orders, tier_id, deposit_paid, commission_rate")
      .eq("id", worker.workerId)
      .single();

    if (workerData && workerData.current_active_orders >= workerData.max_active_orders) {
      await interaction.editReply({
        embeds: [buildErrorEmbed(`Je hebt het maximale aantal actieve orders bereikt (${workerData.max_active_orders}).`)],
      });
      return;
    }

    // Required tier: highest sort_order among min_worker_tier of services in this order
    const serviceIds = getServiceIdsFromOrder(order);
    let requiredSortOrder: number | null = null;
    if (serviceIds.length > 0) {
      const { data: services } = await supabase
        .from("services")
        .select("min_worker_tier_id")
        .in("id", serviceIds) as { data: Array<{ min_worker_tier_id: string | null }> | null };
      const tierIds = (services ?? []).map((s) => s.min_worker_tier_id).filter(Boolean) as string[];
      if (tierIds.length > 0) {
        const { data: tiers } = await supabase
          .from("worker_tiers")
          .select("sort_order")
          .in("id", tierIds) as { data: Array<{ sort_order: number | null }> | null };
        const orders = (tiers ?? []).map((t) => t.sort_order ?? 0);
        if (orders.length > 0) requiredSortOrder = Math.max(...orders);
      }
    }

    let workerSortOrder = 0;
    if (workerData?.tier_id) {
      const { data: wt } = await supabase
        .from("worker_tiers")
        .select("sort_order")
        .eq("id", workerData.tier_id)
        .single() as { data: { sort_order: number | null } | null };
      workerSortOrder = wt?.sort_order ?? 0;
    }

    if (requiredSortOrder != null && workerSortOrder < requiredSortOrder) {
      await interaction.editReply({
        embeds: [buildErrorEmbed("Deze order vereist een hogere booster rank. Je huidige rank is niet hoog genoeg.")],
      });
      return;
    }

    // Deposit check: available deposit must be >= order account value
    const orderAccountValue = Number(order.account_value) || 0;
    if (orderAccountValue > 0) {
      const depositPaid = Number(workerData?.deposit_paid) || 0;
      const { data: activeOrders } = await supabase
        .from("orders")
        .select("account_value")
        .eq("worker_id", worker.workerId)
        .in("status", ["claimed", "in_progress", "paused"]) as { data: Array<{ account_value: number | null }> | null };
      const held = (activeOrders ?? []).reduce((sum, o) => sum + (Number(o.account_value) || 0), 0);
      const availableDeposit = depositPaid - held;
      if (availableDeposit < orderAccountValue) {
        await interaction.editReply({
          embeds: [buildErrorEmbed("Onvoldoende deposit. Deze order vereist een hogere beschikbare deposit dan je hebt.")],
        });
        return;
      }
    }

    const commissionRate = workerData?.commission_rate ?? 0.70;
    const workerPayout = order.total * commissionRate;

    // worker_id must be workers.id (PK), not profile id
    const { data: claimedOrders } = await supabase
      .from("orders")
      .update({
        worker_id: worker.workerId,
        status: "claimed",
        claimed_at: new Date().toISOString(),
        worker_payout: workerPayout,
        worker_commission_rate: commissionRate,
      })
      .eq("id", order.id)
      .eq("status", "queued")
      .is("worker_id", null)
      .select("id");

    if (!claimedOrders || claimedOrders.length === 0) {
      await interaction.editReply({ embeds: [buildErrorEmbed(`Order ${orderNumber} is net door iemand anders geclaimd.`)] });
      return;
    }

    await supabase
      .from("workers")
      .update({ current_active_orders: (workerData?.current_active_orders ?? 0) + 1 })
      .eq("id", worker.workerId);

    await supabase.from("order_messages").insert({
      order_id: order.id,
      content: `Booster ${worker.displayName} heeft de order geclaimd via Discord.`,
      is_system: true,
    });

    await supabase.from("activity_log").insert({
      actor_id: worker.profileId,
      action: "worker_claimed_order",
      target_type: "order",
      target_id: order.id,
      metadata: {
        worker_id: worker.workerId,
        payout: workerPayout,
        commission_rate: commissionRate,
        source: "discord_slash",
      },
    });

    const embed = buildSuccessEmbed(
      `Order ${orderNumber} geclaimd!`,
      `Je payout is $${workerPayout.toFixed(2)} (${Math.round(commissionRate * 100)}%). Gebruik \`/progress ${orderNumber} <percentage>\` om de voortgang bij te werken.`,
    );
    const row = buildProgressRow(order.id);
    await interaction.editReply({ embeds: [embed], components: [row] });
  },
};
