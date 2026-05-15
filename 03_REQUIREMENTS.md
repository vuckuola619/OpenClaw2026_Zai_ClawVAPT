# Requirements

## Functional Requirements

### Telegram Interface

Commands:

```txt
/start
/help
/scan <url>
/verify <job_id>
/connect_repo <owner/repo>
/status <job_id>
/report <job_id>
/create_pr <job_id>
/ssh_plan <job_id>
/approve <plan_id>
/harden <job_id>
/pay
/check_payment <order_id>
/simulate_payment <order_id>
/demo
```

### Multi-Agent Requirements

Agents:

1. MainOrchestrator
2. TrustVerifierPaymentAgent
3. RedTeamRepoScannerAgent
4. BlueTeamHardeningReportAgent

Every specialist agent returns structured JSON to MainOrchestrator. User-facing responses must come from the main Telegram bot.

### State Machine

```txt
START
-> RECEIVE_REQUEST
-> PRE_ENGAGEMENT_CHECK
-> GENERATE_OWNERSHIP_CHALLENGE
-> VERIFY_OWNERSHIP
-> CONNECT_REPOSITORY
-> LOCK_SCOPE
-> CHECK_QUOTA_OR_PAYMENT
-> CREATE_SCAN_PLAN
-> RUN_SAFE_URL_ASSESSMENT
-> RUN_REPO_ASSESSMENT
-> NORMALIZE_FINDINGS
-> CORRELATE_RUNTIME_AND_CODE
-> SCORE_AND_PRIORITIZE
-> GENERATE_INITIAL_REPORT
-> OFFER_REMEDIATION
-> APPROVAL_GATE
-> REMEDIATE_BY_PR_OR_SSH
-> RETEST
-> GENERATE_FINAL_REPORT
-> SEND_TELEGRAM_SUMMARY
-> OFFBOARD_ACCESS
-> END
```

Every transition must write JSONL audit event.

### Payment Requirements

Provider: Pakasir.

Rules:

- First scan is free.
- Second scan requires 10 credits.
- Top-up amount: Rp25.000.
- Payment link can be sent via Telegram.
- `/check_payment <order_id>` validates transaction detail.
- `/simulate_payment <order_id>` allowed only in sandbox/demo mode.
- Webhook is optional for MVP but endpoint should exist.
- Webhook alone is not trusted; transaction detail validation is required.

### Security Scanner Requirements

Built-in safe URL scanner:

- HTTP status
- Redirect chain
- Security headers
- TLS basic availability
- robots.txt
- sitemap.xml
- exposed `.env` status only, without dumping content
- exposed `/debug` status only, without dumping sensitive content
- server header disclosure

Built-in repo scanner:

- committed `.env`
- secret-like patterns with redaction
- wildcard CORS
- Express without Helmet pattern
- missing rate limiter pattern
- Dockerfile running as root
- Dockerfile missing HEALTHCHECK
- unsafe GitHub Actions pattern
- package manifest dependency risk placeholder
- missing SECURITY.md
- missing Dependabot config

External open-source tool adapters:

- OWASP ZAP
- Nuclei
- testssl.sh
- Semgrep
- Gitleaks
- Trivy
- OSV-Scanner
- Checkov
- Syft
- Grype
- Lynis
- OpenSCAP optional/future

### Report Requirements

Generate:

```txt
reports/<job_id>_report.pdf
reports/<job_id>_report.json
reports/sample_report.pdf
reports/sample_report.json
logs/demo_audit.jsonl
docs/demo-transcript.md
```

PDF sections:

1. Executive Summary
2. Authorization and Scope
3. Methodology
4. Tools Used
5. Findings Summary
6. Detailed Findings
7. Runtime-to-Code Correlation
8. Remediation Plan
9. Retest Results
10. Hardening Recommendations
11. Compliance Guardrails
12. Limitations
13. Audit Trail Summary

## Non-Functional Requirements

### Safety

- Scope locked before scan.
- Rate limited HTTP client.
- Request timeout and max response size.
- No destructive tests.
- No brute force or credential attacks.
- No secret exposure.
- Remediation requires approval.

### Reliability

- Deterministic demo works without real secrets.
- Failing external tools do not break the demo.
- Adapter failures are logged with status.
- Core workflow works with built-in scanners.

### Auditability

Every event includes:

```json
{
  "timestamp": "string",
  "job_id": "string",
  "user_id_hash": "string",
  "correlation_id": "string",
  "agent": "string",
  "state_from": "string",
  "state_to": "string",
  "action": "string",
  "tool_name": "string",
  "input_summary": {},
  "output_summary": {},
  "status": "DONE | MOCK | INCOMPLETE | ERROR",
  "error_code": "optional",
  "redaction_applied": true
}
```

### Evidence

OpenClaw final report must cite evidence paths:

- source file path
- test file path
- command output summary
- report file
- audit log
- GitHub Action workflow
- PR or patch file

