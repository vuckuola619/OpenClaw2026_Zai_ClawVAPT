# Real Target and GitHub Repo Flow

The demo buttons are sandbox-only. Real usage is command-driven so the operator can provide an actual web URL and GitHub repo.

## Real web target

```text
/scan https://app.example.com
/verify JOB-xxxx
/web_scan JOB-xxxx
/web_scan_deep JOB-xxxx
```

`/scan` creates a real job for the given public http(s) URL. Scanner execution remains blocked until ownership verification and scope lock.

## Attach GitHub repo

```text
/connect_repo JOB-xxxx https://github.com/owner/repo
/repo_scan JOB-xxxx
/repo_scan_deep JOB-xxxx
```

`/connect_repo` shallow-clones the GitHub repo into `data/repos/<job_id>` and stores repo URL/path/commit on the job. Repo scans then run against that cloned repo, not the ClawVAPT backend repo.

## Reports and export

```text
/status JOB-xxxx
/report JOB-xxxx
/export JOB-xxxx
```

Scan results are persisted into SQLite `scan_runs` with scan type, profile, tools, findings, approval metadata, and timestamp. `/report` regenerates the latest combined JSON/PDF report. `/export` sends PDF, JSON, and redacted audit JSONL bundle.

Reports include scope, web target, GitHub repo/commit, safe/deep profiles, tool matrix, severity summary, findings, and remediation priorities.

## Demo / sandbox

- `Demo / Sandbox` remains available for deterministic QA only.
- It uses `https://demo-owned-site.local` and generated sample reports.
- It is intentionally separated from the real flow.

## Safety

- Only `https://github.com/owner/repo` or `owner/repo` inputs are accepted.
- URL credentials are blocked.
- Clone failures return safe errors.
- No GitHub tokens are logged.
