# Active Web Scanner Gate

Phase 7 adds a fail-closed active web scanning gate.

## Telegram flow

- `/web_scan <job_id>` previews active scan profile only.
- User must tap **Approve Active Web Scan**.
- Callback executes `activeweb:<job_id>`.

## Required gates

Execution requires all conditions:

1. Job exists.
2. Ownership verified.
3. Scope locked.
4. Target host equals locked scope host.
5. Explicit callback approval.
6. Per-user + per-scope active scan rate limit.

If any check fails, scan stops before Nuclei execution.

## Enabled scanners

- `SafeUrlScanner` headers-only check.
- `NucleiSafeProfile` only:
  - severity: `info,low,medium`
  - tags: `tech,headers,misconfig,exposure,ssl,tls,http`
  - excluded tags: `intrusive,dos,fuzz,rce,sqli,lfi,ssrf,xss,bruteforce,default-login,wordpress,kev,cve`
  - excluded severity: `high,critical,unknown`
  - rate limit default: 3 req/s
  - concurrency default: 2
  - retries: 0
  - update check disabled

## Still disabled

- Nikto: installed/status-only, not executable from Telegram yet.
- Nmap: installed/status-only, not executable from Telegram yet.

## Audit

Events:

- `active_web_scan_start`
- `active_web_scan_complete`

All evidence is redacted. No raw response bodies or secrets are sent to Telegram.
