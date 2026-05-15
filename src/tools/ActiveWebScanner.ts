import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import type { Finding, ToolStatus } from '../types/index.js';
import { AuditLogger } from '../core/AuditLogger.js';
import { RateLimiter } from '../core/RateLimiter.js';
import { ScopeGuard } from '../core/ScopeGuard.js';
import { SafeUrlScanner } from './SafeUrlScanner.js';
import { FindingNormalizer } from './FindingNormalizer.js';

export interface ActiveWebScanResult { tools: ToolStatus[]; findings: Finding[]; approval: 'EXPLICIT_CALLBACK'; targetUrl: string }

export class ActiveWebScanner {
  private scope = new ScopeGuard();
  private limiter = new RateLimiter(Number(process.env.ACTIVE_WEB_SCAN_CAPACITY || 2), Number(process.env.ACTIVE_WEB_SCAN_REFILL_PER_MINUTE || 1));
  private normalizer = new FindingNormalizer();

  constructor(private audit = new AuditLogger(), private timeoutMs = Number(process.env.ACTIVE_WEB_SCAN_TIMEOUT_MS || 45000)) {}

  async scan(params: { jobId: string; userHash: string; targetUrl: string; verified: boolean; scopeLocked: boolean; scopeHost: string; approved: boolean }): Promise<ActiveWebScanResult> {
    const { jobId, userHash, targetUrl, verified, scopeLocked, scopeHost, approved } = params;
    if (!approved) throw new Error('ACTIVE_SCAN_APPROVAL_REQUIRED');
    this.scope.assertCanScan(verified, scopeLocked);
    this.scope.assertInScope(targetUrl, scopeHost);
    this.limiter.assertAllowed(`active-web:${userHash}:${scopeHost}`, 1);

    await this.audit.transition(jobId, userHash, 'RedTeamRepoScannerAgent', 'APPROVAL_GATE', 'ACTIVE_WEB_SCAN', 'active_web_scan_start', 'ActiveWebScanner', 'DONE', { targetHost: scopeHost }, { approved: true, rate_limited: true });

    const tools: ToolStatus[] = [];
    const findings: Finding[] = [];

    const safeFindings = await new SafeUrlScanner().scan(targetUrl);
    findings.push(...safeFindings);
    tools.push({ name: 'SafeUrlScanner', status: 'DONE', available: true, mode: 'builtin_headers_only', notes: ['Headers-only web checks executed before active adapter.'] });

    const nuclei = this.runNuclei(targetUrl);
    tools.push(nuclei.status);
    findings.push(...nuclei.findings);

    const normalized = this.normalizer.normalize(findings);
    await this.audit.transition(jobId, userHash, 'RedTeamRepoScannerAgent', 'ACTIVE_WEB_SCAN', 'ACTIVE_WEB_SCAN_COMPLETE', 'active_web_scan_complete', 'NucleiSafeProfile', nuclei.status.status, { targetHost: scopeHost }, { findings: normalized.length, tools: tools.length });
    return { tools, findings: normalized, approval: 'EXPLICIT_CALLBACK', targetUrl };
  }

  status(): ToolStatus[] {
    return [
      { name: 'NucleiSafeProfile', status: this.exists('nuclei') && this.templatesPath() ? 'DONE' : 'INCOMPLETE', available: this.exists('nuclei') && Boolean(this.templatesPath()), mode: 'active_web_safe_templates', notes: ['Requires verified ownership, locked scope, explicit approval, and per-target rate cap.'] },
      { name: 'Nikto', status: this.exists('nikto') ? 'FUTURE' : 'INCOMPLETE', available: this.exists('nikto'), mode: 'disabled_pending_strict_profile', notes: ['Installed status only; execution disabled until stricter profile controls.'] },
      { name: 'Nmap', status: this.exists('nmap') ? 'FUTURE' : 'INCOMPLETE', available: this.exists('nmap'), mode: 'disabled_pending_strict_profile', notes: ['Installed status only; execution disabled until stricter profile controls.'] }
    ];
  }

  private runNuclei(targetUrl: string): { status: ToolStatus; findings: Finding[] } {
    if (!this.exists('nuclei')) return { status: { name: 'NucleiSafeProfile', status: 'INCOMPLETE', available: false, mode: 'not_installed', notes: ['nuclei binary missing.'] }, findings: [] };
    const templates = this.templatesPath();
    if (!templates) return { status: { name: 'NucleiSafeProfile', status: 'INCOMPLETE', available: true, mode: 'templates_missing', notes: ['nuclei installed but templates directory missing.'] }, findings: [] };

    const args = [
      '-u', targetUrl,
      '-t', templates,
      '-jsonl', '-silent', '-duc', '-nh',
      '-severity', 'info,low,medium',
      '-tags', 'tech,headers,misconfig,exposure,ssl,tls,http',
      '-exclude-tags', 'intrusive,dos,fuzz,rce,sqli,lfi,ssrf,xss,bruteforce,default-login,wordpress,kev,cve',
      '-exclude-severity', 'high,critical,unknown',
      '-rate-limit', String(Number(process.env.NUCLEI_SAFE_RATE_LIMIT || 3)),
      '-c', String(Number(process.env.NUCLEI_SAFE_CONCURRENCY || 2)),
      '-timeout', String(Number(process.env.NUCLEI_SAFE_TIMEOUT_SECONDS || 5)),
      '-retries', '0'
    ];
    const result = spawnSync('nuclei', args, { encoding: 'utf8', timeout: this.timeoutMs, maxBuffer: 3_000_000 });
    const findings = result.stdout.split('\n').filter(Boolean).flatMap((line, index) => {
      try { return [this.fromNuclei(JSON.parse(line) as Record<string, unknown>, index + 1, targetUrl)]; } catch { return []; }
    });
    return { status: { name: 'NucleiSafeProfile', status: result.status === null ? 'ERROR' : 'DONE', available: true, mode: 'executed_safe_profile', notes: [`Safe Nuclei profile executed. Exit: ${result.status ?? 'timeout'}`] }, findings };
  }

  private fromNuclei(item: Record<string, unknown>, idx: number, targetUrl: string): Finding {
    const info = typeof item.info === 'object' && item.info ? item.info as Record<string, unknown> : {};
    const id = String(item['template-id'] || item['templateID'] || `nuclei-${idx}`);
    const title = String(info.name || id);
    const severity = severityFromString(String(info.severity || 'INFO'));
    const matched = String(item['matched-at'] || item.host || targetUrl);
    return { id: `NUCLEI-${id}`.slice(0, 120), title, severity, status: 'OPEN', description: `Nuclei safe-profile finding: ${title}`, remediation: 'Validate finding manually, patch safely, and retest before closing.', source: 'EXTERNAL', evidence: [{ type: 'url', url: matched, summary: `Template ${id}; sensitive output redacted.`, redacted: true }] };
  }

  private templatesPath(): string | null {
    for (const path of [process.env.NUCLEI_TEMPLATES_DIR, `${process.env.HOME || ''}/nuclei-templates`]) if (path && existsSync(path)) return path;
    return null;
  }

  private exists(name: string): boolean { return spawnSync('bash', ['-lc', `command -v ${name}`], { encoding: 'utf8' }).status === 0; }
}

function severityFromString(value: string): Finding['severity'] {
  const s = value.toUpperCase();
  return ['INFO', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].includes(s) ? s as Finding['severity'] : 'INFO';
}
