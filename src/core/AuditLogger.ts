import { appendFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import type { AuditEvent, Status } from '../types/index.js';
import { Redactor } from './Redactor.js';
export class AuditLogger {
  constructor(private path = process.env.DEMO_AUDIT_LOG_PATH || 'logs/demo_audit.jsonl', private redactor = new Redactor()) {}
  async log(event: Omit<AuditEvent,'timestamp'|'redaction_applied'>): Promise<void> {
    await mkdir(dirname(this.path), { recursive: true });
    const safe: AuditEvent = { ...this.redactor.redact(event) as Omit<AuditEvent,'timestamp'|'redaction_applied'>, timestamp: new Date().toISOString(), redaction_applied: true };
    await appendFile(this.path, JSON.stringify(safe) + '\n');
  }
  async transition(job_id: string, user_id_hash: string, agent: string, from: string, to: string, action: string, tool_name: string, status: Status, input_summary: Record<string, unknown> = {}, output_summary: Record<string, unknown> = {}) {
    await this.log({ job_id, user_id_hash, correlation_id: `${job_id}:${Date.now()}`, agent, state_from: from, state_to: to, action, tool_name, input_summary, output_summary, status });
  }
}
