# OpenClaw2026_ZaiZai_ClawVAPT

**ClawVAPT** is a Telegram-first, multi-agent VAPT assistant for security operators. It verifies website ownership, locks scan scope, runs safe web checks or standalone public GitHub repo scans, handles QRIS credit top-ups, and sends PDF/JSON/manual-review reports back through Telegram.

Built for operators who need fast security triage without losing control of authorization, scope, credits, evidence, and reporting.

---

## What It Does

ClawVAPT turns a Telegram chat into a guided VAPT workflow:

1. Create a web target or submit a public GitHub repo.
2. Verify ownership for web targets with HTTP/DNS proof.
3. Lock scope before any web scanner runs.
4. Check credits and scan limits.
5. Run safe/deep scanner profiles through guarded tool adapters.
6. Normalize, redact, and summarize findings.
7. Send reports directly to Telegram.

The goal is simple: make security checks easier to run, safer to authorize, and cleaner to report.

---

## Multi-Agent Architecture

ClawVAPT uses a code-level multi-agent engine coordinated by `MainOrchestrator`.

```txt
Telegram User
  -> TelegramBot
  -> MainOrchestrator
      -> TrustVerifierPaymentAgent
      -> RedTeamRepoScannerAgent
      -> BlueTeamHardeningReportAgent
      -> optional OpenClawBridge
  -> Tools
      -> OwnershipVerifier
      -> QuotaStore + PakasirAdapter
      -> ActiveWebScanner
      -> SecurityToolAdapters
      -> GitHubRepoConnector
      -> ReportGenerator
      -> AuditLogger
  -> Telegram reports
```

### Agents

- **MainOrchestrator** — owns state, dispatches agents/tools, enforces gates, persists jobs, refreshes reports.
- **TrustVerifierPaymentAgent** — handles ownership proof, scope lock, quota checks, and Pakasir payment orders.
- **RedTeamRepoScannerAgent** — runs scanner profiles and normalizes findings.
- **BlueTeamHardeningReportAgent** — generates report artifacts and remediation-oriented output.
- **OpenClawBridge** — optional sanitized advisory bridge to local OpenClaw Gateway.

### Autonomous Loop

```txt
request
  -> validate input
  -> verify ownership or public repo policy
  -> check credits + scan limits
  -> run tools
  -> normalize findings
  -> redact evidence
  -> generate reports
  -> deliver artifacts
  -> persist audit trail
```

Every important transition is written to JSONL audit logs. User-facing errors are sanitized.

---

## Core Features

### Web VAPT

```txt
/scan https://example.com
/verify JOB-xxxx
/web_scan JOB-xxxx
/web_scan_deep JOB-xxxx
/nmap_scan JOB-xxxx
```

- HTTP/DNS ownership verification.
- Per-host scope lock.
- 5 scan runs per verification cycle.
- Safe active web profile for low-noise checks.
- Deep active web profile for non-destructive CVE/KEV/injection checks.
- Strict Nmap profile for low-rate single-host port discovery.
- Automatic PDF, JSON, and manual-review report delivery after active web scans.

### Public GitHub Repo Scan

```txt
/repo_scan https://github.com/owner/repo
/repo_scan_deep https://github.com/owner/repo
```

- Standalone flow, not tied to a web target job.
- Public GitHub repositories only.
- 25 credits per repo scan.
- 1 scan per repo per account.
- Shows scan estimate before running.
- Shows credit debit and remaining credits after completion.

### Payments & Credits

- Web safe / strict Nmap: 5 credits.
- Web deep: 10 credits.
- Public GitHub repo scan: 25 credits.
- `/pay` creates a Pakasir QRIS top-up order.
- `/check_payment <order_id>` verifies payment and credits the account once.
- If credits are insufficient, the bot blocks the scan and prompts top-up.

### Reports

- Enterprise-style PDF report.
- Structured JSON report.
- Manual-review checklist for logic flaws scanners often miss.
- Redaction rules keep raw secrets out of logs, reports, and Telegram messages.

---

## Tech Stack

- Node.js 22
- TypeScript ESM
- Telegram Bot API
- SQLite (`better-sqlite3`)
- PM2
- Pakasir QRIS
- OpenClaw optional bridge
- Built-in scanner logic plus optional adapters for Gitleaks, Semgrep, Trivy, Nuclei, Nikto, Nmap, OSV-Scanner, Checkov, Syft, Grype, Lynis, testssl.sh, and OWASP ZAP

---

## AI / Agent Tools

| Tool | Use |
|---|---|
| TypeScript MultiAgentEngine | Product agent loop and routing. |
| OpenClaw | Runtime/operator environment and optional advisory bridge. |
| OpenClaw Codex GPT-5.5 advisory review | Optional sanitized public-repo security review. |
| Security tool adapters | Tool calls for web/repo security checks. |
| Pakasir QRIS | Payment and credit top-up workflow. |

---

## Quick Start

```bash
git clone https://github.com/vuckuola/OpenClaw2026_ZaiZai_ClawVAPT.git
cd OpenClaw2026_ZaiZai_ClawVAPT
npm install
cp .env.example .env
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
- No raw secrets in user-facing output.
- Public GitHub repo scans strip GitHub tokens from the clone environment.
- Destructive payloads, brute force, credential stuffing, and out-of-scope scanning are blocked.

---

## Status

| Capability | Status |
|---|---|
| Telegram bot | Done |
| Multi-agent engine | Done |
| Ownership verification | Done |
| Web safe/deep scan | Done |
| Strict Nmap | Done |
| Public GitHub scan | Done |
| Pakasir QRIS credits | Done |
| SQLite persistence | Done |
| PDF/JSON/manual review reports | Done |
| OpenClaw bridge | Optional |
| Private GitHub repos | Roadmap |

---

## Roadmap

- GitHub App support for private repositories.
- Team dashboard for agencies and pentest operators.
- RAG-backed remediation knowledge base mapped to OWASP/CWE/CIS.
- Retest evidence packs for client-ready delivery.
- Continuous security monitoring from chat.

---

## License

MIT
