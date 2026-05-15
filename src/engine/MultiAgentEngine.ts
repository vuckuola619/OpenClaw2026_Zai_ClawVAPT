import { AuditLogger } from '../core/AuditLogger.js';
import type { AgentResult } from '../types/index.js';
import { TrustVerifierPaymentAgent } from '../agents/TrustVerifierPaymentAgent.js';
import { RedTeamRepoScannerAgent } from '../agents/RedTeamRepoScannerAgent.js';
import { BlueTeamHardeningReportAgent } from '../agents/BlueTeamHardeningReportAgent.js';
import type { AgentEnvelope, AgentName, AgentRuntimeContext, AgentTask, ScanAgentResult } from '../agents/types.js';
import { OpenClawBridge } from '../openclaw/OpenClawBridge.js';

export class MultiAgentEngine {
  readonly trust = new TrustVerifierPaymentAgent();
  readonly red = new RedTeamRepoScannerAgent();
  readonly blue = new BlueTeamHardeningReportAgent();
  readonly bridge = new OpenClawBridge();

  constructor(private audit = new AuditLogger()) {}

  async run<T extends AgentResult | ScanAgentResult>(agent: AgentName, task: AgentTask, context: AgentRuntimeContext): Promise<AgentEnvelope<T>> {
    const started = new Date().toISOString();
    await this.audit.transition(context.job.id, context.job.userIdHash, 'MainOrchestrator', context.job.state, `AGENT:${agent}:${task}`, 'agent_dispatch', 'MultiAgentEngine', 'DONE', { agent, task }, {});
    let result: AgentResult | ScanAgentResult;
    try {
      result = await this.execute(agent, task, context);
      const completed = new Date().toISOString();
      await this.audit.transition(context.job.id, context.job.userIdHash, agent, `AGENT:${agent}:${task}`, result.next_state, 'agent_complete', 'MultiAgentEngine', result.status, { task }, { decision: result.decision, findings: result.findings.length });
      const envelope = { agent, task, job_id: context.job.id, status: result.status, result: result as T, started_at: started, completed_at: completed, redaction_applied: true } satisfies AgentEnvelope<T>;
      const bridge = await this.bridge.publishAgentEnvelope(envelope, this.safeBridgeSummary(agent, task, result));
      await this.audit.transition(context.job.id, context.job.userIdHash, 'OpenClawBridge', result.next_state, result.next_state, 'openclaw_bridge', 'OpenClawGateway', bridge.status === 'sent' ? 'DONE' : bridge.status === 'failed' ? 'ERROR' : 'MOCK', { agent, task }, { ...bridge });
      return envelope;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await this.audit.transition(context.job.id, context.job.userIdHash, agent, `AGENT:${agent}:${task}`, 'ERROR', 'agent_error', 'MultiAgentEngine', 'ERROR', { task }, { error: message });
      throw error;
    }
  }

  private safeBridgeSummary(agent: AgentName, task: AgentTask, result: AgentResult | ScanAgentResult): string {
    const correlations = 'correlations' in result ? result.correlations.length : 0;
    return JSON.stringify({
      agent,
      task,
      status: result.status,
      next_state: result.next_state,
      decision: result.decision,
      findings: result.findings.map((finding) => ({ id: finding.id, severity: finding.severity, title: finding.title })),
      correlations,
      redaction_applied: true
    });
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
