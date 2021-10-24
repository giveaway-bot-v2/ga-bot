import Command from ".";

import type { PermissionString, CommandInteraction } from "discord.js";

import type { Key } from '../database';

export default class DonateCommand extends Command {
  name = 'donate';
  description = 'Donate a key to be given away.';
  permissions: Array<PermissionString> = ['SEND_MESSAGES'];
  DMOnly = true;
  options = [
    {
      type: 'STRING' as const,
      name: 'keys',
      description: 'Space separated Steam key(s) you would like to donate',
      required: true,
    },
    {
      type: 'STRING' as const,
      name: 'message',
      description: 'An optional message you would like to attach to the key',
      required: false,
    },
  ];

  async run(interaction: CommandInteraction): Promise<void> {
    const conn = await interaction.client.db.connect();  // Use a shared connection

    const msg = interaction.options.get('message')?.value as string | null;

    const keys: Array<Key> = [];
    for (const keyArg of (interaction.options.get('keys')?.value as string).split(' ')) {
      keys.push(await interaction.client.db.keys.new(keyArg, msg, conn));
    }

    await interaction.reply(
      `Thank you for your donation! You donated key(s): ${keys.map(key => key.id.toString(36)).join(', ')}`
    );
    conn.release();
  }
}
