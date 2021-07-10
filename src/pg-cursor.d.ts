// Type definitions for pg-cursor 2.6.0
// Project: https://github.com/brianc/node-postgres
// Definitions by: Bluenix <https://github.com/Bluenix2>
// Definitions: https://github.com/DefinitelyTyped/DefinitelyTyped

declare module "pg-cursor" {
    import { types, QueryResult, Submittable, Connection } from "pg";

    export interface CursorQueryConfig {
        /**
         * By default rows come out as a key/value pair for each row,
         * pass the string 'array' here to receive rows as an array of values.
         */
        rowMode?: "array";
        /**
         * Custom type parsers just for this query result.
         */
        types?: typeof types;
    }

    export default class Cursor implements Submittable {
        constructor(text: string, values?: any[], config?: CursorQueryConfig);

        submit: (connection: Connection) => void;

        read(rowCount: number, callback: (err: Error, rows: any[], result: QueryResult) => void): void;
        read(rowCount: number): Promise<any[]>;

        close(callback: (err: Error) => void): void;
    }
}
