import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { createRequire } from 'node:module';
import type { Job, ScanRun, ToolStatus } from '../types/index.js';

type Row = Record<string, unknown>;
type Statement = { run: (...args: unknown[]) => unknown; get: (...args: unknown[]) => Row | undefined; all: (...args: unknown[]) => Row[] };
type Database = { exec: (sql: string) => void; prepare: (sql: string) => Statement };

export interface QuotaSnapshot { userHash: string; scans: number; credits: number }
export interface OrderSnapshot { orderId: string; userHash: string; amount: number; status: string; mode: string; credited: boolean }
export interface ReportSnapshot { jobId: string; json: string; pdf: string }

export class PersistentStore {
  private db: Database;

  constructor(path = resolveDbPath(process.env.DATABASE_URL || 'file:./data/clawvapt.db')) {
    mkdirSync(dirname(path), { recursive: true });
    const require = createRequire(import.meta.url);
    const sqlite = require('node:sqlite') as { DatabaseSync: new (path: string) => Database };
    this.db = new sqlite.DatabaseSync(path);
    this.migrate();
  }

  migrate(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS jobs (
        id TEXT PRIMARY KEY,
        user_hash TEXT NOT NULL,
        target_url TEXT NOT NULL,
        verified INTEGER NOT NULL DEFAULT 0,
        scope_locked INTEGER NOT NULL DEFAULT 0,
        scope_host TEXT NOT NULL DEFAULT '',
        state TEXT NOT NULL,
        free_scan_used INTEGER NOT NULL DEFAULT 0,
        credits INTEGER NOT NULL DEFAULT 0,
        findings_json TEXT NOT NULL DEFAULT '[]',
        order_id TEXT,
        repo_url TEXT,
        repo_path TEXT,
        repo_commit TEXT,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS quotas (
        user_hash TEXT PRIMARY KEY,
        scans INTEGER NOT NULL DEFAULT 0,
        credits INTEGER NOT NULL DEFAULT 0,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS orders (
        order_id TEXT PRIMARY KEY,
        user_hash TEXT NOT NULL,
        amount INTEGER NOT NULL,
        status TEXT NOT NULL,
        mode TEXT NOT NULL,
        credited INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS reports (
        job_id TEXT PRIMARY KEY,
        json_path TEXT NOT NULL,
        pdf_path TEXT NOT NULL,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS scan_runs (
        id TEXT PRIMARY KEY,
        job_id TEXT NOT NULL,
        scan_type TEXT NOT NULL,
        profile TEXT NOT NULL,
        tools_json TEXT NOT NULL DEFAULT '[]',
        findings_json TEXT NOT NULL DEFAULT '[]',
        approval TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_scan_runs_job_id ON scan_runs(job_id);
    `);
  }

  saveJob(job: Job): void {
    this.ensureRepoColumns();
    this.db.prepare(`
      INSERT INTO jobs (id,user_hash,target_url,verified,scope_locked,scope_host,state,free_scan_used,credits,findings_json,order_id,repo_url,repo_path,repo_commit,updated_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP)
      ON CONFLICT(id) DO UPDATE SET
        user_hash=excluded.user_hash,
        target_url=excluded.target_url,
        verified=excluded.verified,
        scope_locked=excluded.scope_locked,
        scope_host=excluded.scope_host,
        state=excluded.state,
        free_scan_used=excluded.free_scan_used,
        credits=excluded.credits,
        findings_json=excluded.findings_json,
        order_id=excluded.order_id,
        repo_url=excluded.repo_url,
        repo_path=excluded.repo_path,
        repo_commit=excluded.repo_commit,
        updated_at=CURRENT_TIMESTAMP
    `).run(job.id, job.userIdHash, job.targetUrl, bool(job.verified), bool(job.scopeLocked), job.scopeHost, job.state, bool(job.freeScanUsed), job.credits, JSON.stringify(job.findings), job.orderId || null, job.repoUrl || null, job.repoPath || null, job.repoCommit || null);
  }

  loadJobs(): Job[] {
    this.ensureRepoColumns();
    return this.db.prepare('SELECT * FROM jobs ORDER BY updated_at DESC').all().map(rowToJob);
  }

  saveQuota(userHash: string, scans: number, credits: number): void {
    this.db.prepare(`
      INSERT INTO quotas (user_hash,scans,credits,updated_at) VALUES (?,?,?,CURRENT_TIMESTAMP)
      ON CONFLICT(user_hash) DO UPDATE SET scans=excluded.scans, credits=excluded.credits, updated_at=CURRENT_TIMESTAMP
    `).run(userHash, scans, credits);
  }

  loadQuotas(): QuotaSnapshot[] {
    return this.db.prepare('SELECT user_hash, scans, credits FROM quotas').all().map((r) => ({ userHash: str(r.user_hash), scans: num(r.scans), credits: num(r.credits) }));
  }

  saveOrder(order: OrderSnapshot): void {
    this.db.prepare(`
      INSERT INTO orders (order_id,user_hash,amount,status,mode,credited,updated_at) VALUES (?,?,?,?,?,?,CURRENT_TIMESTAMP)
      ON CONFLICT(order_id) DO UPDATE SET user_hash=excluded.user_hash, amount=excluded.amount, status=excluded.status, mode=excluded.mode, credited=MAX(orders.credited, excluded.credited), updated_at=CURRENT_TIMESTAMP
    `).run(order.orderId, order.userHash, order.amount, order.status, order.mode, bool(order.credited));
  }

  isOrderCredited(orderId: string): boolean {
    const row = this.db.prepare('SELECT credited FROM orders WHERE order_id=?').get(orderId);
    return Boolean(num(row?.credited));
  }

  loadCreditedOrders(): Set<string> {
    return new Set(this.db.prepare('SELECT order_id FROM orders WHERE credited=1').all().map((r) => str(r.order_id)));
  }

  saveReport(jobId: string, report: { json: string; pdf: string }): void {
    this.db.prepare(`
      INSERT INTO reports (job_id,json_path,pdf_path,updated_at) VALUES (?,?,?,CURRENT_TIMESTAMP)
      ON CONFLICT(job_id) DO UPDATE SET json_path=excluded.json_path, pdf_path=excluded.pdf_path, updated_at=CURRENT_TIMESTAMP
    `).run(jobId, report.json, report.pdf);
  }

  loadReports(): ReportSnapshot[] {
    return this.db.prepare('SELECT job_id,json_path,pdf_path FROM reports').all().map((r) => ({ jobId: str(r.job_id), json: str(r.json_path), pdf: str(r.pdf_path) }));
  }

  saveScanRun(run: ScanRun): void {
    this.db.prepare(`
      INSERT INTO scan_runs (id,job_id,scan_type,profile,tools_json,findings_json,approval,created_at) VALUES (?,?,?,?,?,?,?,?)
      ON CONFLICT(id) DO UPDATE SET tools_json=excluded.tools_json, findings_json=excluded.findings_json, approval=excluded.approval
    `).run(run.id, run.jobId, run.type, run.profile, JSON.stringify(run.tools), JSON.stringify(run.findings), run.approval, run.createdAt);
  }

  loadScanRuns(jobId?: string): ScanRun[] {
    const rows = jobId ? this.db.prepare('SELECT * FROM scan_runs WHERE job_id=? ORDER BY created_at DESC').all(jobId) : this.db.prepare('SELECT * FROM scan_runs ORDER BY created_at DESC').all();
    return rows.map(rowToScanRun);
  }

  private ensureRepoColumns(): void {
    for (const sql of ['ALTER TABLE jobs ADD COLUMN repo_url TEXT', 'ALTER TABLE jobs ADD COLUMN repo_path TEXT', 'ALTER TABLE jobs ADD COLUMN repo_commit TEXT']) {
      try { this.db.exec(sql); } catch { /* column already exists */ }
    }
  }
}

function resolveDbPath(input: string): string {
  if (input.startsWith('file:')) return resolve(input.slice('file:'.length));
  return resolve(input);
}
function rowToJob(row: Row): Job {
  return {
    id: str(row.id),
    userIdHash: str(row.user_hash),
    targetUrl: str(row.target_url),
    verified: Boolean(num(row.verified)),
    scopeLocked: Boolean(num(row.scope_locked)),
    scopeHost: str(row.scope_host),
    state: str(row.state),
    freeScanUsed: Boolean(num(row.free_scan_used)),
    credits: num(row.credits),
    findings: parseFindings(str(row.findings_json)),
    orderId: row.order_id ? str(row.order_id) : undefined,
    repoUrl: row.repo_url ? str(row.repo_url) : undefined,
    repoPath: row.repo_path ? str(row.repo_path) : undefined,
    repoCommit: row.repo_commit ? str(row.repo_commit) : undefined
  };
}
function rowToScanRun(row: Row): ScanRun {
  return { id: str(row.id), jobId: str(row.job_id), type: str(row.scan_type) === 'web' ? 'web' : 'repo', profile: str(row.profile) === 'deep' ? 'deep' : 'safe', tools: parseTools(str(row.tools_json)), findings: parseFindings(str(row.findings_json)), approval: str(row.approval), createdAt: str(row.created_at) };
}
function parseFindings(raw: string): Job['findings'] { try { const parsed = JSON.parse(raw); return Array.isArray(parsed) ? parsed : []; } catch { return []; } }
function parseTools(raw: string): ToolStatus[] { try { const parsed = JSON.parse(raw); return Array.isArray(parsed) ? parsed : []; } catch { return []; } }
function str(value: unknown): string { return typeof value === 'string' ? value : value == null ? '' : String(value); }
function num(value: unknown): number { return typeof value === 'number' ? value : Number(value || 0); }
function bool(value: boolean): number { return value ? 1 : 0; }
