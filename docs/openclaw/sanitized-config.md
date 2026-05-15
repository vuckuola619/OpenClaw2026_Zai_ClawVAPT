# Sanitized OpenClaw Config Notes

This project uses OpenClaw as the development/operator environment and includes sanitized workspace context under `openclaw-workspace/`.

## Included

- assistant persona principles
- workspace rules
- multi-agent operating model
- safe testing/deployment conventions

## Excluded

- OpenClaw gateway tokens
- Telegram bot token
- Pakasir API key
- private memory files
- chat IDs
- local machine credentials
- any `.env` secret values

## Runtime Configuration

Use `.env.example` for non-secret configuration shape.

Real credentials must be provided via local `.env` or deployment environment variables and must not be committed.
