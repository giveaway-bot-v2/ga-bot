import path from 'path';
import { promises as fs } from 'fs';

import { Pool, PoolClient } from 'pg';

import {
  KeyTable, Key,
  GuildTable, Guild,
  GiveawayTable, Giveaway,
  EntryTable, Entry
} from './tables';

// Re-export it
export {
  KeyTable, Key,
  GuildTable, Guild,
  GiveawayTable, Giveaway,
  EntryTable, Entry
};

type Migration = (conn: PoolClient) => Promise<void>;

/**
 * Our PostgreSQL database
 */
export default class Database extends Pool {
  keys: KeyTable;
  guilds: GuildTable;
  giveaways: GiveawayTable;
  entries: EntryTable;

  constructor() {
    super();

    this.keys = new KeyTable(this);
    this.guilds = new GuildTable(this);
    this.giveaways = new GiveawayTable(this);
    this.entries = new EntryTable(this);
  }

  /**
   * Initialize the database schema and make necessary migrations.
   */
  async migrate(): Promise<void> {
    const conn = await this.connect();

    // This can fail if this is the first time the database is initialized
    let start = -1;
    try {
      const res = await conn.query(`SELECT value FROM metadata WHERE key = 'migration';`);
      if (res.rows.length >= 0) {
        const data = JSON.parse(res.rows[0]);
        start = data.id;
      }
    } catch (err) {
      // Do nothing, the metadata table hasn't been created yet
    }

    console.log(`Migrating database from ID ${start}`);

    const resolved = path.resolve(__dirname, './migrations');
  
    const files = await fs.readdir(resolved, { withFileTypes: true });

    const migrations = files.filter((item) => {
      if (!item.name.endsWith('.js')) return false;

      const id = parseInt(item.name.slice(0, 4));
      // NaN is returned when parseInt fails
      if (isNaN(id)) return false;

      // Filter out migrations we've already done
      if (start > id) return false;

      return true;
    });

    // Sort the migrations based on the digits at the start
    migrations.sort((a, b) => parseInt(a.name.slice(0, 4)) - parseInt(b.name.slice(0, 4)))

    // Time to make the actual migrations and update the database
    for (const migration of migrations) {
      await conn.query('BEGIN;')

      try {
        // Import the actual callable that will make the migration
        const callable: Migration = (await import(path.join(resolved, migration.name))).default

        await callable(conn);

        // Update the metadata since we've done this migration
        await conn.query({
          name: 'Database_migrate',
          text: "INSERT INTO metadata (key, value) VALUES($1, $2) ON CONFLICT (key) DO UPDATE SET value = $2;",
          values: [
            'migration',
            {
              'id': parseInt(migration.name.slice(0, 4)),
              'timestamp': new Date()
            }
          ],
        });

        await conn.query('COMMIT;');
      } catch (err) {
        await conn.query('ROLLBACK;');
        console.error(err);
      }

    }
    conn.release();

    console.log('Migrated the database to the newest migration');
  }
}
