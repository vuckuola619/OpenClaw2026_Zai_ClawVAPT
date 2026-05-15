# Deployment Runbook

## Project Path

```bash
cd /home/adm-bot/clawthon/
```

## Files That Must Exist

```txt
.env
.env.example
Dockerfile
docker-compose.yml
package.json
tsconfig.json
README.md
DEMO.md
SECURITY.md
docs/openclaw/
reports/
logs/
```

## Prepare Env

Create runtime env:

```bash
nano /home/adm-bot/clawthon/.env
```

Minimum `.env`:

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

Protect env file:

```bash
chmod 600 /home/adm-bot/clawthon/.env
```

## Local Build

```bash
cd /home/adm-bot/clawthon
npm install
npm run lint
npm run typecheck
npm test
npm run build
npm run demo
```

## Docker Compose

```bash
cd /home/adm-bot/clawthon
docker compose config
docker compose build
docker compose up -d
docker compose logs --tail=200
```

## Telegram Verification

In Telegram bot:

```txt
/start
/help
/demo
```

Then test payment flow:

```txt
/pay
/check_payment <order_id>
/simulate_payment <order_id>
```

## Deployment Health Checks

Expected:

- app process running
- Telegram bot responds
- reports directory writable
- logs directory writable
- `/demo` produces report and audit log
- payment adapter creates URL
- secrets not printed in logs

## Rollback

```bash
cd /home/adm-bot/clawthon
git log --oneline -10
git checkout <last-good-commit>
npm install
npm run build
docker compose build
docker compose up -d
```

## Production-Readiness Notes

For hackathon, this is a production-style isolated deployment. It is not a guaranteed production SaaS until these are added:

- durable database
- RBAC
- encrypted secret store
- webhook signature/verification strategy if provider supports it
- multi-tenant isolation
- monitoring and alerting
- data retention policy
- incident response runbook
- backup and restore procedure

