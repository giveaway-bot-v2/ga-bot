import Table from './base';

import type { PoolClient } from 'pg';
import type { Snowflake } from 'discord.js';

/**
 * An inserted User row
 */
export interface User {
  user_id: Snowflake;
  reputation: number;
  donations: number;
}

/**
 * Wrapper over the User view composed from several transaction tables.
 */
export default class UserTable extends Table {
  /**
   * Get a user by its ID.
   * @param id The Discord ID of the user.
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
