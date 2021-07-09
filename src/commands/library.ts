import Command from ".";

import { PermissionString, CommandInteraction, MessageEmbed } from "discord.js";
import type { Key } from "../database/KeyTable";

export default class KeyCommand extends Command {
  name = 'library';
  description = 'Show your previously won keys'; 
  permissions: Array<PermissionString> = ['SEND_MESSAGES'];
  DMOnly = true;

  async run(interaction: CommandInteraction): Promise<void> {
    const conn = await interaction.client.db.connect();

    const keys: Array<Key> = (await conn.query({
      name: 'KeyCommand_run',
      text: 'SELECT * FROM keys WHERE id IN (SELECT key FROM giveaways WHERE winner=$1);',
      values: [interaction.user.id]
    })).rows;

    if (keys.length === 0) {
      return await interaction.reply({
        content: 'You have not claimed any keys'
      })
    }

    const embed = new MessageEmbed({
      title: 'Your Claimed Keys',
      color: 0x0099ff,
    })

    for (const key of keys) {
      const hidden = '||' + key.value + '||'  // Spoiler
      embed.addField(
        `Key ${key.id.toString(36).toUpperCase()}`,
        (key.message ? `${key.message}: ` : '') + hidden
      );
    }

    await interaction.reply({embeds: [embed]});
  }
}
