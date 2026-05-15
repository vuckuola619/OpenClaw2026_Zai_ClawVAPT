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
