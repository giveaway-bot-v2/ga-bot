import path from 'path';
import { promises as fs } from 'fs';  // Use the promises version of the fs API

import { Collection, Client } from 'discord.js';

import Command from './commands';
import Database from './database';

import type { Interaction } from 'discord.js';
import GiveawayManager from './core/GiveawayManager';

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
      if (item.name.startsWith('_') || !item.name.endsWith('.js')) continue;

      const command: Command = new (await import(path.join(resolved, item.name))).default;

      // Even though command has been typed to a Command instance, this provides runtime safety.
      // The second condition makes sure that our abstract Command baseclass doesn't go through.
      if (command instanceof Command && command.name != '') {
        this.set(command.name, command);
      }
    }
  }
}

export default class Bot extends Client {
  db: Database;
  commands: CommandManager;
  giveawayer: GiveawayManager;

  constructor() {
    super({
      allowedMentions: {
        parse: ['users']
      },
      intents: ['GUILDS'],
    });

    this.db = new Database();
    this.db.init();
    this.commands = new CommandManager('./commands');
    this.giveawayer = new GiveawayManager(this);

    // Register events
    this.on('ready', async () => {
      await this.application?.fetch();
      console.log('GiveawayBot started..');
    })
    this.on('ready', this.updateCommands);
    this.on('ready', this.giveawayer.run.bind(this.giveawayer))
    this.on('interactionCreate', this.handleCommands);
    this.on('interactionCreate', this.giveawayer.receiveButton.bind(this.giveawayer));
  }

  /**
   * Make sure Discord is up-to-date with the commands we have registered locally, this
   * will create, edit or delete the commands depending on what is detected to have changed.
   */
  async updateCommands(): Promise<void> {
    if (!this.application) return;

    // We have to do the following in two loops, because either collection could
    // be missing (or having an extra) element

    const online = await this.application.commands.fetch();
    for (const command of online.values()) {
      const local = this.commands.get(command.name);
      if (!local) {
        await command.delete();
        continue;
      }

      if (command.options != local.options || command.description != local.description) {
        await command.edit(local);
        continue;
      }
    }

    for (const [name, command] of this.commands) {
      const found = online.find(elem => elem.name === name);
      if (found) continue;

      await this.application.commands.create(command);
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

// Change the type of discord.js' Client class to have the same properties as our bot subclass.
declare module 'discord.js' {
  interface Client {
    db: Database;
    commands: CommandManager;

    updateCommands(): Promise<void>;
    handleCommands(interaction: Interaction): Promise<void>;
    handleButtons(interaction: Interaction): Promise<void>;
  }
}
