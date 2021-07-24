import Table from './Table';

import type { PoolClient } from 'pg';
import type { Snowflake } from 'discord.js';

/**
 * An inserted User row
 */
export interface User {
  user_id: Snowflake;
  reputation: number;
  donated_keys: number;
  claimed_keys: number;
}

/**
 * The PostgreSQL users table
 */
export default class UserTable extends Table {
  async init(connection?: PoolClient): Promise<void> {
    await (connection || this.database).query(`
      CREATE TABLE IF NOT EXISTS users (
        user_id BIGINT PRIMARY KEY,
        reputation NOT NULL DEFAULT 0,
        donated_keys NOT NULL DEFAULT 0,
        claimed_keys NOT NULL DEFAULT 0
      )
    `);
  }
  
  /**
   * Insert or update a user (upsert).
   * @param id The ID of the user
   * @param reputation The reputation of the user
   * @param connection The connection to use, defaults to a new connection from the pool
   * @returns The new or updated User row
   */
  async updateRep(id: Snowflake, reputation: number, connection?: PoolClient): Promise<User> {
    const query = (`
      INSERT INTO users (user_id, reputation) VALUES ($1, $2)
        ON CONFLICT (user_id) DO
      UPDATE SET reputation = $2 RETURNING *;
    `);
    const res = await (connection || this.database).query({
      name: 'UserTable_updateReputation',
      text: query,
      values: [id, reputation]
    });
    return res.rows[0] as User;
  }

  /**
   * Increment donated keys of a user (upsert).
   * @param id The ID of the user
   * @param donatedKeysInc How much to increment the donated keys value
   * @param connection The connection to use, defaults to a new connection from the pool
   * @returns The new or updated User row
   */
  async incrementDonatedKeys(id: Snowflake, donatedKeysInc: number, connection?: PoolClient): Promise<User> {
    const query = (`
      INSERT INTO users (user_id, donated_keys) VALUES ($1, $2)
        ON CONFLICT (user_id) DO
      UPDATE SET donated_keys = donated_keys + $2 RETURNING *;
    `);
    const res = await (connection || this.database).query({
      name: 'UserTable_incrementDonatedKeys',
      text: query,
      values: [id, donatedKeysInc]
    });
    return res.rows[0] as User;
  }

  /**
   * Get a user by its ID.
   * @param id The ID of the user
   * @param connection The connection to use, defaults to a new connection from the pool
   */
  async get(id: Snowflake, connection?: PoolClient): Promise<User | null> {
    const res = await (connection || this.database).query({
      name: 'UserTable_Get',
      text: 'SELECT * FROM users WHERE user_id = $1;',
      values: [id]
    });
    return res ? res.rows[0] as User : null;
  }
}
