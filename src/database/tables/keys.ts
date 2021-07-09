import Table from './base';

import type { PoolClient } from 'pg';
import type { Snowflake } from 'discord.js';

export interface Key {
  id: number;
  donor_id: bigint;
  value: string;
  message: string;
  claimed: boolean;
}

/**
 * The PostgreSQL keys table
 */
export default class KeyTable extends Table {
  /**
   * Create and return a new key
   * @param value The value of the key
   * @param connection The connection to use, defaults to a new connection from the pool
   * @returns The new key inserted into the table
   */
  async new(donor_id: Snowflake, value: string, message?: string | null, connection?: PoolClient): Promise<Key> {
    const res = await (connection || this.database).query({
      name: 'KeyTable_new',
      text:'INSERT INTO keys (donor_id, value, message) VALUES ($1, $2) RETURNING *;',
      values: [value, message],
    });
    return res.rows[0] as Key;
  }

  /**
   * Get a key by its id
   * @param id The id to lookup with
   * @param connection The connection to use, defaults to a new connection from the pool
   * @returns The key by the specified id
   */
  async get(id: number, connection?: PoolClient): Promise<Key | null> {
    const res = await (connection || this.database).query({
      name: 'KeyTable_get',
      text: 'SELECT * FROM keys WHERE id = $1 LIMIT 1;',
      values: [id],
    });
    return res.rowCount ? res.rows[0] as Key : null;
  }

  /**
   * Get a random claimable key
   * @param connection The connection to use, defaults to a new connection from the pool
   * @returns A random key that is not already claimed
   */
  async getClaimable(connection?: PoolClient): Promise<Key | null> {
    const res = await (connection || this.database).query({
      name: 'KeyTable_getClaimable',
      text: 'SELECT * FROM keys WHERE claimed = FALSE ORDER BY RANDOM() LIMIT 1;',
    });
    return res.rowCount ? res.rows[0] as Key : null;
  }

  /**
   * Claim a specific key
   * @param id The ID of the key
   * @param connection The connection to use, defaults to a new connection from the pool
   */
  async claim(id: number, connection?: PoolClient): Promise<void> {
    await (connection || this.database).query({
      name: 'KeyTable_claim',
      text: 'UPDATE keys SET claimed = TRUE WHERE id=$1;',
      values: [id],
    });
  }
}
