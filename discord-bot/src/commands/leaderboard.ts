import { SlashCommandBuilder, EmbedBuilder } from "discord.js";
import type { BotCommand } from "./index.js";
import { supabase } from "../services/supabase.js";
import { COLORS } from "../lib/constants.js";

export const leaderboardCommand: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("leaderboard")
    .setDescription("View the top boosters"),

  async execute(interaction) {
    await interaction.deferReply();

    const { data: workers } = await supabase
      .from("workers")
      .select("profile_id, total_orders_completed, average_rating, total_earned, tier:worker_tiers(name, icon)")
      .eq("is_active", true)
      .order("total_orders_completed", { ascending: false })
      .limit(10);

    if (!workers || workers.length === 0) {
      await interaction.editReply({ content: "No boosters found." });
      return;
    }

    const profileIds = workers.map((w) => w.profile_id);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, display_name")
      .in("id", profileIds);

    const profileMap = new Map((profiles ?? []).map((p) => [p.id, p.display_name]));

    const medals = ["🥇", "🥈", "🥉"];
    const lines = workers.map((w, i) => {
      const name = profileMap.get(w.profile_id) ?? "Anonymous";
      const tierData = (Array.isArray(w.tier) ? w.tier[0] : w.tier) as { name: string; icon: string } | null;
      const tierText = tierData ? `${tierData.icon} ${tierData.name}` : "";
      const medal = medals[i] ?? `${i + 1}.`;
      return `${medal} **${name}** ${tierText}\n   ✅ ${w.total_orders_completed} orders · ⭐ ${(w.average_rating ?? 0).toFixed(1)} · 💰 $${(w.total_earned ?? 0).toFixed(2)}`;
    });

    const embed = new EmbedBuilder()
      .setColor(COLORS.primary)
      .setTitle("🏆 Booster Leaderboard")
      .setDescription(lines.join("\n\n"))
      .setTimestamp()
      .setFooter({ text: "BoostPlatform" });

    await interaction.editReply({ embeds: [embed] });
  },
};
