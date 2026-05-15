# Database Hardening

Phase 13 replaces the experimental built-in SQLite runtime with stable `better-sqlite3`.

## Driver

- Runtime driver: `better-sqlite3`
- Removed dependency on the experimental built-in SQLite runtime
- Synchronous store API remains unchanged for orchestrator safety and simple recovery

## Pragmas

PersistentStore enables:

```sql
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;
PRAGMA busy_timeout = 5000;
```

## Compatibility

Existing `DATABASE_URL=file:./data/clawvapt.db` remains supported. Existing SQLite files are opened in-place.

## Verification

Run:

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm run demo
```

Production restart should be preceded by a DB backup:

```bash
cp data/clawvapt.db backups/clawvapt-$(date +%Y%m%d-%H%M%S).db
```
