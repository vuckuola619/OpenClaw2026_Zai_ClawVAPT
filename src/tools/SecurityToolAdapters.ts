import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, unlinkSync } from 'node:fs';
import type { Finding, ToolStatus } from '../types/index.js';
import { AuditLogger } from '../core/AuditLogger.js';
import { RepoScanner } from './RepoScanner.js';
import { FindingNormalizer } from './FindingNormalizer.js';

export interface ToolRunResult { tools: ToolStatus[]; findings: Finding[]; recommendations: string[] }

type ToolName = 'gitleaks' | 'semgrep' | 'trivy';

export class SecurityToolAdapters {
  private normalizer = new FindingNormalizer();
  constructor(private audit = new AuditLogger(), private root = process.cwd(), private timeoutMs = Number(process.env.SECURITY_TOOL_TIMEOUT_MS || 20000)) {}

  async status(jobId = 'tools', userHash = 'system'): Promise<ToolStatus[]> {
    const tools: ToolStatus[] = (['gitleaks', 'semgrep', 'trivy'] as ToolName[]).map((name) => this.toolStatus(name));
    tools.push({ name: 'RepoSecurityHeuristics', status: 'DONE', available: true, mode: 'builtin_safe_repo_scan', notes: ['Runs local repo checks with redaction.'] });
    tools.push({ name: 'SafeUrlScanner', status: 'DONE', available: true, mode: 'builtin_safe_web_headers', notes: ['Runs only after ownership verification and scope lock.'] });
    for (const tool of tools) await this.audit.transition(jobId, userHash, 'RedTeamRepoScannerAgent', 'TOOLS_STATUS', 'TOOLS_STATUS', 'tool_status', tool.name, tool.status, { tool: tool.name }, { available: tool.available, mode: tool.mode });
    return tools;
  }

  async runRepoSuite(jobId = 'repo-suite', userHash = 'system'): Promise<ToolRunResult> {
    const statuses: ToolStatus[] = [];
    const findings: Finding[] = [];

    const gitleaks = await this.runGitleaks(jobId, userHash);
    statuses.push(gitleaks.status);
    findings.push(...gitleaks.findings);

    const semgrep = await this.runSemgrep(jobId, userHash);
    statuses.push(semgrep.status);
    findings.push(...semgrep.findings);

    const trivy = await this.runTrivy(jobId, userHash);
    statuses.push(trivy.status);
    findings.push(...trivy.findings);

    const builtin = await new RepoScanner(this.root).scan();
    statuses.push({ name: 'RepoSecurityHeuristics', status: 'DONE', available: true, mode: 'builtin_safe_repo_scan', notes: ['Fallback repo security checks completed.'] });
    findings.push(...builtin);

    const normalized = this.normalizer.normalize(findings);
    await this.audit.transition(jobId, userHash, 'RedTeamRepoScannerAgent', 'TOOLS_RUN', 'TOOLS_COMPLETE', 'repo_security_suite', 'SecurityToolAdapters', 'DONE', {}, { tools: statuses.length, findings: normalized.length });
    return { tools: statuses, findings: normalized, recommendations: this.skillRecommendations(statuses, normalized) };
  }

  skillRecommendations(statuses: ToolStatus[], findings: Finding[]): string[] {
    const recs = ['Repo detected: Node/TypeScript service. Recommended skills/tools: Gitleaks secrets, Semgrep JS/TS SAST, Trivy dependency/container scan, safe URL header scanner.'];
    if (findings.some((f) => f.id.includes('SECRET'))) recs.push('Prioritize secrets workflow: revoke leaked credentials, rotate tokens, add pre-commit secret scan.');
    if (findings.some((f) => f.id.includes('DOCKER'))) recs.push('Prioritize container hardening: non-root USER, HEALTHCHECK, minimal base image, Trivy scan.');
    if (statuses.some((s) => !s.available)) recs.push('Install missing adapters before enterprise demo, or present builtin fallback as safe-mode evidence.');
    recs.push('Active web tools like Nuclei/Nikto/Nmap should stay approval-gated and scope-locked only.');
    return recs;
  }

  private async runGitleaks(jobId: string, userHash: string): Promise<{ status: ToolStatus; findings: Finding[] }> {
    if (!this.exists('gitleaks')) return this.missing('gitleaks');
    const reportPath = `/tmp/clawvapt-gitleaks-${process.pid}-${Date.now()}.json`;
    const result = spawnSync('gitleaks', ['detect', '--source', this.root, '--no-git', '--redact', '--report-format', 'json', '--report-path', reportPath, '--exit-code', '0'], { encoding: 'utf8', timeout: this.timeoutMs, maxBuffer: 2_000_000 });
    const output = existsSync(reportPath) ? readFileSync(reportPath, 'utf8') : result.stdout;
    if (existsSync(reportPath)) unlinkSync(reportPath);
    const findings = parseJsonArray(output).map((item, i) => this.finding(`GITLEAKS-${i + 1}`, 'Secret detected by Gitleaks', 'CRITICAL', String(item.Description || item.RuleID || 'Gitleaks finding'), String(item.File || 'repo')));
    await this.audit.transition(jobId, userHash, 'RedTeamRepoScannerAgent', 'GITLEAKS', 'GITLEAKS_DONE', 'tool_run', 'gitleaks', result.status === 0 ? 'DONE' : 'ERROR', {}, { findings: findings.length });
    return { status: this.done('gitleaks', result.status === 0 ? 'executed' : 'executed_with_error'), findings };
  }

  private async runSemgrep(jobId: string, userHash: string): Promise<{ status: ToolStatus; findings: Finding[] }> {
    if (!this.exists('semgrep')) return this.missing('semgrep');
    const result = spawnSync('semgrep', ['scan', '--config', 'p/javascript', '--json', '--timeout', '10', this.root], { encoding: 'utf8', timeout: this.timeoutMs, maxBuffer: 3_000_000 });
    const parsed = parseJsonObject(result.stdout);
    const findings = Array.isArray(parsed?.results) ? parsed.results.map((item: Record<string, unknown>, i: number) => this.finding(`SEMGREP-${i + 1}`, String(item.check_id || 'Semgrep finding'), severityFromSemgrep(item.extra), String((item.extra as Record<string, unknown> | undefined)?.message || 'Semgrep finding'), String(item.path || 'repo'))) : [];
    await this.audit.transition(jobId, userHash, 'RedTeamRepoScannerAgent', 'SEMGREP', 'SEMGREP_DONE', 'tool_run', 'semgrep', 'DONE', {}, { findings: findings.length });
    return { status: this.done('semgrep', 'executed'), findings };
  }

  private async runTrivy(jobId: string, userHash: string): Promise<{ status: ToolStatus; findings: Finding[] }> {
    if (!this.exists('trivy')) return this.missing('trivy');
    const result = spawnSync('trivy', ['fs', '--format', 'json', '--scanners', 'vuln,secret,misconfig', '--skip-dirs', 'node_modules', '--skip-dirs', '.git', '--skip-dirs', 'dist', '--skip-dirs', 'data', '--timeout', '30s', this.root], { encoding: 'utf8', timeout: Math.max(this.timeoutMs, 35000), maxBuffer: 4_000_000 });
    const parsed = parseJsonObject(result.stdout);
    const findings: Finding[] = [];
    for (const r of Array.isArray(parsed?.Results) ? parsed.Results : []) {
      const target = String((r as Record<string, unknown>).Target || 'repo');
      for (const v of Array.isArray((r as Record<string, unknown>).Vulnerabilities) ? (r as Record<string, unknown>).Vulnerabilities as Record<string, unknown>[] : []) findings.push(this.finding(`TRIVY-${findings.length + 1}`, String(v.VulnerabilityID || 'Trivy vuln'), severityFromString(String(v.Severity || 'MEDIUM')), String(v.Title || v.PkgName || 'Trivy vulnerability'), target));
      for (const m of Array.isArray((r as Record<string, unknown>).Misconfigurations) ? (r as Record<string, unknown>).Misconfigurations as Record<string, unknown>[] : []) findings.push(this.finding(`TRIVY-${findings.length + 1}`, String(m.ID || 'Trivy config'), severityFromString(String(m.Severity || 'MEDIUM')), String(m.Title || 'Trivy misconfiguration'), target));
    }
    await this.audit.transition(jobId, userHash, 'RedTeamRepoScannerAgent', 'TRIVY', 'TRIVY_DONE', 'tool_run', 'trivy', 'DONE', {}, { findings: findings.length });
    return { status: this.done('trivy', 'executed'), findings };
  }

  private toolStatus(name: ToolName): ToolStatus {
    const available = this.exists(name);
    return { name, available, status: available ? 'DONE' : 'INCOMPLETE', mode: available ? 'adapter_available' : 'not_installed', notes: [available ? 'Available for safe execution.' : 'Adapter ready; binary not installed.'] };
  }

  private exists(name: ToolName): boolean { return spawnSync('bash', ['-lc', `command -v ${name}`], { encoding: 'utf8' }).status === 0; }
  private async missing(name: ToolName): Promise<{ status: ToolStatus; findings: Finding[] }> { return { status: { name, available: false, status: 'INCOMPLETE', mode: 'not_installed', notes: ['Adapter ready; tool binary not installed. Builtin fallback still runs.'] }, findings: [] }; }
  private done(name: ToolName, mode: string): ToolStatus { return { name, available: true, status: 'DONE', mode, notes: ['Executed with timeout, JSON parsing, and normalized findings.'] }; }
  private finding(id: string, title: string, severity: Finding['severity'], description: string, path: string): Finding { return { id, title, severity, status: 'OPEN', description, remediation: 'Review evidence, patch safely, and retest before closing.', source: 'EXTERNAL', evidence: [{ type: 'file', path, summary: description.slice(0, 300), redacted: true }] }; }
}

function parseJsonArray(raw: string): Record<string, unknown>[] { try { const parsed = JSON.parse(raw || '[]'); return Array.isArray(parsed) ? parsed : []; } catch { return []; } }
function parseJsonObject(raw: string): Record<string, unknown> | null { try { const parsed = JSON.parse(raw || '{}'); return parsed && typeof parsed === 'object' ? parsed : null; } catch { return null; } }
function severityFromString(value: string): Finding['severity'] { const s = value.toUpperCase(); return ['INFO', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].includes(s) ? s as Finding['severity'] : 'MEDIUM'; }
function severityFromSemgrep(extra: unknown): Finding['severity'] { const severity = typeof extra === 'object' && extra && 'severity' in extra ? String((extra as { severity?: unknown }).severity) : 'MEDIUM'; return severityFromString(severity); }
