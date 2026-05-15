import { spawnSync } from 'node:child_process';
import type { ToolStatus } from '../types/index.js';
import { AuditLogger } from '../core/AuditLogger.js';
import { ScopeGuard } from '../core/ScopeGuard.js';
export class ExternalSecurityToolRunner {
  constructor(private audit = new AuditLogger(), private scope = new ScopeGuard()) {}
  async checkAll(jobId='tool-status', userHash='demo'): Promise<ToolStatus[]> {
    const tools = ['zap-baseline.py','nuclei','testssl.sh','semgrep','gitleaks','trivy','osv-scanner','checkov','syft','grype','lynis','oscap'];
    const statuses = tools.map(t => this.status(t));
    for (const s of statuses) await this.audit.transition(jobId,userHash,'RedTeamRepoScannerAgent','EXTERNAL_CHECK','EXTERNAL_CHECK','adapter_availability',s.name,s.status,{tool:s.name},{available:s.available,mode:s.mode});
    return statuses;
  }
  assertExecutionAllowed(verified:boolean, scopeLocked:boolean, target:string, scopeHost:string){ this.scope.assertCanScan(verified, scopeLocked); this.scope.assertInScope(target, scopeHost); }
  private status(name:string): ToolStatus { const found = spawnSync('bash',['-lc',`command -v ${name}`],{encoding:'utf8'}); const available = found.status === 0; return { name, available, status: available ? 'INCOMPLETE' : (name==='oscap'?'FUTURE':'INCOMPLETE'), mode: available ? 'adapter_available_not_executed_in_demo' : 'not_installed', notes: [available ? 'Available; safe wrapper present; execution requires verified scope.' : 'Unavailable; demo continues with built-in scanner.']}; }
}
