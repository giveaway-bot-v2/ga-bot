import { Interaction, Webhook } from 'discord.js';
import Cursor from "pg-cursor";

import * as constants from './constants';
import { generateAnnouncement } from './utils';

import type { WebhookMessageOptions, Message } from 'discord.js';
import type { APIMessage } from 'discord-api-types/v8';

import type Bot from '../client';

/**
 * Helper function to sleep for a duration
 * @param ms The time to sleep before resolving
 * @returns A promise that resolves after the duration
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
import type { Guild as GuildRow } from '../database/GuildTable';

export default class GiveawayManager {
  private bot: Bot;

  constructor(bot: Bot) {
    this.bot = bot;
  }

  /**
   * Start the giveaway loop when the bot hit READY.
   */
  async start(): Promise<void> {
    while (true) {
      await this.new();
      await sleep(constants.GIVEAWAY_DELAY);
    }
  }

  /**
   * Process a new giveaway
   */
  async new(): Promise<void> {
    const conn = await this.bot.db.connect();

    try {
      await conn.query('BEGIN;');  // Begin a transaction

      const key = await this.bot.db.keys.getClaimable(conn);
      if (!key) return;  // There's no claimable keys

      const giveaway = await this.bot.db.giveaways.new(key);
      await this.bot.db.keys.claim(key.id);
      // Announce the giveaway asynchronously
      this.send(generateAnnouncement(giveaway));
    } catch (err) {
      await conn.query('ROLLBACK;');
    } finally {
      await conn.query('COMMIT;');
      conn.release();
    }

    await sleep(constants.GIVEAWAY_WAIT);
  }

  async receiveButton(interaction: Interaction): Promise<void> {
    if (!interaction.isButton()) return;
    if (!interaction.customId.startsWith('GIVEAWAY-')) return;

    await interaction.reply({content: `You have entered ${interaction.customId}`, ephemeral: true});

  /**
   * Send a guild's webhook
   * @param record The guild record
   * @param options Options to pass to Webhook#send
   * @returns The message sent
   */
  sendWebhook(record: GuildRow, options: WebhookMessageOptions): Promise<Message | APIMessage> {
    return new Webhook(this.bot, { id: record.webhook_id, token: record.webhook_token }).send(options);
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
}
