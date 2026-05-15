import test from 'node:test';
import assert from 'node:assert/strict';
import { MainOrchestrator } from '../src/orchestrator/MainOrchestrator.js';
import { ActiveWebScanner } from '../src/tools/ActiveWebScanner.js';

test('active web scanner requires explicit approval', async () => {
  const scanner = new ActiveWebScanner(undefined, 1000);
  await assert.rejects(() => scanner.scan({ jobId: 'JOB-x', userHash: 'u', targetUrl: 'https://demo-owned-site.local', verified: true, scopeLocked: true, scopeHost: 'demo-owned-site.local', approved: false }), /ACTIVE_SCAN_APPROVAL_REQUIRED/);
});

test('active web scanner blocks unverified and out-of-scope targets', async () => {
  const scanner = new ActiveWebScanner(undefined, 1000);
  await assert.rejects(() => scanner.scan({ jobId: 'JOB-x', userHash: 'u', targetUrl: 'https://demo-owned-site.local', verified: false, scopeLocked: true, scopeHost: 'demo-owned-site.local', approved: true }), /OWNERSHIP_NOT_VERIFIED/);
  await assert.rejects(() => scanner.scan({ jobId: 'JOB-x', userHash: 'u', targetUrl: 'https://example.com', verified: true, scopeLocked: true, scopeHost: 'demo-owned-site.local', approved: true }), /OUT_OF_SCOPE/);
});

test('active web scanner status keeps nikto and nmap future-gated', () => {
  const tools = new ActiveWebScanner().status();
  assert.equal(tools.find((t) => t.name === 'Nikto')?.status, 'FUTURE');
  assert.equal(tools.find((t) => t.name === 'Nmap')?.status, 'FUTURE');
});

test('orchestrator active web preview requires verified scope', async () => {
  const orchestrator = new MainOrchestrator();
  const job = await orchestrator.createScan('active-web-user', 'https://demo-owned-site.local');
  await assert.rejects(() => orchestrator.previewActiveWebScan(job.id), /OWNERSHIP_OR_SCOPE_GATE_BLOCKED/);
  await orchestrator.verifyDemo(job.id);
  const preview = await orchestrator.previewActiveWebScan(job.id);
  assert.equal(preview.job.scopeHost, 'demo-owned-site.local');
  assert.ok(preview.tools.some((t) => t.name === 'NucleiSafeProfile'));
});
