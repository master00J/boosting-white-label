import type { Client, Interaction } from "discord.js";
import { logger } from "../lib/logger.js";
import { commands } from "../commands/index.js";
import { handleButtonInteraction } from "./button-handler.js";

export async function onInteractionCreate(client: Client, interaction: Interaction): Promise<void> {
  if (interaction.isChatInputCommand()) {
    const command = commands.get(interaction.commandName);
    if (!command) {
      logger.warn(`Onbekend commando: ${interaction.commandName}`);
      return;
    }

    try {
      await command.execute(interaction);
    } catch (err) {
      logger.error(`Fout bij uitvoeren commando ${interaction.commandName}`, err);
      const reply = { content: "❌ An error occurred while executing this command.", ephemeral: true };
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(reply).catch(() => {});
      } else {
        await interaction.reply(reply).catch(() => {});
      }
    }
  } else if (interaction.isButton()) {
    await handleButtonInteraction(client, interaction);
  }
}
