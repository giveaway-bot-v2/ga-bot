import * as constants from '../constants';
import * as utils from '../utils';
import Event from '.';

import type { PoolClient } from 'pg';

import type { Giveaway } from '../../database/GiveawayTable';

export default class CreateEvent extends Event {

  state = constants.GIVEAWAY_FINISH;

  async listener(giveaway?: Giveaway | null, winner?: null | string, conn?: PoolClient): Promise<void> {
    if (!conn) conn = await this.db.connect();
    if (!giveaway) {
      giveaway = await this.db.giveaways.getUnfinished(conn);
      if (!giveaway) throw new Error('Expected to find unfinished giveaway');
    }
    if (!winner) {
      winner = await this.db.giveaways.getWinner(giveaway);
      if (!winner) throw new Error('Expected to find picked winner to announce');
    }
    await this.db.giveaways.setState(giveaway.id, this.state, conn);
  
    await this.manager.send(utils.generateFinished(giveaway, winner));

    await this.db.giveaways.setState(giveaway.id, -1, conn);
    conn.release();
    this.manager.emit('end');
  }
}
