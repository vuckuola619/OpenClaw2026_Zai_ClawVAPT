import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { MainOrchestrator } from '../src/orchestrator/MainOrchestrator.js';
import { PersistentStore } from '../src/core/PersistentStore.js';

test('remediation PR draft includes required review fields and no auto merge', async () => {
  const db = join(mkdtempSync(join(tmpdir(), 'clawvapt-pr-')), 'state.db');
  const o = new MainOrchestrator(new PersistentStore(db));
  const job = await o.createScan('user-pr', 'https://demo-owned-site.local');
  job.findings.push({ id: 'F-1', title: 'Missing security header', severity: 'MEDIUM', status: 'OPEN', description: 'Header missing', remediation: 'Add header', source: 'BUILTIN_URL', evidence: [{ type: 'url', url: job.targetUrl, summary: 'redacted evidence', redacted: true }] });
  const draft = await o.createPrDraft(job.id);
  assert.equal(existsSync(draft.path), true);
  const text = readFileSync(draft.path, 'utf8');
  assert.match(text, /Finding/i);
  assert.match(text, /Severity|MEDIUM/);
  assert.match(text, /Evidence/i);
  assert.match(text, /Test Command/i);
  assert.match(text, /Rollback Note/i);
  assert.match(text, /Retest Instruction/i);
  assert.match(text, /No auto-merge/i);
});
