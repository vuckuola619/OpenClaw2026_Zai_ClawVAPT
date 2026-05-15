import { existsSync, readFileSync, unlinkSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import type { Finding, ToolStatus } from '../types/index.js';
import { AuditLogger } from '../core/AuditLogger.js';
import { RateLimiter } from '../core/RateLimiter.js';
import { ScopeGuard } from '../core/ScopeGuard.js';
import { SafeUrlScanner } from './SafeUrlScanner.js';
import { FindingNormalizer } from './FindingNormalizer.js';

export type WebScanProfile = 'safe' | 'deep';
export interface ActiveWebScanResult { tools: ToolStatus[]; findings: Finding[]; approval: 'EXPLICIT_CALLBACK'; targetUrl: string; profile: WebScanProfile }
export interface StrictNmapScanResult { tools: ToolStatus[]; findings: Finding[]; approval: 'EXPLICIT_NETWORK_SCAN_CALLBACK'; targetUrl: string; profile: 'nmap-strict' }

export class ActiveWebScanner {
  private scope = new ScopeGuard();
  private limiter = new RateLimiter(Number(process.env.ACTIVE_WEB_SCAN_CAPACITY || 2), Number(process.env.ACTIVE_WEB_SCAN_REFILL_PER_MINUTE || 1));
  private normalizer = new FindingNormalizer();

  constructor(private audit = new AuditLogger(), private timeoutMs = Number(process.env.ACTIVE_WEB_SCAN_TIMEOUT_MS || 60000)) {}

  async scan(params: { jobId: string; userHash: string; targetUrl: string; verified: boolean; scopeLocked: boolean; scopeHost: string; approved: boolean; profile?: WebScanProfile }): Promise<ActiveWebScanResult> {
    const { jobId, userHash, targetUrl, verified, scopeLocked, scopeHost, approved } = params;
    const profile = params.profile || 'safe';
    if (!approved) throw new Error('ACTIVE_SCAN_APPROVAL_REQUIRED');
    this.scope.assertCanScan(verified, scopeLocked);
    this.scope.assertInScope(targetUrl, scopeHost);
    this.limiter.assertAllowed(`active-web:${profile}:${userHash}:${scopeHost}`, profile === 'deep' ? 2 : 1);

    await this.audit.transition(jobId, userHash, 'RedTeamRepoScannerAgent', 'APPROVAL_GATE', 'ACTIVE_WEB_SCAN', 'active_web_scan_start', 'ActiveWebScanner', 'DONE', { targetHost: scopeHost, profile }, { approved: true, rate_limited: true });

    const tools: ToolStatus[] = [];
    const findings: Finding[] = [];

    const safeFindings = await new SafeUrlScanner().scan(targetUrl);
    findings.push(...safeFindings);
    tools.push({ name: 'SafeUrlScanner', status: 'DONE', available: true, mode: 'builtin_headers_only', notes: ['Headers-only web checks executed before active adapter.'] });

    const nuclei = this.runNuclei(targetUrl, profile);
    tools.push(nuclei.status);
    findings.push(...nuclei.findings);

    if (profile === 'deep') {
      const nikto = this.runNikto(targetUrl);
      tools.push(nikto.status);
      findings.push(...nikto.findings);
    }

    const normalized = this.normalizer.normalize(findings);
    await this.audit.transition(jobId, userHash, 'RedTeamRepoScannerAgent', 'ACTIVE_WEB_SCAN', 'ACTIVE_WEB_SCAN_COMPLETE', 'active_web_scan_complete', profile === 'deep' ? 'EnterpriseDeepWebProfile' : 'NucleiSafeProfile', nuclei.status.status, { targetHost: scopeHost, profile }, { findings: normalized.length, tools: tools.length });
    return { tools, findings: normalized, approval: 'EXPLICIT_CALLBACK', targetUrl, profile };
  }

  status(): ToolStatus[] {
    const nucleiReady = this.exists('nuclei') && Boolean(this.templatesPath());
    return [
      { name: 'NucleiSafeProfile', status: nucleiReady ? 'DONE' : 'INCOMPLETE', available: nucleiReady, mode: 'active_web_safe_templates', notes: ['Requires verified ownership, locked scope, explicit approval, and per-target rate cap.'] },
      { name: 'NucleiDeepProfile', status: nucleiReady ? 'DONE' : 'INCOMPLETE', available: nucleiReady, mode: 'enterprise_deep_non_destructive', notes: ['Enables CVE/KEV and injection-detection templates but still excludes destructive classes.'] },
      { name: 'NiktoDeepProfile', status: this.exists('nikto') ? 'DONE' : 'INCOMPLETE', available: this.exists('nikto'), mode: 'enterprise_controlled_web_server_scan', notes: ['Controlled tuning; excludes DoS and command execution classes.'] },
      { name: 'NmapStrictProfile', status: this.exists('nmap') ? 'DONE' : 'INCOMPLETE', available: this.exists('nmap'), mode: 'tcp_connect_single_host_low_rate', notes: ['Single locked host only; TCP connect scan; explicit network-scan consent; no UDP, OS detect, NSE vuln/brute, evasion, or broad ranges.'] }
    ];
  }

  async scanNmapStrict(params: { jobId: string; userHash: string; targetUrl: string; verified: boolean; scopeLocked: boolean; scopeHost: string; approved: boolean }): Promise<StrictNmapScanResult> {
    const { jobId, userHash, targetUrl, verified, scopeLocked, scopeHost, approved } = params;
    if (!approved) throw new Error('NETWORK_SCAN_APPROVAL_REQUIRED');
    this.scope.assertCanScan(verified, scopeLocked);
    this.scope.assertInScope(targetUrl, scopeHost);
    this.limiter.assertAllowed(`active-web:nmap-strict:${userHash}:${scopeHost}`, 1);
    await this.audit.transition(jobId, userHash, 'RedTeamRepoScannerAgent', 'APPROVAL_GATE', 'STRICT_NMAP_SCAN', 'strict_nmap_scan_start', 'NmapStrictProfile', 'DONE', { targetHost: scopeHost, profile: 'nmap-strict' }, { approved: true, single_host: true, rate_limited: true });
    const result = this.runNmapStrict(targetUrl, scopeHost);
    const findings = this.normalizer.normalize(result.findings);
    await this.audit.transition(jobId, userHash, 'RedTeamRepoScannerAgent', 'STRICT_NMAP_SCAN', 'STRICT_NMAP_SCAN_COMPLETE', 'strict_nmap_scan_complete', 'NmapStrictProfile', result.status.status, { targetHost: scopeHost, profile: 'nmap-strict' }, { findings: findings.length, tools: 1 });
    return { tools: [result.status], findings, approval: 'EXPLICIT_NETWORK_SCAN_CALLBACK', targetUrl, profile: 'nmap-strict' };
  }

  private runNuclei(targetUrl: string, profile: WebScanProfile): { status: ToolStatus; findings: Finding[] } {
    const name = profile === 'deep' ? 'NucleiDeepProfile' : 'NucleiSafeProfile';
    if (!this.exists('nuclei')) return { status: { name, status: 'INCOMPLETE', available: false, mode: 'not_installed', notes: ['nuclei binary missing.'] }, findings: [] };
    const templates = this.templatesPath();
    if (!templates) return { status: { name, status: 'INCOMPLETE', available: true, mode: 'templates_missing', notes: ['nuclei installed but templates directory missing.'] }, findings: [] };

    const profileArgs = profile === 'deep'
      ? {
          severity: 'info,low,medium,high,critical',
          tags: 'tech,headers,misconfig,exposure,ssl,tls,http,cve,kev,xss,sqli',
          excludeTags: 'intrusive,dos,fuzz,rce,bruteforce,default-login,destructive,ssrf,lfi,wordpress',
          rate: Number(process.env.NUCLEI_DEEP_RATE_LIMIT || 1),
          concurrency: Number(process.env.NUCLEI_DEEP_CONCURRENCY || 1),
          timeout: Number(process.env.NUCLEI_DEEP_TIMEOUT_SECONDS || 8),
          mode: 'executed_deep_non_destructive_profile'
        }
      : {
          severity: 'info,low,medium',
          tags: 'tech,headers,misconfig,exposure,ssl,tls,http',
          excludeTags: 'intrusive,dos,fuzz,rce,sqli,lfi,ssrf,xss,bruteforce,default-login,wordpress,kev,cve,destructive',
          rate: Number(process.env.NUCLEI_SAFE_RATE_LIMIT || 3),
          concurrency: Number(process.env.NUCLEI_SAFE_CONCURRENCY || 2),
          timeout: Number(process.env.NUCLEI_SAFE_TIMEOUT_SECONDS || 5),
          mode: 'executed_safe_profile'
        };

    const args = [
      '-u', targetUrl,
      '-t', templates,
      '-jsonl', '-silent', '-duc', '-nh',
      '-severity', profileArgs.severity,
      '-tags', profileArgs.tags,
      '-exclude-tags', profileArgs.excludeTags,
      '-rate-limit', String(profileArgs.rate),
      '-c', String(profileArgs.concurrency),
      '-timeout', String(profileArgs.timeout),
      '-retries', '0'
    ];
    const result = spawnSync('nuclei', args, { encoding: 'utf8', timeout: profile === 'deep' ? Math.max(this.timeoutMs, 120000) : this.timeoutMs, maxBuffer: 5_000_000 });
    const findings = result.stdout.split('\n').filter(Boolean).flatMap((line, index) => {
      try { return [this.fromNuclei(JSON.parse(line) as Record<string, unknown>, index + 1, targetUrl, profile)]; } catch { return []; }
    });
    return { status: { name, status: result.status === null ? 'ERROR' : 'DONE', available: true, mode: profileArgs.mode, notes: [`${profile} Nuclei profile executed. Exit: ${result.status ?? 'timeout'}`] }, findings };
  }

  private runNikto(targetUrl: string): { status: ToolStatus; findings: Finding[] } {
    if (!this.exists('nikto')) return { status: { name: 'NiktoDeepProfile', status: 'INCOMPLETE', available: false, mode: 'not_installed', notes: ['nikto binary missing.'] }, findings: [] };
    const reportPath = `/tmp/clawvapt-nikto-${process.pid}-${Date.now()}.txt`;
    const args = ['-h', targetUrl, '-Tuning', '1235bde', '-timeout', String(Number(process.env.NIKTO_DEEP_TIMEOUT_SECONDS || 8)), '-Pause', String(Number(process.env.NIKTO_DEEP_PAUSE_SECONDS || 1)), '-nointeractive', '-Format', 'txt', '-output', reportPath];
    const result = spawnSync('nikto', args, { encoding: 'utf8', timeout: Number(process.env.NIKTO_DEEP_PROCESS_TIMEOUT_MS || 120000), maxBuffer: 3_000_000 });
    const output = existsSync(reportPath) ? readFileSync(reportPath, 'utf8') : result.stdout;
    if (existsSync(reportPath)) unlinkSync(reportPath);
    const findings = output.split('\n').filter((line) => line.trim().startsWith('+')).slice(0, 100).map((line, index) => this.fromNikto(line, index + 1, targetUrl));
    return { status: { name: 'NiktoDeepProfile', status: result.status === null ? 'ERROR' : 'DONE', available: true, mode: 'executed_controlled_deep_profile', notes: [`Nikto controlled profile executed. Exit: ${result.status ?? 'timeout'}`] }, findings };
  }

  private runNmapStrict(targetUrl: string, scopeHost: string): { status: ToolStatus; findings: Finding[] } {
    if (!this.exists('nmap')) return { status: { name: 'NmapStrictProfile', status: 'INCOMPLETE', available: false, mode: 'not_installed', notes: ['nmap binary missing.'] }, findings: [] };
    const url = new URL(targetUrl);
    if (url.hostname !== scopeHost) throw new Error('OUT_OF_SCOPE');
    const ports = strictPorts();
    const args = ['-sT', '-Pn', '-n', '--max-retries', '1', '--host-timeout', String(process.env.NMAP_STRICT_HOST_TIMEOUT || '30s'), '--scan-delay', String(process.env.NMAP_STRICT_SCAN_DELAY || '250ms'), '--max-rate', String(Number(process.env.NMAP_STRICT_MAX_RATE || 5)), '-T2', '-p', ports, '--version-light', '--version-intensity', '2', '-oX', '-', scopeHost];
    const result = spawnSync('nmap', args, { encoding: 'utf8', timeout: Number(process.env.NMAP_STRICT_PROCESS_TIMEOUT_MS || 45000), maxBuffer: 2_000_000 });
    const findings = parseNmapOpenPorts(result.stdout, targetUrl);
    return { status: { name: 'NmapStrictProfile', status: result.status === null ? 'ERROR' : 'DONE', available: true, mode: 'executed_tcp_connect_single_host_low_rate', notes: [`Strict Nmap executed against one locked host. Ports: ${ports}. Exit: ${result.status ?? 'timeout'}. No UDP, NSE vuln/brute, OS detect, evasion, or broad range.`] }, findings };
  }

  private fromNuclei(item: Record<string, unknown>, idx: number, targetUrl: string, profile: WebScanProfile): Finding {
    const info = typeof item.info === 'object' && item.info ? item.info as Record<string, unknown> : {};
    const id = String(item['template-id'] || item['templateID'] || `nuclei-${idx}`);
    const title = String(info.name || id);
    const severity = severityFromString(String(info.severity || 'INFO'));
    const matched = String(item['matched-at'] || item.host || targetUrl);
    return { id: `NUCLEI-${id}`.slice(0, 120), title, severity, status: 'OPEN', description: `Nuclei ${profile} profile finding: ${title}`, remediation: 'Validate finding manually, patch safely, and retest before closing.', source: 'EXTERNAL', evidence: [{ type: 'url', url: matched, summary: `Template ${id}; sensitive output redacted.`, redacted: true }] };
  }

  private fromNikto(line: string, idx: number, targetUrl: string): Finding {
    const clean = line.replace(/\s+/g, ' ').slice(0, 400);
    return { id: `NIKTO-${idx}`, title: 'Nikto web server finding', severity: severityFromNikto(clean), status: 'OPEN', description: clean.replace(/^\+\s*/, ''), remediation: 'Review Nikto evidence, confirm manually, patch safely, and retest.', source: 'EXTERNAL', evidence: [{ type: 'url', url: targetUrl, summary: clean, redacted: true }] };
  }

  private templatesPath(): string | null {
    for (const path of [process.env.NUCLEI_TEMPLATES_DIR, `${process.env.HOME || ''}/nuclei-templates`]) if (path && existsSync(path)) return path;
    return null;
  }

  private exists(name: string): boolean { return spawnSync('bash', ['-lc', `command -v ${name}`], { encoding: 'utf8' }).status === 0; }
}

function strictPorts(): string {
  const raw = process.env.NMAP_STRICT_PORTS || '80,443,8080,8443,3000,5000,8000,9000';
  const ports = raw.split(',').map((p) => p.trim()).filter((p) => /^\d{1,5}$/.test(p)).map(Number).filter((p) => p > 0 && p <= 65535).slice(0, 20);
  return ports.length ? [...new Set(ports)].join(',') : '80,443';
}

function parseNmapOpenPorts(xml: string, targetUrl: string): Finding[] {
  const findings: Finding[] = [];
  const portBlocks = xml.match(/<port protocol="tcp" portid="\d+">[\s\S]*?<\/port>/g) || [];
  for (const block of portBlocks) {
    if (!/<state state="open"/.test(block)) continue;
    const port = /portid="(\d+)"/.exec(block)?.[1] || 'unknown';
    const service = /<service[^>]*name="([^"]+)"/.exec(block)?.[1] || 'unknown';
    const product = /product="([^"]+)"/.exec(block)?.[1] || '';
    const version = /version="([^"]+)"/.exec(block)?.[1] || '';
    const serviceText = [service, product, version].filter(Boolean).join(' ');
    findings.push({ id: `NMAP-TCP-${port}`, title: `Open TCP port ${port}`, severity: nmapSeverity(port, serviceText), status: 'OPEN', description: `Strict Nmap found TCP/${port} open (${serviceText || 'unknown service'}).`, remediation: 'Confirm business need, restrict exposure with firewall/security group, patch service, and retest.', source: 'EXTERNAL', evidence: [{ type: 'url', url: targetUrl, summary: `TCP/${port} open; service evidence redacted to banner summary only.`, redacted: true }] });
  }
  return findings.slice(0, 50);
}

function nmapSeverity(port: string, serviceText: string): Finding['severity'] {
  if (/^(21|23|445|3389|3306|5432|6379|9200|27017)$/.test(port)) return 'MEDIUM';
  if (/admin|database|redis|mongo|mysql|postgres|rdp|telnet|smb/i.test(serviceText)) return 'MEDIUM';
  return 'INFO';
}

function severityFromString(value: string): Finding['severity'] {
  const s = value.toUpperCase();
  return ['INFO', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].includes(s) ? s as Finding['severity'] : 'INFO';
}

function severityFromNikto(value: string): Finding['severity'] {
  const v = value.toLowerCase();
  if (/cve|vulnerab|sql|xss|bypass|upload|shell|command/.test(v)) return 'HIGH';
  if (/admin|backup|disclosure|method|trace|put|delete|outdated|default/.test(v)) return 'MEDIUM';
  if (/header|cookie|server/.test(v)) return 'LOW';
  return 'INFO';
}
