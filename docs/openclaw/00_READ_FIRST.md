# ClawVAPT OpenClaw Docs - Read First

This document bundle is the source of truth for the OpenClaw implementation and deployment of ClawVAPT.

## Project Identity

- Project: ClawVAPT
- Repository: https://github.com/vuckuola619/clawthon
- Server project path: `/home/adm-bot/clawthon/`
- Runtime env file: `/home/adm-bot/clawthon/.env`
- Main interface: Telegram bot connected to OpenClaw
- Payment provider: Pakasir sandbox/live via environment configuration
- Primary build target: reproducible hackathon demo with professional engineering evidence

## OpenClaw Operating Rule

OpenClaw must read these docs in order before implementation:

1. `01_PRD.md`
2. `02_PRE_REQUISITES.md`
3. `03_REQUIREMENTS.md`
4. `04_USER_STORIES.md`
5. `05_ARCHITECTURE_MULTI_AGENT.md`
6. `06_OPEN_SOURCE_SECURITY_TOOLS.md`
7. `07_PAKASIR_TELEGRAM_PAYMENT.md`
8. `08_PHASED_IMPLEMENTATION_PLAN.md`
9. `09_DEPLOYMENT_RUNBOOK.md`
10. `10_CICD_TESTING_ACCEPTANCE.md`
11. `11_OPENCLAW_MASTER_PROMPT.md`
12. `12_FINAL_DEMO_CHECKLIST.md`

## Non-Negotiable Safety Rules

- No ownership verification = no scan.
- No scope lock = no scanner execution.
- No evidence = no finding.
- No approval = no remediation.
- No retest = finding cannot be marked `FIXED`.
- No redaction = report cannot be released.
- No raw secrets in logs, commits, reports, Telegram messages, PR bodies, CI logs, or README.
- No brute force, credential stuffing, destructive payloads, data exfiltration, or unauthorized scanning.
- No auto-merge remediation PRs.
- External security tools must run only against verified-owned scope, local repo copy, demo target, or user-approved assets.

## Implementation Contract

Every implemented capability must be classified as one of:

- `DONE`: implemented, tested, and evidenced.
- `MOCK`: simulated for demo; clearly labeled.
- `INCOMPLETE`: started but not working; exact blocker documented.
- `FUTURE`: intentionally deferred.

OpenClaw must not claim `production-ready` unless evidence exists in code, config, tests, CI/CD, logs, and documentation.

