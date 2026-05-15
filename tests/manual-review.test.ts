import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { MainOrchestrator } from '../src/orchestrator/MainOrchestrator.js';
import { manualReviewChecklist } from '../src/report/ManualReview.js';

test('manual review checklist covers scanner blind spots', async () => {
  const orchestrator = new MainOrchestrator();
  const job = await orchestrator.createScan('manual-user', 'https://demo-owned-site.local');
  job.repoUrl = 'https://github.com/example/ai-payment-app';
  job.findings.push({ id: 'T1', title: 'JWT middleware present', severity: 'INFO', status: 'OPEN', description: 'auth token route detected', remediation: 'manual authZ review', source: 'BUILTIN_REPO', evidence: [] });
  const checklist = manualReviewChecklist(job);
  assert.ok(checklist.some((item) => /Authorization/.test(item.area)));
  assert.ok(checklist.some((item) => /Business workflow/.test(item.area)));
  assert.ok(checklist.some((item) => /Payment/.test(item.area)));
  assert.ok(checklist.some((item) => /AI/.test(item.area)));
});

test('manual review file is generated and redaction-safe', async () => {
  const orchestrator = new MainOrchestrator();
  const job = await orchestrator.createScan('manual-user-2', 'https://demo-owned-site.local');
  await orchestrator.verifyDemo(job.id);
  const out = await orchestrator.manualReview(job.id);
  const body = readFileSync(out.markdown, 'utf8');
  assert.match(body, /Manual Review Checklist/);
  assert.match(body, /IDOR/);
  assert.doesNotMatch(body, /gh[pousr]_[A-Za-z0-9_]{20,}/);
});
