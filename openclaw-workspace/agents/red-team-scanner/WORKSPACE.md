# Red Team Scanner Agent Workspace

## Agent

`RedTeamRepoScannerAgent`

## Mission

Run safe, bounded security checks and convert raw tool output into redacted findings.

## Owns

- safe web scan profile
- deep non-destructive web scan profile
- strict Nmap profile
- standalone public GitHub repo scan
- external scanner adapter orchestration
- findings normalization
- sensitive evidence redaction

## Tools / Components

- `ActiveWebScanner`
- `SecurityToolAdapters`
- `GitHubRepoConnector`
- built-in URL/repo checks
- optional Gitleaks, Semgrep, Trivy, Nuclei, Nikto, Nmap, OSV-Scanner, Checkov, Syft, Grype, Lynis, testssl.sh, OWASP ZAP

## Safety Rules

- No destructive payloads.
- No brute force or credential stuffing.
- No data exfiltration.
- No out-of-scope crawling.
- Public GitHub scan only; no private token clone.
- Raw secrets must be redacted before reporting.

## Output Contract

Produces normalized findings with:

- severity
- title
- description
- redacted evidence
- remediation hint
- source
