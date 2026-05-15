import test from 'node:test';
import assert from 'node:assert/strict';
import { OpenClawBridge } from '../src/openclaw/OpenClawBridge.js';

test('OpenClaw bridge is disabled by default and does not require secrets', async () => {
  const bridge = new OpenClawBridge({});
  const result = await bridge.publishAgentEnvelope({
    agent: 'TrustVerifierPaymentAgent',
    task: 'challenge',
    job_id: 'JOB-test',
    status: 'DONE',
    result: { agent: 'x', job_id: 'JOB-test', status: 'DONE', decision: 'ok', evidence: [], findings: [], next_state: 'NEXT', redaction_applied: true, notes: [] },
    started_at: new Date(0).toISOString(),
    completed_at: new Date(0).toISOString(),
    redaction_applied: true
  }, 'summary');
  assert.equal(result.status, 'disabled');
});

test('OpenClaw bridge redacts common token shapes', () => {
  const bridge = new OpenClawBridge({ OPENCLAW_BRIDGE_ENABLED: 'true', OPENCLAW_GATEWAY_TOKEN: 'abc' });
  const telegramToken = `${'123456789'}:${'ABCDEFGHIJKLMNOPQRSTUVWXYZ_abc'}`;
  const githubToken = `ghp_${'abcdefghijklmnopqrstuvwxyz123456'}`;
  const redacted = bridge.redact(`TELEGRAM_BOT_TOKEN=${telegramToken} password=hunter2 github=${githubToken}`);
  assert.match(redacted, /TELEGRAM_BOT_TOKEN=\[redacted\]/);
  assert.doesNotMatch(redacted, /hunter2/);
  assert.doesNotMatch(redacted, new RegExp(telegramToken.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  assert.doesNotMatch(redacted, new RegExp(githubToken));
});
