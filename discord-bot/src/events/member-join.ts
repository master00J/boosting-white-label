import type { GuildMember } from "discord.js";
import { logger } from "../lib/logger.js";
import { assignRoleToMember } from "../services/role-sync.js";

export async function onMemberJoin(member: GuildMember): Promise<void> {
  logger.info(`Nieuw lid: ${member.user.tag} (${member.user.id})`);

  const customerRoleId = process.env.DISCORD_ROLE_CUSTOMER;
  if (customerRoleId) {
    await assignRoleToMember(member.guild, member.user.id, customerRoleId);
    logger.debug(`Customer role toegewezen aan ${member.user.tag}`);
  }
}
