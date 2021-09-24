import type Database from "../../database";
import type GiveawayManager from "../manager";

export default abstract class Event {
  manager: GiveawayManager;
  db: Database;

  abstract readonly state: number;

  constructor(manager: GiveawayManager) {
    this.manager = manager;
    this.db = manager.bot.db;
  }

  abstract listener(...args: any): Promise<void>;
}
