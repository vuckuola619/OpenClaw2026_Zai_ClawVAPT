import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { MainOrchestrator } from '../src/orchestrator/MainOrchestrator.js';
import { PersistentStore } from '../src/core/PersistentStore.js';

test('SQLite persistence recovers jobs across orchestrator instances', async () => {
  const db = join(mkdtempSync(join(tmpdir(), 'clawvapt-')), 'state.db');
  const first = new MainOrchestrator(new PersistentStore(db));
  const job = await first.createScan('user-1', 'https://demo-owned-site.local');
  await first.createChallenge(job);
  await first.verifyDemo(job.id);

  const second = new MainOrchestrator(new PersistentStore(db));
  const recovered = second.getJob(job.id);
  assert.ok(recovered);
  assert.equal(recovered?.verified, true);
  assert.equal(recovered?.scopeLocked, true);
  assert.equal(recovered?.targetUrl, 'https://demo-owned-site.local/');
});

test('scan runs persist and refresh report bundle', async () => {
  const db = join(mkdtempSync(join(tmpdir(), 'clawvapt-')), 'state.db');
  const first = new MainOrchestrator(new PersistentStore(db));
  const job = await first.createScan('user-scanrun', 'https://demo-owned-site.local');
  await first.createChallenge(job);
  await first.verifyDemo(job.id);
  const result = await first.runActiveWebScan(job.id, 'user-scanrun', true, 'safe');
  assert.ok(result.tools.length >= 1);
  assert.equal(first.scanRuns(job.id).length, 1);
  const reports = await first.refreshReport(job.id);
  const report = JSON.parse(readFileSync(reports.json, 'utf8'));
  assert.equal(report.job_id, job.id);
  assert.equal(report.scan_runs.length, 1);
  assert.ok(Array.isArray(report.tool_matrix));
  assert.equal(typeof report.severity_summary.LOW, 'number');

  const second = new MainOrchestrator(new PersistentStore(db));
  assert.equal(second.scanRuns(job.id).length, 1);
});

test('SQLite persistence prevents duplicate payment credits after restart', async () => {
  const db = join(mkdtempSync(join(tmpdir(), 'clawvapt-')), 'state.db');
  const userId = 'user-2';
  const orderId = 'ORDER-paid-once';

  const first = new MainOrchestrator(new PersistentStore(db));
  const firstResult = await first.checkPayment(userId, orderId);
  assert.equal(firstResult.creditsAdded, 10);

  const second = new MainOrchestrator(new PersistentStore(db));
  const secondResult = await second.checkPayment(userId, orderId);
  assert.equal(secondResult.creditsAdded, 0);
  assert.equal(secondResult.alreadyCredited, true);
});
