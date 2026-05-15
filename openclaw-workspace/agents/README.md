# Agent Workspaces

ClawVAPT runs as one Telegram-first product, but its responsibilities are split into three logical agent workspaces.

These are not separate Git repos and not separate OpenClaw processes. They are product-level agent domains coordinated by `MainOrchestrator` through `MultiAgentEngine`.

```txt
MainOrchestrator
  -> TrustVerifierPaymentAgent workspace
  -> RedTeamRepoScannerAgent workspace
  -> BlueTeamHardeningReportAgent workspace
```

Each workspace owns a clear slice of the workflow, has allowed tools, and has safety boundaries. This keeps the autonomous loop understandable, testable, and safe.
