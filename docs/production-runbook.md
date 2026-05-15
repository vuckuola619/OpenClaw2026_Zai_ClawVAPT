# ClawVAPT Production Runbook

Phase 14 finalizes operator-facing production ops.

## Daily checks

```text
/ops
/health
/tools
/cleanup_preview 14
```

Expected:

- `/ops` status is `ok`
- database present and non-zero size
- job/scan/report/order counts sane
- reports/logs/patches/data/backups dirs present
- `/health` token/redaction/database checks ok

## Backup

Operator command:

```text
/backup_now
```

The bot creates a SQLite backup under `BACKUP_DIR` or `backups/` and records an audit event.

Manual equivalent:

```bash
mkdir -p backups
node -e "import('./dist/src/core/PersistentStore.js').then(async ({PersistentStore})=>{const s=new PersistentStore(); await s.backupTo('backups/manual.db')})"
```

## Retention

Preview first:

```text
/cleanup_preview 14
```

Apply only after preview looks safe:

```text
/cleanup_apply 14
```

Cleanup can remove only generated job artifacts and repo cache dirs. It does not remove audit logs, DB files, sample reports, or arbitrary paths.

## End-to-end smoke

1. `/menu`
2. `/scan https://target.example`
3. `/challenge JOB-xxxx`
4. Add HTTP or DNS proof
5. `/verify JOB-xxxx`
6. `/connect_repo JOB-xxxx https://github.com/owner/repo`
7. `/repo_scan JOB-xxxx`
8. `/web_scan JOB-xxxx` then approve agreement
9. `/status JOB-xxxx`
10. `/manual_review JOB-xxxx`
11. `/report JOB-xxxx`
12. `/export JOB-xxxx`
13. `/ops`
14. `/backup_now`
15. `/cleanup_preview 14`

## UX rules

- Old Telegram inline buttons are immutable; `/menu` always sends the current menu.
- Long messages are split before Telegram's hard limit and buttons attach to the final chunk.
- Operator-only commands fail safe if `OPERATOR_USER_IDS` is unset or user ID is not listed.

## Rollback

1. Restore previous git commit.
2. `npm ci && npm run build`.
3. Stop process only if explicitly intended; otherwise use PM2 restart.
4. Restore DB from latest backup if schema/data rollback is needed.
5. Verify `/health`, `/ops`, `/menu`, and `/status <known_job>`.
