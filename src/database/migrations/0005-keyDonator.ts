import type { PoolClient } from 'pg';

export default async function migrate(conn: PoolClient): Promise<void> {
  await conn.query(`ALTER TABLE keys ADD COLUMN donator BIGINT NOT NULL;`);
}
