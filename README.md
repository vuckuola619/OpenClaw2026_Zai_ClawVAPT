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

## Credits and Scan Limits

- New users start with 10 credits.
- Safe scans cost 5 credits (`/web_scan`, `/repo_scan`, strict Nmap).
- Deep scans cost 10 credits (`/web_scan_deep`, `/repo_scan_deep`).
- `/pay` creates a Pakasir top-up order; confirmed payment adds +10 credits.
- URL ownership verification is reused per user + host. Verify once, then future jobs for the same host skip the challenge.
- Each verified URL is limited to 5 scan runs across web/repo scans.

## Code / GitHub Scan Flow

```txt
/scan https://your-site.com
/verify JOB-xxxx
/connect_repo JOB-xxxx https://github.com/owner/repo
/repo_scan JOB-xxxx
/repo_scan_deep JOB-xxxx
/report JOB-xxxx
```

Only GitHub repos are accepted in the current connector. Scanners run against the cloned target repo, not the ClawVAPT backend.

## Telegram Commands

Inline buttons are available for real target onboarding, GitHub repo connection, repo/web scans, strict Nmap approval, reports/export, manual review, payment, and sandbox demo.

```txt
/start
/help
/demo
/scan <url>
/verify <job_id>
/challenge <job_id>
/connect_repo <job_id> <github_url>
/repo_scan <job_id>
/repo_scan_deep <job_id>
/web_scan <job_id>
/web_scan_deep <job_id>
/nmap_scan <job_id>
/status <job_id>
/report <job_id>
/manual_review <job_id>
/export <job_id>
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

Production guardrails add per-user rate limiting, target URL safety policy, structured safe errors, and `/health`. See `docs/production-guardrails.md`.

Security tools phase adds safe repo-first adapters for Gitleaks, Semgrep, Trivy, and builtin heuristics, plus Telegram `/tools` and `/repo_scan`. See `docs/security-tools-phase.md`.

## Real vs Mock

| Capability | Status | Notes |
|---|---|---|
| State machine + audit JSONL | DONE | Demo writes every gate transition. |
| Built-in safe URL scanner | DONE | HTTP headers/status checks; `.local` uses deterministic fixture. |
| Built-in repo scanner | DONE | Redacted pattern checks only. |
| PDF/JSON report | DONE | Structured JSON + enterprise PDF; ISO/SOC/OWASP generator available. |
| Telegram live bot handlers | DONE | Long polling via Telegram Bot API, real target/repo/scan/report/payment flows; requires `TELEGRAM_BOT_TOKEN`. |
| Pakasir URL adapter | DONE | URL generation implemented. |
| Pakasir API validation | DONE/ENV-DEPENDENT | Real transaction detail validation when `PAKASIR_API_KEY` exists; sandbox/mock only in demo/no-key path. |
| External tools | DONE/PARTIAL | Gitleaks/Semgrep/Trivy/Nuclei/Nikto/Nmap real paths; remaining OSS tools status-only/future. |
| Remediation PR | DONE/SAFE-DRAFT | PR draft body generated; no external PR write or auto-merge without human approval. |
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

Not a legal compliance guarantee, not an offensive hacking bot, not multi-tenant SaaS yet. Docker runtime verification is environment-blocked on this VPS because Docker is not installed; PM2 deployment is live.

Active web scanner gate adds `/web_scan <job_id>` with explicit approval, verified scope enforcement, rate limits, and Nuclei safe profile. See `docs/active-web-scanner-gate.md`.

Enterprise deep web scan adds `/web_scan_deep <job_id>` with Nuclei deep non-destructive profile and controlled Nikto profile. See `docs/enterprise-deep-web-scan.md`.

Vibe coding scan profiles add `/repo_scan` safe and `/repo_scan_deep` deep code scanning for AI-generated apps. See `docs/vibe-coding-scan-profiles.md`.

Real target flow: `/scan <url>` + `/connect_repo <job_id> <github_url>` now attaches a GitHub repo to a web target; repo scans run on the cloned repo, not demo/backend code. See `docs/real-target-and-repo-flow.md`.
