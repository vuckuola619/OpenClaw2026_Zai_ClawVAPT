# Enterprise Deep Web Scan Profile

Deep scanning is supported, but not by enabling every excluded class. Enterprise-grade scanning uses risk profiles and guardrails.

## Why not enable every excluded tag?

These remain blocked by default even in deep mode:

- `dos` — can degrade or crash production targets.
- `fuzz` — noisy, unpredictable input volume.
- `bruteforce` / `default-login` — authentication attack behavior.
- `rce` / `destructive` — can execute payloads or trigger dangerous behavior.
- `ssrf` / `lfi` — can touch internal services or sensitive local files.
- `intrusive` — templates explicitly marked as intrusive.

Enterprise quality means controlled coverage, not all-on scanning.

## Profiles

### Safe

Command: `/web_scan <job_id>`

- SafeUrlScanner headers-only.
- Nuclei low-noise templates.
- Severity: info, low, medium.
- Excludes CVE/KEV and injection tags.

### Deep

Command: `/web_scan_deep <job_id>`

Requires same hard gates:

1. Ownership verified.
2. Scope locked.
3. Target host equals locked scope host.
4. Explicit approval button.
5. Per user + scope rate limit.

Deep profile enables:

- SafeUrlScanner.
- NucleiDeepProfile:
  - severity: info, low, medium, high, critical
  - tags: tech, headers, misconfig, exposure, ssl, tls, http, cve, kev, xss, sqli
  - rate limit: 1 req/s
  - concurrency: 1
  - retries: 0
- NiktoDeepProfile:
  - controlled tuning: `1235bde`
  - pause: 1 second
  - timeout: 8 seconds
  - text output parsed into normalized findings

Nmap remains disabled until a strict network scan profile exists.

## Reporting expectations

Deep scan findings are normalized into the existing `Finding[]` schema with redacted evidence. Raw response bodies and secrets are not sent to Telegram.


## Risk model and approval agreement

Risky means operational impact risk, not merely authorization status.

Even in a valid authorized environment, deeper scanners can:

- generate large access logs
- trigger WAF/SIEM/EDR alerts
- create 4xx/5xx application errors
- hit expensive endpoints repeatedly
- trigger rate limits or lockout controls if misconfigured
- expose fragile staging/dev services

ClawVAPT therefore requires explicit approval + agreement before active web scanning. The Telegram approval button states that the user confirms:

1. the target is authorized for testing,
2. they have permission to scan,
3. they accept scan noise/logging risk,
4. ClawVAPT must stay inside locked scope.

Deep mode is enterprise-grade but non-destructive. It still blocks DoS, fuzzing, brute force, default-login, destructive RCE, SSRF, and LFI by default. Those classes require a future lab-only profile with stronger written authorization and isolated target controls.
