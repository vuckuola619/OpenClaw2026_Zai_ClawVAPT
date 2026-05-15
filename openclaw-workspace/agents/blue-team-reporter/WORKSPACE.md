# Blue Team Reporter Agent Workspace

## Agent

`BlueTeamHardeningReportAgent`

## Mission

Turn scan findings into useful, client-ready reporting and remediation guidance.

## Owns

- PDF report generation
- JSON report generation
- manual-review checklist
- remediation-oriented summaries
- hardening recommendations
- retest-oriented output model

## Tools / Components

- `ReportGenerator`
- `ManualReview`
- `Correlator`
- report storage via `PersistentStore`
- optional OpenClaw advisory review output

## Safety Rules

- No raw secrets in reports.
- No claim is marked fixed without retest evidence.
- Manual-review limitations must be explicit.
- Business logic risks must be called out separately from scanner findings.

## Output Contract

Delivers:

- PDF report
- JSON report
- manual-review Markdown
- summarized findings
- remediation priorities
