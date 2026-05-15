import { MainOrchestrator } from '../orchestrator/MainOrchestrator.js';
import { helpText } from './commands.js';
export async function startTelegramBot(){
  // Minimal long-poll skeleton using Telegram Bot API. No secrets logged.
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error('TELEGRAM_BOT_TOKEN_MISSING');
  const orchestrator = new MainOrchestrator();
  console.log('Telegram bot skeleton ready. Commands:', helpText().split('\n').length);
  void orchestrator;
  // Full network polling intentionally not started in demo tests to avoid side effects.
}
