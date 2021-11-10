import Table from './base';

import type { PoolClient } from 'pg';
import type { Snowflake } from 'discord.js';

import { Entry } from './entries';
import type { Key } from './keys';

export interface Giveaway {
  id: number;
  key: number;  // The key ID
  winner: Snowflake | null;
  state: number;
  timestamp: Date;
}

export enum GiveawayState {
  RUNNING,
  PICKING,
  FINISHED,
}

/**
 * The PostgreSQL giveaway table.
 */
export default class GiveawayTable extends Table {
  /**
   * Create a new giveaway.
   * @param key The key or key id that the giveaway is giving away
   * @param connection The connection to use, defaults to a new connection from the pool
   * @returns The new giveaway object.
   */
  async new(key: Key | number, connection?: PoolClient): Promise<Giveaway> {
    const res = await (connection || this.database).query({
      name: 'GiveawayTable_new',
      text: 'INSERT INTO giveaways (key) VALUES ($1) RETURNING *;',
      values: [typeof key === 'number' ? key : key.id],
    });
    return res.rows[0] as Giveaway;
  }

  /**
   * Get a giveaway by its id.
   * @param id The id of the giveaway.
   * @param connection The connection to use, defaults to a new connection from the pool
   * @returns The found giveaway, or null.
   */
  async get(id: number, connection?: PoolClient): Promise<Giveaway | null> {
    const res = await (connection || this.database).query({
      name: 'GiveawayTable_get',
      text: 'SELECT * FROM giveaways WHERE id = $1 LIMIT 1;',
      values: [id],
    });
    return res.rowCount ? res.rows[0] as Giveaway : null;
  }

  /**
   * Get an unfinished giveaway from the table.
   * @param connection The connection to use, defaults to a new connection from the pool
   * @returns The found giveaway that is not finished, or null.
   */
  async getUnfinished(connection?: PoolClient): Promise<Giveaway | null> {
    const res = await (connection || this.database).query({
      name: 'GiveawayTable_getUnifinished',
      text: 'SELECT * FROM giveaways WHERE state != -1 LIMIT 1;',
    });
    return res.rowCount ? res.rows[0] as Giveaway : null;
  }

  /**
   * Get a giveaway by the time it happened, matches the closest giveaway.
   * @param time The time to find the closest match of.
   * @returns The found giveaway, or null.
   */
  async getAround(time: Date, connection?: PoolClient): Promise<Giveaway | null> {
    const res = await (connection || this.database).query({
      name: 'GiveawayTable_getAround',
      text: 'SELECT * FROM giveaways ORDER BY abs(timestamp - date $1) LIMIT 1;',
      values: [time],
    });
    return res.rowCount ? res.rows[0] as Giveaway : null;
  }

  /**
   * Get the latest giveaway the user won.
   * @param id The ID of the user
   * @param connection The connection to use, defaults to a new connection from the pool
   * @returns The latest giveaway found, or null
   */
   async getLastWon(id: Snowflake, connection?: PoolClient): Promise<Giveaway | null> {
    const res = await (connection || this.database).query({
      name: 'GiveawayTable_getLastWon',
      text: 'SELECT * FROM giveaways WHERE winner = $1 ORDER BY timestamp DESC LIMIT 1;',
      values: [id]
    });
    return res ? res.rows[0] as Giveaway : null;
  }

  /**
   * Increment the giveaway's state one step.
   * @param id The ID of the giveaway
   * @param state The new state the giveaway is in
   * @param connection The connection to use, defaults to a new connection from the pool
   */
  async setState(id: number, state: number, connection?: PoolClient): Promise<void> {
    await (connection || this.database).query({
      name: 'GiveawayTable_incrementState',
      text: 'UPDATE giveaways SET state = $2 WHERE id = $1;',
      values: [id, state],
    });
  }

  /**
   * Set the winner of a giveaway.
   * @param giveaway The giveawat the entry won
   * @param entry The entry that won the giveaway
   * @param connection The connection to use, defaults to a new connection from the pool
   */
  async setWinner(giveaway: Giveaway, entry: Entry, connection?: PoolClient): Promise<void> {
    await (connection || this.database).query({
      name: 'GiveawayTable_setWinner',
      text: 'UPDATE giveaways SET winner = $2 WHERE id = $1;',
      values: [giveaway.id, entry.author_id],
    });
  }

  async getWinner(giveaway: Giveaway, connection?: PoolClient): Promise<Snowflake | null> {
    const res = await (connection || this.database).query({
      name: 'GiveawayTable_getWinner',
      text: 'SELECT winner FROM giveaways WHERE id = $1;',
      values: [giveaway.id],
    });
    return res.rowCount ? res.rows[0] as Snowflake : null;
  }
}
