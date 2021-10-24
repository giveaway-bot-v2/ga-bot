import Table from './base';
import { Giveaway } from './giveaways';

import type { PoolClient } from 'pg';
import type { Snowflake } from 'discord.js';

export interface Entry {
  giveaway_id: number;
  guild_id: Snowflake;
  author_id: Snowflake;
}

/**
 * The PostgreSQL entry table.
 */
export default class EntryTable extends Table {
  async init(connection?: PoolClient): Promise<void> {
    await (connection || this.database).query(`
      CREATE TABLE IF NOT EXISTS entries (
        giveaway_id BIGINT NOT NULL REFERENCES giveaways,
        guild_id BIGINT NOT NULL,
        author_id BIGINT NOT NULL,
        timestamp TIMESTAMP DEFAULT (NOW() AT TIME ZONE 'UTC'),
        PRIMARY KEY (giveaway_id, author_id)
      );
    `);
  }

  /**
   * Safely create a new entry, the database constraints ensures no duplicate entries
   * @param giveaway The giveaway (or ID of the giveaway) to enter
   * @param guild The guild from which the author should be contacted
   * @param author The author who entered
   * @param connection The connection to use, defaults to a new connection from the pool
   * @returns A boolean indicating whether a new entry was created or not.
   */
  async new(giveaway: Giveaway | number, guild: Snowflake, author: Snowflake, connection?: PoolClient): Promise<boolean> {
    const res = await (connection || this.database).query({
      name: 'EntryTable_new',
      text: 'INSERT INTO entries (giveaway_id, guild_id, author_id) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING;',
      values: [typeof giveaway === 'number' ? giveaway : giveaway.id, guild, author],
    });
    return Boolean(res.rowCount);
  }

  /**
   * Pick a random entry
   * @param giveaway The giveaway to find an entry for
   * @param connection The connection to use, defaults to a new connection from the pool
   * @returns A random entry or null if there are no entries for that giveaway
   */
  async pickRandom(giveaway: Giveaway | number, connection?: PoolClient): Promise<Entry | null> {
    const res = await (connection || this.database).query({
      name: 'EntryTable_pickRandom',
      text: 'SELECT * FROM entries WHERE giveaway_id = $1 ORDER BY RANDOM() LIMIT 1;',
      values: [typeof giveaway === 'number' ? giveaway : giveaway.id],
    })
    return res.rowCount ? res.rows[0] : null;
  }

  /**
   * Remove a complete entry from the table
   * @param entry The entry to remove permanently
   * @param connection The connection to use, defaults to a new connection from the pool
   */
  async remove(entry: Entry, connection?: PoolClient): Promise<void> {
    await (connection || this.database).query({
      name: 'EntryTable_remove',
      text: 'DELETE FROM entries WHERE giveaway_id = $1 AND author_id = $1;',
      values: [entry.giveaway_id, entry.author_id],
    });
  }
}
