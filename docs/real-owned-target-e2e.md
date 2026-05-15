# Real Owned-Target E2E

This is the no-mock, no-hardcoded production validation path.

## Hard rules

The runner refuses to run when:

- `REAL_E2E_TARGET_URL` is missing
- `REAL_E2E_REPO_URL` is missing
- operator ID is missing
- target is `demo-owned-site.local`
- target is `example.com`, `example.org`, or `example.net`
- repo is not GitHub `owner/repo` or `https://github.com/owner/repo`
- live HTTP/DNS ownership proof is absent

## Required env

```bash
REAL_E2E_TARGET_URL=https://your-owned-domain.com
REAL_E2E_REPO_URL=https://github.com/owner/repo
REAL_E2E_OPERATOR_ID=663952250
REAL_E2E_JOB_ID=                 # set after first challenge run to reuse same token
REAL_E2E_REPO_PROFILE=safe        # safe|deep
REAL_E2E_WEB_PROFILE=safe         # safe|deep
REAL_E2E_APPROVE_ACTIVE_SCAN=true # required for active web scan
REAL_E2E_APPROVE_NMAP=false       # set true only when you want strict Nmap
```

## Run

```bash
npm run real:e2e
```

First run usually fails with `REAL_E2E_OWNERSHIP_PROOF_REQUIRED` and prints the exact HTTP/DNS challenge.

Add one proof:

HTTP:

```text
https://your-owned-domain.com/.well-known/clawvapt/<token>.txt
```

Body must be exactly the token.

DNS:

```text
_clawvapt.your-owned-domain.com TXT <token>
```

Then rerun with the printed job id so the same challenge token is reused:

```bash
REAL_E2E_JOB_ID=JOB-xxxx npm run real:e2e
```

## Output

Real artifacts:

- `reports/<job_id>_report.json`
- `reports/<job_id>_report.pdf`
- `reports/<job_id>_real_e2e_summary.json`
- persistent DB job + scan runs
- audit JSONL events

Summary includes:

- `mock: false`
- `hardcodedTarget: false`
- verification method
- repo commit
- repo findings
- web findings
- Nmap findings when enabled
- report paths

## Recommended real sequence

1. Set env with owned target + owned/authorized GitHub repo.
2. Run `npm run real:e2e` to get challenge.
3. Add HTTP or DNS proof.
4. Run `npm run real:e2e` again.
5. Review report JSON/PDF.
6. Use `/ops`, `/backup_now`, `/cleanup_preview 14` after run.
