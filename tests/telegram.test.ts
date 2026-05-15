import test from 'node:test';
import assert from 'node:assert/strict';
import { TELEGRAM_COMMANDS, helpText } from '../src/telegram/commands.js';

test('telegram command skeleton includes required user commands', () => {
  for (const command of ['/start','/help','/scan <url>','/verify <job_id>','/web_scan <job_id>','/status <job_id>','/my_jobs','/latest','/report <job_id>','/harden <job_id>','/pay','/check_payment <order_id>','/simulate_payment <order_id>','/demo']) {
    assert.ok(TELEGRAM_COMMANDS.includes(command), `${command} missing`);
  }
});

test('help text includes safety gates', () => {
  const text = helpText();
  assert.match(text, /no verification = no scan/i);
  assert.match(text, /no scope lock = no scanner/i);
  assert.match(text, /no explicit approval = no active web scan/i);
});
