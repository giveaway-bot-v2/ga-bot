# Commands

This directory contains all Discord slash commands, it gets automatically
loaded when you start the bot.

## Creating new files

The bot tries to import and load all files in this directory (even
sub-directories). If you need to create a file or directory that shouldn't
be loaded its name should be prefixed with an underscore `_`. Files should
be named appropriately.

## Creating new commands

All commands should inherit from the abstract class [Command](index.ts) -
which can be imported with `import Command from ".";` - and override the
`name` and `description` properties along with the `run` method. Optionally
the command can also override the `check` method. Please name your class in
PascalCase with the name followed by Command, see [PingCommand](ping.ts) for
a simple example.
