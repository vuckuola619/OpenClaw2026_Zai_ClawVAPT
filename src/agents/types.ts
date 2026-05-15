import type { AgentResult, Job } from '../types/index.js';
import type { Correlation } from '../tools/Correlator.js';

export type AgentName = 'TrustVerifierPaymentAgent' | 'RedTeamRepoScannerAgent' | 'BlueTeamHardeningReportAgent';
export type AgentTask = 'challenge' | 'verify_demo' | 'scan' | 'remediation_plan' | 'hardening_plan';

export interface AgentEnvelope<T = AgentResult> {
  agent: AgentName;
  task: AgentTask;
  job_id: string;
  status: 'DONE' | 'MOCK' | 'INCOMPLETE' | 'FUTURE' | 'ERROR';
  result: T;
  started_at: string;
  completed_at: string;
  redaction_applied: true;
}

export interface ScanAgentResult extends AgentResult {
  correlations: Correlation[];
}

export interface AgentRuntimeContext {
  job: Job;
  input?: Record<string, unknown>;
}
