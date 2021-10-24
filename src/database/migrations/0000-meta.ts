import type { PoolClient } from 'pg';

export default async function migrate(conn: PoolClient): Promise<void> {
  // The point of this metadata table is to store information about the
  // migrations and overall state of the database. Here we can put
  // miscellaneous data, it is a simple key-value store to JSON (which is
  // essentially just a TEXT field).
  await conn.query(`
    CREATE TABLE metadata (
      key TEXT PRIMARY KEY,
      value JSON
    );
  `);
}
