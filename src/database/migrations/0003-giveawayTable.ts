import type { PoolClient } from 'pg';

export default async function migrate(conn: PoolClient): Promise<void> {
  await conn.query(`
    CREATE TABLE giveaways (
      id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      key INT UNIQUE NOT NULL REFERENCES keys,
      winner BIGINT,
      state SMALLINT DEFAULT 0,
      timestamp TIMESTAMP DEFAULT (NOW() AT TIME ZONE 'UTC')
    );
  `);
  // This index means that only one giveaway can have a state other than closed
  await conn.query(`
    CREATE UNIQUE INDEX giveaway_state_idx ON giveaways (state) WHERE state != -1;
  `);
}
