# Pre-Requisites

## Server Path

All project work must happen under:

```bash
/home/adm-bot/clawthon/
```

Runtime env file:

```bash
/home/adm-bot/clawthon/.env
```

Do not commit `.env`.

## Required Server Packages

Minimum:

```bash
sudo apt update
sudo apt install -y git curl ca-certificates build-essential jq
```

Recommended:

```bash
sudo apt install -y docker.io docker-compose-plugin
```

Node.js runtime:

```bash
node --version
npm --version
```

Target versions:

- Node.js 20+
- npm 10+
- Docker Engine installed
- Docker Compose plugin installed

## Required Credentials

Store only in `/home/adm-bot/clawthon/.env` or GitHub Secrets.

```env
TELEGRAM_BOT_TOKEN=
GITHUB_TOKEN=
GITHUB_OWNER=vuckuola619
GITHUB_REPO=clawthon
PAYMENT_PROVIDER=pakasir
PAKASIR_MODE=sandbox
PAKASIR_SLUG=
PAKASIR_API_KEY=
PAKASIR_DEFAULT_METHOD=qris
PAKASIR_BASE_URL=https://app.pakasir.com
DATABASE_URL=file:./data/clawvapt.db
SCANNER_MODE=builtin
EXTERNAL_SCANNER_MODE=optional
DEMO_MODE=true
LOG_REDACTION=true
PROJECT_ROOT=/home/adm-bot/clawthon
REPORT_DIR=/home/adm-bot/clawthon/reports
AUDIT_LOG_PATH=/home/adm-bot/clawthon/logs/audit.jsonl
DEMO_AUDIT_LOG_PATH=/home/adm-bot/clawthon/logs/demo_audit.jsonl
```

Optional internal ops bot tokens:

```env
TELEGRAM_TRUST_OPS_BOT_TOKEN=
TELEGRAM_SECURITY_OPS_BOT_TOKEN=
TELEGRAM_TRUST_OPS_CHAT_ID=
TELEGRAM_SECURITY_OPS_CHAT_ID=
```

## GitHub Token Minimum Scope

For hackathon PAT fallback:

- Repository selected: `vuckuola619/clawthon`
- Contents: read/write
- Pull requests: read/write
- Issues: read/write
- Actions: read where possible

Do not use a broad account-wide token unless unavoidable.

## Pakasir Setup

Required from Pakasir project:

- `PAKASIR_SLUG`
- `PAKASIR_API_KEY`
- Sandbox mode enabled if testing

Pakasir payment can be initiated from Telegram by sending a payment URL to the user. The backend must still validate payment via Transaction Detail API before adding credits.

## Optional Open-Source Security Tools

Production-grade external scanner adapters should be optional and safely wrapped. The demo must still work without them.

Recommended installation methods:

```bash
# Gitleaks via Docker or binary
# Trivy via package or Docker
# Semgrep via pipx/pip/Docker
# Nuclei via Go/binary/Docker
# ZAP via Docker image
# OSV-Scanner via binary
# Checkov via pipx/pip/Docker
# Syft/Grype via binary/Docker
# Lynis via apt/git
```

If a tool is unavailable, ClawVAPT must:

1. Mark the adapter as `INCOMPLETE` or `MOCK`.
2. Continue with built-in safe scanner.
3. Log the exact tool availability status.
4. Never fake external tool output as real.

