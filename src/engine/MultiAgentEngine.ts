import { AuditLogger } from '../core/AuditLogger.js';
import type { AgentResult } from '../types/index.js';
import { TrustVerifierPaymentAgent } from '../agents/TrustVerifierPaymentAgent.js';
import { RedTeamRepoScannerAgent } from '../agents/RedTeamRepoScannerAgent.js';
import { BlueTeamHardeningReportAgent } from '../agents/BlueTeamHardeningReportAgent.js';
import type { AgentEnvelope, AgentName, AgentRuntimeContext, AgentTask, ScanAgentResult } from '../agents/types.js';

export class MultiAgentEngine {
  readonly trust = new TrustVerifierPaymentAgent();
  readonly red = new RedTeamRepoScannerAgent();
  readonly blue = new BlueTeamHardeningReportAgent();

  constructor(private audit = new AuditLogger()) {}

  async run<T extends AgentResult | ScanAgentResult>(agent: AgentName, task: AgentTask, context: AgentRuntimeContext): Promise<AgentEnvelope<T>> {
    const started = new Date().toISOString();
    await this.audit.transition(context.job.id, context.job.userIdHash, 'MainOrchestrator', context.job.state, `AGENT:${agent}:${task}`, 'agent_dispatch', 'MultiAgentEngine', 'DONE', { agent, task }, {});
    let result: AgentResult | ScanAgentResult;
    try {
      result = await this.execute(agent, task, context);
      const completed = new Date().toISOString();
      await this.audit.transition(context.job.id, context.job.userIdHash, agent, `AGENT:${agent}:${task}`, result.next_state, 'agent_complete', 'MultiAgentEngine', result.status, { task }, { decision: result.decision, findings: result.findings.length });
      return { agent, task, job_id: context.job.id, status: result.status, result: result as T, started_at: started, completed_at: completed, redaction_applied: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await this.audit.transition(context.job.id, context.job.userIdHash, agent, `AGENT:${agent}:${task}`, 'ERROR', 'agent_error', 'MultiAgentEngine', 'ERROR', { task }, { error: message });
      throw error;
    }
  }

  private async execute(agent: AgentName, task: AgentTask, context: AgentRuntimeContext): Promise<AgentResult | ScanAgentResult> {
    if (agent === 'TrustVerifierPaymentAgent' && task === 'challenge') return this.trust.challenge(context.job);
    if (agent === 'TrustVerifierPaymentAgent' && task === 'verify_demo') return this.trust.verifyDemo(context.job, `clawvapt-verify-${context.job.id}`);
    if (agent === 'RedTeamRepoScannerAgent' && task === 'scan') return this.red.scan(context.job);
    if (agent === 'BlueTeamHardeningReportAgent' && task === 'remediation_plan') return this.blue.plan(context.job);
    if (agent === 'BlueTeamHardeningReportAgent' && task === 'hardening_plan') return this.blue.hardening(context.job);
    throw new Error(`UNSUPPORTED_AGENT_TASK:${agent}:${task}`);
  }
}
