import Command from ".";

import type { PermissionString, CommandInteraction } from "discord.js";

export default class PingCommand extends Command {
  name = 'reputation';
  description = 'Give the donator of your most recently claimed key reputation';
  permissions: Array<PermissionString> = ['SEND_MESSAGES'];

  async run(interaction: CommandInteraction): Promise<void> {