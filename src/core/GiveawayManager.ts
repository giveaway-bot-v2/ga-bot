import { ButtonInteraction, Guild, Interaction, InteractionCollector } from 'discord.js';
import Cursor from "pg-cursor";

import * as constants from './constants';
import * as utils from './utils';

import type { WebhookMessageOptions, Message } from 'discord.js';
import type { APIMessage } from 'discord-api-types/v8';
import type { PoolClient } from 'pg';

import type Bot from '../client';
import type { Giveaway } from '../database/GiveawayTable';
import type { Guild as GuildRow } from '../database/GuildTable';
import { Entry } from '../database/EntryTable';

export default class GiveawayManager {
  private bot: Bot;

  constructor(bot: Bot) {
    this.bot = bot;
  }

  /**
   * Run the main giveaway loop, this function is never meant to return
   */
  async run(): Promise<never> {
    while (true) {
      await this.start();
      await utils.sleep(constants.GIVEAWAY_DELAY);
    }
  }

  /**
   * Start a new giveaway, taking care of one complete giveaway start to finish.
   * This function should be put in a loop with a timeout afterwards.
   */
  async start(): Promise<void> {
    const giveaway = await this.create();
    if (!giveaway) return;  // Something failed or no key was found

    await this.send(utils.generateAnnouncement(giveaway));
    await utils.sleep(constants.GIVEAWAY_WAIT);

    let winner;
    const conn = await this.bot.db.connect();
    while (!winner) {
      await utils.sleep(constants.WINNER_DELAY);
      winner = await this.pickWinner(giveaway, conn);
    }

    await this.send(utils.generateFinished(giveaway, winner.author_id));
    conn.release();
  }

  /**
   * Create a new giveaway
   */
  async create(): Promise<Giveaway | undefined> {
    const conn = await this.bot.db.connect();

    try {
      await conn.query('BEGIN;');  // Begin a transaction

      const key = await this.bot.db.keys.getClaimable(conn);
      if (!key) return;  // There's no claimable keys

      const giveaway = await this.bot.db.giveaways.new(key, conn);
      await this.bot.db.keys.claim(key.id, conn);

      await conn.query('COMMIT;');
      return giveaway;
    } catch (err) {
      await conn.query('ROLLBACK;');
    } finally {
      conn.release();
    }
  }

  /**
   * Attempt to pick a winner. If the winner successfully claims the key, the entry is
   * returned, otherwise undefined and the function should be called again.
   * @param giveaway The giveaway to pick a winner for
   * @param conn The connection to use to query the database with
   * @returns The entry that claimed the key
   */
  async pickWinner(giveaway: Giveaway, conn: PoolClient): Promise<Entry | undefined> {
    // No need to stop the giveaway, if the current attempt fails it does
    // not hurt if others have entered whilst this is happening.

    const entry = await this.bot.db.entries.pickRandom(giveaway, conn);
    if (!entry) return;
    // No need to mark entries, the chance of someone being picked once (failing)
    // and then being picked again should be very low. Additionally, if everyone
    // who has entered fails to claim, this implementation means the bot will retry.

    const guild = await this.bot.db.guilds.get(entry.guild_id, conn);
    if (!guild) {
      // This means that the guild removed their webhook since entering the giveaway
      return void await this.bot.db.entries.remove(entry, conn);
    }

    const webhook = utils.newWebhook(this.bot, guild);
    const msg = await webhook.send(utils.generateClaim(giveaway, entry.author_id));
    const collected = await utils.waitForCollect(new InteractionCollector<ButtonInteraction>(
      this.bot,
      {
        filter: (button) => button.user.id === entry.author_id,
        message: msg, max: 1, time: constants.CLAIM_WAIT
      },
    ));

    await webhook.deleteMessage(msg);
    if (!collected) return;

    return entry;
  }

  async receiveButton(interaction: Interaction): Promise<void> {
    if (!interaction.isButton()) return;
    if (!interaction.customId.startsWith('GIVEAWAY-')) return;

    const inserted = await interaction.client.db.entries.new(
      utils.getId(interaction.customId), (<Guild>interaction.guild).id, interaction.user.id
    );

    await interaction.reply({
      // If no new entry was created, tell the user they have already entered
      content: `You ${!inserted ? 'have already ' : ''}entered ${interaction.customId}`,
      ephemeral: true
    });
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
}
