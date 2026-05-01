import type { ChatInputCommandInteraction, ButtonInteraction } from "discord.js";
import { supabase } from "../services/supabase.js";

type AnyInteraction = ChatInputCommandInteraction | ButtonInteraction;

function getSiteUrl(path = ""): string {
  const base = (process.env.SITE_URL ?? "").replace(/\/$/, "");
  if (!base) return path || "the website";
  return `${base}${path}`;
}

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
    const loginUrl = getSiteUrl("/login?redirectTo=/apply");
    const applyUrl = getSiteUrl("/apply");
    const msg = [
      "❌ You do not have a booster account linked to this Discord account.",
      "",
      "**How to link it:**",
      `1. Open ${loginUrl}`,
      "2. Sign in with **Discord** using this Discord account.",
      "3. Make sure your booster application is approved.",
      `4. If you are not a booster yet, apply here: ${applyUrl}`,
      "",
      "After linking/approval, run this command again.",
    ].join("\n");
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
