import { loadEnv } from './core/env.js';
import { MainOrchestrator } from './orchestrator/MainOrchestrator.js';
import { rm } from 'node:fs/promises';

loadEnv();
await rm(process.env.DEMO_AUDIT_LOG_PATH || 'logs/demo_audit.jsonl', { force: true });
const result = await new MainOrchestrator().demo();
console.log(JSON.stringify({ status:'DONE', job_id: result.job.id, findings: result.job.findings.length, reports: result.reports, transcript: result.transcript, payment_order: result.job.orderId }, null, 2));
