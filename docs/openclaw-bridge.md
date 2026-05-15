# OpenClaw Bridge

ClawVAPT can route sanitized agent events from `@capithon_bot` to the local OpenClaw Gateway without sharing the OpenClaw Telegram bot token.

## Data path

```txt
@capithon_bot -> clawthon Node adapter -> MultiAgentEngine -> OpenClawBridge -> ws://127.0.0.1:18789 chat.send
```

## Security posture

- Disabled by default: `OPENCLAW_BRIDGE_ENABLED=false` unless explicitly enabled.
- Loopback only: bridge refuses non-loopback Gateway URLs.
- Separate tokens: Telegram bot token is never reused for OpenClaw.
- Least privilege: requests use `operator.read` + `operator.write`, not `operator.admin`.
- No external action authority: bridge prompt is advisory and says not to execute external actions.
- Redaction: common Telegram/GitHub/API key/password patterns are redacted before Gateway send.
- Fail-safe: bridge failure does not block ownership checks, scanning, reporting, or payment flow.
- Audit: every bridge attempt writes `openclaw_bridge` JSONL event with `DONE`, `MOCK`, or `ERROR`.

## Required env

```env
OPENCLAW_BRIDGE_ENABLED=true
OPENCLAW_GATEWAY_URL=ws://127.0.0.1:18789
OPENCLAW_GATEWAY_TOKEN=<token>
OPENCLAW_BRIDGE_TIMEOUT_MS=8000
```

## Production notes

Keep Gateway loopback-bound. Do not expose the Gateway directly to the internet for this bridge. Use a separate Telegram token for ClawVAPT and keep OpenClaw's existing Telegram bot token untouched.
