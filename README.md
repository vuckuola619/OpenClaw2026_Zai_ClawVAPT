# ClawVAPT / clawthon

Telegram-first, consent-gated VAPT demo orchestrated by OpenClaw.

## Safety Contract

- No ownership verification = no scan.
- No scope lock = no scanner execution.
- No evidence = no finding.
- No approval = no remediation.
- No retest = finding cannot be marked `FIXED`.
- No redaction = report cannot be released.
- No raw secrets in logs, commits, reports, Telegram, PR body, GitHub Actions, or README.
- No brute force, credential stuffing, destructive payloads, data exfiltration, or scanning outside verified scope.

## Quick Start

```bash
npm install
npm run lint
npm run typecheck
npm test
npm run build
npm run demo
```

`npm run demo` generates:

- `reports/sample_report.pdf`
- `reports/sample_report.json`
- `logs/demo_audit.jsonl`
- `docs/demo-transcript.md`

## Telegram Commands

Inline buttons are available for Demo, Scan Demo Site, Verify, Run Safe Scan, Status, Report, Hardening Plan, Pay, and Check Payment.

```txt
/start
/help
/demo
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
```


## Multi-Agent Engine

ClawVAPT runs a code-level multi-agent engine inside the backend service:

1. `MainOrchestrator` owns state and Telegram responses.
2. `MultiAgentEngine` dispatches structured tasks to specialist agents.
3. `TrustVerifierPaymentAgent` handles ownership, scope lock, quota, and Pakasir.
4. `RedTeamRepoScannerAgent` runs safe URL/repo scanners and normalization/correlation.
5. `BlueTeamHardeningReportAgent` generates reports, patch plan, hardening plan, and retest gate.

Each agent run writes start/complete/error JSONL audit events. OpenClaw is the server operator/orchestration environment; the product backend is a Node.js Telegram bot using this multi-agent engine.

Optional bridge mode can publish sanitized agent envelopes to the local OpenClaw Gateway over loopback WebSocket (`chat.send`) without reusing the OpenClaw Telegram token. See `docs/openclaw-bridge.md`.

SQLite persistence stores jobs, quotas, Pakasir credited orders, and report paths across PM2 restarts. See `docs/sqlite-persistence.md`.

## Real vs Mock

| Capability | Status | Notes |
|---|---|---|
| State machine + audit JSONL | DONE | Demo writes every gate transition. |
| Built-in safe URL scanner | DONE | HTTP headers/status checks; `.local` uses deterministic fixture. |
| Built-in repo scanner | DONE | Redacted pattern checks only. |
| PDF/JSON report | DONE | Minimal generated PDF + structured JSON. |
| Telegram live bot handlers | DONE | Long polling via Telegram Bot API, inline buttons for demo/scan/status/report/payment; requires `TELEGRAM_BOT_TOKEN`. |
| Pakasir URL adapter | DONE | URL generation implemented. |
| Pakasir API validation | MOCK/INCOMPLETE | Mock in `DEMO_MODE`; real API requires env secrets. |
| External tools | INCOMPLETE/FUTURE | Availability checked; unavailable output never faked. |
| Remediation PR | MOCK | Patch file generated; no auto-merge. |
| OpenSCAP | FUTURE | Enterprise compliance adapter. |

## External Security Tools

Adapters are safe-wrapped for OWASP ZAP, Nuclei, testssl.sh, Semgrep, Gitleaks, Trivy, OSV-Scanner, Checkov, Syft, Grype, Lynis, and OpenSCAP. Demo does not require them. If absent, adapters are marked `INCOMPLETE` or `FUTURE`.

## Deployment

```bash
docker compose config
docker compose build
docker compose up -d
docker compose logs --tail=200
```

## Limitations

Hackathon MVP. Not a legal compliance guarantee, not an offensive hacking bot, not multi-tenant SaaS yet.
