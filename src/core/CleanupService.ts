import { readdir, rm, stat } from 'node:fs/promises';
import { resolve, relative, join } from 'node:path';

export interface CleanupCandidate { path: string; kind: 'report' | 'patch' | 'repo-cache'; bytes: number; ageDays: number }
export interface CleanupResult { dryRun: boolean; ttlDays: number; candidates: CleanupCandidate[]; deleted: CleanupCandidate[]; bytes: number }

export class CleanupService {
  constructor(private now = () => Date.now()) {}

  async preview(ttlDays = defaultTtlDays()): Promise<CleanupResult> { return this.run(ttlDays, true); }
  async apply(ttlDays = defaultTtlDays()): Promise<CleanupResult> { return this.run(ttlDays, false); }

  private async run(ttlDays: number, dryRun: boolean): Promise<CleanupResult> {
    const safeTtl = Number.isFinite(ttlDays) && ttlDays >= 1 ? Math.floor(ttlDays) : defaultTtlDays();
    const candidates = await this.collect(safeTtl);
    const deleted: CleanupCandidate[] = [];
    for (const candidate of candidates) {
      if (!dryRun) {
        const root = rootFor(candidate.kind);
        assertInside(root, candidate.path);
        await rm(candidate.path, { recursive: candidate.kind === 'repo-cache', force: true });
      }
      deleted.push(candidate);
    }
    return { dryRun, ttlDays: safeTtl, candidates, deleted: dryRun ? [] : deleted, bytes: candidates.reduce((n, c) => n + c.bytes, 0) };
  }

  private async collect(ttlDays: number): Promise<CleanupCandidate[]> {
    const out: CleanupCandidate[] = [];
    await this.collectFiles(rootFor('report'), /^(JOB-[a-f0-9]+_report\.(json|pdf)|JOB-[a-f0-9]+_manual_review\.md)$/i, 'report', ttlDays, out);
    await this.collectFiles(rootFor('patch'), /^JOB-[a-f0-9]+_remediation\.patch$/i, 'patch', ttlDays, out);
    await this.collectDirs(rootFor('repo-cache'), /^JOB-[a-f0-9]+$/i, 'repo-cache', ttlDays, out);
    return out.sort((a, b) => b.ageDays - a.ageDays || b.bytes - a.bytes);
  }

  private async collectFiles(root: string, pattern: RegExp, kind: CleanupCandidate['kind'], ttlDays: number, out: CleanupCandidate[]): Promise<void> {
    let entries: string[] = [];
    try { entries = await readdir(root); } catch { return; }
    for (const name of entries) {
      if (!pattern.test(name)) continue;
      const path = join(root, name);
      assertInside(root, path);
      const st = await stat(path).catch(() => null);
      if (!st?.isFile()) continue;
      const ageDays = Math.floor((this.now() - st.mtimeMs) / 86_400_000);
      if (ageDays >= ttlDays) out.push({ path, kind, bytes: st.size, ageDays });
    }
  }

  private async collectDirs(root: string, pattern: RegExp, kind: CleanupCandidate['kind'], ttlDays: number, out: CleanupCandidate[]): Promise<void> {
    let entries: string[] = [];
    try { entries = await readdir(root); } catch { return; }
    for (const name of entries) {
      if (!pattern.test(name)) continue;
      const path = join(root, name);
      assertInside(root, path);
      const st = await stat(path).catch(() => null);
      if (!st?.isDirectory()) continue;
      const ageDays = Math.floor((this.now() - st.mtimeMs) / 86_400_000);
      if (ageDays >= ttlDays) out.push({ path, kind, bytes: await dirBytes(path), ageDays });
    }
  }
}

function rootFor(kind: CleanupCandidate['kind']): string {
  if (kind === 'report') return resolve(process.env.REPORT_DIR || 'reports');
  if (kind === 'patch') return resolve(process.env.PATCH_DIR || 'patches');
  return resolve(process.env.REPO_CACHE_DIR || 'data/repos');
}

function defaultTtlDays(): number { return Number(process.env.CLEANUP_TTL_DAYS || 14); }

function assertInside(root: string, path: string): void {
  const rel = relative(resolve(root), resolve(path));
  if (rel.startsWith('..') || rel === '' || rel.startsWith('/')) throw new Error('CLEANUP_PATH_BLOCKED');
}

async function dirBytes(path: string): Promise<number> {
  let total = 0;
  let entries: string[] = [];
  try { entries = await readdir(path); } catch { return total; }
  for (const name of entries) {
    const child = join(path, name);
    const st = await stat(child).catch(() => null);
    if (!st) continue;
    total += st.isDirectory() ? await dirBytes(child) : st.size;
  }
  return total;
}
