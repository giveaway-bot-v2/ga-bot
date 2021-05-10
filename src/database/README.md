# Database

This directory contains all database tables and similar files.

## Creating new tables

See the [Table abstract class](Table.ts) file for what a table class has to
define. Compared to commands, the tables do not get automatically loaded, it
is recommended to add the tables as attributes of the Database class and then
inside the `init` method call the table's `init`.
