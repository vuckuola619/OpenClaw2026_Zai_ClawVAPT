# User Stories

## Story 1 - First Free Scan

As a website owner, I want to send `/scan https://my-site.com` through Telegram so that ClawVAPT can guide me through authorization and run a safe first scan for free.

Acceptance criteria:

- Bot creates job.
- Bot asks for ownership verification.
- Scan does not start before verification.
- After verification, scope is locked.
- First scan consumes free quota, not credits.
- Bot sends summary and report.

## Story 2 - Second Scan Requires Payment

As a returning user, I want to run another scan so that I can continue using ClawVAPT after paying via Pakasir.

Acceptance criteria:

- Bot detects free scan already used.
- Bot creates Pakasir order.
- Bot sends payment URL in Telegram.
- User can run `/check_payment <order_id>`.
- Sandbox user can run `/simulate_payment <order_id>` only when `PAKASIR_MODE=sandbox`.
- Credits are added only after transaction detail validation or clearly labeled mock confirmation in demo mode.

## Story 3 - Repo Security Scan

As a developer, I want ClawVAPT to scan my GitHub repo so that findings are connected to source code.

Acceptance criteria:

- Repo access is explicit.
- GitHub token is never logged.
- Repo scanner finds safe patterns.
- Secret findings are redacted.
- Runtime findings are correlated with repo findings when possible.

## Story 4 - Remediation PR

As a developer, I want a PR or patch for safe fixes so that I can review changes before merging.

Acceptance criteria:

- BlueTeamHardeningReportAgent generates remediation plan.
- Default remediation is GitHub PR or patch file.
- PR is not auto-merged.
- PR body includes finding ID, severity, evidence, changes, test command, rollback note, and retest instruction.

## Story 5 - Hardening Add-On

As a site owner, I want a hardening plan after VAPT so that I can improve baseline security posture.

Acceptance criteria:

- `/harden <job_id>` returns hardening plan.
- Default mode is `PLAN_ONLY`.
- Lockout-risk changes are never applied automatically.
- Plan includes web, repo, Docker, SSH, firewall, CI, and SBOM recommendations.

## Story 6 - Auditor/Judge Review

As a judge, I want to inspect repo, logs, reports, and CI so that I can verify the project is real.

Acceptance criteria:

- README explains real vs mock.
- CI workflow exists.
- Security workflow exists.
- Sample report exists.
- Sanitized demo audit log exists.
- Demo transcript exists.
- Every mocked feature is clearly labeled.

