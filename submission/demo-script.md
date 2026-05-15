# ClawVAPT Demo Video Script — 2 Minutes

Video title: `OpenClaw2026_Zai_ClawVAPT`
Target duration: 1:45–2:00
Format: screen recording Telegram bot + quick report preview.

## Recording Setup

- Open Telegram chat with ClawVAPT bot.
- Keep browser/file viewer ready for PDF report preview if needed.
- Use zoom large enough so text is readable.
- Speak fast but clear.
- Do not show secrets, `.env`, tokens, or server logs.

## Storyline

**Opening line (0:00–0:10)**

> “ClawVAPT is a Telegram-first multi-agent VAPT assistant. It verifies target ownership, locks scope, checks credits, runs safe scanners, and returns reports automatically.”

Show `/start` or menu.

---

## Scene 1 — Agent Architecture & Web Flow (0:10–0:35)

Show menu and say:

> “The workflow is run by three agents: Trust Verifier for ownership and payments, Red Team Scanner for web/repo checks, and Blue Team Reporter for reports and manual review.”

Show commands or existing verified job:

```txt
/scan https://demo-owned-site.local
/verify JOB-xxxx
```

If recording live with existing job, show `/my_jobs` or `/latest` instead of creating new proof.

Key point to say:

> “No verified ownership means no web scan. This prevents accidental or unauthorized scanning.”

---

## Scene 2 — Active Web Scan + Reports (0:35–1:05)

Run or show existing active web scan flow:

```txt
/web_scan JOB-xxxx
```

Show approval screen:

- explicit agreement
- safe profile
- cost
- scope host

Tap approve if using demo-safe target.

Say:

> “Before running tools, the orchestrator checks scope, scan limit, and credits. After completion it sends PDF, JSON, and manual review reports automatically.”

Show report files delivered in Telegram.

---

## Scene 3 — Standalone GitHub Repo Scan (1:05–1:30)

Run or show:

```txt
/repo_scan https://github.com/vuckuola619/sehatai-health-companion
```

Expected if already scanned:

- bot says repo already scanned
- sends existing report

Say:

> “GitHub repo scan is standalone, public repo only, one scan per repo per account, and costs 25 credits.”

Show report delivery.

---

## Scene 4 — QRIS Payment Flow (1:30–1:50)

Run:

```txt
/pay
```

Show QRIS image embedded in Telegram.

Tap:

```txt
Complete QRIS Payment
```

Say:

> “Payments are part of the agent workflow. In sandbox, Complete QRIS Payment simulates payment and credits the account idempotently.”

Show credits `+10` message.

---

## Closing (1:50–2:00)

> “ClawVAPT combines autonomous agents, safe tool use, Telegram UX, QRIS payments, and client-ready security reports. Dashboard UI and GitHub App private repo support are next on the roadmap.”

End on bot menu or README/GitHub page.

## Must Show On Screen

- Telegram menu
- ownership/scope or verified job
- active scan approval
- report files delivered
- GitHub repo scan/report
- QRIS image
- simulated payment success
- credits updated

## Avoid

- Long terminal shots
- raw scanner logs
- secrets/env files
- explaining every command
- over 2 minutes
