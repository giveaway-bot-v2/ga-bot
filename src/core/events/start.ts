import * as constants from '../constants';
import * as utils from '../utils';
import Event from '.';

import type { Giveaway } from '../../database';

export default class CreateEvent extends Event {

  state = constants.GIVEAWAY_CREATE;

  async new(): Promise<Giveaway | undefined> {
    const conn = await this.db.connect();

    try {
      await conn.query('BEGIN;');  // Begin a transaction

      const key = await this.db.keys.getClaimable(conn);
      if (!key) return;  // There's no claimable keys

      const giveaway = await this.db.giveaways.new(key, conn);
      await this.db.keys.claim(key.id, conn);

      await conn.query('COMMIT;');
      return giveaway;
    } catch (err) {
      await conn.query('ROLLBACK;');
      // console.error(err);
    } finally {
      conn.release();
    }
  }

  async listener(): Promise<void> {
    const giveaway = await this.new();
    if (!giveaway) return void this.manager.emit('end');

    await this.manager.send(utils.generateAnnouncement(giveaway));
    this.manager.emit('pickWinner', giveaway);
  }
}
