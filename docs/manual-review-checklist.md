# Manual Review Checklist

Automated scanners cannot close business-logic risk. `/manual_review <job_id>` generates a client-ready checklist for authorized manual validation.

## Covered areas

- Authorization / IDOR
- Business workflow bypass
- Payment / quota / credit integrity
- Tenant isolation
- Rate limits and abuse economics
- AI / prompt / agent misuse

## Rules

- Use authorized test accounts only.
- Use safe test data and test orders.
- Do not perform destructive actions.
- Capture request/response evidence with secrets redacted.
- Treat scanner output as evidence hints, not proof of business-logic safety.

## Output

- Markdown checklist: `reports/<job_id>_manual_review.md`
- Report JSON section: `manual_review_checklist`
- Export bundle includes the checklist alongside PDF, JSON, and redacted audit JSONL.
