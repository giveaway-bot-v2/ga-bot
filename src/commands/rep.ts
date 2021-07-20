import Command from ".";

import type { PermissionString, CommandInteraction } from 'discord.js';

export default class RepCommand extends Command {
  name = 'rep';
  description = 'Give the donator of your last won giveaway a reputation point.';
  permissions: Array<PermissionString> = ['SEND_MESSAGES'];
  DMOnly = true;
  options = [
    {
      type: 'SUB_COMMAND' as const,
      name: 'good',
      description: 'Give a good reputation point',
    },
    {
      type: 'SUB_COMMAND' as const,
      name: 'bad',
      description: 'Give a bad reputation point',
    }
  ];

  async give(interaction: CommandInteraction, increment: number): Promise<void> {
    const conn = await interaction.client.db.connect();
    conn.query('BEGIN;');

    try {
      const lastGiveaway = await interaction.client.db.giveaways.getLastWon(interaction.user.id);
      if (lastGiveaway == null) return interaction.reply("You cannot use this command at the moment.");
      if (lastGiveaway.rep_given === true) {
        return interaction.reply('A reputation point has already been given to this donor.')
      }

      const lastKey = await interaction.client.db.keys.get(lastGiveaway.key)
      // This should never happen. We do it for the typing.
      if (lastKey == null) return interaction.reply("No key was found on your latest giveaway.");

      await interaction.client.db.users.incrementRep(lastKey.donor_id, increment, conn);
      await interaction.client.db.giveaways.setRepGiven(lastGiveaway.id, true, conn);
      await conn.query('COMMIT;');
    } catch {
      await conn.query('ROLLBACK;');
    } finally {
      conn.release();
    }
  }

  async good(interaction: CommandInteraction): Promise<void> {
    await this.give(interaction, 1)
    
    return interaction.reply('A good reputation point has been given.');
  }

  async bad(interaction: CommandInteraction): Promise<void> {
    await this.give(interaction, -1)
    
    return interaction.reply('A bad reputation point has been given.');
  }
}
