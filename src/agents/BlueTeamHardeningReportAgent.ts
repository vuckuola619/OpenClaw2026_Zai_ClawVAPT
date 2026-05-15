import { mkdir, writeFile } from 'node:fs/promises';
import type { AgentResult, Finding, Job } from '../types/index.js';
export class BlueTeamHardeningReportAgent {
  plan(job: Job): AgentResult { return {agent:'BlueTeamHardeningReportAgent',job_id:job.id,status:'DONE',decision:'REMEDIATION_PLAN_CREATED_APPROVAL_REQUIRED',evidence:[{type:'plan',path:`patches/${job.id}_remediation.patch`,summary:'Patch plan generated; approval required before applying.',redacted:true}],findings:job.findings.map(f=>({...f,status:'PLANNED'})),next_state:'APPROVAL_GATE',redaction_applied:true,notes:['No remediation applied. No PR auto-merge.']}; }
  hardening(job: Job): AgentResult { return {agent:'BlueTeamHardeningReportAgent',job_id:job.id,status:'DONE',decision:'PLAN_ONLY_HARDENING',evidence:[{type:'hardening',summary:'Web, repo, Docker, SSH, firewall, CI, SBOM recommendations generated.',redacted:true}],findings:[],next_state:'OFFER_REMEDIATION',redaction_applied:true,notes:['PLAN_ONLY; lockout-risk changes not applied.']}; }
  async patch(job: Job): Promise<string> { await mkdir('patches',{recursive:true}); const path=`patches/${job.id}_remediation.patch`; await writeFile(path, `Draft remediation patch plan for ${job.id}\n\n- Add security headers middleware\n- Add SECURITY.md\n- Add Dependabot config\n- Add Docker HEALTHCHECK/USER\n\nApproval required before applying. Retest required before FIXED.\n`); return path; }
  async prDraft(job: Job): Promise<string> {
    await mkdir('patches',{recursive:true});
    const path=`patches/${job.id}_pr_body.md`;
    const top = job.findings.slice(0, 12).map((f) => `- ${f.id} [${f.severity}] ${f.title}\n  - Evidence: ${f.evidence[0]?.summary || 'redacted evidence'}\n  - Remediation: ${f.remediation}`).join('\n');
    await writeFile(path, `# ClawVAPT Remediation PR Draft\n\nJob: ${job.id}\nTarget: ${job.targetUrl}\nRepo: ${job.repoUrl || '-'}\nCommit: ${job.repoCommit || '-'}\n\n## Findings Addressed\n${top || '- No findings selected.'}\n\n## Proposed Changes\n- Apply security header hardening.\n- Remove/rotate exposed secrets and block secret commits.\n- Harden GitHub Actions permissions and unsafe triggers.\n- Add Dependabot/dependency monitoring.\n- Add Docker non-root user and HEALTHCHECK where applicable.\n\n## Test Command\n\`npm run lint && npm run typecheck && npm test && npm run build\`\n\n## Rollback Note\nRevert this PR and redeploy previous known-good commit if regressions occur.\n\n## Retest Instruction\nRun ClawVAPT retest after merge. Findings must remain OPEN/RETEST_REQUIRED until retest evidence confirms closure.\n\n## Safety\nNo auto-merge. No direct production mutation. Human review required.\n`);
    return path;
  }
}
