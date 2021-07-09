import Table from './base';

import type { PoolClient } from 'pg';
import type { Snowflake } from 'discord.js';

/**
 * An inserted User row
 */
export interface User {
  user_id: bigint;
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
   * Insert or update an user (upsert).
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
   * Increment reputation of an user (upsert).
   * @param id The ID of the user
   * @param reputationInc Reputation increment
   * @param connection The connection to use, defaults to a new connection from the pool
   * @returns The new or updated User row
   */
  async incrementRep(id: Snowflake, reputationInc: number, connection?: PoolClient): Promise<User> {
    const query = (`
      INSERT INTO users (user_id, reputation) VALUES ($1, $2)
        ON CONFLICT (user_id) DO
      UPDATE SET reputation = reputation + $2 RETURNING *;
    `);
    const res = await (connection || this.database).query({
      name: 'UserTable_updateReputation',
      text: query,
      values: [id, reputationInc]
    });
    return res.rows[0] as User;
  }

  /**
   * Increment donated keys of an user (upsert).
   * @param id The ID of the user
   * @param donatedKeysInc Donated keys increment
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
   * Get an user.
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
