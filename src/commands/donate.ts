import Command from ".";

import type { PermissionString, CommandInteraction } from "discord.js";

import type { Key } from '../database/KeyTable';

export default class DonateCommand extends Command {
  name = 'donate';
  description = 'Donate a key to be given away.';
  permissions: Array<PermissionString> = ['SEND_MESSAGES'];
  ignoreGuilds = true;
  options = [
    {
      type: 'STRING' as const,
      name: 'keys',
      description: 'Space separated Steam key(s) you would like to donate',
      required: true,
    }
  ];

  async run(interaction: CommandInteraction): Promise<void> {
    const conn = await interaction.client.db.connect();  // Use a shared connection

    const keys: Array<Key> = [];
    for (const keyArg of (<string>interaction.options.get('keys')?.value).split(' ')) {
      keys.push(await interaction.client.db.keys.new(keyArg, conn));
    }

    await interaction.reply(
      `Thank you for your donation! You donated key(s): ${keys.map(key => key.id.toString(36)).join(', ')}`
    );
  }
}