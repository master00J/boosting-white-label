import type { ChatInputCommandInteraction, ButtonInteraction } from "discord.js";
import { supabase } from "../services/supabase.js";
import { getConfig } from "../services/config.js";

type AnyInteraction = ChatInputCommandInteraction | ButtonInteraction;

function normalizeOrigin(raw: string): string {
  return raw.trim().replace(/\/$/, "");
}

/** Public shop URL: env first, then site_settings.site_url (Admin → General). */
function getPublicSiteBaseUrl(): string {
  const fromEnv =
    process.env.SITE_URL?.trim() ||
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    "";
  if (fromEnv) return normalizeOrigin(fromEnv);
  return normalizeOrigin(getConfig("site_url")?.trim() ?? "");
}

function absoluteShopUrl(path: string): string | null {
  const base = getPublicSiteBaseUrl();
  if (!base) return null;
  const suffix = path.startsWith("/") ? path : `/${path}`;
  return `${base}${suffix}`;
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
    const loginUrl = absoluteShopUrl("/login?redirectTo=/apply");
    const applyUrl = absoluteShopUrl("/apply");
    const steps =
      loginUrl && applyUrl
        ? [
            `1. Open: ${loginUrl}`,
            "2. Sign in with **Discord** using this Discord account.",
            "3. Make sure your booster application is approved.",
            `4. If you are not a booster yet, apply here: ${applyUrl}`,
          ]
        : [
            "1. Open your boosting website in a browser (use the shop link from your server — ask staff if you are unsure).",
            "2. Go to **Login**, then sign in with **Discord** using this same Discord account.",
            "3. Make sure your booster application is approved.",
            "4. If you are not a booster yet, open the **Apply** page on that same website.",
          ];
    const msg = [
      "❌ You do not have a booster account linked to this Discord account.",
      "",
      "**How to link it:**",
      ...steps,
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
