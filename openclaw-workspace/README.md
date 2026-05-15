# OpenClaw Workspace Config (Sanitized)

This folder contains the non-credential OpenClaw workspace context used while building ClawVAPT.

It is intentionally safe to publish:

- no bot tokens
- no API keys
- no private memory
- no Telegram chat IDs
- no local credentials
- no personal secrets

These files document the agent persona, workspace conventions, and multi-agent project operating model so judges can understand how the project was built and operated with OpenClaw.

## Files

- `SOUL.md` — sanitized assistant persona and operating principles.
- `AGENTS.md` — sanitized workspace rules and project workflow.
- `MULTI_AGENT_WORKSPACE.md` — how OpenClaw workspace conventions map to ClawVAPT's product agents.

Runtime credentials belong in `.env` and must never be committed.
