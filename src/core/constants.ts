const minute = 1000 * 60;  // Convert milliseconds to minutes

export const GIVEAWAY_DELAY = minute * 3;  // The last integer is how many minutes

// The real delay between the announcement to a first winner being picked is
// GIVEAWAY_WAIT + WINNER_DELAY. WINNER_DELAY is necessary because it ensures
// that the bot waits a bit before trying to pick another winner. Without this,
// if nobody enters, the bot will spam requests to the database asking for a random winner.
export const GIVEAWAY_WAIT = minute * 1;
export const WINNER_DELAY = minute * 1;

export const CLAIM_WAIT = minute * 0.5;  // 30 seconds

export const WEBHOOK_BATCH = 50;
