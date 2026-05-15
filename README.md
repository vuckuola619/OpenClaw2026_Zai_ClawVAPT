# OpenClaw2026_ZaiZai_ClawVAPT

**ClawVAPT** is a Telegram-first, multi-agent VAPT assistant for security operators. It verifies website ownership, locks scope, runs safe/deep web checks or standalone public GitHub repo scans, handles credit-based QRIS payments, then sends PDF/JSON/manual-review reports directly in Telegram.

> Submission target: **OpenClaw Hackathon 2026**  
> Recommended public repository name: `OpenClaw2026_ZaiZai_ClawVAPT`  
> Current live bot: Telegram `@capithon_bot`  
> Best Payment Use Case: **eligible** via Pakasir QRIS credit top-up flow

---

## 1. Project Description

Security teams and small product builders often need quick vulnerability triage, but normal scanners are hard to operate safely: they can hit unauthorized targets, leak sensitive evidence, overwhelm users with raw logs, or require manual payment/access handling before each engagement.

ClawVAPT solves this with a **consent-gated autonomous agent workflow**:

1. User starts a web target or public GitHub repo scan in Telegram.
2. For web targets, the Trust agent requires HTTP/DNS ownership proof and locks the scope.
3. The orchestrator checks credits and scan limits before any scanner runs.
4. Specialist scanner agents run safe/deep checks through guarded tool adapters.
5. Findings are normalized, redacted, ranked, and exported as PDF/JSON/manual-review reports.
6. If credits are insufficient, the payment agent creates a Pakasir QRIS top-up flow and resumes after payment verification.

This makes VAPT more accessible while keeping explicit authorization, payment, auditability, and redaction as first-class workflow gates.

---

## 2. Why This Can Win

| Judging Criterion | ClawVAPT Strength |
|---|---|
| Use Case Clarity & Impact (10%) | Real security ops pain: safe, authorized VAPT from Telegram with reports operators can send to clients. |
| Creativity & Originality (30%) | Combines Telegram UX, ownership proof, credit/payment gating, security scanners, and AI advisory review in one autonomous agent loop. |
| Autonomy & Agent Behaviour (30%) | Multi-agent engine makes decisions across scope verification, quota/payment, scanning, redaction, reporting, and edge-case handling. |
| Technical Execution (20%) | TypeScript backend, SQLite persistence, audit JSONL, safe scanner wrappers, OpenClaw bridge, PDF/JSON generation, CI/test/build gates. |
| Real-World Deployability (10%) | PM2 live deployment, reproducible install, `.env.example`, Telegram commands, payment flow, persistent jobs/credits/reports. |
| Best Payment Use Case | Pakasir QRIS top-up integrated into the agent workflow; confirmed payment adds credits idempotently. |

---

## 3. AI Agent Workflow / Architecture

Yes — ClawVAPT is currently implemented as a **code-level multi-agent architecture**.

```txt
Telegram User
  -> TelegramBot adapter
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
  -> Telegram reports: PDF + JSON + manual review
```

### Agent Responsibilities

- **MainOrchestrator** — owns state machine, dispatches agents/tools, enforces safety gates, records scan runs, refreshes reports.
- **TrustVerifierPaymentAgent** — creates ownership challenge, validates proof, locks scope, creates Pakasir payment orders, handles quota gate.
- **RedTeamRepoScannerAgent** — runs safe scanner profiles and normalizes security findings.
- **BlueTeamHardeningReportAgent** — generates remediation/report artifacts and retest-oriented output.
- **OpenClawBridge (optional)** — sends sanitized advisory envelopes to local OpenClaw Gateway for extra AI review without exposing secrets.

### Autonomous Loop

```txt
Receive request
  -> validate input
  -> enforce ownership/scope or public GitHub policy
  -> check credits and scan limit
  -> request payment if needed
  -> run selected tools
  -> redact/normalize findings
  -> generate reports
  -> send artifacts to user
  -> persist job/audit/credit state
```

Every meaningful transition is written to JSONL audit logs. Failures return safe user-facing errors rather than raw stack traces.

---

## 4. Key Features

### Web VAPT Flow

```txt
/scan https://example.com
/verify JOB-xxxx
/web_scan JOB-xxxx
/web_scan_deep JOB-xxxx
/nmap_scan JOB-xxxx
```

- HTTP/DNS ownership proof before web scanning.
- Scope lock per verified host.
- Max **5 scan runs per verified URL cycle**; bot asks user to renew verification after limit.
- Active web safe scan: headers + low-noise templates.
- Active web deep scan: non-destructive CVE/KEV/injection checks + controlled Nikto profile.
- Strict Nmap: low-rate single-host port discovery only.
- After active web scan, bot automatically sends:
  - PDF report
  - JSON report
  - manual-review report

### Standalone Public GitHub Scan

```txt
/repo_scan https://github.com/owner/repo
/repo_scan_deep https://github.com/owner/repo
```

- Not linked to web target jobs.
- Public GitHub repos only.
- Cost: **25 credits**.
- Limit: **1 scan per repo per account** for now.
- Shows estimated scan time before running.
- Shows credit debit and remaining credits after completion.

### Payment / Credits

- New users start with credits for web scanning.
- Web safe / strict Nmap: **5 credits**.
- Web deep: **10 credits**.
- Public GitHub repo scan: **25 credits**.
- `/pay` creates Pakasir QRIS payment.
- `/check_payment <order_id>` verifies status and idempotently credits account.
- If credit is insufficient, bot blocks scan and asks user to top up.

### Reporting

- Enterprise-style PDF report.
- Structured JSON report.
- Manual-review checklist for IDOR, authZ, workflow bypass, payment/business logic, tenant isolation, and AI/tool misuse.
- Redaction rules prevent raw secrets from leaking into logs/reports/Telegram.

---

## 5. Tech Stack

- **Runtime:** Node.js 22, TypeScript ESM
- **Bot Interface:** Telegram Bot API long polling
- **Persistence:** SQLite via `better-sqlite3`
- **Process:** PM2 live deployment
- **Security tools:** built-in checks plus optional safe adapters for Gitleaks, Semgrep, Trivy, Nuclei, Nikto, Nmap, OSV-Scanner, Checkov, Syft, Grype, Lynis, testssl.sh, OWASP ZAP
- **Reports:** JSON + generated PDF
- **Payments:** Pakasir QRIS
- **AI/Agent:** local TypeScript multi-agent engine + optional OpenClaw Gateway bridge / OpenClaw Codex GPT-5.5 advisory review

---

## 6. AI Tools / Models Used

| Tool / Model | Role |
|---|---|
| OpenClaw | Operator/runtime environment, orchestration support, bridge target for advisory AI review. |
| OpenClaw Codex GPT-5.5 advisory review | Optional sanitized public-repo security review via OpenClaw bridge. |
| TypeScript MultiAgentEngine | Deterministic product agent engine that dispatches Trust, Red Team, and Blue Team agents. |
| Security scanner adapters | Tool-using agent capabilities for repo/web security checks. |
| Pakasir QRIS | Payment use case enabling credit-based scan access. |

OpenClaw bridge mode is disabled by default in `.env.example` and uses loopback-only gateway settings when enabled.

---

## 7. Reproducible Installation / Run Instructions

### Prerequisites

- Node.js 22+
- npm
- Git
- Optional: Telegram bot token for live bot mode
- Optional: Pakasir credentials for real payment verification
- Optional: external scanner binaries for deeper coverage

### Local Demo

```bash
git clone https://github.com/vuckuola619/OpenClaw2026_ZaiZai_ClawVAPT.git
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

### Start Bot Locally

```bash
cp .env.example .env
# edit TELEGRAM_BOT_TOKEN and payment fields if needed
npm install
npm run build
npm start
```

### PM2 Deployment

```bash
npm install
npm run build
pm2 start "node dist/src/index.js" --name clawthon
pm2 logs clawthon
```

### Docker Deployment

```bash
docker compose config
docker compose build
docker compose up -d
docker compose logs --tail=200
```

---

## 8. Telegram Commands

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

## 9. Safety Contract

- No ownership verification = no web scan.
- No scope lock = no web scanner execution.
- No explicit approval = no active web scan or Nmap.
- No credit = no paid scan.
- No evidence = no finding.
- No redaction = report cannot be released.
- No raw secrets in logs, commits, reports, Telegram, PR body, GitHub Actions, or README.
- No brute force, credential stuffing, destructive payloads, data exfiltration, or scanning outside verified scope.
- GitHub scan accepts public GitHub repos only and strips GitHub tokens from clone environment.

---

## 10. Real vs Mock Status

| Capability | Status | Notes |
|---|---|---|
| Telegram live bot | DONE | Long polling bot handlers. |
| Multi-agent engine | DONE | Trust, Red Team, Blue Team agents. |
| Ownership verification | DONE | HTTP/DNS proof + scope lock. |
| Web safe/deep scan | DONE | Safe approval-gated scanner profiles. |
| Strict Nmap | DONE | Single host, low-rate, limited ports. |
| Public GitHub scan | DONE | Standalone repo scan, 25 credits, 1 scan/repo/account. |
| Payments | DONE | Pakasir QRIS flow + idempotent crediting. |
| Persistence | DONE | SQLite jobs, quotas, orders, reports, scan runs. |
| Reports | DONE | PDF + JSON + manual review. |
| OpenClaw bridge | DONE/OPTIONAL | Sanitized advisory envelope to local OpenClaw Gateway. |
| External scanners | DONE/PARTIAL | Used when installed; missing tools marked incomplete/future safely. |
| Private GitHub repos | ROADMAP | GitHub App/SSO support later. |
| Multi-tenant SaaS dashboard | ROADMAP | Telegram-first MVP for hackathon. |

---

## 11. Submission Assets

> Replace placeholders before Devpost submission. All links/files must remain accessible to judges without extra permission.

| Required Asset | Status / Link |
|---|---|
| GitHub Repository | `https://github.com/vuckuola619/OpenClaw2026_ZaiZai_ClawVAPT` — must be Public |
| Demo Video | `OpenClaw2026_ZaiZai_ClawVAPT` on YouTube Unlisted — max 2 minutes |
| Pitch Deck | `OpenClaw2026_ZaiZai_ClawVAPT.pdf` — max 5 slides |
| Live Deployment Link | Telegram bot `@capithon_bot` |
| AI Tools / Models Used | See section 6 |
| Payment Track | Select `Best Payment Use Case` on Devpost |

### Demo Video Checklist (max 2 minutes)

1. Show Telegram `/start` and credit summary.
2. Show web target `/scan` + ownership/scope gate.
3. Show active web scan approval, estimate, credit debit, and report delivery.
4. Show standalone `/repo_scan https://github.com/owner/repo` with 25-credit cost and estimate.
5. Show insufficient credit -> `/pay` QRIS top-up -> `/check_payment`.
6. Show PDF/JSON/manual review artifacts.
7. Mention multi-agent workflow: Trust -> Red Team -> Blue Team -> Reports.

### Pitch Deck Outline (5 slides max)

1. **Problem Statement** — safe VAPT is hard, authorization/payment/reporting are fragmented.
2. **Solution Overview** — Telegram-first ClawVAPT agent with verified scope, scanners, reports, payments.
3. **AI Agent Workflow / Architecture** — multi-agent loop + tool calls + OpenClaw bridge.
4. **Key Features & Tech Stack** — web scan, GitHub scan, QRIS credits, SQLite, reports, scanners.
5. **Future Development / Impact** — private repo GitHub App, SaaS dashboard, richer RAG knowledge base, enterprise integrations.

---

## 12. Future Development / Impact

- GitHub App integration for private repositories.
- Organization/team dashboard for agencies and pentest operators.
- RAG-backed remediation knowledge base mapped to OWASP/CWE/CIS.
- Client-ready engagement packets with scope, proof, report, and retest evidence.
- Safer continuous security monitoring for SMEs through chat-first workflows.

---

## 13. License

MIT
