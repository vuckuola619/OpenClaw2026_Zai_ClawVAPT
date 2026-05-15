import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { MainOrchestrator } from '../src/orchestrator/MainOrchestrator.js';
import { PersistentStore } from '../src/core/PersistentStore.js';

test('verified URL is reused and scan runs are limited to five per scope', async () => {
  const db = join(mkdtempSync(join(tmpdir(), 'clawvapt-scope-')), 'state.db');
  const oldCap = process.env.ACTIVE_WEB_SCAN_CAPACITY;
  process.env.ACTIVE_WEB_SCAN_CAPACITY = '10';
  const o = new MainOrchestrator(new PersistentStore(db));
  const user = 'scope-user';
  const first = await o.createScan(user, 'https://demo-owned-site.local');
  await o.createChallenge(first);
  await o.verifyDemo(first.id);

  const second = await o.createScan(user, 'https://demo-owned-site.local/path');
  assert.equal(second.verified, true);
  assert.equal(second.scopeLocked, true);
  assert.equal(second.scopeHost, 'demo-owned-site.local');

  o.quota.addCredits(o.hashUser(user), 50);
  for (let i = 0; i < 5; i++) await o.runActiveWebScan(second.id, user, true, 'safe');
  assert.equal(o.scopeScanUsage(second.id).used, 5);
  await assert.rejects(() => o.runActiveWebScan(second.id, user, true, 'safe'), /SCAN_LIMIT_REACHED/);
  if (oldCap === undefined) delete process.env.ACTIVE_WEB_SCAN_CAPACITY; else process.env.ACTIVE_WEB_SCAN_CAPACITY = oldCap;
});

test('safe scans cost 5 credits and deep scans cost 10 credits', async () => {
  const db = join(mkdtempSync(join(tmpdir(), 'clawvapt-credit-')), 'state.db');
  const o = new MainOrchestrator(new PersistentStore(db));
  const user = 'credit-user';
  const job = await o.createScan(user, 'https://demo-owned-site.local');
  await o.createChallenge(job);
  await o.verifyDemo(job.id);

  assert.equal(o.quotaSnapshotForUser(user).credits, 10);
  await o.runActiveWebScan(job.id, user, true, 'safe');
  assert.equal(o.quotaSnapshotForUser(user).credits, 5);
  await assert.rejects(() => o.runActiveWebScan(job.id, user, true, 'deep'), /PAYMENT_REQUIRED/);
  o.quota.addCredits(o.hashUser(user), 10);
  await o.runActiveWebScan(job.id, user, true, 'deep');
  assert.equal(o.quotaSnapshotForUser(user).credits, 5);
});
