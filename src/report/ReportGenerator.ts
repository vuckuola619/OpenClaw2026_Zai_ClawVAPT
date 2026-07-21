import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import type { Finding, Job, ScanRun, Severity, ToolStatus } from '../types/index.js';
import type { Correlation } from '../tools/Correlator.js';
import { manualPrioritySummary, manualReviewChecklist } from './ManualReview.js';
function escPdf(s:string){ return s.replace(/[\\()]/g, m=>`\\${m}`).replace(/[\r\n]+/g,' '); }

export class ReportGenerator {
  constructor(private dir = process.env.REPORT_DIR || 'reports') {}
  async generate(job: Job, correlations: Correlation[], tools: ToolStatus[], sample=false, scanRuns: ScanRun[] = []): Promise<{json:string; pdf:string}> {
    await mkdir(this.dir,{recursive:true});
    const base = sample ? 'sample_report' : `${job.id}_report`;
    const jsonPath=`${this.dir}/${base}.json`;
    const pdfPath=`${this.dir}/${base}.pdf`;
    const severity = severitySummary(job.findings);
    const toolMatrix = toolMatrixFrom(tools, scanRuns);
    const manualReview = manualReviewChecklist(job);
    const report = {
      job_id: job.id,
      generated_at: new Date().toISOString(),
      target: { web_url: job.targetUrl, repo_url: job.repoUrl || null, repo_commit: job.repoCommit || null },
      authorization_and_scope:{ verified:job.verified, scope_locked:job.scopeLocked, scope_host:job.scopeHost, verification_method: job.verificationMethod || null, verified_at: job.verifiedAt || null },
      scan_runs: scanRuns.map((r) => ({ id: r.id, type: r.type, profile: r.profile, approval: r.approval, created_at: r.createdAt, tools: r.tools.map((t) => ({ name: t.name, status: t.status, mode: t.mode })), findings: r.findings.length })),
      executive_summary: {
        product: 'Telegram-first multi-agent VAPT triage with ownership gates, explicit approvals, credits, redaction, and report delivery.',
        priority_lane: priorityLane(job.findings),
        judge_value: ['Working Telegram UX', 'deterministic local demo', 'public repo scan path', 'active web scan guardrails', 'PDF/JSON/manual-review evidence bundle']
      },
      severity_summary: severity,
      methodology:['pre-engagement','ownership verification','scope lock','GitHub repo attachment','safe/deep repo scanner','safe/deep web scanner','normalization','correlation','redaction','reporting'],
      vulnerability_program: {
        prioritization: 'Severity is combined with manual-review signals such as authZ/IDOR/payment/tenant-isolation risk; CISA KEV enrichment is reserved for enabled scanner adapters.',
        remediation_sla: remediationSlaSummary(job.findings),
        safety_controls: ['ownership verification', 'scope lock', 'explicit scan approval', 'low-noise profiles', 'credit gate', 'secret redaction']
      },
      tool_matrix: toolMatrix,
      tools_used:[...tools],
      findings: job.findings,
      correlations,
      remediation_priorities: remediationPriorities(job.findings),
      manual_review_checklist: manualReview,
      manual_review_priorities: manualPrioritySummary(job.findings, manualReview),
      limitations:['Scanner findings require manual validation before client-facing severity finalization.','Logic flaws such as IDOR, tenant isolation, payment/business rules, and prompt/API misuse require manual review.','Evidence is redacted; raw secrets and response bodies are not exported.'],
      redaction_applied:true
    };
    await writeFile(jsonPath, JSON.stringify(report,null,2));
    const enterpriseScript = 'scripts/generate_enterprise_report.py';
    const enterprise = existsSync(enterpriseScript) ? spawnSync('python3', [enterpriseScript, jsonPath, pdfPath], { encoding: 'utf8', timeout: 30000, maxBuffer: 1_000_000 }) : null;
    if (!enterprise || enterprise.status !== 0) await writeFile(pdfPath, this.pdf(job, severity, toolMatrix, job.findings));
    return {json:jsonPath,pdf:pdfPath};
  }
  private pdf(job: Job, severity: Record<Severity, number>, tools: Array<{name:string; status:string; mode:string}>, findings: Finding[]): string {
    const lines = [
      'ClawVAPT Enterprise Report',
      `Job: ${job.id}`,
      `Web: ${job.targetUrl}`,
      `Repo: ${job.repoUrl || '-'}`,
      `Commit: ${job.repoCommit || '-'}`,
      `Scope: ${job.scopeHost || '-'}`,
      `Verification: ${job.verificationMethod || '-'} ${job.verifiedAt || ''}`,
      `Severity C/H/M/L/I: ${severity.CRITICAL}/${severity.HIGH}/${severity.MEDIUM}/${severity.LOW}/${severity.INFO}`,
      `Priority: ${priorityLane(findings)}`,
      'Tool Matrix:',
      ...tools.slice(0,10).map(t=>`${t.name} ${t.status} ${t.mode}`),
      'Findings Summary:',
      ...findings.slice(0,14).map(f=>`${f.severity}: ${f.title}`),
      'Manual Review Priorities: IDOR/authZ, workflow bypass, payment integrity, tenant isolation, AI/tool misuse.',
      'Remediation: prioritize Critical/High, secrets rotation, authZ review, dependency patching, header hardening.',
      'Evidence redacted. Manual validation required before closure.'
    ];
    const body=lines.slice(0,34).map((l,i)=>`BT /F1 10 Tf 45 ${760-i*20} Td (${escPdf(l)}) Tj ET`).join('\n');
    return `%PDF-1.4\n1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj\n3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >> endobj\n4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj\n5 0 obj << /Length ${body.length} >> stream\n${body}\nendstream endobj\nxref\n0 6\n0000000000 65535 f \ntrailer << /Root 1 0 R /Size 6 >>\nstartxref\n0\n%%EOF\n`;
  }
}

export function severitySummary(findings: Finding[]): Record<Severity, number> {
  const out: Record<Severity, number> = { INFO: 0, LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 };
  for (const finding of findings) out[finding.severity] += 1;
  return out;
}

function toolMatrixFrom(tools: ToolStatus[], scanRuns: ScanRun[]): Array<{name:string; status:string; mode:string}> {
  const all = [...tools, ...scanRuns.flatMap((r) => r.tools)];
  const seen = new Set<string>();
  return all.filter((t) => { const key = `${t.name}:${t.mode}`; if (seen.has(key)) return false; seen.add(key); return true; }).map((t) => ({ name: t.name, status: t.status, mode: t.mode }));
}

function remediationPriorities(findings: Finding[]): string[] {
  const recs: string[] = [];
  if (findings.some((f) => f.severity === 'CRITICAL')) recs.push('P1: fix critical findings immediately; rotate exposed credentials before redeploy.');
  if (findings.some((f) => f.severity === 'HIGH')) recs.push('P2: patch high-risk code/dependencies and retest within SLA.');
  if (findings.some((f) => /auth|idor|jwt|access/i.test(`${f.title} ${f.description}`))) recs.push('Manual review: authorization, IDOR, JWT/session handling, and tenant isolation.');
  if (findings.some((f) => /header|csp|hsts|frame/i.test(`${f.title} ${f.description}`))) recs.push('Hardening: enforce CSP, HSTS, X-Frame-Options/frame-ancestors, X-Content-Type-Options, Referrer-Policy.');
  return recs.length ? recs : ['No priority remediation generated from current findings; perform manual validation.'];
}

function priorityLane(findings: Finding[]): string {
  const sev = severitySummary(findings);
  if (sev.CRITICAL > 0) return 'P1 immediate validation and remediation';
  if (sev.HIGH > 0) return 'P2 high-priority remediation within 7 days';
  if (sev.MEDIUM > 0) return 'P3 scheduled hardening within 30 days';
  if (findings.length > 0) return 'P4 monitor, harden, and verify';
  return 'No scanner findings yet; manual validation still required';
}

function remediationSlaSummary(findings: Finding[]): Array<{ priority: string; condition: string; target: string }> {
  const sev = severitySummary(findings);
  return [
    { priority: 'P1', condition: 'Critical or known exploited vulnerability on exposed asset', target: sev.CRITICAL > 0 ? '24 hours' : 'not triggered' },
    { priority: 'P2', condition: 'High severity or auth/payment/tenant isolation concern', target: sev.HIGH > 0 || findings.some((f) => /auth|idor|payment|tenant/i.test(`${f.title} ${f.description}`)) ? '7 days' : 'not triggered' },
    { priority: 'P3', condition: 'Medium severity hardening issue', target: sev.MEDIUM > 0 ? '30 days' : 'not triggered' },
    { priority: 'P4', condition: 'Low/info or best-practice finding', target: sev.LOW + sev.INFO > 0 ? 'next security cycle' : 'not triggered' }
  ];
}
