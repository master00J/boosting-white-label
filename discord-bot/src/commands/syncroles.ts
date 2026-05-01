import { SlashCommandBuilder } from "discord.js";
import type { BotCommand } from "./index.js";
import { requireAdmin } from "../lib/permissions.js";
import { buildSuccessEmbed, buildErrorEmbed } from "../lib/embeds.js";
import { importDiscordRolesAsTiers } from "../services/tier-sync.js";

export const syncRolesCommand: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("syncroles")
    .setDescription("[Admin] Import existing Discord roles as worker tiers on the website"),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const isAdmin = await requireAdmin(interaction);
    if (!isAdmin) return;

    if (!interaction.client) {
      await interaction.editReply({ embeds: [buildErrorEmbed("No client available.")] });
      return;
    }

    try {
      const { created, skipped, errors } = await importDiscordRolesAsTiers(interaction.client);

      const lines: string[] = [];
      if (created > 0) lines.push(`✅ **${created}** new tier${created !== 1 ? "s" : ""} created from Discord roles`);
      if (skipped > 0) lines.push(`⏭️ **${skipped}** role${skipped !== 1 ? "s" : ""} already linked — skipped`);
      if (errors > 0) lines.push(`❌ **${errors}** error${errors !== 1 ? "s" : ""} (check bot logs)`);
      if (created === 0 && errors === 0) lines.push("All Discord roles are already linked to tiers.");

      await interaction.editReply({
        embeds: [buildSuccessEmbed("Role sync complete", lines.join("\n"))],
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      await interaction.editReply({ embeds: [buildErrorEmbed(`Sync failed: ${msg}`)] });
    }
  },
};
