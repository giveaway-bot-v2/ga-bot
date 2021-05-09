import { config } from 'dotenv';
config();

import Bot from './client';

(async function() {
  const bot = new Bot();

  await bot.login(process.env.token);
})();
