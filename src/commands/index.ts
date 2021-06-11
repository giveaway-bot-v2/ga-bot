import { Permissions, GuildMember, GuildChannel } from "discord.js";

import type {
  ApplicationCommandData, ApplicationCommandOptionData,
  PermissionString, CommandInteraction,
} from "discord.js";

export default abstract class Command implements ApplicationCommandData {
  // These are official Discord slash commands fields

  /**
   * The name used to invoke the command (1-32 character name matching [\w-]{1,32}).
   * Should always be overriden!
   */
  name = '';  // Default here is because otherwise we'd have to type it as optional.

  /**
   * A 1-100 character description of the command. Should always be overriden.
   */
  description = '';

  /**
   * Arguments that can be passed to the command.
   */
  options?: Array<ApplicationCommandOptionData>;

  /**
   * Whether by default the command should be allowed to be used by anyone.
   * This is different from the custom implemented permission checks!
   */
  defaultPermission = true;

  // The following are fields used in custom checks
  
  /** 
   * Permissions that the bot requires for this command.
   */
  permissions?: Array<PermissionString>;

  /**
   * Permissions that the author needs to have to run this command.
   */
  authorPermissions?: Array<PermissionString>;

  ignoreGuilds = false;
  ignoreNews = false;
  ignoreDMs = false;

  /**
   * Run all command checks to see if the command can be executed
   * @param interaction The command interaction invoked
   * @returns Whether the command can be executed according to checks
   */
  async canRun(interaction: CommandInteraction): Promise<boolean> {

    // The latter condition is to infer the type of CommandInteraction.channel
    if (interaction.guild && interaction.channel instanceof GuildChannel) {
  
      if (this.ignoreGuilds) {
        await interaction.reply('This command is unavailable in guild channels!');
        return false;
      }
  
      if (this.ignoreNews && interaction.channel.type === 'news') {
        await interaction.reply('This command is unavailable in news channels!');
        return false;
      }

      // Check user permissions
      if (this.authorPermissions && interaction.member) {
        // This ternary is to handle a raw APIInteractionGuildMember
        const permissions = interaction.member instanceof GuildMember ?
          interaction.channel.permissionsFor(interaction.member) : new Permissions(BigInt(interaction.member.permissions));

        if (!permissions.has(this.authorPermissions)) {
          await interaction.reply('You do not have permissions to run this command!');
          return false;
        }
      }

      // Check bot permissions
      if (this.permissions && interaction.client.user) {
        const permissions = interaction.channel.permissionsFor(interaction.client.user);
        // If we can't find permissions because of missing cache, give it the benefit of the doubt
        if (permissions && !permissions.has(this.permissions)) {
          await interaction.reply('I do not have sufficient permissions!');
          return false;
        }
      }

      } else {
      // We're in a DM
  
      if (this.ignoreDMs) {
        await interaction.reply('This command is unavailable in DMs!');
        return false;
      }
    }

    // We passed all permission and channel checks, run the custom command check
    return await this.check(interaction);
  }

  /**
   * A custom check implementation
   * @param event The command interaction invoked
   * @returns Whether the command's run method should be executed
   */
  async check(_event: CommandInteraction): Promise<boolean> {
    return true;
  }

  /**
   * The command's actual implementation, must be overriden.
   * @param event The command interaction invoked
   */
  async run(_event: CommandInteraction): Promise<void> {
    throw new Error('Command run method not defined!');
  }
}
