# SQLite Persistence

ClawVAPT persists runtime state so Telegram jobs, payment credits, and reports survive PM2 restarts.

## Database

Configured by `DATABASE_URL` (default `file:./data/clawvapt.db`). The app uses Node.js built-in SQLite runtime (`node:sqlite`) to avoid adding native npm dependencies.

## Tables

- `jobs` — scan job state, scope lock, findings, order id
- `quotas` — per-user scan count and credits
- `orders` — Pakasir order status and credited flag
- `reports` — JSON/PDF report paths

## Recovery behavior

On `MainOrchestrator` startup:

1. Loads jobs into memory.
2. Loads quotas into `QuotaStore`.
3. Loads report paths for `/report`.
4. Loads credited orders to prevent duplicate credit grants.

## Telegram UX

- `/my_jobs` lists persisted jobs for the Telegram user.
- `/latest` shows latest persisted job status.
- Inline buttons include **My Jobs** and **Latest**.

## Payment safety

Credits are idempotent by order id. If a paid Pakasir order was already credited before restart, future `/check_payment` returns `alreadyCredited=true` and adds `0` credits.
