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
  /**
   * Helper method to give a reputation point to the user.
   * @param interaction The interaction to use.
   * @param increment How much to increment the reputation.
   */
    const conn = await interaction.client.db.connect();
    conn.query('BEGIN;');

    try {
      const lastGiveaway = await interaction.client.db.giveaways.getLastWon(interaction.user.id);
      if (lastGiveaway == null) return interaction.reply("You cannot use this command at the moment.");
      else if (lastGiveaway.rep_given === true) {
        return interaction.reply('A reputation point has already been given to this donor.')
      }

      const lastKey = await interaction.client.db.keys.get(lastGiveaway.key)
      // This should never happen. We do it for the typing.
      if (lastKey == null) return interaction.reply("No key was found on your latest giveaway.");

      await conn.query({
        name: 'RepCommand_giveReputationPoint',
        text: `
          WITH (
            SELECT id, key FROM giveaways WHERE winner = $1 ORDER BY timestamp DESC;
          ) AS last_giveaway;
          UPDATE giveaways SET rep_given = TRUE WHERE id = last_giveaway.id;
          UPDATE users SET reputation = reputation + $2 WHERE user_id = (
            SELECT donor_id FROM keys WHERE id = last_giveaway.key;
          ) RETURNING *;
        `,
        values: [interaction.user.id, increment]
      });

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
