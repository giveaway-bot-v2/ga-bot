import Command from ".";

import type { PermissionString, CommandInteraction } from 'discord.js';

export default class RepCommand extends Command {
  name = 'rep';
  description = 'Either give a good or a bad reputation point to an user.';
  permissions: Array<PermissionString> = ['SEND_MESSAGES'];
  DMOnly = true;
  options = [
    {
      type: 'STRING' as const,
      name: 'rep',
      description: 'Use the words "good" or "bad"',
      required: true
    }
  ];

  async run(interaction: CommandInteraction): Promise<void> {
    const conn = await interaction.client.db.connect();
    
    const lastGiveaway = await interaction.client.db.giveaways.getLastWon(interaction.user.id);
    if (lastGiveaway == null) return interaction.reply("You're not allowed to use that command at the moment.");

    const lastKey = await interaction.client.db.keys.get(lastGiveaway.key)
    if (lastKey == null) return interaction.reply("You're not allowed to use that command at the moment.");

    // TODO: Check if the user already gave a reputation point

    switch (interaction.options.get('rep')?.value) {
      case 'good':
        await interaction.client.db.users.incrementRep(lastKey.donor_id, 1, conn);
        conn.release();
        return interaction.reply('A good reputation point has been given.');

      case 'bad':
        await interaction.client.db.users.incrementRep(lastKey.donor_id, -1, conn);
        conn.release();
        return interaction.reply('A bad reputation point has been given.');

      default:
        conn.release();
        return interaction.reply('Please choose between "good" or "bad"');
    }
  }
}
