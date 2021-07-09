// I copied this from ping.ts, if you want to read about how it works look at the README.md
// in this folder.
import Command from ".";

import { PermissionString, CommandInteraction, MessageEmbed } from "discord.js";
import type { Key } from "../database/KeyTable";

export default class KeyCommand extends Command {
  name = 'library';
  description = 'Show your previously won keys'; 
  permissions: Array<PermissionString> = ['SEND_MESSAGES'];
  ignoreGuilds = true;

  async run(interaction: CommandInteraction): Promise<void> {
    // Grab a connection
    const conn = await interaction.client.db.connect();

    const keys: Array<Key> = (await conn.query({
      name: 'KeyCommand_run',
      text: 'SELECT * FROM keys WHERE id IN (SELECT key FROM giveaways WHERE winner=$1);',
      values: [interaction.user.id]
    })).rows;

    const embed = new MessageEmbed({
      title: 'Your Claimed Keys',
      color: 0x0099ff,
    })

    for (const key of keys) {
      /* Here is the interface:
      export interface Key {
        id: number;  // key.id
        value: string;  // key.value
        message: string;  // key.message
        claimed: boolean;  // key.claimed  (this one doesn't really matter)
      }
      */
      const hidden = '||' + key.value + '||'  // Spoiler
      // I was just thinking it goes something on each line like: Game - Key
      // Yeah, but what should the field name be? (the "key title")
      // Let's start: You need to call this function to add a field. But perhaps we want to format something?
      embed.addField(
        `Key ${key.id.toString(36).toUpperCase()}`,
        (key.message ? `${key.message}: ` : '') + hidden
      );
    }

    await interaction.reply({
      embeds: [embed],
    });
  }
}
