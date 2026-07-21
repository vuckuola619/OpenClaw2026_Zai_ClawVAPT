# Final Smoke Test

Date: 2026-07-21 UTC

## Passed

- `npm run lint` — passed
- `npm run typecheck` — passed
- `npm test` — passed, 48/48 tests
- `npm run build` — passed
- `npm run demo` — passed, regenerated sample report/audit/transcript
- GPT-5.6 advisory sample — generated: `reports/sample_gpt56_advisory.md`
- PM2 app `clawthon` — online
- Telegram API `getMe` — OK, username `capithon_bot`
- GitHub repo — public
- Pitch deck PDF — 5 pages

## Notes

Full `npm test` is intentionally slower because quota/scope and repo security tests exercise realistic flows. Latest run passed all 48 tests locally.

Latest local commit: `47d1485 Polish judge walkthrough UX`.

Push attempt from this environment failed with GitHub 403 for the configured HTTPS credential. Fresh transfer artifacts were generated:

- `outgoing-build-week.patch`
- `outgoing-build-week.bundle`

## Public Repository

https://github.com/vuckuola619/OpenClaw2026_Zai_ClawVAPT

## Artifacts

- `submission/OpenClaw2026_Zai_ClawVAPT.pdf`
- `submission/demo-script.md`
- `submission/demo-shotlist.md`
- `submission/devpost-fields.md`

## Demo Video

https://youtu.be/mupug2vA5Ys
