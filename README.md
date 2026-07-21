# OpenClaw2026_Zai_ClawVAPT

**ClawVAPT** is a Telegram-first, multi-agent VAPT assistant that helps security operators run safer vulnerability triage from chat.

It verifies web target ownership, locks scan scope, checks credits, runs safe web/repo security tools, handles QRIS top-ups, and delivers PDF/JSON/manual-review reports directly in Telegram.

> Built for fast, authorized, report-ready security checks — without forcing operators to stitch together scanners, payments, scope control, and reporting by hand.

---

## Demo Video

Watch the demo: https://youtu.be/mupug2vA5Ys

## Build Week Submission

- Track: Developer Tools
- Live demo: Telegram bot `@capithon_bot`
- Repository: https://github.com/vuckuola619/OpenClaw2026_Zai_ClawVAPT
- Demo video: https://youtu.be/mupug2vA5Ys
- Judge test path: run the local deterministic demo with `npm run demo`, or use the live Telegram bot in sandbox mode with `/judge` then `/demo`.

## Pitch Deck

Jury deck: [`submission/OpenClaw2026_Zai_ClawVAPT_Jury_Deck.pdf`](submission/OpenClaw2026_Zai_ClawVAPT_Jury_Deck.pdf)

## Why ClawVAPT Stands Out

### Clear Real-World Use Case

Security operators, freelancers, and small teams often need quick VAPT triage, but raw scanners are risky without guardrails. ClawVAPT wraps the workflow with authorization, credits, redaction, reports, and audit logs.

### Creative Agent Experience

Instead of a normal dashboard-first scanner, ClawVAPT runs from Telegram:

- start scans from chat
- approve active testing explicitly
- receive QRIS payment image in chat
- confirm payment from a button
- get reports back as files

### Autonomous Agent Behaviour

The system is not a single prompt. It is a multi-agent workflow with state, tools, safety gates, persistence, and autonomous decisions:

```txt
request
  -> validate target
  -> verify ownership / public repo policy
  -> check credits and scan limits
  -> run tools
  -> normalize + redact evidence
  -> generate reports
  -> deliver artifacts
  -> persist audit trail
```

### Technical Execution

ClawVAPT uses TypeScript, SQLite, Telegram Bot API, PM2, scanner adapters, report generation, and optional OpenClaw advisory bridge. Every major action passes through deterministic backend logic, not just free-form LLM output.

### Deployable MVP

The MVP is live as a Telegram bot, has reproducible setup, persistent jobs/credits/reports, and a clean `.env.example` for local deployment.

---

## Product Flow

### Web Target Scan

```txt
/judge
/scan https://example.com
/verify JOB-xxxx
/web_scan JOB-xxxx
/web_scan_deep JOB-xxxx
/nmap_scan JOB-xxxx
/gpt_review JOB-xxxx
/manual_review JOB-xxxx
```

Web scans are protected by:

- HTTP/DNS ownership proof
- locked scope host
- explicit scan approval
- credit checks
- max 5 scan runs per verification cycle
- redacted evidence

After active web scans, ClawVAPT automatically sends:

- PDF report
- JSON report
- manual-review checklist

### Public GitHub Repo Scan

```txt
/repo_scan https://github.com/owner/repo
/repo_scan_deep https://github.com/owner/repo
```

Repo scan rules:

- public GitHub repos only
- standalone flow, not tied to web targets
- 25 credits per repo scan
- 1 scan per repo per account
- estimated scan time shown before running
- existing report resent if repo already scanned

### QRIS Payment Flow

```txt
/pay
```

The bot sends a QRIS image with payment details. In demo/sandbox mode, tapping **I Have Paid / Check Status** confirms payment and adds credits.

---

## Multi-Agent Architecture

ClawVAPT runs one product backend with three logical agent workspaces coordinated by `MainOrchestrator`.

```txt
Telegram User
  -> TelegramBot
  -> MainOrchestrator
      -> TrustVerifierPaymentAgent
      -> RedTeamRepoScannerAgent
      -> BlueTeamHardeningReportAgent
      -> optional OpenClawBridge
  -> Reports back to Telegram
```

### 1. Trust Verifier & Payment Agent

Owns:

- ownership challenge
- HTTP/DNS proof validation
- scope lock
- quota and credit checks
- Pakasir QRIS payment creation
- payment status verification
- idempotent crediting

### 2. Red Team Scanner Agent

Owns:

- active web safe profile
- active web deep profile
- strict Nmap profile
- public GitHub repo scanning
- external scanner adapters
- finding normalization
- secret redaction

### 3. Blue Team Reporter Agent

Owns:

- PDF reports
- JSON reports
- manual-review checklist
- remediation priorities
- hardening-oriented summaries

More detail lives in:

```txt
openclaw-workspace/agents/
```

---

## Features

- Telegram-first VAPT workflow
- multi-agent orchestration
- verified web target ownership
- explicit active scan agreement
- public GitHub repo scanning
- QRIS credit top-up via Pakasir
- SQLite persistence for jobs, reports, orders, and quotas
- credit debit/remaining balance messages
- scan time estimates
- judge walkthrough command (`/judge`)
- GPT-5.6 advisory pack command (`/gpt_review`) with deterministic fallback
- automatic report delivery
- safe error messages
- audit JSONL events
- optional OpenClaw Gateway bridge for sanitized advisory review

---

## Tech Stack

- Node.js 22
- TypeScript ESM
- Telegram Bot API
- SQLite (`better-sqlite3`)
- PM2
- Pakasir QRIS
- OpenClaw optional bridge
- ReportLab PDF generation
- Built-in scanner logic
- Optional adapters: Gitleaks, Semgrep, Trivy, Nuclei, Nikto, Nmap, OSV-Scanner, Checkov, Syft, Grype, Lynis, testssl.sh, OWASP ZAP

---

## AI / Agent Tools Used

| Tool | Role |
|---|---|
| Codex with GPT-5.6 | Build Week implementation partner for product planning, code changes, tests, docs, demo assets, and submission polish. |
| GPT-5.6 Advisor | Optional configured runtime advisor for turning sanitized findings into validation plans, remediation tickets, executive readouts, and residual-risk notes. |
| TypeScript MultiAgentEngine | Deterministic product agent loop and tool routing. |
| OpenClaw | Operator runtime and optional advisory bridge. |
| OpenClaw Codex advisory bridge | Optional sanitized public-repo security review path. |
| Security scanner adapters | Tool calls for web/repo checks. |
| Pakasir QRIS | Payment and credit workflow. |

---

## Build Week Work Added

ClawVAPT existed as a security-operator idea before submission, then was meaningfully extended during Build Week with Codex-assisted implementation and hardening:

- Telegram-first scan UX with inline buttons, explicit approval gates, and progress messages.
- GPT-5.6 advisory pack command for real operator triage, with safe deterministic fallback when no API key is configured.
- Persistent SQLite jobs, credit accounting, orders, scan runs, and report records.
- Standalone public GitHub repo scan flow with one-scan-per-repo/account guardrails.
- Active web safe/deep scan approvals, strict low-rate Nmap profile, and scan-run limits.
- Pakasir QRIS sandbox/live-ready credit top-up flow with idempotent crediting.
- PDF/JSON/manual-review report bundle generation and redacted audit logging.
- Submission evidence: README, demo script, demo transcript, pitch deck, sample reports, and final smoke test notes.

Codex/GPT-5.6 accelerated the work by turning the product spec into vertical slices, adding tests around security boundaries, tightening Telegram UX, and aligning this README/submission package with the official Build Week requirements.

---

## Quick Start

```bash
git clone https://github.com/vuckuola619/OpenClaw2026_Zai_ClawVAPT.git
cd clawthon
npm install
cp .env.example .env
npm run lint
npm run typecheck
npm test
npm run build
npm run demo
```

Demo output:

```txt
reports/sample_report.pdf
reports/sample_report.json
reports/sample_gpt56_advisory.md
reports/sample_gpt56_advisory.json
logs/demo_audit.jsonl
docs/demo-transcript.md
```

Optional GPT-5.6 runtime advisory:

```bash
GPT56_ADVISOR_ENABLED=true
GPT56_MODEL=gpt-5.6
OPENAI_API_KEY=...
OPENAI_BASE_URL=https://api.openai.com/v1
```

When not configured, `/gpt_review <job_id>` still generates a deterministic redacted advisory pack so judges can test the workflow without secrets.

No Telegram token is required for the deterministic local demo.

---

## Run Telegram Bot

```bash
cp .env.example .env
# edit TELEGRAM_BOT_TOKEN and payment settings
npm install
npm run build
npm start
```

PM2:

```bash
npm run build
pm2 start "node dist/src/index.js" --name clawthon
pm2 logs clawthon
```

Docker:

```bash
docker compose config
docker compose build
docker compose up -d
docker compose logs --tail=200
```

Supported platforms:

- Local development: Linux/macOS with Node.js 22.
- Production demo: Linux server with PM2 and Telegram Bot API access.
- Container path: Dockerfile and Compose are included; Docker runtime verification depends on the host having Docker installed.

---

## Judge Testing Instructions

Fast local test:

```bash
npm install
npm run lint
npm run typecheck
npm test
npm run build
npm run demo
```

Artifacts to inspect after `npm run demo`:

```txt
reports/sample_report.pdf
reports/sample_report.json
reports/sample_gpt56_advisory.md
reports/sample_gpt56_advisory.json
logs/demo_audit.jsonl
docs/demo-transcript.md
```

Live bot test:

```txt
/start
/demo
/scan https://demo-owned-site.local
/verify <job_id>
/web_scan <job_id>
/repo_scan https://github.com/vuckuola619/sehatai-health-companion
/pay
```

The live bot runs in sandbox/demo mode for judging, so payment completion can be simulated from the Telegram button without real money.

---

## Telegram Commands

```txt
/start
/help
/demo
/scan <url>
/verify <job_id>
/challenge <job_id>
/renew_scope <job_id>
/web_scan <job_id>
/web_scan_deep <job_id>
/nmap_scan <job_id>
/repo_scan <github_url>
/repo_scan_deep <github_url>
/status <job_id>
/my_jobs
/latest
/report <job_id>
/pay
/check_payment <order_id>
/simulate_payment <order_id>
/tools
/summary
```

---

## Safety Model

- No verified ownership, no web scan.
- No scope lock, no web scanner.
- No explicit approval, no active web scan or Nmap.
- No credits, no paid scan.
- No raw secrets in Telegram, reports, logs, or README.
- No destructive payloads, brute force, credential stuffing, or data exfiltration.
- Public GitHub scan strips GitHub tokens from clone environment.

---

## Current Status

| Capability | Status |
|---|---|
| Telegram bot | Done |
| Multi-agent engine | Done |
| Ownership verification | Done |
| Active web safe/deep scan | Done |
| Strict Nmap profile | Done |
| Public GitHub repo scan | Done |
| QRIS payment/credits | Done |
| SQLite persistence | Done |
| PDF/JSON/manual review reports | Done |
| Sanitized OpenClaw workspace docs | Done |
| Dashboard UI | Roadmap |
| GitHub App private repos | Roadmap |

---

## Roadmap

- dashboard UI for teams and agencies
- GitHub App support for private repositories
- RAG-backed remediation knowledge base mapped to OWASP/CWE/CIS
- retest evidence packs
- continuous monitoring from chat

---

## License

MIT
