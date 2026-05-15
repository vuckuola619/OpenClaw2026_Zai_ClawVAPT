import { randomUUID, createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import type { AgentResult, Job, ToolStatus } from '../types/index.js';
import { AuditLogger } from '../core/AuditLogger.js';
import { QuotaStore } from '../core/QuotaStore.js';
import { TrustVerifierPaymentAgent } from '../agents/TrustVerifierPaymentAgent.js';
import { RedTeamRepoScannerAgent } from '../agents/RedTeamRepoScannerAgent.js';
import { BlueTeamHardeningReportAgent } from '../agents/BlueTeamHardeningReportAgent.js';
import { ExternalSecurityToolRunner } from '../tools/ExternalSecurityToolRunner.js';
import { ReportGenerator } from '../report/ReportGenerator.js';
import { PakasirAdapter } from '../tools/PakasirAdapter.js';
import type { Correlation } from '../tools/Correlator.js';

export class MainOrchestrator {
  jobs = new Map<string, Job>();
  quota = new QuotaStore();
  audit = new AuditLogger();
  trust = new TrustVerifierPaymentAgent();
  red = new RedTeamRepoScannerAgent();
  blue = new BlueTeamHardeningReportAgent();
  payments = new PakasirAdapter();
  reportsByJob = new Map<string, { json: string; pdf: string }>();
  correlationsByJob = new Map<string, Correlation[]>();

  hashUser(userId: string) { return createHash('sha256').update(userId).digest('hex').slice(0, 16); }

  async createScan(userId: string, targetUrl: string): Promise<Job> {
    const job: Job = { id: `JOB-${randomUUID().slice(0, 8)}`, userIdHash: this.hashUser(userId), targetUrl, verified: false, scopeLocked: false, scopeHost: '', state: 'RECEIVE_REQUEST', freeScanUsed: false, credits: 0, findings: [] };
    this.jobs.set(job.id, job);
    await this.audit.transition(job.id, job.userIdHash, 'MainOrchestrator', 'START', 'RECEIVE_REQUEST', 'create_job', 'telegram', 'DONE', { targetUrl }, { job_id: job.id });
    return job;
  }

  getJob(jobId: string): Job | undefined { return this.jobs.get(jobId); }

  async createChallenge(job: Job): Promise<AgentResult> {
    const result = this.trust.challenge(job);
    await this.audit.transition(job.id, job.userIdHash, 'TrustVerifierPaymentAgent', 'PRE_ENGAGEMENT_CHECK', 'GENERATE_OWNERSHIP_CHALLENGE', 'challenge', 'ScopeGuard', 'DONE', {}, { decision: result.decision });
    job.state = 'GENERATE_OWNERSHIP_CHALLENGE';
    return result;
  }

  async verifyDemo(jobId: string): Promise<AgentResult> {
    const job = this.mustJob(jobId);
    const result = this.trust.verifyDemo(job, `clawvapt-verify-${job.id}`);
    await this.audit.transition(job.id, job.userIdHash, 'TrustVerifierPaymentAgent', 'VERIFY_OWNERSHIP', 'LOCK_SCOPE', 'verify_demo', 'ScopeGuard', result.status, {}, { scope: job.scopeHost });
    job.state = result.next_state;
    return result;
  }

  async runApprovedScan(jobId: string): Promise<{ job: Job; reports: { json: string; pdf: string }; correlations: Correlation[]; tools: ToolStatus[] }> {
    const job = this.mustJob(jobId);
    if (!job.verified || !job.scopeLocked) throw new Error('OWNERSHIP_OR_SCOPE_GATE_BLOCKED');
    const q = this.quota.check(job.userIdHash);
    if (q.allowed) {
      this.quota.consume(job.userIdHash);
      await this.audit.transition(job.id, job.userIdHash, 'TrustVerifierPaymentAgent', 'LOCK_SCOPE', 'CHECK_QUOTA_OR_PAYMENT', q.reason === 'FREE' ? 'first_scan_free' : 'credits_scan', 'QuotaStore', 'DONE', {}, q);
    } else {
      const payment = await this.trust.createPayment(job);
      await this.audit.transition(job.id, job.userIdHash, 'TrustVerifierPaymentAgent', 'CHECK_QUOTA_OR_PAYMENT', 'CHECK_QUOTA_OR_PAYMENT', 'payment_gate', 'PakasirAdapter', payment.status, {}, { orderId: job.orderId });
      throw new Error(`PAYMENT_REQUIRED:${job.orderId}`);
    }
    const scan = await this.red.scan(job);
    await this.audit.transition(job.id, job.userIdHash, 'RedTeamRepoScannerAgent', 'CREATE_SCAN_PLAN', 'SCORE_AND_PRIORITIZE', 'safe_scan', 'BuiltInScanners', 'DONE', {}, { findings: scan.findings.length });
    const patch = await this.blue.patch(job);
    await this.audit.transition(job.id, job.userIdHash, 'BlueTeamHardeningReportAgent', 'OFFER_REMEDIATION', 'APPROVAL_GATE', 'plan_patch', 'PatchGenerator', 'MOCK', {}, { patch });
    await this.audit.transition(job.id, job.userIdHash, 'BlueTeamHardeningReportAgent', 'APPROVAL_GATE', 'RETEST', 'retest_required', 'RetestRunner', 'DONE', {}, { fixed_marked: false });
    const tools = await new ExternalSecurityToolRunner(this.audit).checkAll(job.id, job.userIdHash);
    const reports = await new ReportGenerator().generate(job, scan.correlations, tools, false);
    this.reportsByJob.set(job.id, reports);
    this.correlationsByJob.set(job.id, scan.correlations);
    await this.audit.transition(job.id, job.userIdHash, 'BlueTeamHardeningReportAgent', 'GENERATE_FINAL_REPORT', 'SEND_TELEGRAM_SUMMARY', 'report', 'ReportGenerator', 'DONE', {}, reports);
    job.state = 'SEND_TELEGRAM_SUMMARY';
    return { job, reports, correlations: scan.correlations, tools };
  }

  async createPaymentForUser(userId: string): Promise<{ orderId: string; amount: number; paymentUrl: string; mode: string }> {
    const userHash = this.hashUser(userId);
    const orderId = `CLWV-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${randomUUID().slice(0, 4)}`;
    const tx = await this.payments.createTransaction('qris', orderId, 25000);
    await this.audit.transition(orderId, userHash, 'TrustVerifierPaymentAgent', 'CHECK_QUOTA_OR_PAYMENT', 'CHECK_QUOTA_OR_PAYMENT', 'create_payment', 'PakasirAdapter', tx.mode === 'mock' ? 'MOCK' : 'DONE', {}, { orderId, amount: 25000 });
    return { orderId, amount: 25000, paymentUrl: tx.paymentUrl, mode: tx.mode };
  }

  async checkPayment(userId: string, orderId: string): Promise<{ status: string; creditsAdded: number; mode: string }> {
    const tx = await this.payments.getTransactionDetail(orderId, 25000);
    const paid = tx.status === 'MOCK_PAYMENT_CONFIRMED' || tx.status === 'PAID';
    if (paid) this.quota.addCredits(this.hashUser(userId), 10);
    await this.audit.transition(orderId, this.hashUser(userId), 'TrustVerifierPaymentAgent', 'CHECK_QUOTA_OR_PAYMENT', 'CREATE_SCAN_PLAN', 'check_payment', 'PakasirAdapter', tx.mode === 'mock' ? 'MOCK' : 'DONE', { orderId }, { status: tx.status, creditsAdded: paid ? 10 : 0 });
    return { status: tx.status, creditsAdded: paid ? 10 : 0, mode: tx.mode };
  }

  hardening(jobId: string): AgentResult { return this.blue.hardening(this.mustJob(jobId)); }

  async demo(): Promise<{ job: Job; reports: { json: string; pdf: string }; transcript: string; tools: ToolStatus[] }> {
    const job = await this.createScan('demo-user', 'https://demo-owned-site.local');
    await this.createChallenge(job);
    await this.verifyDemo(job.id);
    const secondBefore = this.quota.check(job.userIdHash);
    const result = await this.runApprovedScan(job.id);
    const second = this.quota.check(job.userIdHash);
    if (!second.allowed || secondBefore.allowed) {
      const payment = await this.trust.createPayment(job);
      await this.audit.transition(job.id, job.userIdHash, 'TrustVerifierPaymentAgent', 'CHECK_QUOTA_OR_PAYMENT', 'CHECK_QUOTA_OR_PAYMENT', 'payment_gate', 'PakasirAdapter', payment.status, {}, { orderId: job.orderId });
      this.quota.addCredits(job.userIdHash, 10);
      await this.audit.transition(job.id, job.userIdHash, 'TrustVerifierPaymentAgent', 'CHECK_QUOTA_OR_PAYMENT', 'CREATE_SCAN_PLAN', 'simulate_payment', 'PakasirAdapter', 'MOCK', { orderId: job.orderId }, { credits_added: 10 });
    }
    const sampleReports = await new ReportGenerator().generate(job, result.correlations, result.tools, true);
    const transcript = await this.writeTranscript(job, sampleReports);
    return { job, reports: sampleReports, transcript, tools: result.tools };
  }

  async writeTranscript(job: Job, reports: { json: string; pdf: string }) {
    await mkdir('docs', { recursive: true });
    const path = 'docs/demo-transcript.md';
    await writeFile(path, `# ClawVAPT Demo Transcript\n\n/start\n/help\n/demo\n/scan ${job.targetUrl}\n/verify ${job.id}\n/status ${job.id}\n/report ${job.id}\n/harden ${job.id}\n/pay\n/check_payment ${job.orderId}\n/simulate_payment ${job.orderId}\n\nReports: ${reports.json}, ${reports.pdf}\nSafety: ownership verified, scope locked, secrets redacted.\n`);
    return path;
  }

  private mustJob(jobId: string): Job {
    const job = this.jobs.get(jobId);
    if (!job) throw new Error('JOB_NOT_FOUND');
    return job;
  }
}
