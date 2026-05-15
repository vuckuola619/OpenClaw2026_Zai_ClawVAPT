# Security Tools Phase

Implemented safe repo-first security adapters and Telegram controls.

## Tool strategy

Repo-based skills/tools are selected from project contents:

- Node/TypeScript service → Semgrep JS/TS SAST
- Local secrets/config risk → Gitleaks secrets scan
- Docker/dependency surface → Trivy vuln/config/secret scan
- Web endpoint checks → built-in SafeUrlScanner after ownership + scope lock
- Fallback → built-in RepoSecurityHeuristics

## Adapters

`src/tools/SecurityToolAdapters.ts`

- `gitleaks detect --no-git --redact --report-format json`
- `semgrep scan --config p/javascript --json`
- `trivy fs --format json --scanners vuln,secret,config`
- timeout + maxBuffer caps
- JSON parsing only
- normalized `Finding[]`
- audit events for status and execution
- no external active web tooling yet

## Telegram

- `/tools` — security tool availability and recommended repo skills
- `/repo_scan` — runs safe repo security suite
- Buttons: Tools Status, Repo Scan

## Active web scanner policy

Nuclei/Nikto/Nmap are intentionally not enabled yet. They require strict scope lock, rate caps, and explicit approval before execution. Built-in SafeUrlScanner remains the only active web check for now.


## Phase 6 install state

Installed user-local under `~/.local/bin` without sudo/system package mutation:

- Gitleaks 8.30.1 (GitHub release tarball, checksum verified)
- Semgrep 1.163.0 (isolated `pip --target` wrapper; no `--break-system-packages`)
- Trivy 0.70.0 (GitHub release tarball, checksum verified)
- Nuclei 3.8.0 (Go user-local install; active execution still disabled in app)
- Nikto present at `/usr/bin/nikto` (execution still disabled in app)
- Nmap 7.94SVN present at `/usr/bin/nmap` (execution still disabled in app)

Smoke evidence:

- Gitleaks executed with JSON report-path and redaction.
- Semgrep executed `p/javascript` rules successfully.
- Trivy executed repo `secret,misconfig` smoke successfully.
- `SecurityToolAdapters.runRepoSuite()` executed Gitleaks, Semgrep, Trivy, and built-in repo heuristics: 16 normalized findings in local smoke.

Safety notes:

- No sudo install.
- No Python externally-managed override.
- Nuclei/Nikto/Nmap remain unavailable from Telegram scan execution until active-scan approval gate lands.
- Gitleaks uses temp report file because current release writes JSON to report path, not stdout.
- Trivy adapter uses `misconfig` (not deprecated `config`) and skips `.git`, `node_modules`, `dist`, and `data`.
