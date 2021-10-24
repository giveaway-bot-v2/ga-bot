import Bot from './client';

(async function() {
  const bot = new Bot();

  await bot.login(process.env.TOKEN);
})();
