import { startTelegramBot } from './telegram/bot.js';

if (process.env.TELEGRAM_BOT_TOKEN) {
  startTelegramBot();
} else {
  console.log('TELEGRAM_BOT_TOKEN missing; demo service idle. Run npm run demo for deterministic CLI demo.');
  setInterval(() => {
    // Keep process alive for deployment health visibility without starting network side effects.
  }, 60_000);
}
