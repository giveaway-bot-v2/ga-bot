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

  /**
   * Helper method to give a reputation point to the user.
   * @param interaction The interaction to use.
   * @param increment How much to increment the reputation.
   */
  async give(interaction: CommandInteraction, increment: number): Promise<boolean> {
    const conn = await interaction.client.db.connect();
    conn.query('BEGIN;');

    try {
      const lastGiveaway = await interaction.client.db.giveaways.getLastWon(interaction.user.id);
      if (lastGiveaway == null) {
        await interaction.reply("You cannot use this command at the moment.");
        return false;
      } else if (lastGiveaway.rep_given === true) {
        await interaction.reply('A reputation point has already been given to this donor.')
        return false;
      }

      const lastKey = await interaction.client.db.keys.get(lastGiveaway.key)
      // This should never happen. We do it for the typing.
      if (lastKey == null) {
        await interaction.reply("No key was found on your latest giveaway.");
        return false;
      }

      await interaction.client.db.reputation.append(lastKey.donator, increment);

      await conn.query('COMMIT;');
      return true;
    } catch {
      await conn.query('ROLLBACK;');
      return false;
    } finally {
      conn.release();
    }
  }

  async good(interaction: CommandInteraction): Promise<void> {
    if (await this.give(interaction, 1)) {
      await interaction.reply('A good reputation point has been given.');
    }
  }

  async bad(interaction: CommandInteraction): Promise<void> {
    if (await this.give(interaction, -1)) {
      return interaction.reply('A bad reputation point has been given.');
    }
  }
}
