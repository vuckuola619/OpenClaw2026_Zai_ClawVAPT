import type { AgentResult, Job } from '../types/index.js';
import { ScopeGuard } from '../core/ScopeGuard.js';
import { SafeUrlScanner } from '../tools/SafeUrlScanner.js';
import { RepoScanner } from '../tools/RepoScanner.js';
import { FindingNormalizer } from '../tools/FindingNormalizer.js';
import { Correlator } from '../tools/Correlator.js';
import { ExternalSecurityToolRunner } from '../tools/ExternalSecurityToolRunner.js';
export class RedTeamRepoScannerAgent { async scan(job: Job): Promise<AgentResult & { correlations: ReturnType<Correlator['correlate']> }> { new ScopeGuard().assertCanScan(job.verified,job.scopeLocked); new ScopeGuard().assertInScope(job.targetUrl,job.scopeHost); const urlFindings=await new SafeUrlScanner().scan(job.targetUrl); const repoFindings=await new RepoScanner().scan(); await new ExternalSecurityToolRunner().checkAll(job.id, job.userIdHash); const findings=new FindingNormalizer().normalize([...urlFindings,...repoFindings]); job.findings=findings; const correlations=new Correlator().correlate(findings); return {agent:'RedTeamRepoScannerAgent',job_id:job.id,status:'DONE',decision:'SAFE_SCAN_COMPLETE',evidence:[{type:'scanner',summary:`${findings.length} normalized findings; ${correlations.length} correlations`,redacted:true}],findings,next_state:'SCORE_AND_PRIORITIZE',redaction_applied:true,notes:['Built-in scanners executed. External adapters availability logged; no unavailable tool output faked.'], correlations}; } }
