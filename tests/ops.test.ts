import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { MainOrchestrator } from '../src/orchestrator/MainOrchestrator.js';
import { PersistentStore } from '../src/core/PersistentStore.js';

test('ops status reports database counts', async () => {
  const db = join(mkdtempSync(join(tmpdir(), 'clawvapt-ops-')), 'state.db');
  const orchestrator = new MainOrchestrator(new PersistentStore(db));
  await orchestrator.createScan('operator', 'https://demo-owned-site.local');
  const status = await orchestrator.opsStatus('operator');
  assert.equal(status.database.present, true);
  assert.equal(status.database.counts.jobs, 1);
  assert.equal(status.dirs.reports, true);
});

test('backup database creates restorable sqlite file', async () => {
  const root = mkdtempSync(join(tmpdir(), 'clawvapt-backup-'));
  const db = join(root, 'state.db');
  process.env.BACKUP_DIR = join(root, 'backups');
  const orchestrator = new MainOrchestrator(new PersistentStore(db));
  await orchestrator.createScan('operator', 'https://demo-owned-site.local');
  const backup = await orchestrator.backupDatabase('operator');
  assert.equal(existsSync(backup.path), true);
  assert.ok(backup.sizeBytes > 0);

  const recovered = new MainOrchestrator(new PersistentStore(backup.path));
  assert.equal(recovered.listJobsForUser('operator').length, 1);
  delete process.env.BACKUP_DIR;
});
