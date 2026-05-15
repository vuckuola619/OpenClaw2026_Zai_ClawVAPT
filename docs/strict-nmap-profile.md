# Strict Nmap Profile

`/nmap_scan <job_id>` adds a conservative network-port visibility profile for verified jobs.

## Required gates

- Job must exist.
- Ownership must be verified.
- Scope must be locked.
- Target host must equal locked scope host.
- User must press explicit `I Agree + Approve Strict Nmap` callback.
- Per user + scope rate limit applies.

## Allowed behavior

- Single locked host only.
- TCP connect scan only (`-sT`) so root/raw packet privileges are not required.
- Low timing (`-T2`), low max rate, one retry, host timeout.
- Limited TCP port list from `NMAP_STRICT_PORTS` or default: `80,443,8080,8443,3000,5000,8000,9000`.
- XML output parsed into normalized findings.

## Explicitly blocked / not used

- UDP scanning.
- Broad ranges or CIDR sweeps.
- OS detection.
- NSE vuln/brute/default-login scripts.
- Firewall evasion, decoys, spoofing, fragmentation, idle scan.
- Aggressive timing.

## Reporting

Strict Nmap findings persist as `scan_runs.profile = nmap-strict` and flow into `/status`, `/report`, and `/export` with `redaction_applied: true`.
