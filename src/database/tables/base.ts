import type { PoolClient } from 'pg';

import type Database from '..';

export default abstract class Table {
  /**
   * The database the table is attached to
   */
  protected database: Database;

  constructor (database: Database) {
    this.database = database;
  }

  abstract init(connection?: PoolClient): void;
}
