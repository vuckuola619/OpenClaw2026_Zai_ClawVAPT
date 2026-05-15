# Final Demo Checklist

## Before Recording

```bash
cd /home/adm-bot/clawthon
git status
npm run lint
npm run typecheck
npm test
npm run build
npm run demo
```

## Files to Show in Repo

```txt
README.md
DEMO.md
SECURITY.md
.env.example
.github/workflows/ci.yml
.github/workflows/security.yml
src/agents/
src/tools/
src/orchestrator/
src/telegram/
docs/openclaw/
docs/demo-transcript.md
reports/sample_report.pdf
reports/sample_report.json
logs/demo_audit.jsonl
patches/
```

## Telegram Demo Flow

```txt
/start
/help
/demo
/scan https://demo-owned-site.local
/verify <job_id>
/status <job_id>
/report <job_id>
/harden <job_id>
/pay
/check_payment <order_id>
/simulate_payment <order_id>
```

## What To Say in Demo

- ClawVAPT is not a chatbot and not an offensive scanner.
- It is an autonomous, consent-gated VAPT and remediation workflow.
- It blocks scans before ownership verification.
- It locks scope before tool execution.
- It uses multiple agents.
- It supports Pakasir payment via Telegram for credit-gated scans.
- It integrates production-grade open-source security tools through safe adapters.
- It generates audit logs and reports.
- It can create PR/patch remediation, but never auto-merges.

## Proof Points for Judges

- OpenClaw multi-agent workflow visible in logs.
- Telegram bot flow visible.
- Pakasir payment URL/check visible.
- Report generated.
- Audit log generated.
- CI/CD workflow present.
- Security tool adapter design present.
- README says real vs mock.

## Common Failure Recovery

If Telegram token missing:

- Run CLI demo.
- Mark Telegram live bot as INCOMPLETE due to missing env.

If Pakasir key missing:

- Use mock/sandbox payment.
- Mark real Pakasir API as INCOMPLETE.

If external tools missing:

- Use built-in scanner.
- Mark adapters as INCOMPLETE.

If PDF generation fails:

- Generate JSON report and HTML/Markdown fallback.
- Mark PDF as INCOMPLETE until fixed.

