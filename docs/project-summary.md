# ClawVAPT Project Summary

1. ClawVAPT is a Telegram-first, OpenClaw-orchestrated VAPT workflow for authorized assets only.
2. The workflow enforces pre-engagement gates: ownership verification, scope lock, quota/payment, scan plan, scan, report, remediation approval, retest.
3. The primary interface is one public Telegram bot with deterministic `/demo` and command skeletons for scan, verify, status, report, harden, pay, and payment check.
4. Pakasir is the payment provider; the first scan is free and second scan requires 10 credits after a Rp25.000 top-up.
5. Built-in scanners must work without external tools and perform only safe URL/repo checks with redacted evidence.
6. Optional external adapters cover OWASP ZAP, Nuclei, testssl.sh, Semgrep, Gitleaks, Trivy, OSV-Scanner, Checkov, Syft, Grype, Lynis, and OpenSCAP future.
7. Findings require evidence and are normalized, scored, correlated, and reported; no finding can be marked `FIXED` without retest.
8. Remediation is approval-gated and defaults to PR or patch; auto-merge and automatic risky server changes are forbidden.
9. Demo evidence must include audit JSONL, sample PDF/JSON report, demo transcript, CI workflows, and README real-vs-mock disclosure.
10. Raw secrets must never appear in logs, commits, reports, Telegram messages, CI logs, PR bodies, or README.
