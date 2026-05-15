import { randomUUID, createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import type { AgentResult, Job, ToolStatus } from '../types/index.js';
import { AuditLogger } from '../core/AuditLogger.js';
import { QuotaStore } from '../core/QuotaStore.js';
import { validatePublicTarget } from '../core/TargetSafety.js';
import { PersistentStore } from '../core/PersistentStore.js';
import { MultiAgentEngine } from '../engine/MultiAgentEngine.js';
import { ExternalSecurityToolRunner } from '../tools/ExternalSecurityToolRunner.js';
import { ReportGenerator } from '../report/ReportGenerator.js';
import { PakasirAdapter } from '../tools/PakasirAdapter.js';
import { SecurityToolAdapters, type ToolRunResult, type RepoScanProfile } from '../tools/SecurityToolAdapters.js';
import { ActiveWebScanner, type ActiveWebScanResult, type WebScanProfile } from '../tools/ActiveWebScanner.js';
import { GitHubRepoConnector } from '../tools/GitHubRepoConnector.js';
import type { Correlation } from '../tools/Correlator.js';

export class MainOrchestrator {
  jobs = new Map<string, Job>();
  store: PersistentStore;
  quota: QuotaStore;
  audit = new AuditLogger();
  engine = new MultiAgentEngine(this.audit);
  payments = new PakasirAdapter();
  securityTools = new SecurityToolAdapters(this.audit);
  activeWebScanner = new ActiveWebScanner(this.audit);
  repoConnector = new GitHubRepoConnector();
  reportsByJob = new Map<string, { json: string; pdf: string }>();
  correlationsByJob = new Map<string, Correlation[]>();
  creditedOrders = new Set<string>();

  constructor(store = new PersistentStore()) {
    this.store = store;
    this.quota = new QuotaStore(this.store.loadQuotas(), (q) => this.store.saveQuota(q.userHash, q.scans, q.credits));
    for (const job of this.store.loadJobs()) this.jobs.set(job.id, job);
    for (const report of this.store.loadReports()) this.reportsByJob.set(report.jobId, { json: report.json, pdf: report.pdf });
    this.creditedOrders = this.store.loadCreditedOrders();
  }

  hashUser(userId: string) { return createHash('sha256').update(userId).digest('hex').slice(0, 16); }

  async createScan(userId: string, targetUrl: string): Promise<Job> {
    const safeUrl = validatePublicTarget(targetUrl);
    const job: Job = { id: `JOB-${randomUUID().slice(0, 8)}`, userIdHash: this.hashUser(userId), targetUrl: safeUrl.toString(), verified: false, scopeLocked: false, scopeHost: '', state: 'RECEIVE_REQUEST', freeScanUsed: false, credits: 0, findings: [] };
    this.jobs.set(job.id, job);
    this.store.saveJob(job);
    await this.audit.transition(job.id, job.userIdHash, 'MainOrchestrator', 'START', 'RECEIVE_REQUEST', 'create_job', 'telegram', 'DONE', { targetUrl }, { job_id: job.id });
    return job;
  }

  getJob(jobId: string): Job | undefined { return this.jobs.get(jobId); }

  listJobsForUser(userId: string, limit = 10): Job[] {
    const userHash = this.hashUser(userId);
    return [...this.jobs.values()].filter((job) => job.userIdHash === userHash).slice(0, limit);
  }

  latestJobForUser(userId: string): Job | undefined { return this.listJobsForUser(userId, 1)[0]; }

  async createChallenge(job: Job): Promise<AgentResult> {
    const envelope = await this.engine.run('TrustVerifierPaymentAgent', 'challenge', { job });
    const result = envelope.result;
    job.state = 'GENERATE_OWNERSHIP_CHALLENGE';
    this.store.saveJob(job);
    return result;
  }

  async verifyDemo(jobId: string): Promise<AgentResult> {
    const job = this.mustJob(jobId);
    const envelope = await this.engine.run('TrustVerifierPaymentAgent', 'verify_demo', { job });
    const result = envelope.result;
    job.state = result.next_state;
    this.store.saveJob(job);
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
      const payment = await this.engine.trust.createPayment(job);
      this.store.saveJob(job);
      if (job.orderId) this.store.saveOrder({ orderId: job.orderId, userHash: job.userIdHash, amount: 25000, status: payment.status, mode: payment.status === 'MOCK' ? 'mock' : 'sandbox', credited: false });
      await this.audit.transition(job.id, job.userIdHash, 'TrustVerifierPaymentAgent', 'CHECK_QUOTA_OR_PAYMENT', 'CHECK_QUOTA_OR_PAYMENT', 'payment_gate', 'PakasirAdapter', payment.status, {}, { orderId: job.orderId });
      throw new Error(`PAYMENT_REQUIRED:${job.orderId}`);
    }
    const scanEnvelope = await this.engine.run<import('../agents/types.js').ScanAgentResult>('RedTeamRepoScannerAgent', 'scan', { job });
    const scan = scanEnvelope.result;
    const patch = await this.engine.blue.patch(job);
    const planEnvelope = await this.engine.run('BlueTeamHardeningReportAgent', 'remediation_plan', { job });
    await this.audit.transition(job.id, job.userIdHash, 'BlueTeamHardeningReportAgent', planEnvelope.result.next_state, 'APPROVAL_GATE', 'plan_patch', 'PatchGenerator', 'MOCK', {}, { patch });
    await this.audit.transition(job.id, job.userIdHash, 'BlueTeamHardeningReportAgent', 'APPROVAL_GATE', 'RETEST', 'retest_required', 'RetestRunner', 'DONE', {}, { fixed_marked: false });
    const tools = await new ExternalSecurityToolRunner(this.audit).checkAll(job.id, job.userIdHash);
    const reports = await new ReportGenerator().generate(job, scan.correlations, tools, false);
    this.reportsByJob.set(job.id, reports);
    this.store.saveReport(job.id, reports);
    this.correlationsByJob.set(job.id, scan.correlations);
    await this.audit.transition(job.id, job.userIdHash, 'BlueTeamHardeningReportAgent', 'GENERATE_FINAL_REPORT', 'SEND_TELEGRAM_SUMMARY', 'report', 'ReportGenerator', 'DONE', {}, reports);
    job.state = 'SEND_TELEGRAM_SUMMARY';
    this.store.saveJob(job);
    return { job, reports, correlations: scan.correlations, tools };
  }

  async createPaymentForUser(userId: string): Promise<{ orderId: string; amount: number; paymentUrl: string; mode: string }> {
    const userHash = this.hashUser(userId);
    const orderId = `CLWV-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${randomUUID().slice(0, 4)}`;
    const tx = await this.payments.createTransaction('qris', orderId, 25000);
    this.store.saveOrder({ orderId, userHash, amount: 25000, status: tx.status, mode: tx.mode, credited: false });
    await this.audit.transition(orderId, userHash, 'TrustVerifierPaymentAgent', 'CHECK_QUOTA_OR_PAYMENT', 'CHECK_QUOTA_OR_PAYMENT', 'create_payment', 'PakasirAdapter', tx.mode === 'mock' ? 'MOCK' : 'DONE', {}, { orderId, amount: 25000 });
    return { orderId, amount: 25000, paymentUrl: tx.paymentUrl, mode: tx.mode };
  }

  async checkPayment(userId: string, orderId: string): Promise<{ status: string; creditsAdded: number; mode: string; alreadyCredited: boolean }> {
    const tx = await this.payments.getTransactionDetail(orderId, 25000);
    const paid = this.payments.isPaid(tx.status);
    const alreadyCredited = this.creditedOrders.has(orderId) || this.store.isOrderCredited(orderId);
    const creditsAdded = paid && !alreadyCredited ? 10 : 0;
    if (creditsAdded > 0) {
      this.quota.addCredits(this.hashUser(userId), creditsAdded);
      this.creditedOrders.add(orderId);
    }
    this.store.saveOrder({ orderId, userHash: this.hashUser(userId), amount: 25000, status: tx.rawStatus || tx.status, mode: tx.mode, credited: paid });
    await this.audit.transition(orderId, this.hashUser(userId), 'TrustVerifierPaymentAgent', 'CHECK_QUOTA_OR_PAYMENT', paid ? 'CREATE_SCAN_PLAN' : 'CHECK_QUOTA_OR_PAYMENT', 'check_payment', 'PakasirAdapter', tx.mode === 'mock' ? 'MOCK' : 'DONE', { orderId }, { status: tx.status, rawStatus: tx.rawStatus, creditsAdded, alreadyCredited });
    return { status: tx.rawStatus || tx.status, creditsAdded, mode: tx.mode, alreadyCredited };
  }

  async hardening(jobId: string): Promise<AgentResult> { const job = this.mustJob(jobId); return (await this.engine.run('BlueTeamHardeningReportAgent', 'hardening_plan', { job })).result; }

  async toolsStatus(userId = 'system'): Promise<ToolStatus[]> { return this.securityTools.status('tools-status', this.hashUser(userId)); }

  async connectRepo(jobId: string, userId: string, repoUrl: string): Promise<Job> {
    const job = this.mustJob(jobId);
    if (job.userIdHash !== this.hashUser(userId)) throw new Error('JOB_NOT_FOUND');
    const repo = this.repoConnector.connect(job.id, repoUrl);
    job.repoUrl = repo.repoUrl;
    job.repoPath = repo.repoPath;
    job.repoCommit = repo.commit;
    job.state = 'REPO_CONNECTED';
    this.store.saveJob(job);
    await this.audit.transition(job.id, job.userIdHash, 'MainOrchestrator', 'RECEIVE_REQUEST', 'REPO_CONNECTED', 'connect_repo', 'GitHubRepoConnector', 'DONE', { repo: `${repo.owner}/${repo.repo}` }, { commit: repo.commit });
    return job;
  }

  async runRepoSecuritySuite(userId = 'system', profile: RepoScanProfile = 'safe', jobId?: string): Promise<ToolRunResult> {
    if (!jobId) throw new Error('REPO_NOT_CONNECTED');
    const job = this.mustJob(jobId);
    if (job.userIdHash !== this.hashUser(userId)) throw new Error('JOB_NOT_FOUND');
    if (!job.repoPath) throw new Error('REPO_NOT_CONNECTED');
    return new SecurityToolAdapters(this.audit, job.repoPath, profile === 'deep' ? 90000 : 30000).runRepoSuite(`repo-security-suite-${profile}-${job.id}`, job.userIdHash, profile);
  }

  activeWebToolsStatus(): ToolStatus[] { return this.activeWebScanner.status(); }

  async previewActiveWebScan(jobId: string, profile: WebScanProfile = 'safe'): Promise<{ job: Job; tools: ToolStatus[]; profile: WebScanProfile }> {
    const job = this.mustJob(jobId);
    if (!job.verified || !job.scopeLocked) throw new Error('OWNERSHIP_OR_SCOPE_GATE_BLOCKED');
    return { job, tools: this.activeWebToolsStatus(), profile };
  }

  async runActiveWebScan(jobId: string, userId: string, approved = false, profile: WebScanProfile = 'safe'): Promise<ActiveWebScanResult> {
    const job = this.mustJob(jobId);
    const result = await this.activeWebScanner.scan({ jobId: job.id, userHash: this.hashUser(userId), targetUrl: job.targetUrl, verified: job.verified, scopeLocked: job.scopeLocked, scopeHost: job.scopeHost, approved, profile });
    job.findings = [...job.findings, ...result.findings];
    job.state = 'ACTIVE_WEB_SCAN_COMPLETE';
    this.store.saveJob(job);
    return result;
  }

  async demo(): Promise<{ job: Job; reports: { json: string; pdf: string }; transcript: string; tools: ToolStatus[] }> {
    const job = await this.createScan('demo-user', 'https://demo-owned-site.local');
    await this.createChallenge(job);
    await this.verifyDemo(job.id);
    const secondBefore = this.quota.check(job.userIdHash);
    const result = await this.runApprovedScan(job.id);
    const second = this.quota.check(job.userIdHash);
    if (!second.allowed || secondBefore.allowed) {
      const payment = await this.engine.trust.createPayment(job);
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
