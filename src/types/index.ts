export type Status = 'DONE' | 'MOCK' | 'INCOMPLETE' | 'FUTURE' | 'ERROR';
export type Severity = 'INFO' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type FindingStatus = 'OPEN' | 'PLANNED' | 'RETEST_REQUIRED' | 'FIXED';

export interface AuditEvent {
  timestamp: string; job_id: string; user_id_hash: string; correlation_id: string; agent: string;
  state_from: string; state_to: string; action: string; tool_name: string;
  input_summary: Record<string, unknown>; output_summary: Record<string, unknown>;
  status: Status; error_code?: string; redaction_applied: true;
}
export interface Evidence { type: string; path?: string; url?: string; summary: string; redacted: true; }
export interface Finding { id: string; title: string; severity: Severity; status: FindingStatus; description: string; evidence: Evidence[]; remediation: string; source: 'BUILTIN_URL'|'BUILTIN_REPO'|'EXTERNAL'|'MOCK'; }
export interface AgentResult { agent: string; job_id: string; status: Status; decision: string; evidence: Evidence[]; findings: Finding[]; next_state: string; redaction_applied: true; notes: string[]; }
export interface Job { id: string; userIdHash: string; targetUrl: string; verified: boolean; scopeLocked: boolean; scopeHost: string; state: string; freeScanUsed: boolean; credits: number; findings: Finding[]; orderId?: string; repoUrl?: string; repoPath?: string; repoCommit?: string; }
export interface ToolStatus { name: string; status: Status; available: boolean; mode: string; notes: string[]; }
