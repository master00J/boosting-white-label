import { EmbedBuilder } from "discord.js";
import { COLORS, STATUS_COLORS, STATUS_LABELS } from "./constants.js";

type OrderData = {
  id: string;
  order_number: string;
  status: string;
  total: number;
  worker_payout?: number | null;
  progress?: number | null;
  progress_notes?: string | null;
  created_at: string;
  service?: { name: string } | null;
  game?: { name: string } | null;
  worker?: { display_name: string | null } | null;
  customer?: { display_name: string | null; discord_username: string | null } | null;
  configuration?: Record<string, unknown> | null;
  items?: unknown[] | null;
  customer_notes?: string | null;
  payment_method?: string | null;
  payment_status?: string | null;
};

type WorkerStats = {
  display_name: string | null;
  total_earned: number;
  total_orders_completed: number;
  average_rating: number;
  current_active_orders: number;
  tier?: { name: string; icon: string; color: string } | null;
};

type ReviewData = {
  order_number: string;
  rating: number;
  comment: string | null;
  reviewer_name: string | null;
  service_name: string | null;
  game_name: string | null;
  created_at: string;
};

const EMBED_FIELD_MAX = 1024;

/** Base URL of the BoostPlatform site (e.g. https://boosting-self.vercel.app). Set SITE_URL in env. */
function getSiteBaseUrl(): string {
  const url = process.env.SITE_URL ?? "";
  return url.replace(/\/$/, "");
}

export function getOrderUrl(orderId: string): string {
  const base = getSiteBaseUrl();
  return base ? `${base}/orders/${orderId}` : "";
}

function truncate(str: string, max: number = EMBED_FIELD_MAX): string {
  if (str.length <= max) return str;
  return str.slice(0, max - 3) + "...";
}

/** Convert snake_case or underscore key to Title Case label. */
function cleanLabel(s: string): string {
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Short readable summary of an item configuration. */
function formatItemConfigSummary(config: Record<string, unknown> | null | undefined): string {
  if (!config || typeof config !== "object") return "";

  const skill = config.skill as string | undefined;
  const segments = config.route_segments as Array<{ from_level?: number; to_level?: number }> | undefined;
  if (skill && Array.isArray(segments) && segments.length > 0) {
    const from = segments[0]?.from_level ?? "?";
    const to = segments[segments.length - 1]?.to_level ?? "?";
    return `${cleanLabel(skill)} — level ${from} → ${to}`;
  }
  if (skill) return cleanLabel(skill);

  const boss = config.boss as string | undefined;
  const kills = config.kills as number | undefined;
  if (boss != null && kills != null) return `${cleanLabel(boss)} · ${kills} kills`;
  if (boss) return cleanLabel(boss);

  const item = config.item as string | undefined;
  if (item) return cleanLabel(item).slice(0, 60);

  const statKeys = Object.keys(config).filter((k) => k.startsWith("stat_"));
  if (statKeys.length > 0) {
    return statKeys
      .slice(0, 4)
      .map((k) => `${cleanLabel(k.replace("stat_", ""))}: ${config[k]}`)
      .join(", ");
  }

  const quantity = config.quantity as number | undefined;
  if (typeof quantity === "number" && quantity > 1) return `×${quantity}`;

  return "";
}

type OrderItem = {
  gameName?: string;
  serviceName?: string;
  quantity?: number;
  finalPrice?: number;
  configuration?: Record<string, unknown>;
};

/** One line per item for the embed. */
function formatOrderItemsLines(items: OrderItem[]): string {
  const lines = items.map((it) => {
    const name = it.serviceName ? cleanLabel(it.serviceName) : "Item";
    const summary = formatItemConfigSummary(it.configuration ?? null);
    const qty = (it.quantity ?? 1) > 1 ? ` ×${it.quantity}` : "";
    const price = typeof it.finalPrice === "number" ? ` — $${it.finalPrice.toFixed(2)}` : "";
    return `• ${name}${summary ? `: ${summary}` : ""}${qty}${price}`;
  });
  return truncate(lines.join("\n"));
}

/** Readable multi-line summary of an order configuration object. */
function formatConfiguration(config: Record<string, unknown> | null | undefined): string {
  if (!config || typeof config !== "object") return "—";

  const lines: string[] = [];
  const skip = new Set(["route_segments", "quests"]);

  // skill + route_segments
  const skill = config.skill as string | undefined;
  const segments = config.route_segments as Array<{ from_level?: number; to_level?: number }> | undefined;
  if (skill) {
    if (Array.isArray(segments) && segments.length > 0) {
      const from = segments[0]?.from_level ?? "?";
      const to = segments[segments.length - 1]?.to_level ?? "?";
      lines.push(`**Skill:** ${cleanLabel(skill)} (level ${from} → ${to})`);
    } else {
      lines.push(`**Skill:** ${cleanLabel(skill)}`);
    }
    skip.add("skill");
  }

  // boss + kills
  const boss = config.boss as string | undefined;
  const kills = config.kills as number | undefined;
  if (boss) {
    lines.push(`**Boss:** ${cleanLabel(boss)}`);
    skip.add("boss");
    if (kills != null) { lines.push(`**Kills:** ${kills}`); skip.add("kills"); }
  }

  // item (quest)
  const item = config.item as string | undefined;
  if (item) { lines.push(`**Quest:** ${cleanLabel(item)}`); skip.add("item"); }

  // quests array
  const quests = config.quests as string[] | undefined;
  if (Array.isArray(quests) && quests.length > 0) {
    lines.push(`**Quests:** ${quests.map(cleanLabel).join(", ")}`);
  }

  // stat_* fields
  const statEntries = Object.entries(config).filter(([k]) => k.startsWith("stat_"));
  if (statEntries.length > 0) {
    const statLines = statEntries.map(([k, v]) => `${cleanLabel(k.replace("stat_", ""))}: ${v}`);
    lines.push(`**Stats:** ${statLines.join(", ")}`);
    for (const [k] of statEntries) skip.add(k);
  }

  // remaining fields
  for (const [k, v] of Object.entries(config)) {
    if (skip.has(k) || k.startsWith("stat_") || k.startsWith("route_")) continue;
    if (v == null || v === "" || v === false) continue;
    if (typeof v === "object") continue; // skip nested objects
    lines.push(`**${cleanLabel(k)}:** ${v}`);
  }

  return lines.length ? truncate(lines.join("\n")) : "—";
}

export function buildOrderEmbed(order: OrderData, title?: string, showPayout = true): EmbedBuilder {
  const color = STATUS_COLORS[order.status] ?? COLORS.primary;
  const statusLabel = STATUS_LABELS[order.status] ?? order.status;

  const items = Array.isArray(order.items) ? (order.items as OrderItem[]) : [];
  const firstItem = items[0];
  const gameValue =
    order.game?.name ?? (firstItem?.gameName as string | undefined) ?? "—";
  const serviceValue =
    order.service?.name ??
    (items.length > 1 ? `${items.length} services` : (firstItem?.serviceName as string | undefined)) ??
    "—";

  const embed = new EmbedBuilder()
    .setColor(color)
    .setTitle(title ?? `📦 Order #${order.order_number}`)
    .addFields(
      { name: "Order #", value: order.order_number, inline: true },
      { name: "Game", value: gameValue, inline: true },
      { name: "Service", value: serviceValue, inline: true },
      { name: "Status", value: statusLabel, inline: true },
      { name: "Amount", value: `$${order.total.toFixed(2)}`, inline: true },
      { name: "Payment", value: [order.payment_method, order.payment_status].filter(Boolean).join(" · ") || "—", inline: true },
    )
    .setTimestamp(new Date(order.created_at))
    .setFooter({ text: "BoostPlatform" });

  if (order.customer?.display_name) {
    embed.addFields({ name: "Customer", value: order.customer.display_name, inline: true });
  }

  // Only show booster payout in admin/worker contexts, never in customer-facing ticket channels
  if (showPayout && order.worker_payout != null) {
    embed.addFields({ name: "Booster payout", value: `$${order.worker_payout.toFixed(2)}`, inline: true });
  }

  if (order.worker?.display_name) {
    embed.addFields({ name: "Booster", value: order.worker.display_name, inline: true });
  }

  if (order.customer_notes) {
    embed.addFields({ name: "Customer notes", value: truncate(order.customer_notes), inline: false });
  }

  if (items.length > 0) {
    embed.addFields({ name: "Items", value: formatOrderItemsLines(items), inline: false });
  } else {
    const configStr = formatConfiguration(order.configuration ?? null);
    if (configStr !== "—") {
      embed.addFields({ name: "Configuration", value: configStr, inline: false });
    }
  }

  if (order.progress != null && order.progress !== undefined && order.progress > 0) {
    const bar = buildProgressBar(order.progress);
    embed.addFields({ name: `Progress — ${order.progress}%`, value: bar, inline: false });
  }

  if (order.progress_notes) {
    embed.addFields({ name: "Note", value: truncate(order.progress_notes), inline: false });
  }

  const orderUrl = getOrderUrl(order.id);
  if (orderUrl) {
    embed.addFields({ name: "Link", value: `[View order on website](${orderUrl})`, inline: false });
    embed.setURL(orderUrl);
  }

  return embed;
}

export function buildNewOrderEmbed(order: OrderData): EmbedBuilder {
  return buildOrderEmbed(order, `🆕 New order — #${order.order_number}`)
    .setColor(COLORS.primary)
    .setDescription("A new order is in the queue and awaiting a booster.");
}

export function buildQueuedOrderEmbed(order: OrderData): EmbedBuilder {
  // Workers channel is public — hide payout amount (personalized payout shown in claim confirmation)
  return buildOrderEmbed(order, `📋 Order available — #${order.order_number}`, false)
    .setColor(COLORS.warning)
    .setDescription("This order has been released and is ready to be claimed.");
}

export function buildCompletedOrderEmbed(order: OrderData): EmbedBuilder {
  return buildOrderEmbed(order, `✅ Order completed — #${order.order_number}`)
    .setColor(COLORS.success)
    .setDescription("The order has been successfully completed!");
}

export function buildWorkerStatsEmbed(stats: WorkerStats): EmbedBuilder {
  const tierText = stats.tier ? `${stats.tier.icon} ${stats.tier.name}` : "No tier";

  return new EmbedBuilder()
    .setColor(COLORS.primary)
    .setTitle(`📊 Stats — ${stats.display_name ?? "Booster"}`)
    .addFields(
      { name: "Tier", value: tierText, inline: true },
      { name: "Completed orders", value: String(stats.total_orders_completed), inline: true },
      { name: "Active orders", value: String(stats.current_active_orders), inline: true },
      { name: "Total earned", value: `$${stats.total_earned.toFixed(2)}`, inline: true },
      { name: "Average rating", value: `⭐ ${stats.average_rating.toFixed(1)}`, inline: true },
    )
    .setTimestamp()
    .setFooter({ text: "BoostPlatform" });
}

export function buildReviewEmbed(review: ReviewData): EmbedBuilder {
  const stars = "⭐".repeat(review.rating) + "☆".repeat(5 - review.rating);
  const RATING_LABELS = ["", "Poor", "Fair", "Good", "Very good", "Excellent"];

  const embed = new EmbedBuilder()
    .setColor(COLORS.warning)
    .setTitle(`${stars} New review — Order #${review.order_number}`)
    .addFields(
      { name: "Rating", value: `${stars} ${RATING_LABELS[review.rating]}`, inline: true },
      { name: "Game", value: review.game_name ?? "—", inline: true },
      { name: "Service", value: review.service_name ?? "—", inline: true },
    )
    .setTimestamp(new Date(review.created_at))
    .setFooter({ text: "BoostPlatform" });

  if (review.reviewer_name) {
    embed.addFields({ name: "Customer", value: review.reviewer_name, inline: true });
  }

  if (review.comment) {
    embed.addFields({ name: "Comment", value: review.comment, inline: false });
  }

  return embed;
}

export function buildErrorEmbed(message: string): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(COLORS.error)
    .setTitle("❌ Error")
    .setDescription(message)
    .setTimestamp();
}

export function buildSuccessEmbed(title: string, description?: string): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setColor(COLORS.success)
    .setTitle(`✅ ${title}`)
    .setTimestamp();
  if (description) embed.setDescription(description);
  return embed;
}

export function buildUpdateEmbed(orderNumber: string, content: string, imageUrl?: string): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setColor(COLORS.info)
    .setTitle(`📡 Update — Order #${orderNumber}`)
    .setDescription(content.replace(/\*\*(.*?)\*\*/g, "**$1**"))
    .setTimestamp()
    .setFooter({ text: "BoostPlatform" });

  if (imageUrl) {
    embed.setImage(imageUrl);
  }

  return embed;
}

function buildProgressBar(progress: number): string {
  const filled = Math.round(progress / 10);
  const empty = 10 - filled;
  return "█".repeat(filled) + "░".repeat(empty) + ` ${progress}%`;
}
