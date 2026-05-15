# Production Cleanup

Phase 11 adds operator-safe artifact cleanup.

## Commands

```text
/cleanup_preview [ttl_days]
/cleanup_apply [ttl_days]
```

`/cleanup_preview` is dry-run only. `/cleanup_apply` deletes only matched generated artifacts older than TTL.

## Operator gate

Set `OPERATOR_USER_IDS` to comma-separated Telegram user IDs. If unset, cleanup commands are denied.

## Cleanup scope

Allowed deletion targets only:

- `reports/JOB-*_report.json`
- `reports/JOB-*_report.pdf`
- `reports/JOB-*_manual_review.md`
- `patches/JOB-*_remediation.patch`
- `data/repos/JOB-*` directories

Protected:

- `sample_report.*`
- audit logs
- database files
- arbitrary paths outside configured roots

## Audit

Cleanup preview/apply writes redacted audit JSONL events through `CleanupService` with candidate count, deleted count, TTL, and total bytes.
