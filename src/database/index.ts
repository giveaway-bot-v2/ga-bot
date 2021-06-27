import { Pool } from 'pg';

import KeyTable from './KeyTable';

/**
 * Our PostgreSQL database
 */
export default class Database extends Pool {
  keys: KeyTable;

  constructor() {
    super();

    this.keys = new KeyTable(this);
  }

  /**
   * Initialize the database schema
   */
  async init(): Promise<void> {
    const conn = await this.connect();

    await this.keys.init(conn);

    conn.release();
  }
}
