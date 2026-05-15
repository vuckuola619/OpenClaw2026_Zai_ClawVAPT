import { mkdir, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import type { PersistentStore } from './PersistentStore.js';
import { healthCheck } from './HealthCheck.js';

export interface OpsStatus {
  status: 'ok' | 'degraded';
  uptimeSeconds: number;
  memoryMb: number;
  database: { path: string; present: boolean; sizeBytes: number; counts: { jobs: number; scanRuns: number; reports: number; orders: number } };
  dirs: Record<string, boolean>;
  health: ReturnType<typeof healthCheck>;
}

export interface BackupResult { path: string; sizeBytes: number; createdAt: string }

export class OpsService {
  constructor(private store: PersistentStore) {}

  async status(): Promise<OpsStatus> {
    const dbStat = await stat(this.store.path).catch(() => null);
    const dirs = ['reports', 'logs', 'patches', 'data', 'backups'].reduce<Record<string, boolean>>((acc, dir) => { acc[dir] = existsSync(resolve(dir)); return acc; }, {});
    return {
      status: healthCheck().status,
      uptimeSeconds: Math.floor(process.uptime()),
      memoryMb: Math.round(process.memoryUsage().rss / 1024 / 1024),
      database: { path: this.store.path, present: Boolean(dbStat), sizeBytes: dbStat?.size || 0, counts: this.store.counts() },
      dirs,
      health: healthCheck()
    };
  }

  async backupDatabase(destinationDir = process.env.BACKUP_DIR || 'backups'): Promise<BackupResult> {
    const dir = resolve(destinationDir);
    await mkdir(dir, { recursive: true });
    const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
    const path = resolve(dir, `clawvapt-${stamp}.db`);
    await this.store.backupTo(path);
    const st = await stat(path);
    return { path, sizeBytes: st.size, createdAt: new Date().toISOString() };
  }
}
