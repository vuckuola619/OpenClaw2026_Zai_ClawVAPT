# Open-Source Security Tools Stack

This page defines the production-grade open-source security tooling strategy for ClawVAPT. These tools are not used for uncontrolled offensive behavior. They are wrapped by safety gates, run only on verified-owned scope, and normalized before reporting.

## Tooling Principles

- Built-in scanner must work without external tools.
- External tools are optional adapters.
- External tool failure must not break the deterministic demo.
- Every external tool run must be logged.
- Raw output must be normalized and redacted.
- Tool output must not go directly to Telegram/PDF.
- Active/destructive scanning must be disabled unless explicit safe lab mode is enabled.

## Tool Matrix

| Tool | Purpose | Agent | MVP Mode | Enterprise Mode |
|---|---|---|---|---|
| OWASP ZAP | DAST/passive web assessment | RedTeamRepoScannerAgent | optional adapter, baseline/passive | ZAP automation YAML with safe jobs |
| Nuclei | Template-based checks | RedTeamRepoScannerAgent | safe template subset | curated templates, CI regression |
| testssl.sh | TLS checks | RedTeamRepoScannerAgent | optional | full TLS baseline report |
| Semgrep | SAST/code patterns | RedTeamRepoScannerAgent | optional adapter | CI SAST with curated rules |
| Gitleaks | Secret scanning | RedTeamRepoScannerAgent | optional adapter | CI secret scanning + redacted reports |
| Trivy | Vulnerabilities, IaC, secrets, container scanning | RedTeamRepoScannerAgent | optional adapter | CI/CD scanning, SBOM support |
| OSV-Scanner | Dependency vulnerabilities | RedTeamRepoScannerAgent | optional adapter | lockfile scanning in CI |
| Checkov | IaC misconfiguration | RedTeamRepoScannerAgent / HardeningAgent | optional | Terraform/K8s/Docker/IaC policy-as-code |
| Syft | SBOM generation | BlueTeamHardeningReportAgent | optional | SBOM artifact generation |
| Grype | SBOM/filesystem vulnerability scan | RedTeamRepoScannerAgent | optional | SBOM-based vulnerability scanning |
| Lynis | Linux audit/hardening | BlueTeamHardeningReportAgent | PLAN_ONLY | approved server hardening audit |
| OpenSCAP | Compliance/security baseline | BlueTeamHardeningReportAgent | FUTURE | compliance baseline scan/remediation |

## Why These Tools Are Credible

- OWASP ZAP has an Automation Framework that controls ZAP via YAML and supports jobs such as passive scan, report generation, and exit status logic.
- Nuclei is a YAML-template based vulnerability scanner with CI/CD integration and output customization.
- Trivy supports targets such as container image, filesystem, code repository, Kubernetes and SBOM, and scanners for vulnerability, misconfiguration, secret, and license concerns.
- Gitleaks is designed to detect secrets in git repositories, directories, files, and stdin, and supports JSON/SARIF-like reporting and redaction.
- OSV-Scanner is an officially supported frontend to the OSV database for finding dependency vulnerabilities and can run as CLI or CI/CD tool.
- Checkov scans cloud/IaC configuration for misconfigurations before deployment and supports Terraform, CloudFormation, Kubernetes, Helm, ARM, Serverless, and AWS CDK.

## Adapter Interface

Every external tool adapter must implement:

```ts
export interface SecurityToolAdapter {
  name: string;
  isAvailable(): Promise<boolean>;
  run(input: ToolRunInput): Promise<ToolRunResult>;
  normalize(raw: unknown): Promise<NormalizedFinding[]>;
}
```

## Safe Tool Runner

All external tool execution must pass through `ExternalSecurityToolRunner`.

Requirements:

```txt
- validate job_id exists
- validate ownership verified
- validate scope locked
- validate target allowed
- set timeout
- set memory/process limit where possible
- store raw output under ignored runtime directory only
- normalize output
- redact secrets
- write audit log
- return structured findings
```

## Adapter Execution Policy

### OWASP ZAP

Allowed MVP use:

```txt
- passive scan
- baseline scan
- report generation
- no active scan by default
```

Forbidden by default:

```txt
- activeScan job against non-lab target
- fuzzing
- forced browsing beyond allowed scope
```

### Nuclei

Allowed MVP use:

```txt
- safe templates only
- severity filter: info/low/medium/high as configured
- no exploit-heavy templates
- no out-of-scope targets
```

Required safeguards:

```txt
- template allowlist
- rate limit
- host allowlist
- JSON output
```

### Semgrep

Allowed MVP use:

```txt
- repo code scan
- security rules
- JSON/SARIF output
- no secret values in report
```

### Gitleaks

Allowed MVP use:

```txt
- scan repo working tree or current git history
- use --redact where possible
- normalize secret findings to hash/fingerprint only
```

### Trivy

Allowed MVP use:

```txt
- trivy fs .
- trivy config .
- trivy repo <repo> only if authorized
- JSON output
```

### OSV-Scanner

Allowed MVP use:

```txt
- lockfile/package manifest scanning
- CI dependency vulnerability checks
```

### Checkov

Allowed MVP use:

```txt
- IaC scan only
- JSON output
- Dockerfile/K8s/Terraform if present
```

### Syft + Grype

Allowed MVP use:

```txt
- Syft generates SBOM
- Grype scans SBOM
- results normalized into dependency findings
```

### Lynis

Allowed MVP use:

```txt
- hardening add-on PLAN_ONLY
- demo server only unless explicitly approved
- no automatic lockout-risk changes
```

## Report Disclosure

Reports must show:

- Tool name
- Version if available
- Execution mode: `BUILTIN`, `EXTERNAL`, `MOCK`, or `INCOMPLETE`
- Scope
- Exclusions
- Limitations
- Redaction applied

## Required Files

```txt
src/tools/ExternalSecurityToolRunner.ts
src/tools/adapters/ZapAdapter.ts
src/tools/adapters/NucleiAdapter.ts
src/tools/adapters/SemgrepAdapter.ts
src/tools/adapters/GitleaksAdapter.ts
src/tools/adapters/TrivyAdapter.ts
src/tools/adapters/OsvScannerAdapter.ts
src/tools/adapters/CheckovAdapter.ts
src/tools/adapters/SyftAdapter.ts
src/tools/adapters/GrypeAdapter.ts
src/tools/adapters/LynisAdapter.ts
```

For hackathon, not all adapters must be fully real. Each must be marked clearly:

- `DONE`
- `MOCK`
- `INCOMPLETE`
- `FUTURE`

## References

- OWASP ZAP Automation Framework: https://www.zaproxy.org/docs/automate/automation-framework/
- Nuclei docs: https://docs.projectdiscovery.io/opensource/nuclei/overview
- Trivy docs: https://trivy.dev/docs/latest/guide/
- Gitleaks: https://github.com/gitleaks/gitleaks
- OSV-Scanner: https://google.github.io/osv-scanner/
- Checkov: https://www.checkov.io/

