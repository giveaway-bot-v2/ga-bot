import path from 'path';
import { promises as fs } from 'fs';  // Use the promises version of the fs API

import { Collection } from 'discord.js';
import Command from '../commands';

/**
 * A collection of commands
 */
export default class CommandManager extends Collection<string, Command> {

  /**
   * @param dir An optional path to a directory with commands
   */
  constructor(dir?: string) {
    super();
    if (dir) this.loadDir(dir);
  }

  /**
   * Recursively import and load all commands in the specified directory
   * @param dir The relative directory to scan for commands
   */
  async loadDir(dir: string): Promise<void> {
    // The extra period here is to walk out of the client folder
    const resolved = path.resolve(__dirname, '.' + dir);

    for (const item of await fs.readdir(resolved, { withFileTypes: true })) {
      if (item.isDirectory()) await this.loadDir(resolved + item.name);

      // If we want a file to be ignored we can prefix it with _
      if (!item.name.startsWith('_') && item.name.endsWith('.js')) {
        const command: Command = new (await import(path.join(resolved, item.name))).default;

        // Even though command has been typed to a Command instance, this provides runtime safety.
        // The second condition makes sure that our abstract Command baseclass doesn't go through.
        if (command instanceof Command && command.name != '') {
          this.set(command.name, command);
        }
      }
    }
  }
}
