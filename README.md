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
