import { Client } from 'discord.js';
import type { Interaction } from 'discord.js';
import CommandManager from './CommandManager';
import Database from '../database';

export default class Bot extends Client {
  db: Database;

  commands: CommandManager;

  constructor() {
    super({
      allowedMentions: {
        parse: ['users']
      },
      intents: ['GUILDS'],
    });

    this.db = new Database();
    this.commands = new CommandManager('./commands');

    // Register events
    this.on('ready', this.createCommands);
    this.on('interaction', this.handleCommands);
  }

  /**
   * Create Discord slash commands for all registered commands,
   * cannot be called before the Client has fully connected to Discord.
   */
  createCommands(): void {
    if (!this.application) {
      throw new Error('Client must have reached READY before creating commands!');
    }

    for (const command of this.commands.values()) {
      this.application.commands.create(command);
    }
  }

  /**
   * Safely handle an interaction and execute any triggered slash commands.
   * @param interaction The interaction that was sent from Discord
   */
  async handleCommands(interaction: Interaction): Promise<void> {
    if (!interaction.isCommand()) return;
    // interaction is now confirmed to be an instance of CommandInteraction

    const command = this.commands.get(interaction.commandName);
    if (!command) {
      // You can't trigger a command we haven't registered. Something is wrong internally or
      // an edit in global commands haven't propogated yet (it can take up to one hour).
      return await interaction.reply(
        "Command not found, this shouldn't happen. Please try again later or contact the developers."
      );
    }

    command.canRun(interaction).then((value: boolean) => {
      if(!value) return;  // The command shouldn't run, canRun has handled responding to the user.
      command.run(interaction);
    });
  }
}
