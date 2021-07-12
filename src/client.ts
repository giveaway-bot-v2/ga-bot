import path from 'path';
import { promises as fs } from 'fs';  // Use the promises version of the fs API

import { Collection, Client, DMChannel, GuildChannel, TextChannel } from 'discord.js';

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
    this.on('ready', this.createCommands);
    this.on('ready', this.giveawayer.start.bind(this.giveawayer))
    this.on('interactionCreate', this.handleCommands);
    this.on('interactionCreate', this.giveawayer.receiveButton.bind(this.giveawayer));
    // TODO: Register the event to listen to:
    // https://discord.js.org/#/docs/main/master/class/Client?scrollTo=e-webhookUpdate
    // https://discord.js.org/#/docs/main/master/class/Client?scrollTo=e-channelDelete
    ...
  }

  /**
   * Create Discord slash commands for all registered commands,
   * cannot be called before the Client has fully connected to Discord.
   */
  createCommands(): void {
    if (!this.application) return;

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

  /**
   * ...
   * @param channel The channel that was updated, or deleted
   */
  // TODO: Name this function and configure JSDoc ^^^^^
  async ...(channel: DMChannel | GuildChannel): Promise<void> {
    if (!(channel instanceof TextChannel)) return;

    // TODO: Get the channel's webhooks. This may fail, put it in a try / catch?
    const webhooks = ...;

    // TODO: How do we convert an array of objects, into an array of one of its properties?
    // We need an array of Ids from the webhooks
    const guild = await channel.client.db.guilds.removeByWebhooks(...);

    if (!guild) {
      // No guild was found, probably another webhook was deleted
      // TODO: What do you want to do?
      ...
      return;
    }

    // If we reach here, it probaly was our webhook that we deleted...
    // TODO: What do you want to do? Perhaps let the user know? Leave the guild? DM the owner?
    ...

  }
}

// Change the type of discord.js' Client class to have the same properties as our bot subclass.
declare module 'discord.js' {
  interface Client {
    db: Database;
    commands: CommandManager;

    createCommands(): void;
    handleCommands(interaction: Interaction): Promise<void>;
    handleButtons(interaction: Interaction): Promise<void>;
    // TODO: Insert the name
    ...(channel: DMChannel | GuildChannel): Promise<void>
  }
}
