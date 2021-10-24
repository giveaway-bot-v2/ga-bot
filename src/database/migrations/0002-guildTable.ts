import type { PoolClient } from 'pg';

export default async function migrate(conn: PoolClient): Promise<void> {
  await conn.query(`
    CREATE TYPE language AS ENUM (
      'ENG'
    );
  `);
  await conn.query(`
    CREATE TABLE guilds (
      guild_id BIGINT PRIMARY KEY,
      lang language NOT NULL DEFAULT 'ENG',
      webhook_id BIGINT UNIQUE,
      webhook_token TEXT UNIQUE
    );
  `);
  await conn.query(`
    CREATE INDEX guild_webhooks_idx ON guilds (lang, webhook_id, webhook_token);
  `);
}
