# Build Week 4-Hour Execution Plan

Purpose: turn ClawVAPT from working MVP into judge-ready Developer Tools submission before OpenAI Build Week deadline.

Track: Developer Tools

Project angle: Telegram-first multi-agent security triage bot with authorization gates, credit/payment flow, safe scanners, and judge-ready reports.

Hard rule: keep scope frozen. Fix blockers, polish proof, document everything judges need. No large rewrites.

## Success Criteria

- [x] Working project built with Codex/GPT-5.6
- [x] README has install, run, supported platforms, and judge test path
- [x] Devpost fields ready in `submission/devpost-fields.md`
- [x] Demo video URL present and under 3 minutes
- [x] Public repo URL present
- [x] Live/sandbox judge path exists: Telegram `@capithon_bot`
- [x] In-bot judge walkthrough exists: `/judge`
- [x] Local deterministic judge path exists: `npm run demo`
- [x] Sample report artifacts generated
- [x] Codex/GPT-5.6 contribution highlighted
- [ ] `/feedback` Codex session ID pasted into Devpost form

## Phase 0 - Freeze Scope and Verify Repo

Time box: 0:00-0:20

Goal: confirm repo state, identify blockers, and prevent deadline drift.

### Tasks

- [x] Check `git status` and current branch.
- [x] Confirm Build Week requirements from Devpost rules.
- [x] Identify judging track and one-sentence product angle.
- [x] Run verification commands once to find blockers.
- [x] Decide no big rewrite unless tests or demo path fail.

### Acceptance Criteria

- [x] Track selected: Developer Tools.
- [x] Final project angle written in README/submission docs.
- [x] Build/test blockers listed or confirmed absent.
- [x] Dirty files reviewed before final commit.

### Verification

```bash
git status --short
npm run lint
npm run typecheck
npm test
npm run build
npm run demo
```

## Phase 1 - Product Polish With Demo Value

Time box: 0:20-1:20

Goal: make product look alive and credible in a short judging demo.

### Tasks

- [x] Add Telegram scan progress UX with clear phases.
- [x] Show authorization/scope/payment/reporting gates in user-facing flow.
- [x] Keep active web scans behind ownership verification and approval.
- [x] Keep public GitHub repo scans separate from web ownership flow.
- [x] Ensure payment completion works in sandbox/demo mode.
- [x] Ensure reports are sent after scans.

### Acceptance Criteria

- [x] User sees scan progress before report delivery.
- [x] Scan cannot run before authorization gate passes.
- [x] Credit debit and QRIS top-up path are visible.
- [x] Report delivery path produces PDF/JSON/manual-review output.

### Verification

```bash
npm test
npm run demo
```

Manual demo path:

```txt
/start
/judge
/demo
/scan https://demo-owned-site.local
/verify <job_id>
/web_scan <job_id>
/pay
```

## Phase 2 - Submission-Grade Documentation

Time box: 1:20-2:00

Goal: make repo judge-readable without live support from builder.

### Tasks

- [x] Update README with Build Week track, demo URL, live bot, judge path.
- [x] Add supported platforms for developer-tool judging.
- [x] Explain Codex/GPT-5.6 workflow and Build Week extension.
- [x] Create Devpost copy-paste fields.
- [x] Create submission checklist.
- [x] Include sandbox/demo testing instructions.

### Acceptance Criteria

- [x] Judge can run local path from README.
- [x] Judge can use live Telegram sandbox path.
- [x] README explains what was built with Codex/GPT-5.6.
- [x] Devpost form fields are ready to paste.

### Verification

```bash
sed -n '1,220p' README.md
sed -n '1,240p' submission/devpost-fields.md
sed -n '1,200p' submission/SUBMISSION_CHECKLIST.md
```

## Phase 3 - Evidence Pack

Time box: 2:00-2:40

Goal: leave concrete artifacts judges can inspect.

### Tasks

- [x] Generate fresh demo audit log.
- [x] Generate sample PDF report.
- [x] Generate sample JSON report.
- [x] Generate demo transcript.
- [x] Add pitch deck PDF.
- [x] Add final smoke test notes.
- [x] Tighten secret-like detector and avoid leaking sensitive values in artifacts.

### Acceptance Criteria

- [x] `reports/sample_report.pdf` exists.
- [x] `reports/sample_report.json` exists.
- [x] `logs/demo_audit.jsonl` exists after demo.
- [x] `docs/demo-transcript.md` exists.
- [x] `submission/final-smoke-test.md` records final validation.

### Verification

```bash
ls -lh reports/sample_report.pdf reports/sample_report.json logs/demo_audit.jsonl
sed -n '1,220p' docs/demo-transcript.md
sed -n '1,220p' submission/final-smoke-test.md
```

## Phase 4 - Deep Run Test

Time box: 2:40-3:20

Goal: prove project works end-to-end, not only builds.

### Tasks

- [x] Run lint.
- [x] Run typecheck.
- [x] Run full tests.
- [x] Run build.
- [x] Run deterministic demo.
- [x] Start live PM2 bot safely from built `dist`.
- [x] Confirm Telegram `getMe` returns `capithon_bot`.
- [x] Check PM2 logs after startup.

### Acceptance Criteria

- [x] `npm run lint` passes.
- [x] `npm run typecheck` passes.
- [x] `npm test` passes.
- [x] `npm run build` passes.
- [x] `npm run demo` passes.
- [x] PM2 process starts cleanly.
- [x] Telegram bot identity verified.

### Verification

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm run demo
pm2 status
```

## Phase 5 - Final Repo State

Time box: 3:20-3:45

Goal: create clean evidence for submission and prevent accidental omissions.

### Tasks

- [x] Review `git diff`.
- [x] Commit Build Week polish.
- [x] Confirm latest commit is visible locally.
- [x] Keep generated evidence files tracked where useful.
- [ ] Push latest commit if remote auth works and user allows final publish.
- [ ] Confirm GitHub public repo shows latest docs/assets.

### Acceptance Criteria

- [x] Commit exists: `4a55f61 Polish Build Week submission`.
- [x] README and submission docs are included.
- [x] Demo URL and live bot are documented.
- [ ] Remote repo contains final commit.

### Verification

```bash
git log --oneline -5
git status --short
git remote -v
```

## Phase 6 - Devpost Payload

Time box: 3:45-4:00

Goal: finish copy-paste submission payload and identify only manual blocker.

### Tasks

- [x] Prepare project name.
- [x] Prepare short description.
- [x] Prepare long description.
- [x] Prepare category.
- [x] Prepare GitHub URL.
- [x] Prepare demo video URL.
- [x] Prepare testing instructions.
- [x] Prepare AI/Codex usage notes.
- [ ] Paste `/feedback` Codex session ID.
- [ ] Submit Devpost form.

### Acceptance Criteria

- [x] `submission/devpost-fields.md` has all non-secret fields.
- [x] `submission/SUBMISSION_CHECKLIST.md` tracks manual steps.
- [ ] Devpost submission completed.

## Risk Register

| Risk | Impact | Mitigation | Status |
|---|---:|---|---|
| Deadline miss | High | Freeze scope, ship docs/evidence first | Controlled |
| Live Telegram bot fails | High | Provide deterministic `npm run demo` judge path | Controlled |
| Real payment ambiguity | Medium | Use sandbox/demo QRIS flow, document no real payment needed | Controlled |
| Security concern from scanner misuse | High | Ownership gate, approval, scope lock, low-rate profiles | Controlled |
| Secret leakage in sample artifacts | High | Redaction and secret-like detector checks | Controlled |
| Devpost `/feedback` missing | Medium | Leave explicit TODO, user must run `/feedback` | Open |

## Priority If Time Burns

1. README/submission compliance
2. Demo reliability
3. Progress UX polish
4. Commit/push
5. Extra deck polish

## Final Command Checklist

```bash
cd /home/adm-bot/clawthon
npm run lint
npm run typecheck
npm test
npm run build
npm run demo
git status --short
git log --oneline -5
```

## Manual Devpost Checklist

- [ ] Paste project name from `submission/devpost-fields.md`.
- [ ] Paste short/long description from `submission/devpost-fields.md`.
- [ ] Select Developer Tools.
- [ ] Add GitHub URL: `https://github.com/vuckuola619/OpenClaw2026_Zai_ClawVAPT`.
- [ ] Add demo video URL: `https://youtu.be/mupug2vA5Ys`.
- [ ] Add live demo note: Telegram `@capithon_bot`, sandbox/demo mode.
- [ ] Add `/feedback` Codex session ID.
- [ ] Submit before deadline.
