import test from 'node:test';
import assert from 'node:assert/strict';
import { TELEGRAM_COMMANDS, helpText } from '../src/telegram/commands.js';

test('help text documents every public telegram command', () => {
  for (const command of ['/start','/menu','/help','/judge','/scan <url>','/verify <job_id>','/challenge <job_id>','/web_scan <job_id>','/web_scan_deep <job_id>','/nmap_scan <job_id>','/status <job_id>','/my_jobs','/latest','/report <job_id>','/pay','/check_payment <order_id>','/simulate_payment <order_id>','/repo_scan <github_url>','/repo_scan_deep <github_url>','/demo']) {
    assert.ok(TELEGRAM_COMMANDS.includes(command), command);
  }
  const help = helpText();
  assert.match(help, /judge-ready walkthrough/);
  assert.match(help, /repo_scan <github_url>/);
  assert.match(help, /Cost: 25 credits/);
  assert.match(help, /Not linked to website jobs/);
  assert.match(help, /Sends PDF, JSON, and manual-review report/);
});
