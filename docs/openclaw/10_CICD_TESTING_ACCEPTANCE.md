# CI/CD, Testing, and Acceptance

## Required GitHub Workflows

```txt
.github/workflows/ci.yml
.github/workflows/security.yml
```

## CI Workflow

Must run:

```bash
npm ci
npm run lint
npm run typecheck
npm test
npm run build
```

## Security Workflow

Should run where available:

```bash
npm audit --audit-level=high
gitleaks
semgrep
trivy fs
```

Optional security tools may use `continue-on-error: true` during hackathon, but README must say security workflow is visibility-oriented for demo and can be promoted to blocking gate later.

## Required Tests

- URL validation
- ownership challenge generation
- ownership verification success/failure
- scope lock enforcement
- quota first scan free
- second scan requires payment
- Pakasir payment URL generation
- payment confirmation mock/sandbox path
- secret redaction
- finding normalization
- report generation
- remediation approval gate
- retest status update
- audit log event creation
- external tool adapter availability handling

## Acceptance Commands

Run before final answer:

```bash
git status
npm run lint
npm run typecheck
npm test
npm run build
npm run demo
```

## Demo Acceptance

`npm run demo` must produce:

```txt
reports/sample_report.pdf
reports/sample_report.json
logs/demo_audit.jsonl
docs/demo-transcript.md
```

Demo must show:

1. scan request received
2. ownership challenge generated
3. ownership verified in demo mode
4. scope locked
5. first scan free
6. second scan payment gate
7. Pakasir payment URL or sandbox/mock payment
8. URL scan findings
9. repo scan findings
10. finding normalization
11. correlation
12. report generation
13. remediation plan
14. PR or MOCK_PR patch
15. retest status update
16. final summary
17. audit log

## Final Implementation Status Format

```md
| Requirement | Status | Evidence | Notes |
|---|---|---|---|
| Telegram /demo | DONE | src/telegram/commands.ts, npm run demo | deterministic demo |
| Pakasir payment | MOCK/DONE | src/tools/PakasirAdapter.ts | sandbox if env exists |
```

Allowed statuses:

- DONE
- MOCK
- INCOMPLETE
- FUTURE

## Anti-Bluff Rules

- Do not mark DONE without evidence.
- Do not hide mock as real.
- Do not say CI passes unless it was run or visible in GitHub Actions.
- Do not claim external tool integration is real if tool is unavailable.
- Do not claim payment is real if sandbox/mock used.
- Do not claim production legal compliance.

