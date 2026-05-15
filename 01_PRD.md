# PRD - ClawVAPT

## Product Summary

ClawVAPT is a Telegram-first, OpenClaw-orchestrated, multi-agent security workflow for authorized VAPT, repository security scanning, payment-gated credits, remediation PRs, hardening recommendations, and PDF/JSON reporting.

The product is not an offensive hacking bot. It is a consent-gated, scope-locked, evidence-based security assessment and remediation workflow for user-owned assets.

## Target Users

- Solo developers and indie hackers
- Student teams and hackathon participants
- UMKM and small businesses with public web apps
- Dev teams that need low-cost initial security checks
- Website owners who want actionable remediation instead of generic scan output

## Primary Problem

Small teams often skip VAPT because it is expensive, manual, slow, and hard to translate into code/server fixes. Existing scanners usually stop at detection and leave users with noisy findings.

## Product Differentiator

ClawVAPT closes the loop:

1. Verify authorization.
2. Lock scope.
3. Run safe assessment.
4. Scan source repository.
5. Correlate runtime findings with code evidence.
6. Generate remediation plan.
7. Create PR or patch.
8. Retest.
9. Produce final report.
10. Gate repeated scans through Pakasir payment credits.

## Success Criteria

For the hackathon demo, success means:

- Telegram bot receives `/demo` and completes deterministic flow.
- Telegram bot receives `/scan <url>` and blocks until verification.
- Ownership verification flow works in demo mode and is implemented structurally for real mode.
- Scope lock blocks out-of-scope scan execution.
- First scan is free.
- Second scan triggers Pakasir payment flow.
- Built-in safe URL scanner produces findings.
- Repo scanner produces findings.
- Findings are normalized and correlated.
- PDF and JSON reports are generated.
- Audit log is written.
- GitHub Actions CI exists.
- Security tooling plan is documented and partially implemented with safe wrappers.
- README clearly lists real vs mock capabilities.

## Product Surfaces

Primary:

- Telegram bot
- GitHub repository evidence
- GitHub Actions logs
- PDF report
- JSON report
- Sanitized audit logs
- Remediation PR or patch file

Secondary:

- Docker Compose deployment
- Local CLI demo
- Open-source security tool adapter outputs

## Out of Scope for Hackathon MVP

- Full exploit chain automation
- Unauthorized scanning
- Brute force or credential attacks
- Full multi-tenant SaaS billing
- Full vulnerability database management
- Full SSH production remediation without manual approval
- Auto-merge PRs
- Production legal compliance guarantee

## Positioning Statement

ClawVAPT is an autonomous, consent-gated VAPT and remediation workflow. It is designed to align with PTES-style pre-engagement, NIST SP 800-115-style security testing lifecycle, OWASP web testing methodology, CIS vulnerability management and audit logging principles, and CVSS-style severity communication. It does not claim full legal or standards compliance without human review.

