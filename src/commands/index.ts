import type {
  ApplicationCommandData, ApplicationCommandOptionData,
  PermissionString, CommandInteraction,
  GuildChannel, ClientUser,
} from "discord.js";


export default abstract class Command implements ApplicationCommandData {

  // These are official Discord slash commands fields

  /**
   * The name used to invoke the command (1-32 character name matching ^[\w-]{1,32}$).
   * Should always be overriden, default is set to satisfy TypeScript.
   */
  name = '';

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

    if (interaction.guild) {
  
      if (this.ignoreGuilds) {
        await interaction.reply('This command is unavailable in Guild channels!');
        return false;
      }
  
      if (this.ignoreNews && (<GuildChannel>interaction.channel).type == 'news') {
        await interaction.reply('This command is unavailable in news channels!');
        return false;
      }

      // Check user permissions
      if (this.authorPermissions) {
        const permissions = (<GuildChannel>interaction.channel).permissionsFor(interaction.member);
        if (!permissions.has(this.authorPermissions)) {
          await interaction.reply('You do not have permissions to run this command!');
          return false;
        }
      }

      // Check bot permissions
      if (this.permissions) {
        const permissions = (<GuildChannel>interaction.channel).permissionsFor(<ClientUser>interaction.client.user);
        if (!permissions?.has(this.permissions)) {
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
