import type { PoolClient } from 'pg';

export default async function migrate(conn: PoolClient): Promise<void> {
  await conn.query(`
    CREATE VIEW users AS
      SELECT
        rp.user_id,
        SUM(rp.increment) as reputation,
        COUNT(keys) as donations
      FROM reputation_log as rp
      JOIN keys ON keys.donator = rp.user_id
      GROUP BY rp.user_id;
  `);
}
