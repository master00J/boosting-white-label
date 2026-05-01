import type { Client } from "discord.js";
import { supabase } from "./supabase.js";
import { getChannelId, sendToChannel, sendDmToUser } from "./notifications.js";
import {
  buildNewOrderEmbed,
  buildQueuedOrderEmbed,
  buildCompletedOrderEmbed,
  buildOrderEmbed,
  buildUpdateEmbed,
} from "../lib/embeds.js";
import { buildOrderActionRow } from "../lib/buttons.js";
import { createOrderTicket, sendTicketUpdate, closeOrderTicket } from "./ticket-service.js";
import { logger } from "../lib/logger.js";

type OrderRecord = {
  id: string;
  order_number: string;
  status: string;
  total: number;
  worker_payout: number | null;
  progress: number;
  progress_notes: string | null;
  created_at: string;
  worker_id: string | null;
  customer_id: string | null;
  discord_ticket_channel_id: string | null;
};

type FullOrder = {
  id: string;
  order_number: string;
  status: string;
  total: number;
  worker_payout: number | null;
  progress: number | undefined;
  progress_notes: string | null;
  created_at: string;
  discord_ticket_channel_id: string | null;
  configuration?: Record<string, unknown> | null;
  items?: unknown[] | null;
  customer_notes?: string | null;
  payment_method?: string | null;
  payment_status?: string | null;
  service: { name: string } | null;
  game: { name: string } | null;
  worker: { display_name: string | null } | null;
  customer: { display_name: string | null; discord_id: string | null; discord_username: string | null } | null;
};

/** Order IDs we've already posted to Discord (admin new-order notification) — avoids duplicates when using polling. */
const notifiedOrderIds = new Set<string>();
/** Order IDs already posted to the public worker claim channel. */
const workerNotifiedOrderIds = new Set<string>();

const POLL_INTERVAL_MS = 45_000;
const POLL_LOOKBACK_MINUTES = 5;
const QUEUED_POLL_LOOKBACK_HOURS = 24;
const WORKER_CLAIM_POST_ACTION = "discord_worker_claim_posted";
/** Persisted so polling does not re-post admin + recreate tickets after bot restart. */
const ADMIN_NEW_ORDER_ACTION = "discord_new_order_posted";

export function startOrderSync(client: Client): void {
  logger.info("Order sync started — listening to Supabase realtime + polling fallback...");
  subscribeOrders(client);
  logger.info("Order polling: every 45s, first poll in 3s (pending_payment, paid, queued).");
  startOrderPolling(client);
}

const FIRST_POLL_DELAY_MS = 3_000;

/** Polling fallback: fetches recent paid/queued orders and posts to Discord if not already notified. */
function startOrderPolling(client: Client): void {
  const run = async () => {
    try {
      const recentSince = new Date(Date.now() - POLL_LOOKBACK_MINUTES * 60 * 1000).toISOString();
      const queuedSince = new Date(Date.now() - QUEUED_POLL_LOOKBACK_HOURS * 60 * 60 * 1000).toISOString();
      const { data: recentOrders, error: recentError } = await supabase
        .from("orders")
        .select("id, order_number, status, created_at")
        .in("status", ["pending_payment", "paid", "queued"])
        .gte("created_at", recentSince)
        .order("created_at", { ascending: false });

      if (recentError) {
        logger.error("Order polling Supabase error", recentError);
        return;
      }

      const { data: queuedOrders, error: queuedError } = await supabase
        .from("orders")
        .select("id, order_number, status, created_at")
        .eq("status", "queued")
        .is("worker_id", null)
        .gte("updated_at", queuedSince)
        .order("updated_at", { ascending: false });

      if (queuedError) {
        logger.error("Queued order polling Supabase error", queuedError);
      }

      const orders = Array.from(
        new Map([...(recentOrders ?? []), ...(queuedOrders ?? [])].map((order) => [order.id, order])).values()
      );

      await hydrateWorkerNotifiedOrderIds(orders.filter((o) => o.status === "queued").map((o) => o.id));
      await hydrateNewOrderNotifiedIds(orders.map((o) => o.id));

      const count = orders?.length ?? 0;
      const toNotify = orders?.filter((o) => !notifiedOrderIds.has(o.id) || (o.status === "queued" && !workerNotifiedOrderIds.has(o.id))).length ?? 0;
      logger.info(`[Poll] Recent/queued orders: ${count} (${toNotify} not yet notified).`);

      if (!orders?.length) return;

      for (const order of orders) {
        const needsAdminPost = !notifiedOrderIds.has(order.id);
        const needsWorkerPost = order.status === "queued" && !workerNotifiedOrderIds.has(order.id);
        if (!needsAdminPost && !needsWorkerPost) continue;
        logger.info(`[Poll] Syncing order: #${order.order_number} (status: ${order.status}, admin=${needsAdminPost}, workers=${needsWorkerPost})`);

        try {
          const fullOrder = await fetchOrderWithDetails(order.id);
          if (!fullOrder) {
            logger.warn(`[Poll] Could not load order #${order.order_number} (id: ${order.id}), skipping.`);
            notifiedOrderIds.delete(order.id);
            continue;
          }

          if (needsAdminPost) {
            const adminEmbed = buildNewOrderEmbed(fullOrder);
            await sendToChannel(client, "new_orders", adminEmbed);
            await logNewOrderNotified(order.id, order.order_number);
            notifiedOrderIds.add(order.id);
            await createOrderTicket(client, fullOrder);
          }

          if (needsWorkerPost) {
            await postToWorkersChannel(client, fullOrder);
          }
        } catch (err) {
          logger.error("Error processing polled order", err);
          if (needsAdminPost) notifiedOrderIds.delete(order.id);
          if (needsWorkerPost) workerNotifiedOrderIds.delete(order.id);
        }
      }
    } catch (err) {
      logger.error("Order polling error", err);
    }
  };

  setTimeout(() => {
    logger.info("[Poll] First poll running...");
    run();
  }, FIRST_POLL_DELAY_MS);
  setInterval(run, POLL_INTERVAL_MS);
}

let orderRealtimeFailures = 0;
const ORDER_REALTIME_MAX_FAILURES = 5;

function subscribeOrders(client: Client, attempt = 0): void {
  const channelName = `order-changes-${Date.now()}`;
  supabase
    .channel(channelName)
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "orders" },
      async (payload) => {
        const order = payload.new as OrderRecord;

        // Admin channel: pending_payment, paid, queued. Workers + ticket: paid/queued (workers only queued)
        if (!["pending_payment", "paid", "queued"].includes(order.status)) return;

        logger.info(`New order: #${order.order_number} (status: ${order.status})`);

        try {
          const fullOrder = await fetchOrderWithDetails(order.id);
          if (!fullOrder) return;

          // Always notify admin for new orders (awaiting payment, paid, or queued)
          const adminEmbed = buildNewOrderEmbed(fullOrder);
          await sendToChannel(client, "new_orders", adminEmbed);
          await logNewOrderNotified(order.id, order.order_number);
          notifiedOrderIds.add(order.id);

          if (order.status === "queued") {
            // Also post to workers channel with claim button
            await postToWorkersChannel(client, fullOrder);
          }

          // Create a ticket channel if customer has Discord linked
          await createOrderTicket(client, fullOrder);
        } catch (err) {
          logger.error("Error processing new order", err);
          notifiedOrderIds.delete(order.id);
        }
      }
    )
    .on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "orders" },
      async (payload) => {
        const order = payload.new as OrderRecord;
        const oldOrder = payload.old as Partial<OrderRecord>;

        try {
          // ── Status change ──────────────────────────────────────────────
          if (oldOrder.status !== order.status) {
            logger.info(`Order #${order.order_number}: ${oldOrder.status} → ${order.status}`);

            const fullOrder = await fetchOrderWithDetails(order.id);
            if (!fullOrder) return;

            switch (order.status) {
              case "queued": {
                // Admin released the order — post to workers channel with claim button
                await sendToChannel(client, "admin_alerts", buildOrderEmbed(fullOrder, `📋 Order released — #${order.order_number}`));
                await postToWorkersChannel(client, fullOrder);

                // If ticket exists, notify customer
                if (fullOrder.discord_ticket_channel_id) {
                  await sendTicketUpdate(
                    client,
                    fullOrder.discord_ticket_channel_id,
                    `📋 **Your order has been released!** A booster will pick it up shortly.`,
                  );
                }
                break;
              }

              case "claimed": {
                await sendToChannel(
                  client,
                  "admin_alerts",
                  buildOrderEmbed(fullOrder, `🤝 Order claimed — #${order.order_number}`),
                );

                // Notify customer ticket
                if (fullOrder.discord_ticket_channel_id) {
                  await sendTicketUpdate(
                    client,
                    fullOrder.discord_ticket_channel_id,
                    `🤝 **A booster has claimed your order!**\n**Booster:** ${fullOrder.worker?.display_name ?? "—"}\n\nYour order will start soon.`,
                  );
                }
                break;
              }

              case "in_progress": {
                // Notify customer ticket
                if (fullOrder.discord_ticket_channel_id) {
                  await sendTicketUpdate(
                    client,
                    fullOrder.discord_ticket_channel_id,
                    `⚡ **Your order is now in progress!** We'll keep you updated here.`,
                  );
                }
                break;
              }

              case "completed": {
                // Post to completed orders channel
                await sendToChannel(client, "completed_orders", buildCompletedOrderEmbed(fullOrder));

                // DM the worker — worker_id references workers.id, so join via workers table
                if (order.worker_id) {
                  const { data: workerRow } = await supabase
                    .from("workers")
                    .select("profile_id")
                    .eq("id", order.worker_id)
                    .single();

                  const { data: workerProfile } = workerRow
                    ? await supabase
                        .from("profiles")
                        .select("discord_id")
                        .eq("id", workerRow.profile_id)
                        .single()
                    : { data: null };

                  if (workerProfile?.discord_id) {
                    await sendDmToUser(
                      client,
                      workerProfile.discord_id,
                      buildCompletedOrderEmbed(fullOrder),
                      `🎉 Order #${order.order_number} completed! Your payout of $${(order.worker_payout ?? 0).toFixed(2)} will be processed.`,
                    );
                  }
                }

                // Close the ticket channel
                if (fullOrder.discord_ticket_channel_id) {
                  await closeOrderTicket(client, fullOrder.discord_ticket_channel_id, order.order_number);
                }
                break;
              }

              case "paused": {
                if (fullOrder.discord_ticket_channel_id) {
                  await sendTicketUpdate(
                    client,
                    fullOrder.discord_ticket_channel_id,
                    `⏸️ **Your order has been paused.** Please contact support if you have questions.`,
                  );
                }
                break;
              }

              case "cancelled": {
                if (fullOrder.discord_ticket_channel_id) {
                  await sendTicketUpdate(
                    client,
                    fullOrder.discord_ticket_channel_id,
                    `❌ **Your order has been cancelled.** Please contact support for more information.`,
                  );
                }
                break;
              }
            }
          }

          // ── Progress update ────────────────────────────────────────────
          if (
            oldOrder.progress !== order.progress &&
            order.discord_ticket_channel_id &&
            order.status === "in_progress"
          ) {
            const filled = Math.round((order.progress ?? 0) / 10);
            const empty = 10 - filled;
            const bar = "█".repeat(filled) + "░".repeat(empty);
            await sendTicketUpdate(
              client,
              order.discord_ticket_channel_id,
              `📊 **Progress update:** ${bar} **${order.progress}%**${order.progress_notes ? `\n> ${order.progress_notes}` : ""}`,
            );
          }
        } catch (err) {
          logger.error("Error processing order update", err);
        }
      }
    )
    // ── order_messages — system updates (RuneLite screenshots etc.) ──────
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "order_messages" },
      async (payload) => {
        const msg = payload.new as {
          order_id: string;
          content: string;
          is_system: boolean;
          sender_id: string | null;
        };

        // Only forward system messages (RuneLite updates) to the ticket
        if (!msg.is_system) return;

        try {
          const { data: order } = await supabase
            .from("orders")
            .select("order_number, discord_ticket_channel_id")
            .eq("id", msg.order_id)
            .single() as { data: { order_number: string; discord_ticket_channel_id: string | null } | null };

          if (!order?.discord_ticket_channel_id) return;

          // Extract image URL from markdown: ![screenshot](url)
          const imageMatch = msg.content.match(/!\[.*?\]\((https?:\/\/[^\s)]+)\)/);
          const imageUrl = imageMatch?.[1];
          // Strip the markdown image syntax from the text
          const textContent = msg.content.replace(/!\[.*?\]\(https?:\/\/[^\s)]+\)/g, "").trim();

          if (!textContent && !imageUrl) return;

          await sendTicketUpdate(
            client,
            order.discord_ticket_channel_id,
            textContent || "📸 Screenshot received",
            imageUrl,
          );
        } catch (err) {
          logger.error("Error forwarding system message to ticket", err);
        }
      }
    )
    .subscribe((status, err) => {
      if (status === "SUBSCRIBED") {
        orderRealtimeFailures = 0;
        logger.info("Order sync realtime connected ✅");
      } else if (status === "TIMED_OUT" || status === "CHANNEL_ERROR" || status === "CLOSED") {
        orderRealtimeFailures++;
        if (orderRealtimeFailures >= ORDER_REALTIME_MAX_FAILURES) {
          logger.warn(`Order sync realtime failed ${orderRealtimeFailures}x — giving up, relying on polling fallback`);
          return;
        }
        const delay = Math.min(10_000 * Math.pow(2, attempt), 300_000);
        logger.warn(`Order sync ${status} (attempt ${attempt + 1}) — retrying in ${delay / 1000}s...`);
        setTimeout(() => subscribeOrders(client, attempt + 1), delay);
      } else if (err) {
        logger.debug(`Order sync realtime status: ${status} | ${JSON.stringify(err)}`);
      }
    });
}

async function postToWorkersChannel(client: Client, order: FullOrder): Promise<void> {
  if (workerNotifiedOrderIds.has(order.id)) return;

  const workerChannelId = await getChannelId("worker_notifications");
  if (!workerChannelId) return;

  try {
    const chan = await client.channels.fetch(workerChannelId).catch(() => null);
    if (!chan?.isTextBased()) return;

    const embed = buildQueuedOrderEmbed(order);
    const row = buildOrderActionRow(order.id, order.order_number);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (chan as import("discord.js").TextChannel).send({
      embeds: [embed],
      components: [row as any],
    });
    workerNotifiedOrderIds.add(order.id);
    await supabase.from("activity_log").insert({
      actor_id: null,
      action: WORKER_CLAIM_POST_ACTION,
      target_type: "order",
      target_id: order.id,
      metadata: {
        order_number: order.order_number,
        channel_id: workerChannelId,
      },
    });
    logger.info(`Worker claim message posted for order #${order.order_number}`);
  } catch (err) {
    logger.error("Error posting to workers channel", err);
  }
}

async function logNewOrderNotified(orderId: string, orderNumber: string): Promise<void> {
  const { error } = await supabase.from("activity_log").insert({
    actor_id: null,
    action: ADMIN_NEW_ORDER_ACTION,
    target_type: "order",
    target_id: orderId,
    metadata: { order_number: orderNumber },
  });
  if (error) {
    logger.warn(`Could not persist new-order notification marker for ${orderNumber}: ${error.message}`);
  }
}

async function hydrateNewOrderNotifiedIds(orderIds: string[]): Promise<void> {
  const missingIds = orderIds.filter((id) => !notifiedOrderIds.has(id));
  if (missingIds.length === 0) return;

  const { data, error } = await supabase
    .from("activity_log")
    .select("target_id")
    .eq("action", ADMIN_NEW_ORDER_ACTION)
    .eq("target_type", "order")
    .in("target_id", missingIds);

  if (error) {
    logger.warn(`Could not hydrate new-order markers: ${error.message}`);
    return;
  }

  for (const row of data ?? []) {
    if (row.target_id) notifiedOrderIds.add(row.target_id);
  }
}

async function hydrateWorkerNotifiedOrderIds(orderIds: string[]): Promise<void> {
  const missingIds = orderIds.filter((id) => !workerNotifiedOrderIds.has(id));
  if (missingIds.length === 0) return;

  const { data, error } = await supabase
    .from("activity_log")
    .select("target_id")
    .eq("action", WORKER_CLAIM_POST_ACTION)
    .eq("target_type", "order")
    .in("target_id", missingIds);

  if (error) {
    logger.warn(`Could not hydrate worker notification markers: ${error.message}`);
    return;
  }

  for (const row of data ?? []) {
    if (row.target_id) workerNotifiedOrderIds.add(row.target_id);
  }
}

async function fetchOrderWithDetails(orderId: string): Promise<FullOrder | null> {
  // orders.worker_id → workers(id), not profiles; customer_id → profiles(id)
  const { data, error } = await supabase
    .from("orders")
    .select(
      "id, order_number, status, total, worker_payout, progress, progress_notes, created_at, discord_ticket_channel_id, " +
      "configuration, items, customer_notes, payment_method, payment_status, " +
      "service:services(name), game:games(name), " +
      "worker:workers(profile:profiles(display_name)), " +
      "customer:profiles!orders_customer_id_fkey(display_name, discord_id, discord_username)"
    )
    .eq("id", orderId)
    .single();

  if (error) {
    logger.warn(`fetchOrderWithDetails error for ${orderId}: ${error.message}`);
    return null;
  }
  if (!data) return null;

  // Normalize: workers returns { profile: { display_name } }; embed expects worker: { display_name }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const raw = data as any;
  const workerRow = Array.isArray(raw.worker) ? raw.worker[0] : raw.worker;
  const workerProfile = workerRow?.profile;
  const workerDisplayName = Array.isArray(workerProfile) ? workerProfile[0]?.display_name : workerProfile?.display_name;

  return {
    ...raw,
    progress: raw.progress ?? undefined,
    service: Array.isArray(raw.service) ? raw.service[0] ?? null : raw.service,
    game: Array.isArray(raw.game) ? raw.game[0] ?? null : raw.game,
    worker: workerRow ? { display_name: workerDisplayName ?? null } : null,
    customer: Array.isArray(raw.customer) ? raw.customer[0] ?? null : raw.customer,
  } as FullOrder;
}
