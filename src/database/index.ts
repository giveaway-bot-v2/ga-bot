import { Pool } from 'pg';

import KeyTable from './KeyTable';
import GuildTable from './GuildTable';
import GiveawayTable from './GiveawayTable';
import EntryTable from './EntryTable';

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
   * Initialize the database schema
   */
  async init(): Promise<void> {
    const conn = await this.connect();

    await this.keys.init(conn);
    await this.guilds.init(conn);
    await this.giveaways.init(conn);
    await this.entries.init(conn);

    conn.release();
  }
}
