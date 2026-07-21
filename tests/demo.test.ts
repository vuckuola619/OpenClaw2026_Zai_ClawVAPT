import test from 'node:test';
import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import { MainOrchestrator } from '../src/orchestrator/MainOrchestrator.js';

test('demo generates audit log and reports without external tools', async () => { process.env.DEMO_MODE='true'; const res=await new MainOrchestrator().demo(); assert.ok(res.job.verified); assert.ok(res.job.scopeLocked); assert.ok(res.job.findings.length > 0); await access(res.reports.json); await access(res.reports.pdf); await access(res.transcript); await access(process.env.DEMO_AUDIT_LOG_PATH || 'logs/demo_audit.jsonl'); const report=JSON.parse(await readFile(res.reports.json,'utf8')); assert.equal(report.redaction_applied,true); assert.equal(report.executive_summary.product.includes('Telegram-first'), true); assert.ok(Array.isArray(report.vulnerability_program.remediation_sla)); const transcript = await readFile(res.transcript, 'utf8'); assert.match(transcript, /Judge Walkthrough/); assert.match(transcript, /\/judge/); });
