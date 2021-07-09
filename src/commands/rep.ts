import Command from ".";

import type { PermissionString, CommandInteraction } from 'discord.js';

export default class RepCommand extends Command {
  name = 'rep';
  description = 'Either give a good or a bad reputation point to an user.';
  permissions: Array<PermissionString> = ['SEND_MESSAGES'];
  ignoreGuilds = true;
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
    
    const lastGiveaway = await interaction.client.db.giveaways.getLastWonGiveawayBy(interaction.user.id);
    if (lastGiveaway == null) return interaction.reply("You're not allowed to use that command at the moment.");
    const donor_id = lastGiveaway.donor_id;
    
    const rep = interaction.options.get('rep')?.value as string;

    // TODO: Check if the user already gave
    // either a good or a bad reputation point

    switch (rep) {
      case 'good':
        return interaction.client.db.users.incrementRep(donor_id, 1, conn);

      case 'bad':
        return interaction.client.db.users.incrementRep(donor_id, -1, conn);

      default:
        return interaction.reply('Please choose between "good" or "bad"');
    }
  }
}
