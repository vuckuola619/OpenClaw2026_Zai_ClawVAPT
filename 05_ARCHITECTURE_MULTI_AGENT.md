# Multi-Agent Architecture

## High-Level Architecture

```txt
Telegram User
  -> Main Telegram Bot
  -> OpenClaw MainOrchestrator
      -> TrustVerifierPaymentAgent
      -> RedTeamRepoScannerAgent
      -> BlueTeamHardeningReportAgent
  -> Tools
      -> PakasirAdapter
      -> GitHubAdapter
      -> SafeUrlScanner
      -> RepoScanner
      -> ExternalSecurityToolRunner
      -> ReportGenerator
      -> AuditLogger
```

## Deployment Path

```txt
/home/adm-bot/clawthon/
```

## MainOrchestrator

Responsibilities:

- Own state machine.
- Route jobs to specialist agents.
- Enforce gates.
- Write audit logs.
- Send user-facing Telegram messages.
- Aggregate reports.
- Finalize status.

Forbidden:

- Running scanner without scope lock.
- Running remediation without approval.
- Sending raw scanner output directly to user.

## TrustVerifierPaymentAgent

Responsibilities:

- Validate URL.
- Generate ownership challenge.
- Verify `.well-known` or DNS TXT token.
- Lock scope.
- Check free quota and credits.
- Create Pakasir payment order.
- Validate payment status.
- Redact payment secrets.

Key tools:

- ScopeGuard
- PakasirAdapter
- AuditLogger
- Redactor

## RedTeamRepoScannerAgent

Responsibilities:

- Run safe URL scan.
- Run safe repo scan.
- Run optional external scanners through safe wrapper.
- Normalize findings.
- Correlate runtime and code evidence.
- Score findings.

Key tools:

- SafeUrlScanner
- RepoScanner
- ExternalSecurityToolRunner
- FindingNormalizer
- Correlator

Forbidden:

- Exploit payloads.
- Brute force.
- Credential stuffing.
- Data exfiltration.
- Out-of-scope crawling.
- Printing raw secrets.

## BlueTeamHardeningReportAgent

Responsibilities:

- Generate remediation plan.
- Create PR or patch file.
- Generate hardening plan.
- Run retest.
- Generate PDF/JSON reports.
- Prepare final Telegram summary.

Key tools:

- GitHubAdapter
- PatchGenerator
- HardeningPlanner
- RetestRunner
- ReportGenerator

## Agent Communication Contract

Every agent returns:

```json
{
  "agent": "string",
  "job_id": "string",
  "status": "DONE | MOCK | INCOMPLETE | ERROR",
  "decision": "string",
  "evidence": [],
  "findings": [],
  "next_state": "string",
  "redaction_applied": true,
  "notes": []
}
```

## Telegram Bot Strategy

Use one public user-facing bot.

Optional internal ops bots are allowed only for logs/monitoring:

- Trust/payment ops bot
- Security ops bot

Users must not be required to talk to multiple bots.

