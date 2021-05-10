import type { Client } from 'pg';

import Table from './Table';

export interface Key {
  id: number;
  value: string;
  claimed: boolean;
}

/**
 * The PostgreSQL keys table
 */
export default class KeyTable extends Table {
  async init(connection?: Client): Promise<void> {
    await (connection || this.database).query(`
      CREATE TABLE keys (
        id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        value TEXT UNIQUE NOT NULL,
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
  async new(value: string, connection?: Client): Promise<Key> {
    const res = await (connection || this.database).query({
      name: 'KeyTable_new',
      text:'INSERT INTO keys (value) VALUES ($1) RETURNING *;',
      values: [value],
    });
    return res.rows[0] as Key;
  }

  /**
   * Get a key by its id
   * @param id The id to lookup with
   * @param connection The connection to use, defaults to a new connection from the pool
   * @returns The key by the specified id
   */
  async get(id: number, connection?: Client): Promise<Key | null> {
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
  async getClaimable(connection?: Client): Promise<Key | null> {
    const res = await (connection || this.database).query({
      name: 'KeyTable_getClaimable',
      text: 'SELECT * FROM keys WHERE claimed = FALSE ORDER BY RANDOM() LIMIT 1;',
    });
    return res ? res.rows[0] as Key : null;
  }
}
