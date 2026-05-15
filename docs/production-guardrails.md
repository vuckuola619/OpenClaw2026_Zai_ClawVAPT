# Production Guardrails

Implemented controls for ClawVAPT Telegram workflow.

## Abuse controls

- Token-bucket rate limiting per Telegram user.
- Higher command cost for `/scan` and scan callbacks.
- Safe error messages via structured `AppError` codes.

## Target safety

- Only `http://` and `https://` targets are accepted.
- URLs with embedded credentials are blocked.
- Localhost, `.localhost`, `.local`, and private/internal IP ranges are blocked.
- Demo fixture `https://demo-owned-site.local` is explicitly allowed.
- URL fragments are stripped before persistence/scanning.

## Health

- `/health` command and Health button report service status without secrets.
- Checks include Telegram token presence, database path/file, redaction state, and bridge enablement.

## Notes

These controls are deliberately fail-closed. External scanners remain disabled until later phases add strict scope, timeout, and rate caps per tool.
