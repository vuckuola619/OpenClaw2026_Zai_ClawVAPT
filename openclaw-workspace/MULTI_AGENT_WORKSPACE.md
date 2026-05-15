# Multi-Agent Workspace Notes

ClawVAPT was developed with OpenClaw as the operator workspace and a TypeScript multi-agent engine inside the product runtime.

## Operator Layer

OpenClaw was used for:

- coding orchestration
- repository operations
- testing and build verification
- documentation generation
- deployment checks
- submission asset preparation

Sanitized workspace files are included here to make the operating model transparent without exposing credentials.

## Product Layer

Inside ClawVAPT, `MainOrchestrator` coordinates product agents:

```txt
TelegramBot
  -> MainOrchestrator
      -> TrustVerifierPaymentAgent
      -> RedTeamRepoScannerAgent
      -> BlueTeamHardeningReportAgent
      -> optional OpenClawBridge
```

## Agent Responsibilities

### TrustVerifierPaymentAgent

- create ownership challenge
- verify HTTP/DNS proof
- lock target scope
- handle quota checks
- create/check Pakasir QRIS payments

### RedTeamRepoScannerAgent

- run safe scanner profiles
- collect findings
- normalize evidence
- avoid destructive behavior

### BlueTeamHardeningReportAgent

- generate report output
- provide remediation-oriented summaries
- produce manual-review checklist

### OpenClawBridge

Optional bridge for sanitized advisory review through local OpenClaw Gateway. It is disabled by default and requires local loopback gateway configuration.

## Guardrails

- Web scans require verified ownership.
- Active scans require explicit approval.
- Payments/credits are checked before paid scans.
- Reports are redacted before delivery.
- Audit events are persisted as JSONL.


## Logical Agent Workspaces

Detailed workspace specs live in:

- `openclaw-workspace/agents/trust-verifier-payment/WORKSPACE.md`
- `openclaw-workspace/agents/red-team-scanner/WORKSPACE.md`
- `openclaw-workspace/agents/blue-team-reporter/WORKSPACE.md`

They document each product agent's mission, owned tools, safety rules, and output contract.
