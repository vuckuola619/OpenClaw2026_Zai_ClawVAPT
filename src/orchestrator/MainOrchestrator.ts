import { randomUUID, createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import type { AgentResult, Finding, Job, ScanRun, ToolStatus } from '../types/index.js';
import { AuditLogger } from '../core/AuditLogger.js';
import { DEEP_SCAN_COST, QuotaStore, SAFE_SCAN_COST } from '../core/QuotaStore.js';
import { validatePublicTarget } from '../core/TargetSafety.js';
import { CleanupService, type CleanupResult } from '../core/CleanupService.js';
import { OwnershipVerifier } from '../core/OwnershipVerifier.js';
import { OpsService, type BackupResult, type OpsStatus } from '../core/OpsService.js';
import { PersistentStore } from '../core/PersistentStore.js';
import { MultiAgentEngine } from '../engine/MultiAgentEngine.js';
import { ExternalSecurityToolRunner } from '../tools/ExternalSecurityToolRunner.js';
import { ReportGenerator } from '../report/ReportGenerator.js';
import { manualReviewChecklist, writeManualReview } from '../report/ManualReview.js';
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
  ownershipVerifier = new OwnershipVerifier();
  repoConnector = new GitHubRepoConnector();
  reportsByJob = new Map<string, { json: string; pdf: string }>();
  correlationsByJob = new Map<string, Correlation[]>();
  scanRunsByJob = new Map<string, ScanRun[]>();
  creditedOrders = new Set<string>();

  constructor(store = new PersistentStore()) {
    this.store = store;
    this.quota = new QuotaStore(this.store.loadQuotas(), (q) => this.store.saveQuota(q.userHash, q.scans, q.credits));
    for (const job of this.store.loadJobs()) this.jobs.set(job.id, job);
    for (const report of this.store.loadReports()) this.reportsByJob.set(report.jobId, { json: report.json, pdf: report.pdf });
    for (const run of this.store.loadScanRuns()) this.scanRunsByJob.set(run.jobId, [...(this.scanRunsByJob.get(run.jobId) || []), run]);
    this.creditedOrders = this.store.loadCreditedOrders();
  }

  hashUser(userId: string) { return createHash('sha256').update(userId).digest('hex').slice(0, 16); }

  async createScan(userId: string, targetUrl: string): Promise<Job> {
    const safeUrl = validatePublicTarget(targetUrl);
    const userHash = this.hashUser(userId);
    const quota = this.quota.ensureUser(userHash);
    const reusable = this.findVerifiedScope(userHash, safeUrl.hostname.toLowerCase());
    const job: Job = { id: `JOB-${randomUUID().slice(0, 8)}`, userIdHash: userHash, targetUrl: safeUrl.toString(), verified: Boolean(reusable), scopeLocked: Boolean(reusable), scopeHost: reusable?.scopeHost || '', state: reusable ? 'LOCK_SCOPE' : 'RECEIVE_REQUEST', freeScanUsed: false, credits: quota.credits, findings: [], ownershipToken: reusable?.ownershipToken, verificationMethod: reusable?.verificationMethod, verifiedAt: reusable?.verifiedAt };
    this.jobs.set(job.id, job);
    this.store.saveJob(job);
    await this.audit.transition(job.id, job.userIdHash, 'MainOrchestrator', 'START', job.state, reusable ? 'create_job_reuse_verified_scope' : 'create_job', 'telegram', 'DONE', { targetUrl }, { job_id: job.id, credits: quota.credits, reused_verification: Boolean(reusable) });
    return job;
  }

  getJob(jobId: string): Job | undefined { return this.jobs.get(jobId); }

  listJobsForUser(userId: string, limit = 10): Job[] {
    const userHash = this.hashUser(userId);
    return [...this.jobs.values()].filter((job) => job.userIdHash === userHash).slice(0, limit);
  }

  latestJobForUser(userId: string): Job | undefined { return this.listJobsForUser(userId, 1)[0]; }

  quotaSnapshotForUser(userId: string) { return this.quota.ensureUser(this.hashUser(userId)); }

  scopeScanUsage(jobId: string): { used: number; limit: number } { const job = this.mustJob(jobId); return { used: this.scansForScope(job), limit: Number(process.env.MAX_SCANS_PER_VERIFIED_SCOPE || 5) }; }

  async createChallenge(job: Job): Promise<AgentResult> {
    const envelope = await this.engine.run('TrustVerifierPaymentAgent', 'challenge', { job });
    const result = envelope.result;
    job.ownershipToken = job.ownershipToken || this.ownershipVerifier.challengeToken(job);
    job.state = 'GENERATE_OWNERSHIP_CHALLENGE';
    this.store.saveJob(job);
    await this.audit.transition(job.id, job.userIdHash, 'TrustVerifierPaymentAgent', 'RECEIVE_REQUEST', 'GENERATE_OWNERSHIP_CHALLENGE', 'ownership_challenge_created', 'OwnershipVerifier', 'DONE', { targetHost: new URL(job.targetUrl).hostname }, { methods: ['http', 'dns'], token_created: true });
    return { ...result, evidence: [{ type: 'challenge', summary: this.ownershipVerifier.instructions(job), redacted: true }] };
  }

  challengeInstructions(jobId: string): string {
    return this.ownershipVerifier.instructions(this.mustJob(jobId));
  }

  async verifyOwnership(jobId: string): Promise<AgentResult> {
    const job = this.mustJob(jobId);
    job.ownershipToken = job.ownershipToken || this.ownershipVerifier.challengeToken(job);
    const result = await this.ownershipVerifier.verify(job);
    if (result.ok) {
      job.verified = true;
      job.scopeHost = new URL(job.targetUrl).hostname.toLowerCase();
      job.scopeLocked = true;
      job.verificationMethod = result.method;
      job.verifiedAt = new Date().toISOString();
      job.state = 'LOCK_SCOPE';
    } else {
      job.state = 'VERIFY_OWNERSHIP';
    }
    this.store.saveJob(job);
    await this.audit.transition(job.id, job.userIdHash, 'TrustVerifierPaymentAgent', 'VERIFY_OWNERSHIP', job.state, result.ok ? 'ownership_verification_passed' : 'ownership_verification_failed', 'OwnershipVerifier', result.ok ? 'DONE' : 'ERROR', { targetHost: new URL(job.targetUrl).hostname }, { method: result.method || 'none', evidence: result.evidence });
    return { agent: 'TrustVerifierPaymentAgent', job_id: job.id, status: result.ok ? 'DONE' : 'ERROR', decision: result.ok ? 'OWNERSHIP_VERIFIED_SCOPE_LOCKED' : 'OWNERSHIP_VERIFICATION_FAILED', evidence: [{ type: 'scope', summary: result.ok ? `method=${result.method}; scope=${job.scopeHost}` : result.evidence, redacted: true }], findings: [], next_state: job.state, redaction_applied: true, notes: [result.ok ? 'Ownership proof validated.' : 'HTTP/DNS proof not found or token mismatch.'] };
  }

  async verifyDemo(jobId: string): Promise<AgentResult> { return this.verifyOwnership(jobId); }

  async runApprovedScan(jobId: string): Promise<{ job: Job; reports: { json: string; pdf: string }; correlations: Correlation[]; tools: ToolStatus[] }> {
    const job = this.mustJob(jobId);
    if (!job.verified || !job.scopeLocked) throw new Error('OWNERSHIP_OR_SCOPE_GATE_BLOCKED');
    this.assertScanLimit(job);
    const q = this.quota.check(job.userIdHash, SAFE_SCAN_COST);
    if (q.allowed) {
      this.quota.consume(job.userIdHash, SAFE_SCAN_COST);
      await this.audit.transition(job.id, job.userIdHash, 'TrustVerifierPaymentAgent', 'LOCK_SCOPE', 'CHECK_QUOTA_OR_PAYMENT', 'credits_scan', 'QuotaStore', 'DONE', {}, q);
    } else {
      const payment = await this.engine.trust.createPayment(job);
      this.store.saveJob(job);
      if (job.orderId) this.store.saveOrder({ orderId: job.orderId, userHash: job.userIdHash, amount: 25000, status: payment.status, mode: payment.status === 'MOCK' ? 'mock' : 'sandbox', credited: false });
      await this.audit.transition(job.id, job.userIdHash, 'TrustVerifierPaymentAgent', 'CHECK_QUOTA_OR_PAYMENT', 'CHECK_QUOTA_OR_PAYMENT', 'payment_gate', 'PakasirAdapter', payment.status, {}, { orderId: job.orderId });
      throw new Error(`PAYMENT_REQUIRED:${job.orderId}`);
    }
    job.credits = this.quota.snapshot(job.userIdHash).credits;
    const scanEnvelope = await this.engine.run<import('../agents/types.js').ScanAgentResult>('RedTeamRepoScannerAgent', 'scan', { job });
    const scan = scanEnvelope.result;
    const patch = await this.engine.blue.patch(job);
    const planEnvelope = await this.engine.run('BlueTeamHardeningReportAgent', 'remediation_plan', { job });
    await this.audit.transition(job.id, job.userIdHash, 'BlueTeamHardeningReportAgent', planEnvelope.result.next_state, 'APPROVAL_GATE', 'plan_patch', 'PatchGenerator', 'MOCK', {}, { patch });
    await this.audit.transition(job.id, job.userIdHash, 'BlueTeamHardeningReportAgent', 'APPROVAL_GATE', 'RETEST', 'retest_required', 'RetestRunner', 'DONE', {}, { fixed_marked: false });
    const tools = await new ExternalSecurityToolRunner(this.audit).checkAll(job.id, job.userIdHash);
    const reports = await new ReportGenerator().generate(job, scan.correlations, tools, false, this.scanRunsByJob.get(job.id) || []);
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

  async simulatePayment(userId: string, orderId: string): Promise<{ status: string; creditsAdded: number; mode: string; alreadyCredited: boolean }> {
    const tx = await this.payments.simulatePayment(orderId, 25000);
    const alreadyCredited = this.creditedOrders.has(orderId) || this.store.isOrderCredited(orderId);
    const creditsAdded = alreadyCredited ? 0 : 10;
    if (creditsAdded > 0) {
      this.quota.addCredits(this.hashUser(userId), creditsAdded);
      this.creditedOrders.add(orderId);
    }
    this.store.saveOrder({ orderId, userHash: this.hashUser(userId), amount: 25000, status: tx.status, mode: tx.mode, credited: true });
    await this.audit.transition(orderId, this.hashUser(userId), 'TrustVerifierPaymentAgent', 'CHECK_QUOTA_OR_PAYMENT', 'CREATE_SCAN_PLAN', 'simulate_payment', 'PakasirAdapter', 'MOCK', { orderId }, { status: tx.status, creditsAdded, alreadyCredited });
    return { status: tx.status, creditsAdded, mode: tx.mode, alreadyCredited };
  }

  async hardening(jobId: string): Promise<AgentResult> { const job = this.mustJob(jobId); return (await this.engine.run('BlueTeamHardeningReportAgent', 'hardening_plan', { job })).result; }

  async createPrDraft(jobId: string): Promise<{ path: string }> { const job = this.mustJob(jobId); return { path: await this.engine.blue.prDraft(job) }; }

  async cleanupArtifacts(userId: string, apply = false, ttlDays?: number): Promise<CleanupResult> {
    const userHash = this.hashUser(userId);
    const result = apply ? await new CleanupService().apply(ttlDays) : await new CleanupService().preview(ttlDays);
    await this.audit.transition('CLEANUP', userHash, 'MainOrchestrator', 'OPERATOR_REQUEST', 'CLEANUP_COMPLETE', apply ? 'cleanup_apply' : 'cleanup_preview', 'CleanupService', 'DONE', { ttlDays: result.ttlDays, dryRun: result.dryRun }, { candidates: result.candidates.length, deleted: result.deleted.length, bytes: result.bytes });
    return result;
  }

  async opsStatus(userId: string): Promise<OpsStatus> {
    const userHash = this.hashUser(userId);
    const result = await new OpsService(this.store).status();
    await this.audit.transition('OPS', userHash, 'MainOrchestrator', 'OPERATOR_REQUEST', 'OPS_STATUS', 'ops_status', 'OpsService', result.status === 'ok' ? 'DONE' : 'ERROR', {}, { jobs: result.database.counts.jobs, scanRuns: result.database.counts.scanRuns, dbBytes: result.database.sizeBytes });
    return result;
  }

  async backupDatabase(userId: string): Promise<BackupResult> {
    const userHash = this.hashUser(userId);
    const result = await new OpsService(this.store).backupDatabase();
    await this.audit.transition('BACKUP', userHash, 'MainOrchestrator', 'OPERATOR_REQUEST', 'BACKUP_COMPLETE', 'backup_database', 'OpsService', 'DONE', {}, { path: result.path, bytes: result.sizeBytes });
    return result;
  }

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
    if (!job.verified || !job.scopeLocked) throw new Error('OWNERSHIP_OR_SCOPE_GATE_BLOCKED');
    if (!job.repoPath) throw new Error('REPO_NOT_CONNECTED');
    this.chargeForScan(job, profile === 'deep' ? DEEP_SCAN_COST : SAFE_SCAN_COST);
    const result = await new SecurityToolAdapters(this.audit, job.repoPath, profile === 'deep' ? 90000 : 30000).runRepoSuite(`repo-security-suite-${profile}-${job.id}`, job.userIdHash, profile);
    job.findings = mergeFindings(job.findings, result.findings);
    job.state = `REPO_SCAN_${profile.toUpperCase()}_COMPLETE`;
    this.store.saveJob(job);
    this.recordScanRun({ id: `RUN-${randomUUID().slice(0, 8)}`, jobId: job.id, type: 'repo', profile, tools: result.tools, findings: result.findings, approval: 'repo_connected_by_user', createdAt: new Date().toISOString() });
    await this.refreshReport(job.id, result.tools);
    return result;
  }

  activeWebToolsStatus(): ToolStatus[] { return this.activeWebScanner.status(); }

  async previewActiveWebScan(jobId: string, profile: WebScanProfile = 'safe'): Promise<{ job: Job; tools: ToolStatus[]; profile: WebScanProfile }> {
    const job = this.mustJob(jobId);
    if (!job.verified || !job.scopeLocked) throw new Error('OWNERSHIP_OR_SCOPE_GATE_BLOCKED');
    return { job, tools: this.activeWebToolsStatus(), profile };
  }

  async runActiveWebScan(jobId: string, userId: string, approved = false, profile: WebScanProfile = 'safe'): Promise<ActiveWebScanResult> {
    const job = this.mustJob(jobId);
    if (job.userIdHash !== this.hashUser(userId)) throw new Error('JOB_NOT_FOUND');
    if (!job.verified || !job.scopeLocked) throw new Error('OWNERSHIP_OR_SCOPE_GATE_BLOCKED');
    this.chargeForScan(job, profile === 'deep' ? DEEP_SCAN_COST : SAFE_SCAN_COST);
    const result = await this.activeWebScanner.scan({ jobId: job.id, userHash: this.hashUser(userId), targetUrl: job.targetUrl, verified: job.verified, scopeLocked: job.scopeLocked, scopeHost: job.scopeHost, approved, profile });
    job.findings = mergeFindings(job.findings, result.findings);
    job.state = `ACTIVE_WEB_SCAN_${profile.toUpperCase()}_COMPLETE`;
    this.store.saveJob(job);
    this.recordScanRun({ id: `RUN-${randomUUID().slice(0, 8)}`, jobId: job.id, type: 'web', profile, tools: result.tools, findings: result.findings, approval: result.approval, createdAt: new Date().toISOString() });
    await this.refreshReport(job.id, result.tools);
    return result;
  }

  async runStrictNmapScan(jobId: string, userId: string, approved = false) {
    const job = this.mustJob(jobId);
    if (job.userIdHash !== this.hashUser(userId)) throw new Error('JOB_NOT_FOUND');
    if (!job.verified || !job.scopeLocked) throw new Error('OWNERSHIP_OR_SCOPE_GATE_BLOCKED');
    this.chargeForScan(job, SAFE_SCAN_COST);
    const result = await this.activeWebScanner.scanNmapStrict({ jobId: job.id, userHash: this.hashUser(userId), targetUrl: job.targetUrl, verified: job.verified, scopeLocked: job.scopeLocked, scopeHost: job.scopeHost, approved });
    job.findings = mergeFindings(job.findings, result.findings);
    job.state = 'STRICT_NMAP_SCAN_COMPLETE';
    this.store.saveJob(job);
    this.recordScanRun({ id: `RUN-${randomUUID().slice(0, 8)}`, jobId: job.id, type: 'web', profile: 'nmap-strict', tools: result.tools, findings: result.findings, approval: result.approval, createdAt: new Date().toISOString() });
    await this.refreshReport(job.id, result.tools);
    return result;
  }

  scanRuns(jobId: string): ScanRun[] { return this.scanRunsByJob.get(jobId) || []; }

  async exportBundle(jobId: string): Promise<{ reports: { json: string; pdf: string }; audit: string; manualReview: { markdown: string } }> {
    const reports = await this.refreshReport(jobId, []);
    const manualReview = await this.manualReview(jobId);
    return { reports, audit: process.env.DEMO_AUDIT_LOG_PATH || 'logs/demo_audit.jsonl', manualReview };
  }

  async manualReview(jobId: string): Promise<{ markdown: string }> {
    const job = this.mustJob(jobId);
    return writeManualReview(job);
  }

  manualReviewSummary(jobId: string) {
    const job = this.mustJob(jobId);
    return manualReviewChecklist(job);
  }

  async refreshReport(jobId: string, tools: ToolStatus[] = []): Promise<{ json: string; pdf: string }> {
    const job = this.mustJob(jobId);
    const correlations = this.correlationsByJob.get(job.id) || [];
    const reports = await new ReportGenerator().generate(job, correlations, tools, false, this.scanRunsByJob.get(job.id) || []);
    this.reportsByJob.set(job.id, reports);
    this.store.saveReport(job.id, reports);
    return reports;
  }

  private recordScanRun(run: ScanRun): void {
    this.store.saveScanRun(run);
    this.scanRunsByJob.set(run.jobId, [run, ...(this.scanRunsByJob.get(run.jobId) || [])]);
  }

  private findVerifiedScope(userHash: string, host: string): Job | undefined {
    return [...this.jobs.values()].find((job) => job.userIdHash === userHash && job.verified && job.scopeLocked && job.scopeHost === host);
  }

  private scansForScope(job: Job): number {
    return [...this.jobs.values()]
      .filter((candidate) => candidate.userIdHash === job.userIdHash && (candidate.scopeHost || new URL(candidate.targetUrl).hostname.toLowerCase()) === (job.scopeHost || new URL(job.targetUrl).hostname.toLowerCase()))
      .reduce((total, candidate) => total + (this.scanRunsByJob.get(candidate.id) || []).length, 0);
  }

  private assertScanLimit(job: Job): void {
    const limit = Number(process.env.MAX_SCANS_PER_VERIFIED_SCOPE || 5);
    if (this.scansForScope(job) >= limit) throw new Error('SCAN_LIMIT_REACHED');
  }

  private chargeForScan(job: Job, cost: number): void {
    this.assertScanLimit(job);
    const q = this.quota.check(job.userIdHash, cost);
    if (!q.allowed) throw new Error(`PAYMENT_REQUIRED:${job.orderId || 'TOPUP'}`);
    this.quota.consume(job.userIdHash, cost);
    job.credits = this.quota.snapshot(job.userIdHash).credits;
    this.store.saveJob(job);
  }

  async demo(): Promise<{ job: Job; reports: { json: string; pdf: string }; transcript: string; tools: ToolStatus[] }> {
    const job = await this.createScan('demo-user', 'https://demo-owned-site.local');
    await this.createChallenge(job);
    await this.verifyDemo(job.id);
    const secondBefore = this.quota.check(job.userIdHash, SAFE_SCAN_COST);
    const result = await this.runApprovedScan(job.id);
    const second = this.quota.check(job.userIdHash, SAFE_SCAN_COST);
    if (!second.allowed || secondBefore.allowed) {
      const payment = await this.engine.trust.createPayment(job);
      await this.audit.transition(job.id, job.userIdHash, 'TrustVerifierPaymentAgent', 'CHECK_QUOTA_OR_PAYMENT', 'CHECK_QUOTA_OR_PAYMENT', 'payment_gate', 'PakasirAdapter', payment.status, {}, { orderId: job.orderId });
      this.quota.addCredits(job.userIdHash, 10);
      await this.audit.transition(job.id, job.userIdHash, 'TrustVerifierPaymentAgent', 'CHECK_QUOTA_OR_PAYMENT', 'CREATE_SCAN_PLAN', 'simulate_payment', 'PakasirAdapter', 'MOCK', { orderId: job.orderId }, { credits_added: 10 });
    }
    const sampleReports = await new ReportGenerator().generate(job, result.correlations, result.tools, true, this.scanRunsByJob.get(job.id) || []);
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

function mergeFindings(existing: Finding[], incoming: Finding[]): Finding[] {
  const map = new Map<string, Finding>();
  for (const finding of [...existing, ...incoming]) map.set(`${finding.source}:${finding.id}:${finding.title}`, finding);
  return [...map.values()];
}
