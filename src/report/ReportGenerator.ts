import { mkdir, writeFile } from 'node:fs/promises';
import type { Finding, Job, ScanRun, Severity, ToolStatus } from '../types/index.js';
import type { Correlation } from '../tools/Correlator.js';
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
    const report = {
      job_id: job.id,
      generated_at: new Date().toISOString(),
      target: { web_url: job.targetUrl, repo_url: job.repoUrl || null, repo_commit: job.repoCommit || null },
      authorization_and_scope:{ verified:job.verified, scope_locked:job.scopeLocked, scope_host:job.scopeHost },
      scan_runs: scanRuns.map((r) => ({ id: r.id, type: r.type, profile: r.profile, approval: r.approval, created_at: r.createdAt, tools: r.tools.map((t) => ({ name: t.name, status: t.status, mode: t.mode })), findings: r.findings.length })),
      severity_summary: severity,
      methodology:['pre-engagement','ownership verification','scope lock','GitHub repo attachment','safe/deep repo scanner','safe/deep web scanner','normalization','correlation','redaction','reporting'],
      tool_matrix: toolMatrix,
      tools_used:[...tools],
      findings: job.findings,
      correlations,
      remediation_priorities: remediationPriorities(job.findings),
      limitations:['Scanner findings require manual validation before client-facing severity finalization.','Logic flaws such as IDOR, tenant isolation, payment/business rules, and prompt/API misuse require manual review.','Evidence is redacted; raw secrets and response bodies are not exported.'],
      redaction_applied:true
    };
    await writeFile(jsonPath, JSON.stringify(report,null,2));
    await writeFile(pdfPath, this.pdf(job, severity, toolMatrix, job.findings));
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
      `Severity C/H/M/L/I: ${severity.CRITICAL}/${severity.HIGH}/${severity.MEDIUM}/${severity.LOW}/${severity.INFO}`,
      'Tool Matrix:',
      ...tools.slice(0,10).map(t=>`${t.name} ${t.status} ${t.mode}`),
      'Findings Summary:',
      ...findings.slice(0,14).map(f=>`${f.severity}: ${f.title}`),
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
