# Requirement Matrix

| Requirement | Status | Evidence | Notes |
|---|---|---|---|
| Read docs 00-12 | DONE | docs/openclaw/ | Source bundle copied. |
| Telegram command skeleton | DONE | src/telegram/commands.ts | Live token required for runtime polling. |
| Ownership verification gate | DONE | src/core/ScopeGuard.ts, tests/core.test.ts | Demo token + real skeleton. |
| Scope lock before scan | DONE | src/core/ScopeGuard.ts | Enforced by orchestrator/scanner. |
| Audit JSONL events | DONE | src/core/AuditLogger.ts | `logs/demo_audit.jsonl`. |
| Pakasir payment URL | DONE | src/tools/PakasirAdapter.ts | Sandbox/mock mode. |
| Pakasir transaction validation | MOCK/INCOMPLETE | src/tools/PakasirAdapter.ts | Real API requires env secrets. |
| Built-in URL scanner | DONE | src/tools/SafeUrlScanner.ts | Safe checks only. |
| Built-in repo scanner | DONE | src/tools/RepoScanner.ts | Redacted evidence. |
| External adapters | INCOMPLETE/FUTURE | src/tools/adapters/ | Availability status only unless installed. |
| JSON/PDF sample report | DONE | src/report/ReportGenerator.ts | `npm run demo`. |
| Remediation approval gate | DONE/MOCK | src/agents/BlueTeamHardeningReportAgent.ts | Patch only, no auto-merge. |
| CI workflows | DONE | .github/workflows/ | CI + security visibility. |
| Docker compose | DONE | Dockerfile, docker-compose.yml | Needs deploy verification. |
