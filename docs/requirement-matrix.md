# Requirement Matrix

| Requirement | Status | Evidence | Notes |
|---|---|---|---|
| Read docs 00-12 | DONE | root `00_*.md`-`12_*.md`, `docs/openclaw/` | Source bundle preserved. |
| Telegram live bot handlers | DONE | `src/telegram/bot.ts`, `src/telegram/commands.ts` | Long polling, commands, inline buttons, long-message split. |
| Ownership verification gate | DONE | `src/core/OwnershipVerifier.ts`, `tests/ownership-verifier.test.ts` | HTTP/DNS real proof; demo fixture isolated. |
| Scope lock before scan | DONE | `ScopeGuard`, `ActiveWebScanner`, orchestrator tests | Active scans block before verification/scope lock. |
| Audit JSONL events | DONE | `src/core/AuditLogger.ts`, `logs/demo_audit.jsonl` | Transitions for job/payment/tools/report. |
| Pakasir payment URL | DONE | `src/tools/PakasirAdapter.ts`, `tests/core.test.ts` | URL generation implemented. |
| Pakasir transaction validation | DONE/MOCK-READY | `getTransactionDetail`, `checkPayment` | Real API when env key exists; mock only in demo/no-key path. |
| Sandbox payment simulation | DONE | `simulatePayment`, `tests/core.test.ts` | Fails outside sandbox/demo. |
| Built-in URL scanner | DONE | `src/tools/SafeUrlScanner.ts` | Safe headers/status checks. |
| Built-in repo scanner | DONE | `src/tools/RepoScanner.ts` | Redacted evidence. |
| Real repo connector | DONE | `src/tools/GitHubRepoConnector.ts` | GitHub-only, credential-blocked, shallow clone. |
| External repo adapters | DONE | `SecurityToolAdapters` | Gitleaks/Semgrep/Trivy real when installed; timeout/redaction/JSON parsing. |
| Active web adapters | DONE | `ActiveWebScanner` | Nuclei safe/deep, Nikto deep, strict Nmap with approval gates. |
| Other OSS tool matrix | PARTIAL/FUTURE | `ExternalSecurityToolRunner` | ZAP/testssl/OSV/Checkov/Syft/Grype/Lynis/OpenSCAP status-only unless installed/expanded. |
| JSON report | DONE | `ReportGenerator`, real E2E artifacts | Structured report with scope/tools/findings/limitations/redaction. |
| PDF report | DONE | `ReportGenerator`, enterprise generator | Enterprise ISO/SOC/OWASP PDF available; fallback PDF if Python/reportlab absent. |
| Manual review | DONE | `ManualReview.ts`, `/manual_review` | Business logic scanner blind spots included. |
| Remediation PR safety | DONE | `BlueTeamHardeningReportAgent.prDraft`, `/create_pr` | Draft body only; no auto-merge/external PR write. |
| Retest gate | DONE | Finding statuses never marked FIXED automatically | Retest required before closure. |
| Hardening add-on | DONE | `/harden`, hardening plan docs | Web/repo/Docker/SSH/firewall/CI/SBOM recommendations. |
| CI workflows | DONE | `.github/workflows/ci.yml`, `security.yml` | CI blocking; security visibility with optional tools. |
| Docker files | DONE/ENV-BLOCKED | `Dockerfile`, `docker-compose.yml` | Docker binary unavailable locally, so PM2 deploy used. |
| PM2 deployment | DONE | `pm2 status clawthon-demo` | Live Telegram polling online. |
| Real owned-target E2E | DONE | `src/real-e2e.ts`, `reports/JOB-6ec6f4e5_*` | No mock, no hardcode; DNS verified. |
