import type { PoolClient } from 'pg';

export default async function migrate(conn: PoolClient): Promise<void> {
  await conn.query(`
    CREATE TABLE reputation_log (
      id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      user_id BIGINT NOT NULL,
      data JSONB NOT NULL,
      increment SMALLINT NOT NULL,
      timestamp TIMESTAMP DEFAULT (NOW() AT TIME ZONE 'UTC')
    );
  `);
}
