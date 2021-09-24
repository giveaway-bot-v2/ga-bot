import { InteractionCollector, ButtonInteraction } from 'discord.js';

import * as constants from '../constants';
import * as utils from '../utils';
import Event from '.';

import type { PoolClient } from 'pg';

import type { Entry } from '../../database/EntryTable';
import type { Giveaway } from '../../database/GiveawayTable';

export default class PickWinnerEvent extends Event {

  state = constants.GIVEAWAY_PICKWINNER;

  /**
   * Attempt to pick a winner, if successful this will return the givesaway
   * entry otherwise undefined.
   */
  async attempt(giveaway: Giveaway, conn: PoolClient): Promise<Entry | undefined> {
    // No need to stop the giveaway, if the current attempt fails it does
    // not hurt if others have entered whilst this is happening.

    const entry = await this.db.entries.pickRandom(giveaway, conn);
    if (!entry) return;
    // No need to mark entries, the chance of someone being picked once (failing)
    // and then being picked again should be very low. Additionally, if everyone
    // who has entered fails to claim, this implementation means the bot will retry.

    const guild = await this.db.guilds.get(entry.guild_id, conn);
    if (!guild) {
      // This means that the guild removed their webhook since entering the giveaway
      return void await this.db.entries.remove(entry, conn);
    }

    const webhook = utils.newWebhook(this.manager.bot, guild);
    const msg = await webhook.send(utils.generateClaim(giveaway, entry.author_id));
    const collected = await utils.waitForCollect(new InteractionCollector<ButtonInteraction>(
      this.manager.bot,
      {
        filter: (button) => button.user.id === entry.author_id,
        message: msg, max: 1, time: constants.CLAIM_WAIT
      },
    ));

    await webhook.deleteMessage(msg);
    if (!collected) return;

    return entry;
  }

  async listener(giveaway?: Giveaway | null, conn?: PoolClient): Promise<void> {
    if (!conn) conn = await this.db.connect();
    if (!giveaway) {
      giveaway = await this.db.giveaways.getUnfinished(conn);
      if (!giveaway) throw new Error('Expected to find unfinished giveaway');
    }

    await this.db.giveaways.setState(giveaway.id, this.state, conn);
    conn.release();

    await utils.sleep(constants.GIVEAWAY_WAIT);

    conn = await this.db.connect();

    let winner;
    while (!winner) {
      await utils.sleep(constants.WINNER_DELAY);
      winner = await this.attempt(giveaway, conn);
    }

    await this.db.giveaways.setWinner(giveaway, winner, conn);

    this.manager.emit('finish', giveaway, winner.author_id, conn);
  }
}
