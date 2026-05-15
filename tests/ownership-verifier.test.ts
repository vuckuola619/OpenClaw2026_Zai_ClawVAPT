import test from 'node:test';
import assert from 'node:assert/strict';
import { OwnershipVerifier } from '../src/core/OwnershipVerifier.js';
import type { Job } from '../src/types/index.js';

test('ownership verifier accepts demo fixture only through controlled path', async () => {
  const job = makeJob('https://demo-owned-site.local');
  const result = await new OwnershipVerifier(100).verify(job);
  assert.equal(result.ok, true);
  assert.equal(result.method, 'demo');
});

test('ownership verifier instructions include HTTP and DNS proof', () => {
  const job = makeJob('https://example.com/app');
  const text = new OwnershipVerifier().instructions(job);
  assert.match(text, /\.well-known\/clawvapt\/clawvapt-verify-JOB-1234\.txt/);
  assert.match(text, /_clawvapt\.example\.com/);
});

test('ownership verifier rejects missing public proof', async () => {
  const job = makeJob('https://example.com');
  const result = await new OwnershipVerifier(50).verify(job);
  assert.equal(result.ok, false);
  assert.match(result.evidence, /HTTP failed|DNS failed/);
});

function makeJob(targetUrl: string): Job {
  return { id: 'JOB-1234', userIdHash: 'u', targetUrl, verified: false, scopeLocked: false, scopeHost: '', state: 'VERIFY_OWNERSHIP', freeScanUsed: false, credits: 0, findings: [] };
}
