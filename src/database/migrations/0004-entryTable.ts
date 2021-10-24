import type { PoolClient } from 'pg';

export default async function migrate(conn: PoolClient): Promise<void> {
  await conn.query(`
    CREATE TABLE entries (
      giveaway_id BIGINT NOT NULL REFERENCES giveaways,
      guild_id BIGINT NOT NULL,
      author_id BIGINT NOT NULL,
      timestamp TIMESTAMP DEFAULT (NOW() AT TIME ZONE 'UTC'),
      PRIMARY KEY (giveaway_id, author_id)
    );
  `);
}
