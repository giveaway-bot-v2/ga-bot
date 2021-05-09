import type { PermissionString, CommandInteraction } from "discord.js";
import Command from ".";

export default class PingCommand extends Command {
  name = 'ping';
  description = 'Ping pong!';
  permissions: Array<PermissionString> = ['SEND_MESSAGES'];

  async run(interaction: CommandInteraction): Promise<void> {
    return interaction.reply(`**Pong!** ${interaction.client.ws.ping} ms`);
  }
}
