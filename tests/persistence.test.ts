import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
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
  assert.equal(recovered?.targetUrl, 'https://demo-owned-site.local');
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
