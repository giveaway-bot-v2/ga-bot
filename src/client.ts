import path from 'path';
import { promises as fs } from 'fs';  // Use the promises version of the fs API

import { Collection, Client } from 'discord.js';

import Command from './commands';
import Database from './database';

import type { Interaction } from 'discord.js';

/**
 * A collection of commands
 */
class CommandManager extends Collection<string, Command> {

  /**
   * @param dir An optional path to a directory with commands
   */
  constructor(dir?: string) {
    super();
    if (dir) this.loadDir(dir);
  }

  /**
   * Recursively import and load all commands in the specified directory
   * @param dir The relative directory to scan for commands
   */
  async loadDir(dir: string): Promise<void> {
    const resolved = path.resolve(__dirname, dir);

    for (const item of await fs.readdir(resolved, { withFileTypes: true })) {
      if (item.isDirectory()) await this.loadDir(resolved + item.name);

      // If we want a file to be ignored we can prefix it with _
      if (!item.name.startsWith('_') && item.name.endsWith('.js')) {
        const command: Command = new (await import(path.join(resolved, item.name))).default;

        // Even though command has been typed to a Command instance, this provides runtime safety.
        // The second condition makes sure that our abstract Command baseclass doesn't go through.
        if (command instanceof Command && command.name != '') {
          this.set(command.name, command);
        }
      }
    }
  }
}

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
      // For testing (global commands can take an hour to register):
      // this.guilds.cache.get('GUILD_ID')?.commands.create(command);

      // For production
      this.application.commands.create(command);
    }
  }

  /**
   * Safely handle an interaction and execute any triggered slash commands.
   * @param interaction The interaction that was sent from Discord.
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
