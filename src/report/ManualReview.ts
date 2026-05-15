import { mkdir, writeFile } from 'node:fs/promises';
import type { Finding, Job } from '../types/index.js';

export interface ManualReviewItem { area: string; risk: string; whyScannerMissesIt: string; testPlan: string[]; evidenceNeeded: string[]; priority: 'P1' | 'P2' | 'P3' }

export function manualReviewChecklist(job: Job): ManualReviewItem[] {
  const appHints = `${job.targetUrl} ${job.repoUrl || ''} ${job.findings.map((f) => `${f.title} ${f.description}`).join(' ')}`;
  const hasApi = /api|jwt|token|auth|bearer|route|endpoint|controller|middleware/i.test(appHints);
  const hasCommerce = /pay|order|cart|price|coupon|invoice|checkout|pakasir|qris|credit|balance/i.test(appHints);
  const hasTenant = /tenant|org|workspace|team|project|account|user_id|owner/i.test(appHints);
  const hasAi = /ai|prompt|openai|openrouter|llm|model|agent|chat|completion/i.test(appHints);
  const items: ManualReviewItem[] = [
    {
      area: 'Authorization / IDOR',
      risk: 'User accesses or modifies another user\'s object by changing IDs, slugs, UUIDs, or ownership fields.',
      whyScannerMissesIt: 'Requires multiple accounts and business context; static scanners cannot know object ownership boundaries.',
      testPlan: ['Create two low-privilege accounts A/B.', 'Capture read/update/delete requests for A-owned resources.', 'Replace object identifiers with B-owned identifiers.', 'Verify server-side ownership checks on every endpoint, not only UI routes.'],
      evidenceNeeded: ['A/B account roles', 'request/response pairs', 'object IDs tested', 'expected vs actual access decision'],
      priority: hasApi || hasTenant ? 'P1' : 'P2'
    },
    {
      area: 'Business workflow bypass',
      risk: 'User skips required steps such as verification, approval, payment, MFA, or onboarding.',
      whyScannerMissesIt: 'Requires knowing intended workflow order and state transitions.',
      testPlan: ['Map required workflow states.', 'Attempt direct final-step request before prerequisites.', 'Replay old valid requests after state changes.', 'Test duplicate submission and one-time action reuse.'],
      evidenceNeeded: ['workflow diagram', 'state before/after', 'blocked/allowed requests', 'server-side validation points'],
      priority: 'P1'
    },
    {
      area: 'Payment / quota / credit integrity',
      risk: 'Price, credit, quota, order status, or payment confirmation can be manipulated or replayed.',
      whyScannerMissesIt: 'Requires domain rules, payment lifecycle knowledge, and safe test orders.',
      testPlan: ['Modify amount/quantity/credit fields client-side.', 'Replay payment callbacks or order IDs.', 'Check idempotency by repeating paid-order confirmation.', 'Verify server computes trusted totals and payment status.'],
      evidenceNeeded: ['test order IDs', 'amounts before/after', 'callback replay result', 'credit ledger entries'],
      priority: hasCommerce ? 'P1' : 'P2'
    },
    {
      area: 'Tenant isolation',
      risk: 'Cross-tenant data exposure through shared IDs, search, exports, reports, or background jobs.',
      whyScannerMissesIt: 'Requires tenant-aware fixtures and role/organization boundaries.',
      testPlan: ['Create two tenants/orgs with similar data.', 'Test list/search/export/report endpoints across tenants.', 'Check background jobs and webhooks for tenant scoping.', 'Verify DB queries include tenant constraints.'],
      evidenceNeeded: ['tenant IDs', 'role matrix', 'cross-tenant request attempts', 'query/code references'],
      priority: hasTenant ? 'P1' : 'P2'
    },
    {
      area: 'Rate limits and abuse economics',
      risk: 'Features can be spammed to exhaust credits, emails, AI tokens, reports, or third-party APIs.',
      whyScannerMissesIt: 'Requires cost model and abuse scenario design beyond vulnerability signatures.',
      testPlan: ['Identify expensive actions.', 'Test per-user, per-IP, per-object, and global rate limits.', 'Check retry/idempotency handling.', 'Verify failed actions still have sane limits.'],
      evidenceNeeded: ['limit config', 'request counts', 'cost impact estimate', '429/error behavior'],
      priority: 'P2'
    },
    {
      area: 'AI / prompt / agent misuse',
      risk: 'LLM features leak data, ignore tool boundaries, run unauthorized actions, or accept prompt injection.',
      whyScannerMissesIt: 'Requires adversarial prompts, tool-permission context, and app-specific data boundaries.',
      testPlan: ['Test prompt injection in user content and uploaded files.', 'Verify tools require server-side authorization.', 'Check cross-user memory/data isolation.', 'Force model to reveal secrets or system prompts and confirm redaction.'],
      evidenceNeeded: ['prompt payloads', 'tool call logs', 'redacted outputs', 'authorization decision trail'],
      priority: hasAi ? 'P1' : 'P3'
    }
  ];
  return items;
}

export async function writeManualReview(job: Job, dir = process.env.REPORT_DIR || 'reports'): Promise<{ markdown: string }> {
  await mkdir(dir, { recursive: true });
  const path = `${dir}/${job.id}_manual_review.md`;
  const items = manualReviewChecklist(job);
  const body = [`# Manual Review Checklist — ${job.id}`, '', `Web: ${job.targetUrl}`, `Repo: ${job.repoUrl || '-'}`, `Commit: ${job.repoCommit || '-'}`, '', 'Scanner results do not prove business logic safety. Use authorized test accounts and safe test data only.', '', ...items.flatMap((item, idx) => [`## ${idx + 1}. ${item.area} (${item.priority})`, '', `Risk: ${item.risk}`, '', `Why scanner misses it: ${item.whyScannerMissesIt}`, '', 'Test plan:', ...item.testPlan.map((s) => `- ${s}`), '', 'Evidence needed:', ...item.evidenceNeeded.map((s) => `- ${s}`), ''])].join('\n');
  await writeFile(path, body);
  return { markdown: path };
}

export function manualPrioritySummary(findings: Finding[], checklist: ManualReviewItem[]): string[] {
  const out = checklist.filter((item) => item.priority === 'P1').map((item) => `${item.priority}: ${item.area}`);
  if (findings.some((f) => /secret|token|credential/i.test(`${f.title} ${f.description}`))) out.push('P1: verify secret rotation and blast radius manually.');
  return out.length ? out : ['P2: run manual business logic validation before client closure.'];
}
