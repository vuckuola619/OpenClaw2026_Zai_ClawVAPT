# Demo

Run:

```bash
npm run demo
```

Telegram flow to show:

```txt
/start
/help
/demo
/scan https://demo-owned-site.local
/verify <job_id>
/status <job_id>
/report <job_id>
/harden <job_id>
/pay
/check_payment <order_id>
/simulate_payment <order_id>
```

Expected artifacts:

- `reports/sample_report.pdf`
- `reports/sample_report.json`
- `logs/demo_audit.jsonl`
- `docs/demo-transcript.md`
- `patches/<job_id>_remediation.patch`
