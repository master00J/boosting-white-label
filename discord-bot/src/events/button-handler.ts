import type { Client, ButtonInteraction } from "discord.js";
import { supabase } from "../services/supabase.js";
import { requireWorker } from "../lib/permissions.js";
import { buildOrderEmbed, buildErrorEmbed, buildSuccessEmbed } from "../lib/embeds.js";
import { buildProgressRow } from "../lib/buttons.js";
import { logger } from "../lib/logger.js";

/** Discord custom_id uses underscores; order_number values like BST-GME-SVC-MON40JD2 must not be split on "_". */
const ORDER_UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function normalizeOrderNumberKey(key: string): string {
  return key.trim().toUpperCase().replace(/\s+/g, "");
}

/** Button payload is either orders.id (UUID) or orders.order_number. */
async function resolveOrderUuidFromButtonKey(orderKey: string): Promise<string | null> {
  const raw = orderKey.trim();
  if (!raw) return null;

  if (ORDER_UUID_RE.test(raw)) {
    const { data } = await supabase.from("orders").select("id").eq("id", raw).maybeSingle();
    if (data?.id) return data.id;
  }

  const { data } = await supabase
    .from("orders")
    .select("id")
    .eq("order_number", normalizeOrderNumberKey(raw))
    .maybeSingle();

  return data?.id ?? null;
}

export async function handleButtonInteraction(client: Client, interaction: ButtonInteraction): Promise<void> {
  const customId = interaction.customId;

  try {
    if (customId.startsWith("claim_")) {
      await handleClaim(interaction, customId.slice("claim_".length));
      return;
    }
    if (customId.startsWith("status_")) {
      await handleStatusCheck(interaction, customId.slice("status_".length));
      return;
    }
    const progressMatch = customId.match(/^progress_(\d+)_(.+)$/);
    if (progressMatch) {
      const pct = parseInt(progressMatch[1], 10);
      await handleProgressUpdate(interaction, progressMatch[2], pct);
      return;
    }
  } catch (err) {
    logger.error(`Error handling button interaction ${interaction.customId}`, err);
    if (interaction.replied || interaction.deferred) {
      await interaction.editReply({ embeds: [buildErrorEmbed("An error occurred.")] }).catch(() => {});
    } else {
      await interaction.reply({ embeds: [buildErrorEmbed("An error occurred.")], ephemeral: true }).catch(() => {});
    }
  }
}

async function handleClaim(interaction: ButtonInteraction, orderKey: string): Promise<void> {
  await interaction.deferReply({ ephemeral: true });

  const worker = await requireWorker(interaction);
  if (!worker) return;

  const resolvedId = await resolveOrderUuidFromButtonKey(orderKey);
  if (!resolvedId) {
    await interaction.editReply({ embeds: [buildErrorEmbed("Order not found.")] });
    return;
  }

  const { data: order } = await supabase
    .from("orders")
    .select("id, order_number, status, worker_id, total, service_id, items, account_value")
    .eq("id", resolvedId)
    .maybeSingle() as { data: {
      id: string;
      order_number: string;
      status: string;
      worker_id: string | null;
      total: number;
      service_id: string | null;
      items: Array<{ serviceId?: string }> | null;
      account_value: number | null;
    } | null };

  if (!order) {
    await interaction.editReply({ embeds: [buildErrorEmbed("Order not found.")] });
    return;
  }
  if (order.status !== "queued" || order.worker_id) {
    await interaction.editReply({ embeds: [buildErrorEmbed("This order is no longer available.")] });
    return;
  }

  // Fetch worker data for validation and payout calculation
  const { data: workerData } = await supabase
    .from("workers")
    .select("current_active_orders, max_active_orders, tier_id, deposit_paid, commission_rate")
    .eq("id", worker.workerId)
    .single() as { data: { current_active_orders: number; max_active_orders: number; tier_id: string | null; deposit_paid: number | null; commission_rate: number | null } | null };

  // Max active orders check
  if (workerData && workerData.current_active_orders >= workerData.max_active_orders) {
    await interaction.editReply({
      embeds: [buildErrorEmbed(`You have reached your maximum active orders (${workerData.max_active_orders}).`)],
    });
    return;
  }

  // Tier check
  const serviceIds: string[] = [];
  if (order.items && Array.isArray(order.items)) {
    for (const it of order.items) {
      if (it.serviceId && !serviceIds.includes(it.serviceId)) serviceIds.push(it.serviceId);
    }
  }
  if (serviceIds.length === 0 && order.service_id) serviceIds.push(order.service_id);

  if (serviceIds.length > 0) {
    const { data: services } = await supabase
      .from("services")
      .select("min_worker_tier_id")
      .in("id", serviceIds) as { data: Array<{ min_worker_tier_id: string | null }> | null };

    const tierIds = (services ?? []).map((s) => s.min_worker_tier_id).filter(Boolean) as string[];
    if (tierIds.length > 0) {
      const { data: requiredTiers } = await supabase
        .from("worker_tiers")
        .select("sort_order")
        .in("id", tierIds) as { data: Array<{ sort_order: number | null }> | null };

      const maxRequired = Math.max(...(requiredTiers ?? []).map((t) => t.sort_order ?? 0));

      let workerSortOrder = 0;
      if (workerData?.tier_id) {
        const { data: wt } = await supabase
          .from("worker_tiers")
          .select("sort_order")
          .eq("id", workerData.tier_id)
          .single() as { data: { sort_order: number | null } | null };
        workerSortOrder = wt?.sort_order ?? 0;
      }

      if (workerSortOrder < maxRequired) {
        await interaction.editReply({
          embeds: [buildErrorEmbed("This order requires a higher booster rank.")],
        });
        return;
      }
    }
  }

  // Deposit check
  const orderAccountValue = Number(order.account_value) || 0;
  if (orderAccountValue > 0) {
    const depositPaid = Number(workerData?.deposit_paid) || 0;
    const { data: activeOrders } = await supabase
      .from("orders")
      .select("account_value")
      .eq("worker_id", worker.workerId)
      .in("status", ["claimed", "in_progress", "paused"]) as { data: Array<{ account_value: number | null }> | null };
    const held = (activeOrders ?? []).reduce((sum, o) => sum + (Number(o.account_value) || 0), 0);
    if (depositPaid - held < orderAccountValue) {
      await interaction.editReply({
        embeds: [buildErrorEmbed("Insufficient deposit for this order.")],
      });
      return;
    }
  }

  // Calculate this booster's personalized payout based on their commission rate
  const commissionRate = workerData?.commission_rate ?? 0.70;
  const personalPayout = order.total * commissionRate;
  const commissionPct = Math.round(commissionRate * 100);

  // worker_id references workers.id (not profiles.id)
  const { data: claimedOrders } = await supabase
    .from("orders")
    .update({
      worker_id: worker.workerId,
      status: "claimed",
      claimed_at: new Date().toISOString(),
      worker_payout: personalPayout,
      worker_commission_rate: commissionRate,
    })
    .eq("id", resolvedId)
    .eq("status", "queued")
    .is("worker_id", null)
    .select("id");

  if (!claimedOrders || claimedOrders.length === 0) {
    await interaction.editReply({ embeds: [buildErrorEmbed("This order was just claimed by someone else.")] });
    return;
  }

  // Increment current_active_orders safely (no rpc needed)
  await supabase
    .from("workers")
    .update({ current_active_orders: (workerData?.current_active_orders ?? 0) + 1 })
    .eq("id", worker.workerId);

  await supabase.from("order_messages").insert({
    order_id: resolvedId,
    content: `Booster ${worker.displayName} has claimed your order via Discord.`,
    is_system: true,
  });

  await supabase.from("activity_log").insert({
    actor_id: worker.profileId,
    action: "worker_claimed_order",
    target_type: "order",
    target_id: resolvedId,
    metadata: {
      worker_id: worker.workerId,
      payout: personalPayout,
      commission_rate: commissionRate,
      source: "discord_button",
    },
  });

  const embed = buildSuccessEmbed(
    `Order #${order.order_number} claimed!`,
    `**Your payout:** $${personalPayout.toFixed(2)} (${commissionPct}% of $${order.total.toFixed(2)})\n\nUse \`/progress\` to update the progress.`,
  );
  const row = buildProgressRow(resolvedId);
  await interaction.editReply({ embeds: [embed], components: [row] });
}

async function handleStatusCheck(interaction: ButtonInteraction, orderKey: string): Promise<void> {
  await interaction.deferReply({ ephemeral: true });

  const resolvedId = await resolveOrderUuidFromButtonKey(orderKey);
  if (!resolvedId) {
    await interaction.editReply({ embeds: [buildErrorEmbed("Order not found.")] });
    return;
  }

  const { data: order } = await supabase
    .from("orders")
    .select("id, order_number, status, total, worker_payout, progress, progress_notes, created_at, service:services(name), game:games(name)")
    .eq("id", resolvedId)
    .maybeSingle();

  if (!order) {
    await interaction.editReply({ embeds: [buildErrorEmbed("Order not found.")] });
    return;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await interaction.editReply({ embeds: [buildOrderEmbed(order as any)] });
}

async function handleProgressUpdate(interaction: ButtonInteraction, orderKey: string, percentage: number): Promise<void> {
  await interaction.deferReply({ ephemeral: true });

  const worker = await requireWorker(interaction);
  if (!worker) return;

  const resolvedId = await resolveOrderUuidFromButtonKey(orderKey);
  if (!resolvedId) {
    await interaction.editReply({ embeds: [buildErrorEmbed("Order not found.")] });
    return;
  }

  const { data: order } = await supabase
    .from("orders")
    .select("id, order_number, worker_id, status, worker_payout, customer_id, track_token")
    .eq("id", resolvedId)
    .maybeSingle();

  // worker_id references workers.id (not profiles.id)
  if (!order || order.worker_id !== worker.workerId) {
    await interaction.editReply({ embeds: [buildErrorEmbed("You do not have access to this order.")] });
    return;
  }

  const updateData: Record<string, unknown> = { progress: percentage };
  if (percentage === 100) {
    updateData.status = "completed";
    updateData.completed_at = new Date().toISOString();
  }

  await supabase.from("orders").update(updateData).eq("id", resolvedId);

  if (percentage === 100 && order.status !== "completed") {
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
      order_id: resolvedId,
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
      target_id: resolvedId,
      metadata: {
        worker_id: worker.workerId,
        payout: order.worker_payout ?? 0,
        source: "discord_button_progress",
      },
    });
  }

  const embed = buildSuccessEmbed(
    `Progress updated — ${percentage}%`,
    percentage === 100 ? `Order #${order.order_number} completed! 🎉` : `Order #${order.order_number} is now at ${percentage}%.`,
  );
  await interaction.editReply({ embeds: [embed] });
}
