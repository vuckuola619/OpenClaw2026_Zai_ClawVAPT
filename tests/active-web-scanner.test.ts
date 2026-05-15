import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { MainOrchestrator } from '../src/orchestrator/MainOrchestrator.js';
import { PersistentStore } from '../src/core/PersistentStore.js';
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

test('active web scanner exposes deep profile and strict nmap profile', () => {
  const tools = new ActiveWebScanner().status();
  assert.equal(tools.find((t) => t.name === 'NucleiDeepProfile')?.mode, 'enterprise_deep_non_destructive');
  assert.equal(tools.find((t) => t.name === 'NiktoDeepProfile')?.mode, 'enterprise_controlled_web_server_scan');
  assert.equal(tools.find((t) => t.name === 'NmapStrictProfile')?.mode, 'tcp_connect_single_host_low_rate');
});

test('strict nmap requires explicit network approval', async () => {
  const scanner = new ActiveWebScanner(undefined, 1000);
  await assert.rejects(() => scanner.scanNmapStrict({ jobId: 'JOB-x', userHash: 'u', targetUrl: 'https://demo-owned-site.local', verified: true, scopeLocked: true, scopeHost: 'demo-owned-site.local', approved: false }), /NETWORK_SCAN_APPROVAL_REQUIRED/);
});

test('orchestrator active web preview requires verified scope', async () => {
  const db = join(mkdtempSync(join(tmpdir(), 'clawvapt-active-')), 'state.db');
  const orchestrator = new MainOrchestrator(new PersistentStore(db));
  const job = await orchestrator.createScan('active-web-user', 'https://demo-owned-site.local');
  await assert.rejects(() => orchestrator.previewActiveWebScan(job.id), /OWNERSHIP_OR_SCOPE_GATE_BLOCKED/);
  await orchestrator.verifyDemo(job.id);
  const preview = await orchestrator.previewActiveWebScan(job.id, 'deep');
  assert.equal(preview.job.scopeHost, 'demo-owned-site.local');
  assert.equal(preview.profile, 'deep');
  assert.ok(preview.tools.some((t) => t.name === 'NucleiDeepProfile'));
});
