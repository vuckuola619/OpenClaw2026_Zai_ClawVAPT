# OpenAI Build Week Submission Checklist

## Required

- [x] Working project built with Codex/GPT-5.6
- [x] Category selected: Developer Tools
- [x] Project description prepared in `submission/devpost-fields.md`
- [x] 4-hour execution plan prepared in `submission/BUILD_WEEK_4H_PLAN.md`
- [x] Demo video under 3 minutes: https://youtu.be/mupug2vA5Ys
- [x] Public code repository: https://github.com/vuckuola619/OpenClaw2026_Zai_ClawVAPT
- [x] README setup and run instructions
- [x] Judge testing instructions
- [x] Supported platforms for developer-tool judging
- [x] Live/sandbox test path: Telegram bot `@capithon_bot`
- [x] Sample report artifacts
- [x] Codex/GPT-5.6 collaboration notes
- [ ] `/feedback` Codex session ID pasted into Devpost form

## Final Local Verification

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm run demo
```

## Manual Devpost Steps

1. Register/join OpenAI Build Week on Devpost.
2. Paste fields from `submission/devpost-fields.md`.
3. Add demo video URL.
4. Add GitHub repository URL.
5. Add live bot note: `Telegram bot @capithon_bot, sandbox/demo payment mode`.
6. Run `/feedback` in the Codex session used for core build work and paste the session ID.
