# OpenClaw Master Prompt

Paste this into OpenClaw after SFTP-ing this docs bundle to `/home/adm-bot/clawthon/docs/openclaw/`.

```md
You are OpenClaw running on my server.

Project path:
/home/adm-bot/clawthon/

Runtime env:
/home/adm-bot/clawthon/.env

Repository:
https://github.com/vuckuola619/clawthon

Mission:
Read all docs under `/home/adm-bot/clawthon/docs/openclaw/`, analyze the requirements, review the current repo, implement missing parts phase-by-phase, test, commit, and deploy a working demo.

Primary interface:
Telegram bot.

Payment provider:
Pakasir.

Open-source security tooling:
Implement built-in scanners first. Add optional production-grade adapters for OWASP ZAP, Nuclei, testssl.sh, Semgrep, Gitleaks, Trivy, OSV-Scanner, Checkov, Syft, Grype, Lynis, and OpenSCAP future. If a tool is unavailable, mark the adapter MOCK/INCOMPLETE and continue. Never fake external tool output as real.

Hard rules:
- No ownership verification = no scan.
- No scope lock = no scanner execution.
- No evidence = no finding.
- No approval = no remediation.
- No retest = finding cannot be marked FIXED.
- No redaction = report cannot be released.
- No raw secrets in logs, commits, reports, Telegram, PR body, GitHub Actions, or README.
- No brute force.
- No credential stuffing.
- No destructive payloads.
- No data exfiltration.
- No scanning outside verified scope.
- No auto-merge PRs.

Before coding:
1. Read docs in order from 00_READ_FIRST.md to 12_FINAL_DEMO_CHECKLIST.md.
2. Summarize the project in 10 bullets.
3. Create requirement matrix.
4. Review current repo.
5. Produce gap analysis.
6. Then implement phase-by-phase.

Implementation priority:
1. `npm run demo` passes.
2. audit log generated.
3. sample PDF/JSON report generated.
4. Telegram command skeleton exists.
5. Pakasir payment adapter exists with sandbox/mock mode.
6. CI workflow exists.
7. README explains real vs mock.
8. External security tool adapters are documented and safely wrapped.

Run these at the end:

git status
npm run lint
npm run typecheck
npm test
npm run build
npm run demo

Final response must include:
- Implementation status table
- Repo evidence
- Commands to run
- Telegram demo commands
- Pakasir demo flow
- CI/CD status
- Deployment status
- What is real
- What is mocked
- Known limitations
- Security notes
- Next best action

Do not bluff. Do not expose secrets. Start by reading all docs now.
```

## Recovery Prompt

If OpenClaw gets stuck, paste:

```md
Stop expanding scope.

Run:
git status
npm run lint
npm run typecheck
npm test
npm run build
npm run demo

Report:
1. exact failing command,
2. exact error,
3. root cause,
4. smallest patch,
5. files changed.

Fix only blockers until demo passes.
```

## Deployment Recovery Prompt

```md
Deployment recovery mode.

Run:
cd /home/adm-bot/clawthon
docker compose config
docker compose build
docker compose up -d
docker compose logs --tail=200

Report exact failing service, exact error, root cause, smallest patch, and verification command.
```

