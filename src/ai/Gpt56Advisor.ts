import { mkdir, writeFile } from 'node:fs/promises';
import type { Finding, Job, ScanRun } from '../types/index.js';
import type { ManualReviewItem } from '../report/ManualReview.js';
import { severitySummary } from '../report/ReportGenerator.js';
import { Redactor } from '../core/Redactor.js';

export interface Gpt56AdvisoryFiles { markdown: string; json: string; mode: 'gpt-5.6' | 'deterministic'; model: string; note: string }

interface ChatCompletionResponse { choices?: Array<{ message?: { content?: string } }>; error?: { message?: string } }

export class Gpt56Advisor {
  private enabled: boolean;
  private apiKey?: string;
  private baseUrl: string;
  private model: string;
  private timeoutMs: number;
  private redactor = new Redactor();

  constructor(private env: NodeJS.ProcessEnv = process.env) {
    this.enabled = env.GPT56_ADVISOR_ENABLED === 'true';
    this.apiKey = env.OPENAI_API_KEY?.trim() || undefined;
    this.baseUrl = (env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/+$/, '');
    this.model = env.GPT56_MODEL || env.OPENAI_MODEL || 'gpt-5.6';
    this.timeoutMs = Number(env.GPT56_ADVISOR_TIMEOUT_MS || 20000);
  }

  async generate(job: Job, scanRuns: ScanRun[], manualReview: ManualReviewItem[], dir = process.env.REPORT_DIR || 'reports'): Promise<Gpt56AdvisoryFiles> {
    await mkdir(dir, { recursive: true });
    const input = this.safeInput(job, scanRuns, manualReview);
    const prompt = this.prompt(input);
    const ai = await this.callModel(prompt);
    const mode = ai.usedModel ? 'gpt-5.6' : 'deterministic';
    const body = ai.content || this.deterministicAdvisory(input, ai.note);
    const payload = {
      job_id: job.id,
      generated_at: new Date().toISOString(),
      mode,
      model: ai.usedModel || this.model,
      note: ai.note,
      redaction_applied: true,
      advisory_markdown: body,
      input
    };
    const markdown = `${dir}/${job.id}_gpt56_advisory.md`;
    const json = `${dir}/${job.id}_gpt56_advisory.json`;
    await writeFile(markdown, body);
    await writeFile(json, JSON.stringify(payload, null, 2));
    return { markdown, json, mode, model: payload.model, note: ai.note };
  }

  private safeInput(job: Job, scanRuns: ScanRun[], manualReview: ManualReviewItem[]) {
    const severity = severitySummary(job.findings);
    const topFindings = job.findings.slice(0, 12).map((f) => ({
      id: f.id,
      title: this.redactor.redactString(f.title),
      severity: f.severity,
      status: f.status,
      source: f.source,
      description: this.redactor.redactString(f.description).slice(0, 500),
      remediation: this.redactor.redactString(f.remediation).slice(0, 500)
    }));
    return {
      project: 'ClawVAPT',
      job: {
        id: job.id,
        state: job.state,
        target_url: this.safeUrl(job.targetUrl),
        repo_url: job.repoUrl ? this.safeUrl(job.repoUrl) : null,
        repo_commit: job.repoCommit || null,
        verified: job.verified,
        scope_locked: job.scopeLocked,
        scope_host: job.scopeHost || null
      },
      severity,
      scan_runs: scanRuns.map((run) => ({ type: run.type, profile: run.profile, approval: run.approval, tools: run.tools.map((t) => `${t.name}:${t.status}:${t.mode}`), findings: run.findings.length })),
      top_findings: topFindings,
      manual_review_p1: manualReview.filter((item) => item.priority === 'P1').map((item) => ({ area: item.area, risk: item.risk, test_plan: item.testPlan })),
      constraints: ['authorized testing only', 'no exploitation instructions', 'no secret disclosure', 'manual validation required before closure']
    };
  }

  private prompt(input: unknown): string {
    return [
      'You are GPT-5.6 acting as a senior application security lead inside ClawVAPT.',
      'Create an operator-ready advisory pack from sanitized scan data.',
      'Do not include exploit payloads, destructive steps, secrets, or instructions that bypass authorization.',
      'Prioritize what an authorized operator should validate next and what a builder should fix first.',
      'Return Markdown with sections: Executive Readout, Priority Lane, Validation Plan, Remediation Tickets, Demo Notes, Residual Risk.',
      '',
      JSON.stringify(input, null, 2)
    ].join('\n');
  }

  private async callModel(prompt: string): Promise<{ content?: string; usedModel?: string; note: string }> {
    if (!this.enabled) return { note: 'GPT56_ADVISOR_ENABLED is not true; generated deterministic advisory.' };
    if (!this.apiKey) return { note: 'OPENAI_API_KEY missing; generated deterministic advisory.' };
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const res = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${this.apiKey}` },
        body: JSON.stringify({
          model: this.model,
          messages: [
            { role: 'system', content: 'You produce concise, safe, operator-ready security advisory notes.' },
            { role: 'user', content: prompt }
          ],
          temperature: 0.2
        }),
        signal: controller.signal
      });
      const json = await res.json() as ChatCompletionResponse;
      if (!res.ok) return { note: `Model call failed: ${this.redactor.redactString(json.error?.message || res.statusText).slice(0, 180)}; generated deterministic advisory.` };
      const content = json.choices?.[0]?.message?.content;
      if (!content) return { note: 'Model returned no content; generated deterministic advisory.' };
      return { content: this.redactor.redactString(content), usedModel: this.model, note: 'GPT-5.6 advisory generated through configured OpenAI-compatible endpoint.' };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { note: `Model call error: ${this.redactor.redactString(message).slice(0, 180)}; generated deterministic advisory.` };
    } finally {
      clearTimeout(timer);
    }
  }

  private deterministicAdvisory(input: ReturnType<Gpt56Advisor['safeInput']>, note: string): string {
    const criticalHigh = input.top_findings.filter((f) => f.severity === 'CRITICAL' || f.severity === 'HIGH');
    const top = criticalHigh.length ? criticalHigh : input.top_findings.slice(0, 5);
    const tickets = top.map((f, idx) => `${idx + 1}. ${f.severity}: ${f.title}\n   Fix: ${f.remediation}\n   Validate: reproduce safely in authorized scope, apply fix, rerun relevant scan/profile.`).join('\n');
    const manual = input.manual_review_p1.map((item, idx) => `${idx + 1}. ${item.area}: ${item.risk}\n   Tests: ${item.test_plan.join(' ')}`).join('\n');
    return `# GPT-5.6 Advisory Pack — ${input.job.id}\n\nMode: deterministic fallback\nNote: ${note}\n\n## Executive Readout\n\nClawVAPT found ${input.top_findings.length} prioritized findings in this report view. Severity C/H/M/L/I: ${input.severity.CRITICAL}/${input.severity.HIGH}/${input.severity.MEDIUM}/${input.severity.LOW}/${input.severity.INFO}.\n\n## Priority Lane\n\n${input.severity.CRITICAL > 0 ? 'P1: validate critical issues immediately and block release until remediated.' : input.severity.HIGH > 0 ? 'P2: fix high-risk issues before production promotion.' : 'P3: continue hardening and manual validation.'}\n\n## Validation Plan\n\n${manual || '1. Run manual authorization, workflow, payment/quota, tenant isolation, abuse-limit, and AI/tool misuse checks with authorized test accounts.'}\n\n## Remediation Tickets\n\n${tickets || '1. No scanner finding tickets generated; complete manual validation before closure.'}\n\n## Demo Notes\n\nShow /judge, /demo, /status, /report, and /gpt_review. Emphasize that GPT-5.6 advisory is safe, redacted, and advisory-only.\n\n## Residual Risk\n\nScanner output is not proof of business-logic safety. Keep manual validation gates before client-facing closure.\n`;
  }

  private safeUrl(value: string): string {
    try {
      const url = new URL(value);
      url.username = '';
      url.password = '';
      return url.toString();
    } catch {
      return this.redactor.redactString(value);
    }
  }
}
