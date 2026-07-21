# ClawVAPT Demo Transcript

## Judge Walkthrough

```txt
/judge
/demo
```

What this proves:

- deterministic sandbox path works without touching an external target
- Telegram UX exposes the product flow through buttons and progress states
- ownership, scope, credits, redaction, and reporting are enforced by backend code
- generated artifacts are ready for judge inspection

## Web Target Flow

```txt
/start
/help
/scan https://demo-owned-site.local/
/verify JOB-8f795d60
/status JOB-8f795d60
/gpt_review JOB-8f795d60
/report JOB-8f795d60
/harden JOB-8f795d60
```

Expected result:

- challenge instructions are shown before scan actions
- verified job locks scope to the target host
- status shows credits, scan usage, severity, and priority lane
- GPT-5.6 advisory pack turns findings into validation plans and remediation tickets
- report command returns PDF and JSON artifacts

## Payment Flow

```txt
/pay
/check_payment CLWV-20260721-5d60
/simulate_payment CLWV-20260721-5d60
```

Expected result:

- QRIS payment card is generated
- sandbox completion credits the account idempotently

Reports: reports/sample_report.json, reports/sample_report.pdf
Safety: ownership verified, scope locked, explicit approvals required for active scans, secrets redacted.
