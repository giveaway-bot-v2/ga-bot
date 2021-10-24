import type { PoolClient } from 'pg';

export default async function migrate(conn: PoolClient): Promise<void> {
  await conn.query(`
    CREATE TABLE keys (
      id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      value TEXT UNIQUE NOT NULL,
      message VARCHAR(128),
      claimed BOOLEAN NOT NULL DEFAULT FALSE
    );
  `);
  await conn.query(`
    CREATE INDEX claimable_keys_idx ON keys (claimed);
  `);
}
