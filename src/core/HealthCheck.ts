import { existsSync } from 'node:fs';

export interface HealthStatus { status: 'ok' | 'degraded'; checks: Record<string, boolean | string>; timestamp: string }

export function healthCheck(): HealthStatus {
  const checks: Record<string, boolean | string> = {
    telegramToken: Boolean(process.env.TELEGRAM_BOT_TOKEN),
    databaseUrl: process.env.DATABASE_URL || 'file:./data/clawvapt.db',
    databaseFilePresent: existsSync((process.env.DATABASE_URL || 'file:./data/clawvapt.db').replace(/^file:/, '')),
    redaction: process.env.LOG_REDACTION !== 'false',
    bridgeEnabled: process.env.OPENCLAW_BRIDGE_ENABLED === 'true'
  };
  const required = [checks.telegramToken, checks.redaction];
  return { status: required.every(Boolean) ? 'ok' : 'degraded', checks, timestamp: new Date().toISOString() };
}
