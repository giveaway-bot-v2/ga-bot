import Table from './Table';

import type { PoolClient } from 'pg';

export interface Key {
  id: number;
  value: string;
  message: string;
  claimed: boolean;
}

/**
 * The PostgreSQL keys table
 */
export default class KeyTable extends Table {
  async init(connection?: PoolClient): Promise<void> {
    await (connection || this.database).query(`
      CREATE TABLE keys (
        id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        value TEXT UNIQUE NOT NULL,
        message VARCHAR(128),
        claimed BOOLEAN NOT NULL DEFAULT FALSE
      );
      CREATE INDEX claimable_keys_idx ON keys (claimed);
    `);
  }

  /**
   * Create and return a new key
   * @param value The value of the key
   * @param connection The connection to use, defaults to a new connection from the pool
   * @returns The new key inserted into the table
   */
  async new(value: string, message?: string | null, connection?: PoolClient): Promise<Key> {
    const res = await (connection || this.database).query({
      name: 'KeyTable_new',
      text:'INSERT INTO keys (value, message) VALUES ($1, $2) RETURNING *;',
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
    return res ? res.rows[0] as Key : null;
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
    return res ? res.rows[0] as Key : null;
  }
}
