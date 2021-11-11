import EventEmitter from 'events';
import { promises as fs } from 'fs';  // Use the promises version of the fs API
import path from 'path';

import { Guild, Interaction } from 'discord.js';
import Cursor from "pg-cursor";

import Event from './events';
import * as constants from './constants';
import * as utils from './utils';

import type { WebhookMessageOptions, Message } from 'discord.js';
import type { APIMessage } from 'discord-api-types/v9';

import type Bot from '../client';
import type { Guild as GuildRow } from '../database';

export default class GiveawayManager extends EventEmitter {
  readonly bot: Bot;

 events: Map<number, string>;

  constructor(bot: Bot, dir?: string) {
    super()
    this.bot = bot;
    this.events = new Map();
    this.loadEvents(dir ?? './events');
  }

  /**
   * Import and load all events in a directory.
   * @param dir The relative directory to scan for events
   */
  async loadEvents(dir: string): Promise<void> {
    // This is very similar to the one defined for CommandManager
    const resolved = path.resolve(__dirname, dir);

    for (const item of await fs.readdir(resolved, { withFileTypes: true })) {
      if (item.name.startsWith('_')) continue;
      if (item.isDirectory()) await this.loadEvents(resolved + item.name);
  
      if (!item.name.endsWith('.js')) continue;
  
      const event: Event = new (await import(path.join(resolved, item.name))).default(this);
  
      // This if-statement provides runtime safety
      if (event instanceof Event && item.name != 'index.js') {
        const name = item.name.slice(0, -3);

        this.events.set(event.state, name);
        this.on(name, event.listener.bind(event));
      }
    }
  }

  /**
   * Recover the last ran giveaway in the event that the bot was interrupted in
   * the middle of one.
   */
  async recover(): Promise<void> {
    const giveaway = await this.bot.db.giveaways.getUnfinished();
    if (!giveaway) return;  // There is no unfinished giveaway
  
    const event = this.events.get(giveaway.state);
    if (!event) return;

    this.emit(event);
    await new Promise(async (resolve) => this.once('end', resolve));
  }

  /**
   * Run the main giveaway loop, this function is never meant to return
   */
  async run(): Promise<never> {
    await this.bot.migration;
    await this.recover();  // Attempt to recover the last running giveaway

    while (true) {
      this.emit('start');

      // By doing this we won't cause recursion errors because the 'close' listener
      // doesn't call 'start' again. The promise will be resolved when close is called,
      // so this `await` will wait until a complete giveaway has been done.
      await new Promise(async (resolve) => this.once('end', resolve));

      // Sleep between each giveaway
      await utils.sleep(constants.GIVEAWAY_DELAY);
    }
  }

  /**
   * Send a guild's webhook
   * @param record The guild record
   * @param options Options to pass to Webhook#send
   * @returns The message sent
   */
  sendWebhook(record: GuildRow, options: WebhookMessageOptions): Promise<Message | APIMessage> {
    return utils.newWebhook(this.bot, record).send(options);
  }

  /**
   * Send a message to all guilds through the bot's webhook in every guild
   * @param args The arguments to pass to Webhook.send for every guild
   * @returns The number of messages delivered
   */
  async send(options: WebhookMessageOptions): Promise<Array<Message | APIMessage>> {
    const conn = await this.bot.db.connect();
    const cursor = conn.query(new Cursor('SELECT webhook_id, webhook_token FROM guilds;'));

    // If we instead await each send() individually we will spend a singificant amount of time
    // waiting for the request to return before sending the next one. This can be calculated
    // as t*n, t is the ping (time to make the request) and n is the number of webhooks.
    // Using Promise.all we can send all requests and then wait for them to all return,
    // this turns t*n into t*1 because we wait for all requests at the same time.
    const promises: Array<Promise<Message | APIMessage>> = [];

    // Use a cursor object to loop through all webhooks and send the message
    while (true) {

      // Read multiple records in batch
      const rows = await cursor.read(constants.WEBHOOK_BATCH);
      if (!rows.length) break;  // End of the table

      promises.push(...rows.map(record => this.sendWebhook(record, options)));
    }

    conn.release();
    return await Promise.all(promises)
  }

  async receiveButton(interaction: Interaction): Promise<void> {
    if (!interaction.isButton()) return;
    if (!interaction.customId.startsWith('GIVEAWAY-')) return;

    const giveaway = await interaction.client.db.giveaways.getUnfinished();
    if (
      !giveaway ||  // There is no giveaway running
      utils.getId(interaction.customId) != giveaway.id ||  // This is not the running giveaway
      giveaway.state != constants.GIVEAWAY_PICKWINNER  // The running giveaway is not accepting entries
    ) {
      return await interaction.reply({
        content: 'This giveaway is not accepting entries.',
        ephemeral: true
      })
    }

    const inserted = await interaction.client.db.entries.new(
      utils.getId(interaction.customId), (<Guild>interaction.guild).id, interaction.user.id
    );

    await interaction.reply({
      // If no new entry was created, tell the user they have already entered
      content: `You ${!inserted ? 'have already ' : ''}entered ${interaction.customId}`,
      ephemeral: true
    });
  }
}
