import { MainOrchestrator } from './orchestrator/MainOrchestrator.js';
const result = await new MainOrchestrator().demo();
console.log(JSON.stringify({ status:'DONE', job_id: result.job.id, findings: result.job.findings.length, reports: result.reports, transcript: result.transcript, payment_order: result.job.orderId }, null, 2));
