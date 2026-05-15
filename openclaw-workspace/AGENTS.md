# AGENTS.md — Sanitized Workspace Rules

This document describes the workspace conventions used to build ClawVAPT with OpenClaw.

## Workspace Goals

- Build a Telegram-first VAPT assistant.
- Keep all scan flows authorization-gated.
- Maintain reproducible docs, tests, and deployment steps.
- Keep hackathon/demo assets close to the codebase.

## Project Workflow

1. Read project docs and current code before editing.
2. Make the smallest safe change.
3. Run a meaningful gate:
   - `npm run lint`
   - `npm run typecheck`
   - targeted tests
   - `npm run build`
4. Commit with a clear message.
5. Push only after explicit approval.
6. Update docs when product behavior changes.

## Safety Rules

- Never commit credentials.
- Never print or upload `.env` contents.
- Never run destructive commands without explicit approval.
- Never scan targets without ownership verification and explicit scan approval.
- Public GitHub repo scans must not use private tokens or clone credentials.

## Documentation Pattern

- `README.md` — clean product documentation.
- `docs/` — technical implementation notes.
- `submission/` — pitch deck, demo script, Devpost fields.
- `openclaw-workspace/` — sanitized OpenClaw operating context.

## Testing Expectations

Before claiming a feature is done, run at least:

```bash
npm run typecheck
npm run build
```

When possible, also run:

```bash
npm run lint
npx tsx --test tests/core.test.ts tests/telegram.test.ts
```

## Deployment Notes

ClawVAPT can run via:

```bash
npm run build
npm start
```

or PM2:

```bash
pm2 start "node dist/src/index.js" --name clawthon
```
