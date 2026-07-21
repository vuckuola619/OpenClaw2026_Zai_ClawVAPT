import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, rm } from 'node:fs/promises';
import { Gpt56Advisor } from '../src/ai/Gpt56Advisor.js';
import type { Job } from '../src/types/index.js';
import { manualReviewChecklist } from '../src/report/ManualReview.js';

test('GPT-5.6 advisor generates redacted deterministic advisory when API is disabled', async () => {
  const dir = 'reports/test-gpt56-advisor';
  await rm(dir, { recursive: true, force: true });
  const job: Job = {
    id: 'JOB-gpt56',
    userIdHash: 'user',
    targetUrl: 'https://demo-owned-site.local',
    verified: true,
    scopeLocked: true,
    scopeHost: 'demo-owned-site.local',
    state: 'ACTIVE_WEB_SCAN_COMPLETE',
    freeScanUsed: false,
    credits: 5,
    findings: [{
      id: 'F-1',
      title: 'Missing authorization check',
      severity: 'HIGH',
      status: 'OPEN',
      description: 'Access control weakness with token=supersecretvalue1234567890',
      remediation: 'Enforce server-side ownership checks.',
      source: 'BUILTIN_REPO',
      evidence: [{ type: 'test', summary: 'redacted evidence', redacted: true }]
    }]
  };
  const result = await new Gpt56Advisor({ GPT56_ADVISOR_ENABLED: 'false' }).generate(job, [], manualReviewChecklist(job), dir);
  assert.equal(result.mode, 'deterministic');
  const markdown = await readFile(result.markdown, 'utf8');
  const json = JSON.parse(await readFile(result.json, 'utf8'));
  assert.match(markdown, /GPT-5\.6 Advisory Pack/);
  assert.match(markdown, /Remediation Tickets/);
  assert.equal(json.redaction_applied, true);
  assert.doesNotMatch(JSON.stringify(json), /supersecretvalue1234567890/);
});
