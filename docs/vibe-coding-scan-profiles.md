# Vibe Coding Scan Profiles

ClawVAPT supports safe and deep scanning for AI/vibe-coded applications.

## Why profiles?

Vibe-coded apps often ship fast and miss hidden security basics:

- broken access control / IDOR
- weak auth and JWT handling
- missing input validation
- exposed secrets in generated config
- risky dependencies
- Docker/IaC insecure defaults
- business logic gaps scanners cannot fully prove

Profiles keep scan depth intentional instead of noisy or unsafe.

## Repo profiles

### Safe repo scan

Command: `/repo_scan`

Runs:

- Gitleaks secret scan
- Semgrep JavaScript SAST
- Trivy vuln/secret/misconfig
- Built-in repo heuristics

Use for quick checks during coding.

### Deep repo scan

Command: `/repo_scan_deep`

Runs:

- Gitleaks secret scan
- Semgrep configs:
  - `p/javascript`
  - `p/typescript`
  - `p/owasp-top-ten`
  - `p/jwt`
- Trivy vuln/secret/misconfig with dev dependencies included
- Built-in repo heuristics

Use before release, handoff, or client delivery.

## Web profiles

### Safe web scan

Command: `/web_scan <job_id>`

Low-noise headers + Nuclei safe templates.

### Deep web scan

Command: `/web_scan_deep <job_id>`

Enterprise non-destructive profile with Nuclei deep + Nikto controlled profile. Requires verified ownership, locked scope, and explicit approval.

## Still manual

For enterprise VAPT, manually review:

- authorization boundaries
- tenant isolation
- payment/business logic
- prompt/API misuse
- role transitions
- sensitive data lifecycle

Scanners support evidence gathering; they do not replace logic review.
