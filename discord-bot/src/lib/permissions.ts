import type { ChatInputCommandInteraction, ButtonInteraction } from "discord.js";
import { supabase } from "../services/supabase.js";

type AnyInteraction = ChatInputCommandInteraction | ButtonInteraction;

export async function getWorkerByDiscordId(discordId: string) {
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, display_name")
    .eq("discord_id", discordId)
    .single();

  if (!profile) return null;

  const { data: worker } = await supabase
    .from("workers")
    .select("id, is_active, tier_id, current_active_orders, max_active_orders, total_earned, total_orders_completed, average_rating, commission_rate, deposit_paid")
    .eq("profile_id", profile.id)
    .single();

  return { profile, worker };
}

export async function requireWorker(
  interaction: AnyInteraction,
): Promise<{ profileId: string; workerId: string; displayName: string } | null> {
  const result = await getWorkerByDiscordId(interaction.user.id);

  if (!result?.worker) {
    const msg = "❌ You do not have a booster account linked to this Discord account. Link your account on the website.";
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply({ content: msg }).catch(() => {});
    } else {
      await interaction.reply({ content: msg, ephemeral: true }).catch(() => {});
    }
    return null;
  }

  if (!result.worker.is_active) {
    const msg = "❌ Your booster account is not active. Contact an admin.";
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply({ content: msg }).catch(() => {});
    } else {
      await interaction.reply({ content: msg, ephemeral: true }).catch(() => {});
    }
    return null;
  }

  return {
    profileId: result.profile.id,
    workerId: result.worker.id,
    displayName: result.profile.display_name ?? interaction.user.username,
  };
}

export async function requireAdmin(interaction: AnyInteraction): Promise<boolean> {
  const result = await getWorkerByDiscordId(interaction.user.id);

  if (!result?.profile || !["admin", "super_admin"].includes(result.profile.role)) {
    const msg = "❌ You do not have admin permissions for this command.";
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply({ content: msg }).catch(() => {});
    } else {
      await interaction.reply({ content: msg, ephemeral: true }).catch(() => {});
    }
    return false;
  }

  return true;
}
