# Devpost Submission Fields — ClawVAPT

## Project Name

OpenClaw2026_Zai_ClawVAPT

## Short Description

Telegram-first multi-agent VAPT assistant with verified web scanning, standalone public GitHub repo scanning, QRIS credit top-ups, and automatic PDF/JSON/manual-review reports.

## Category

Developer Tools

## Project Description

ClawVAPT helps security operators run safer vulnerability triage from Telegram. The system verifies website ownership with HTTP/DNS proof, locks the scan scope, checks user credits, runs safe scanner profiles, redacts evidence, and sends reports directly back to the user.

The product is built around a multi-agent workflow:

- TrustVerifierPaymentAgent handles ownership verification, scope locking, credits, and Pakasir QRIS payments.
- RedTeamRepoScannerAgent runs guarded web/repo scanner profiles.
- BlueTeamHardeningReportAgent generates PDF, JSON, and manual-review reports.
- MainOrchestrator enforces state, safety gates, audit logs, and Telegram UX.

ClawVAPT supports active web checks, strict low-rate Nmap, standalone public GitHub repo scans, credit accounting, QRIS top-up simulation in sandbox mode, persistent jobs via SQLite, and optional OpenClaw advisory review through a sanitized bridge.

## GitHub Repository

https://github.com/vuckuola619/OpenClaw2026_Zai_ClawVAPT

## Demo Video

https://youtu.be/mupug2vA5Ys

Suggested title: OpenClaw2026_Zai_ClawVAPT

Video link: https://youtu.be/mupug2vA5Ys

## Pitch Deck

submission/OpenClaw2026_Zai_ClawVAPT.pdf

## Live Deployment Link

Telegram bot: @capithon_bot

## AI Tools / Models Used

- Codex with GPT-5.6: Build Week implementation partner for planning, coding, testing, documentation, demo assets, and final submission polish.
- TypeScript MultiAgentEngine: deterministic agent routing and workflow execution.
- OpenClaw: runtime/operator environment and optional advisory bridge.
- OpenClaw Codex advisory bridge: optional sanitized public-repo security review.
- Security scanner adapters: tool calls for web/repo security checks using built-in checks and optional external scanners.
- Pakasir QRIS: payment and credit top-up workflow integrated into the agent loop.

## Built With

Node.js, TypeScript, Telegram Bot API, SQLite, PM2, Pakasir QRIS, OpenClaw, Gitleaks, Semgrep, Trivy, Nuclei, Nikto, Nmap, ReportLab/PDF generation.

## Best Payment Use Case

Yes — select the Best Payment Use Case label. ClawVAPT uses Pakasir QRIS to gate scan credits and simulate payment completion in demo/sandbox mode.

## Testing Instructions

```bash
npm install
npm run lint
npm run typecheck
npm test
npm run build
npm run demo
```

Inspect generated artifacts:

- `reports/sample_report.pdf`
- `reports/sample_report.json`
- `logs/demo_audit.jsonl`
- `docs/demo-transcript.md`

Live sandbox demo:

- Telegram bot: `@capithon_bot`
- Use `/judge`, `/demo`, `/scan https://demo-owned-site.local`, `/verify <job_id>`, `/status <job_id>`, `/report <job_id>`, `/pay`.
- Payment completion is sandbox/demo mode; no real payment required for judging.

Supported platforms: Node.js 22 on Linux/macOS, Telegram Bot API, PM2 for the live demo. Dockerfile and Compose are included.

## Build Week / Codex Notes

Pre-existing direction: Telegram-first VAPT bot for authorized scans.

Meaningful Build Week extension:

- multi-agent workflow tightened around Trust, Red Team, and Blue Team roles
- scan approval/progress UX in Telegram
- judge walkthrough command and clearer Telegram command center UX
- public GitHub repo scan flow
- Pakasir QRIS credit top-up path
- SQLite persistence and audit evidence
- PDF/JSON/manual-review reporting
- final README/submission package aligned to OpenAI Build Week rules

Codex with GPT-5.6 was used to convert requirements into vertical slices, implement and review TypeScript changes, run tests, update docs, and prepare Devpost-ready submission materials.

## /feedback Session ID

TODO: paste Codex `/feedback` session ID for the thread where most core functionality was built.

## Final Checks

- GitHub repo public: yes
- README install/run: yes
- Pitch deck PDF: yes, 5 slides
- Demo script: submission/demo-script.md
- Demo video: https://youtu.be/mupug2vA5Ys
- Live bot: @capithon_bot
- Payment flow: /pay -> QRIS image -> Complete QRIS Payment -> +10 credits
