import type { Client } from 'pg';

import type Database from '.';

export default abstract class Table {
  /**
   * The database the table is attached to
   */
  protected database: Database;

  constructor (database: Database) {
    this.database = database;
  }

  /**
   * Initialize the Keys table in PostgreSQL
   * @param connection The connection to use, defaults to a new connection from the pool
   */
  abstract init(connection?: Client): void;
}
