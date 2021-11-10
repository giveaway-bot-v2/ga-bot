import Table from './base';

import type { PoolClient } from 'pg';

import type { Snowflake, User } from 'discord.js';

export interface ReputationLog {
  id: number;
  user_id: number;
  increment: number;
  timestamp: Date;
}

/**
 * PostgreSQL implementation with methods for appending to the reputation
 * transaction table. This is meant to be an append-only table with individual
 * changes to a user's reputation.
 * 
 * To get a user's reputation look at the users table which wraps a
 * materialized view that sums this transaction log.
 */
export default class ReputationTable extends Table {
  /**
   * Append a transaction log to the table.
   * @param user The user who's reputation to change.
   * @param increment How much to change the user's reputation.
   * @param connection The connection to use, defaults to a new connection from the pool.
   * @returns The inserted transaction log row.
   */
  async append(user: Snowflake | User, increment: number, connection?: PoolClient): Promise<ReputationLog> {
    const res = await (connection || this.database).query({
      name: 'ReputationTable_append',
      text: 'INSERT INTO reputation_log (user_id, increment) VALUES ($1, $2) RETURNING *;',
      values: [typeof user === 'string' ? user : user.id, increment],
    });
    return res.rows[0];
  }
}
