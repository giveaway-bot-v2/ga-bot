import Table from './Table';
import { Key } from './KeyTable';

import type { PoolClient } from 'pg';
import type { Snowflake } from 'discord.js';

export interface Giveaway {
  id: number;
  key: number;  // The key ID
  winner: Snowflake | null;
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
  async init(connection?: PoolClient): Promise<void> {
    await (connection || this.database).query(`
      CREATE TABLE IF NOT EXISTS giveaways (
        id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        key INT UNIQUE NOT NULL REFERENCES keys,
        winner BIGINT,
        state SMALLINT DEFAULT 0,
        timestamp TIMESTAMP DEFAULT (NOW() AT TIME ZONE 'UTC')
      );
      -- This will make sure that only one giveaways row has a state other than closed
      CREATE UNIQUE INDEX IF NOT EXISTS giveaway_state_idx ON giveaways (state) WHERE state != 2;
    `);
  }

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
   * Get the currently open giveaway.
   * @param connection The connection to use, defaults to a new connection from the pool
   * @returns The found giveaway, or null.
   */
  async getOpen(connection?: PoolClient): Promise<number> {
    const res = await (connection || this.database).query({
      name: 'GiveawayTable_get',
      text: 'SELECT id FROM giveaways WHERE state = 0 LIMIT 1;',
    });
    return res.rowCount ? res.rows[0].id : null;
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
   * Increment the giveaway's state one step.
   * @param id The ID of the giveaway
   * @param connection The connection to use, defaults to a new connection from the pool
   */
  async incrementState(id: number, connection?: PoolClient): Promise<void> {
    await (connection || this.database).query({
      name: 'GiveawayTable_incrementState',
      text: 'UPDATE giveaways SET state = state + 1 WHERE id = $1;',
      values: [id],
    });
  }
}
