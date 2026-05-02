import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";

export function buildOrderActionRow(orderId: string, orderNumber: string): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`claim_${orderId}`)
      .setLabel(`Claim #${orderNumber}`)
      .setStyle(ButtonStyle.Primary)
      .setEmoji("🤝"),
    new ButtonBuilder()
      .setCustomId(`status_${orderId}`)
      .setLabel("View status")
      .setStyle(ButtonStyle.Secondary)
      .setEmoji("📋"),
  );
}
