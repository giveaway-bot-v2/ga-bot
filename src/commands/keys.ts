// I copied this from ping.ts, if you want to read about how it works look at the README.md
// in this folder.
import Command from ".";

import { PermissionString, CommandInteraction, MessageEmbed } from "discord.js";
import type { Key } from "../database/KeyTable";

export default class KeyCommand extends Command {
  name = 'ping';  // CHANGE
  description = 'Ping pong!';  // CHANGE
  permissions: Array<PermissionString> = ['SEND_MESSAGES'];
  // We need to set this to be DM only, take a look at donate.ts

  async run(interaction: CommandInteraction): Promise<void> {
    // Grab a connection
    const conn = await interaction.client.db.connect();

    // keys is an array of Key objects (they have an id, value, and claimed property),
    const keys: Array<Key> = (await conn.query({
      name: 'KeyCommand_run',
      text: 'SELECT * FROM keys WHERE id IN (SELECT key FROM giveaways WHERE winner=$1);',
      values: [interaction.user.id]
    })).rows;

    // Build an embed. How should it look? Should each key have a field, or should it be formatted
    // in the description?
    const embed: MessageEmbed;

    await interaction.reply({
      content: '...',  // Do we want content?
      embeds: [embed],
    });
  }
}
