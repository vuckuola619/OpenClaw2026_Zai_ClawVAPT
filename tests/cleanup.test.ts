import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, existsSync, writeFileSync, utimesSync } from 'node:fs';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { CleanupService } from '../src/core/CleanupService.js';

test('cleanup preview does not delete candidates', async () => {
  const root = mkdtempSync(join(tmpdir(), 'cleanup-'));
  process.env.REPORT_DIR = join(root, 'reports');
  process.env.PATCH_DIR = join(root, 'patches');
  process.env.REPO_CACHE_DIR = join(root, 'repos');
  mkdirSync(process.env.REPORT_DIR, { recursive: true });
  const report = join(process.env.REPORT_DIR, 'JOB-abcdef12_report.json');
  writeFileSync(report, '{}');
  const old = new Date(Date.now() - 20 * 86_400_000);
  utimesSync(report, old, old);
  const result = await new CleanupService().preview(14);
  assert.equal(result.candidates.length, 1);
  assert.equal(result.deleted.length, 0);
  assert.equal(existsSync(report), true);
});

test('cleanup apply only removes allowed old artifacts', async () => {
  const root = mkdtempSync(join(tmpdir(), 'cleanup-'));
  process.env.REPORT_DIR = join(root, 'reports');
  process.env.PATCH_DIR = join(root, 'patches');
  process.env.REPO_CACHE_DIR = join(root, 'repos');
  mkdirSync(process.env.REPORT_DIR, { recursive: true });
  mkdirSync(process.env.PATCH_DIR, { recursive: true });
  const oldReport = join(process.env.REPORT_DIR, 'JOB-abcdef12_manual_review.md');
  const sample = join(process.env.REPORT_DIR, 'sample_report.json');
  const patch = join(process.env.PATCH_DIR, 'JOB-abcdef12_remediation.patch');
  writeFileSync(oldReport, 'old');
  writeFileSync(sample, 'keep');
  writeFileSync(patch, 'old patch');
  const old = new Date(Date.now() - 20 * 86_400_000);
  for (const p of [oldReport, patch]) utimesSync(p, old, old);
  const result = await new CleanupService().apply(14);
  assert.equal(result.deleted.length, 2);
  assert.equal(existsSync(oldReport), false);
  assert.equal(existsSync(patch), false);
  assert.equal(existsSync(sample), true);
});
