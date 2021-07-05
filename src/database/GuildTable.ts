import Table from './Table';

import type { PoolClient } from 'pg';
import type { Snowflake } from 'discord.js'; 

/**
 * An inserted Guild row
 */
export interface Guild {
  guild_id: number;
  lang: string;
  webhook_id: number;
  webhook_token: string;
}

/**
 * The PostgreSQL guilds table
 */
export default class GuildTable extends Table {
  async init(connection?: PoolClient): Promise<void> {
    // You cannot use IF NOT EXISTS on a type, so we'll have to
    // wrap this one in a try statement.
    try {
      await (connection || this.database).query(`
        CREATE TYPE language AS ENUM (
          'ENG'
        );
        CREATE TABLE IF NOT EXISTS guilds (
          guild_id BIGINT PRIMARY KEY,
          lang language NOT NULL DEFAULT 'ENG',
          webhook_id BIGINT UNIQUE,
          webhook_token TEXT UNIQUE
        );
        CREATE INDEX IF NOT EXISTS guild_webhooks_idx ON guilds (lang, webhook_id, webhook_token);
      `);
    } catch (error) {
      // Just ignore
    }
  }

  /**
   * Insert or update a guild (upsert).
   * @param id The ID of the guild
   * @param webhookID The new webhook ID
   * @param webhookToken The new webhook token
   * @param connection The connection to use, defaults to a new connection from the pool
   * @returns The new or updated Guild row
   */
  async update(id: Snowflake, webhookID: string, webhookToken: string, connection?: PoolClient): Promise<Guild> {
    const query = (`
      INSERT INTO guilds (guild_id, webhook_id, webhook_token) VALUES ($1, $2, $3)
        ON CONFLICT (guild_id) DO
      UPDATE SET webhook_id = $2, webhook_token = $3 RETURNING *;
    `);
    const res = await (connection || this.database).query({
      name: 'GuildTable_update',
      text: query,
      values: [id, webhookID, webhookToken]
    });
    return res.rows[0] as Guild;
  }

  async get(id: Snowflake, connection?: PoolClient): Promise<Guild | null> {
    const res = await (connection || this.database).query({
      name: 'GuildTable_get',
      text: 'SELECT * FROM guilds WHERE guild_id = $1;',
      values: [id],
    });
    return res ? res.rows[0] as Guild : null;
  }
}
