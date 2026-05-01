import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";

export function buildOrderActionRow(orderId: string, orderNumber: string): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`claim_${orderId}`)
      .setLabel(`Claimen #${orderNumber}`)
      .setStyle(ButtonStyle.Primary)
      .setEmoji("🤝"),
    new ButtonBuilder()
      .setCustomId(`status_${orderId}`)
      .setLabel("Status bekijken")
      .setStyle(ButtonStyle.Secondary)
      .setEmoji("📋"),
  );
}

export function buildProgressRow(orderId: string): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`progress_25_${orderId}`)
      .setLabel("25%")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`progress_50_${orderId}`)
      .setLabel("50%")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`progress_75_${orderId}`)
      .setLabel("75%")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`progress_100_${orderId}`)
      .setLabel("100% — Voltooien")
      .setStyle(ButtonStyle.Success),
  );
}
