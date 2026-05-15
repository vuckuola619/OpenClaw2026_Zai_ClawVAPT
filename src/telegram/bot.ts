import { readFile } from 'node:fs/promises';
import { basename } from 'node:path';
import { MainOrchestrator } from '../orchestrator/MainOrchestrator.js';
import { RateLimiter } from '../core/RateLimiter.js';
import { formatSafeError } from '../core/AppError.js';
import { healthCheck } from '../core/HealthCheck.js';
import { helpText } from './commands.js';

type InlineButton = { text: string; callback_data?: string; url?: string };
type TelegramMessage = { message_id: number; chat: { id: number | string }; from?: { id: number | string }; text?: string };
type TelegramUpdate = { update_id: number; message?: TelegramMessage; callback_query?: { id: string; data?: string; message?: TelegramMessage; from: { id: number | string } } };

type ReplyMarkup = { inline_keyboard: InlineButton[][] };

export class TelegramBot {
  private offset = 0;
  private stopped = false;
  private orchestrator = new MainOrchestrator();
  private limiter = new RateLimiter();
  constructor(private token: string) {}

  async start(): Promise<void> {
    console.log('Telegram bot live: polling enabled.');
    await this.setCommands();
    void this.pollLoop();
  }

  stop(): void { this.stopped = true; }

  async handleText(chatId: string | number, userId: string, text: string): Promise<void> {
    const [cmd, ...args] = text.trim().split(/\s+/);
    try {
      this.limiter.assertAllowed(userId, cmd === '/scan' || cmd === '/web_scan_deep' ? 3 : 1);
      if (cmd === '/start') return this.sendMainMenu(chatId);
      if (cmd === '/help') return this.sendMessage(chatId, helpText(), mainButtons());
      if (cmd === '/demo') return this.runDemo(chatId);
      if (cmd === '/scan') return this.createScan(chatId, userId, args.join(' '));
      if (cmd === '/verify') return this.verify(chatId, args[0]);
      if (cmd === '/status') return this.status(chatId, args[0]);
      if (cmd === '/my_jobs') return this.myJobs(chatId, userId);
      if (cmd === '/latest') return this.latest(chatId, userId);
      if (cmd === '/report') return this.report(chatId, args[0]);
      if (cmd === '/harden') return this.harden(chatId, args[0]);
      if (cmd === '/pay') return this.pay(chatId, userId);
      if (cmd === '/health') return this.health(chatId);
      if (cmd === '/tools') return this.toolsStatus(chatId, userId);
      if (cmd === '/repo_scan') return this.repoScan(chatId, userId);
      if (cmd === '/web_scan') return this.webScanPreview(chatId, args[0], 'safe');
      if (cmd === '/web_scan_deep') return this.webScanPreview(chatId, args[0], 'deep');
      if (cmd === '/check_payment' || cmd === '/simulate_payment') return this.checkPayment(chatId, userId, args[0]);
      if (cmd === '/connect_repo' || cmd === '/create_pr' || cmd === '/ssh_plan' || cmd === '/approve') return this.sendMessage(chatId, 'Command skeleton ready. Demo mode uses patch-only remediation; no auto-merge, no SSH changes.', mainButtons());
      return this.sendMessage(chatId, 'Unknown command. Tap Help.', mainButtons());
    } catch (error) {
      return this.sendMessage(chatId, formatSafeError(error), mainButtons());
    }
  }

  async handleCallback(queryId: string, chatId: string | number, userId: string, data = ''): Promise<void> {
    await this.answerCallback(queryId);
    try {
      this.limiter.assertAllowed(userId, data.startsWith('run:') || data.startsWith('activeweb:') || data.startsWith('deepweb:') || data === 'scan_demo' ? 3 : 1);
      if (data === 'menu') return this.sendMainMenu(chatId);
      if (data === 'help') return this.sendMessage(chatId, helpText(), mainButtons());
      if (data === 'demo') return this.runDemo(chatId);
      if (data === 'scan_demo') return this.createScan(chatId, userId, 'https://demo-owned-site.local');
      if (data === 'pay') return this.pay(chatId, userId);
      if (data === 'health') return this.health(chatId);
      if (data === 'tools') return this.toolsStatus(chatId, userId);
      if (data === 'repo_scan') return this.repoScan(chatId, userId);
      if (data.startsWith('verify:')) return this.verify(chatId, data.slice('verify:'.length));
      if (data.startsWith('run:')) return this.runScan(chatId, data.slice('run:'.length));
      if (data.startsWith('webpreview:')) return this.webScanPreview(chatId, data.slice('webpreview:'.length), 'safe');
      if (data.startsWith('deeppreview:')) return this.webScanPreview(chatId, data.slice('deeppreview:'.length), 'deep');
      if (data.startsWith('activeweb:')) return this.runActiveWebScan(chatId, userId, data.slice('activeweb:'.length), 'safe');
      if (data.startsWith('deepweb:')) return this.runActiveWebScan(chatId, userId, data.slice('deepweb:'.length), 'deep');
      if (data === 'my_jobs') return this.myJobs(chatId, userId);
      if (data === 'latest') return this.latest(chatId, userId);
      if (data.startsWith('status:')) return this.status(chatId, data.slice('status:'.length));
      if (data.startsWith('report:')) return this.report(chatId, data.slice('report:'.length));
      if (data.startsWith('harden:')) return this.harden(chatId, data.slice('harden:'.length));
      if (data.startsWith('checkpay:')) return this.checkPayment(chatId, userId, data.slice('checkpay:'.length));
      return this.sendMessage(chatId, 'Button action unknown.', mainButtons());
    } catch (error) {
      return this.sendMessage(chatId, formatSafeError(error), mainButtons());
    }
  }

  private async pollLoop(): Promise<void> {
    while (!this.stopped) {
      try {
        const updates = await this.api<{ ok: boolean; result: TelegramUpdate[] }>('getUpdates', { offset: this.offset, timeout: 25, allowed_updates: ['message', 'callback_query'] });
        for (const update of updates.result || []) {
          this.offset = Math.max(this.offset, update.update_id + 1);
          if (update.message?.text) await this.handleText(update.message.chat.id, String(update.message.from?.id || update.message.chat.id), update.message.text);
          if (update.callback_query?.message) await this.handleCallback(update.callback_query.id, update.callback_query.message.chat.id, String(update.callback_query.from.id), update.callback_query.data);
        }
      } catch (error) {
        console.error('telegram polling error:', formatSafeError(error));
        await sleep(3000);
      }
    }
  }

  private async sendMainMenu(chatId: string | number): Promise<void> {
    return this.sendMessage(chatId, '🔒 ClawVAPT\nConsent-gated VAPT workflow. No verification = no scan. No scope lock = no scanner.\n\nChoose action:', mainButtons());
  }

  private async runDemo(chatId: string | number): Promise<void> {
    await this.sendMessage(chatId, 'Running deterministic demo...');
    const result = await this.orchestrator.demo();
    await this.sendMessage(chatId, `✅ Demo complete\nEngine: MultiAgentEngine\nAgents: TrustVerifierPaymentAgent → RedTeamRepoScannerAgent → BlueTeamHardeningReportAgent\nJob: ${result.job.id}\nFindings: ${result.job.findings.length}\nPayment order: ${result.job.orderId}\nReports ready.`, jobButtons(result.job.id, result.job.orderId));
    await this.sendDocument(chatId, result.reports.pdf, 'Sample PDF report');
    await this.sendDocument(chatId, result.reports.json, 'Sample JSON report');
  }

  private async createScan(chatId: string | number, userId: string, rawUrl: string): Promise<void> {
    if (!rawUrl) return this.sendMessage(chatId, 'Usage: /scan https://example.com', mainButtons());
    const job = await this.orchestrator.createScan(userId, rawUrl);
    const challenge = await this.orchestrator.createChallenge(job);
    const token = challenge.evidence[0]?.summary || 'challenge generated';
    await this.sendMessage(chatId, `Scan job created: ${job.id}\n\nOwnership challenge:\n${token}\n\nScanner is blocked until verification and scope lock.`, verifyButtons(job.id));
  }

  private async verify(chatId: string | number, jobId?: string): Promise<void> {
    if (!jobId) return this.sendMessage(chatId, 'Usage: /verify <job_id>', mainButtons());
    const result = await this.orchestrator.verifyDemo(jobId);
    await this.sendMessage(chatId, `✅ ${result.decision}\nScope locked. Ready to run safe scanner.`, runButtons(jobId));
  }

  private async runScan(chatId: string | number, jobId?: string): Promise<void> {
    if (!jobId) return this.sendMessage(chatId, 'Missing job id.', mainButtons());
    await this.sendMessage(chatId, `Running safe scan for ${jobId}...`);
    try {
      const result = await this.orchestrator.runApprovedScan(jobId);
      await this.sendMessage(chatId, `✅ Scan complete\nEngine: MultiAgentEngine\nAgents: Trust → RedTeam → BlueTeam\nJob: ${jobId}\nFindings: ${result.job.findings.length}\nCorrelations: ${result.correlations.length}`, jobButtons(jobId, result.job.orderId));
      await this.sendDocument(chatId, result.reports.pdf, 'PDF report');
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      if (msg.startsWith('PAYMENT_REQUIRED:')) {
        const orderId = msg.split(':')[1];
        const job = this.orchestrator.getJob(jobId);
        await this.sendMessage(chatId, `Payment required for next scan. Order: ${orderId}`, jobButtons(jobId, orderId || job?.orderId));
        return;
      }
      throw error;
    }
  }

  private async status(chatId: string | number, jobId?: string): Promise<void> {
    if (!jobId) return this.sendMessage(chatId, 'Usage: /status <job_id>', mainButtons());
    const job = this.orchestrator.getJob(jobId);
    if (!job) return this.sendMessage(chatId, 'Job not found in current process memory.', mainButtons());
    return this.sendMessage(chatId, `Status ${job.id}\nState: ${job.state}\nVerified: ${job.verified}\nScope locked: ${job.scopeLocked}\nScope: ${job.scopeHost || '-'}\nFindings: ${job.findings.length}`, jobButtons(job.id, job.orderId));
  }

  private async myJobs(chatId: string | number, userId: string): Promise<void> {
    const jobs = this.orchestrator.listJobsForUser(userId, 10);
    if (jobs.length === 0) return this.sendMessage(chatId, 'No persisted jobs yet. Create one with /scan <url>.', mainButtons());
    const lines = jobs.map((job) => `• ${job.id} — ${job.state} — findings ${job.findings.length}`);
    return this.sendMessage(chatId, `Your jobs:\n${lines.join('\n')}`, mainButtons());
  }

  private async latest(chatId: string | number, userId: string): Promise<void> {
    const job = this.orchestrator.latestJobForUser(userId);
    if (!job) return this.sendMessage(chatId, 'No latest job found.', mainButtons());
    return this.status(chatId, job.id);
  }

  private async report(chatId: string | number, jobId?: string): Promise<void> {
    if (!jobId) return this.sendMessage(chatId, 'Usage: /report <job_id>', mainButtons());
    const reports = this.orchestrator.reportsByJob.get(jobId);
    if (!reports) return this.sendMessage(chatId, 'Report not generated yet. Run scan first.', runButtons(jobId));
    await this.sendDocument(chatId, reports.pdf, 'PDF report');
    await this.sendDocument(chatId, reports.json, 'JSON report');
  }

  private async harden(chatId: string | number, jobId?: string): Promise<void> {
    if (!jobId) return this.sendMessage(chatId, 'Usage: /harden <job_id>', mainButtons());
    const result = await this.orchestrator.hardening(jobId);
    return this.sendMessage(chatId, `Hardening plan: ${result.decision}\n- Web headers\n- Repo hygiene\n- Docker USER/HEALTHCHECK\n- SSH/firewall PLAN_ONLY\n- CI/SBOM recommendations\n\nNo changes applied automatically.`, jobButtons(jobId));
  }

  private async pay(chatId: string | number, userId: string): Promise<void> {
    const tx = await this.orchestrator.createPaymentForUser(userId);
    await this.sendMessage(chatId, `Payment order: ${tx.orderId}\nAmount: Rp${tx.amount}\nMode: ${tx.mode}\nCredits after confirmation: +10`, { inline_keyboard: [[{ text: 'Open Pakasir', url: tx.paymentUrl }], [{ text: 'Check Payment', callback_data: `checkpay:${tx.orderId}` }], [{ text: 'Menu', callback_data: 'menu' }]] });
  }

  private async health(chatId: string | number): Promise<void> {
    const health = healthCheck();
    const checks = Object.entries(health.checks).map(([k, v]) => `• ${k}: ${v}`).join('\n');
    await this.sendMessage(chatId, `Health: ${health.status}\n${checks}`, mainButtons());
  }

  private async toolsStatus(chatId: string | number, userId: string): Promise<void> {
    const tools = await this.orchestrator.toolsStatus(userId);
    const lines = tools.map((t) => `• ${t.name}: ${t.available ? 'available' : 'missing'} (${t.mode})`);
    await this.sendMessage(chatId, `Security tools status:\n${lines.join('\n')}\n\nRecommended repo skills: secrets scan, JS/TS SAST, dependency/container scan, safe web headers.`, toolsButtons());
  }

  private async repoScan(chatId: string | number, userId: string): Promise<void> {
    await this.sendMessage(chatId, 'Running safe repo security suite...');
    const result = await this.orchestrator.runRepoSecuritySuite(userId);
    const top = result.findings.slice(0, 8).map((f) => `• ${f.severity} ${f.title}`).join('\n') || 'No findings from available tools.';
    await this.sendMessage(chatId, `Repo security suite complete\nTools: ${result.tools.length}\nFindings: ${result.findings.length}\n\nTop findings:\n${top}\n\nRecommendations:\n${result.recommendations.map((r) => `• ${r}`).join('\n')}`, toolsButtons());
  }

  private async webScanPreview(chatId: string | number, jobId?: string, profile: 'safe' | 'deep' = 'safe'): Promise<void> {
    if (!jobId) return this.sendMessage(chatId, profile === 'deep' ? 'Usage: /web_scan_deep <job_id>' : 'Usage: /web_scan <job_id>', mainButtons());
    const preview = await this.orchestrator.previewActiveWebScan(jobId, profile);
    const profileTools = preview.tools.filter((t) => profile === 'deep' ? ['NucleiDeepProfile','NiktoDeepProfile','Nmap'].includes(t.name) : ['NucleiSafeProfile','Nmap'].includes(t.name));
    const tools = profileTools.map((t) => `• ${t.name}: ${t.available ? 'available' : 'missing'} (${t.mode})`).join('\n');
    const warning = profile === 'deep' ? 'Enterprise deep profile enables CVE/KEV + XSS/SQLi detection and controlled Nikto. It still blocks DoS, fuzzing, brute force, default-login, destructive RCE, SSRF, and LFI.' : 'Safe profile runs headers check + low-noise Nuclei templates only.';
    await this.sendMessage(chatId, `Active web scan requires explicit approval.\n\nJob: ${preview.job.id}\nTarget: ${preview.job.targetUrl}\nScope: ${preview.job.scopeHost}\nProfile: ${profile.toUpperCase()}\n\nEnabled profile:\n${tools}\n\n${warning}`, activeWebApproveButtons(preview.job.id, profile));
  }

  private async runActiveWebScan(chatId: string | number, userId: string, jobId?: string, profile: 'safe' | 'deep' = 'safe'): Promise<void> {
    if (!jobId) return this.sendMessage(chatId, 'Missing job id.', mainButtons());
    await this.sendMessage(chatId, `Approved. Running active web ${profile} profile for ${jobId}...`);
    const result = await this.orchestrator.runActiveWebScan(jobId, userId, true, profile);
    const top = result.findings.slice(0, 10).map((f) => `• ${f.severity} ${f.title}`).join('\n') || `No findings from ${profile} web profile.`;
    await this.sendMessage(chatId, `Active web scan complete\nTarget: ${result.targetUrl}\nProfile: ${result.profile.toUpperCase()}\nApproval: ${result.approval}\nTools: ${result.tools.length}\nFindings: ${result.findings.length}\n\nTop findings:\n${top}`, jobButtons(jobId));
  }

  private async checkPayment(chatId: string | number, userId: string, orderId?: string): Promise<void> {
    if (!orderId) return this.sendMessage(chatId, 'Usage: /check_payment <order_id>', mainButtons());
    const result = await this.orchestrator.checkPayment(userId, orderId);
    await this.sendMessage(chatId, `Payment status: ${result.status}\nMode: ${result.mode}\nCredits added: ${result.creditsAdded}${result.alreadyCredited ? '\nOrder already credited before.' : ''}`, mainButtons());
  }

  private async setCommands(): Promise<void> {
    await this.api('setMyCommands', { commands: [
      { command: 'start', description: 'Open ClawVAPT menu' },
      { command: 'help', description: 'Show commands and safety rules' },
      { command: 'demo', description: 'Run deterministic demo' },
      { command: 'scan', description: 'Create scan job: /scan https://site.com' },
      { command: 'verify', description: 'Verify ownership: /verify JOB-id' },
      { command: 'web_scan', description: 'Approve active web safe scan' },
      { command: 'web_scan_deep', description: 'Approve enterprise deep web scan' },
      { command: 'status', description: 'Check job status' },
      { command: 'my_jobs', description: 'List persisted jobs' },
      { command: 'latest', description: 'Show latest job' },
      { command: 'report', description: 'Send report files' },
      { command: 'harden', description: 'Show hardening plan' },
      { command: 'pay', description: 'Create Pakasir payment' },
      { command: 'check_payment', description: 'Check Pakasir payment' },
      { command: 'health', description: 'Show service health' },
      { command: 'tools', description: 'Show security tools status' },
      { command: 'repo_scan', description: 'Run safe repo security suite' }
    ] });
  }

  private async sendMessage(chatId: string | number, text: string, reply_markup?: ReplyMarkup): Promise<void> {
    await this.api('sendMessage', { chat_id: chatId, text, reply_markup, disable_web_page_preview: true });
  }

  private async sendDocument(chatId: string | number, path: string, caption: string): Promise<void> {
    const data = await readFile(path);
    const form = new FormData();
    form.set('chat_id', String(chatId));
    form.set('caption', caption);
    form.set('document', new Blob([data]), basename(path));
    await this.rawApi('sendDocument', form);
  }

  private async answerCallback(callbackQueryId: string): Promise<void> { await this.api('answerCallbackQuery', { callback_query_id: callbackQueryId }); }

  private async api<T = unknown>(method: string, payload: Record<string, unknown>): Promise<T> {
    const res = await fetch(`https://api.telegram.org/bot${this.token}/${method}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) });
    const json = await res.json() as T & { ok?: boolean; description?: string };
    if (!res.ok || json.ok === false) throw new Error(json.description || `Telegram API ${method} failed`);
    return json;
  }

  private async rawApi<T = unknown>(method: string, body: BodyInit): Promise<T> {
    const res = await fetch(`https://api.telegram.org/bot${this.token}/${method}`, { method: 'POST', body });
    const json = await res.json() as T & { ok?: boolean; description?: string };
    if (!res.ok || json.ok === false) throw new Error(json.description || `Telegram API ${method} failed`);
    return json;
  }
}

export async function startTelegramBot(): Promise<TelegramBot> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error('TELEGRAM_BOT_TOKEN_MISSING');
  const bot = new TelegramBot(token);
  await bot.start();
  return bot;
}

function mainButtons(): ReplyMarkup { return { inline_keyboard: [[{ text: 'Run Demo', callback_data: 'demo' }, { text: 'Scan Demo Site', callback_data: 'scan_demo' }], [{ text: 'My Jobs', callback_data: 'my_jobs' }, { text: 'Latest', callback_data: 'latest' }], [{ text: 'Tools Status', callback_data: 'tools' }, { text: 'Repo Scan', callback_data: 'repo_scan' }], [{ text: 'Pay / Top Up', callback_data: 'pay' }, { text: 'Health', callback_data: 'health' }], [{ text: 'Help', callback_data: 'help' }]] }; }
function toolsButtons(): ReplyMarkup { return { inline_keyboard: [[{ text: 'Tools Status', callback_data: 'tools' }, { text: 'Run Repo Scan', callback_data: 'repo_scan' }], [{ text: 'Menu', callback_data: 'menu' }]] }; }
function verifyButtons(jobId: string): ReplyMarkup { return { inline_keyboard: [[{ text: 'Verify Demo Ownership', callback_data: `verify:${jobId}` }], [{ text: 'Status', callback_data: `status:${jobId}` }, { text: 'Menu', callback_data: 'menu' }]] }; }
function runButtons(jobId: string): ReplyMarkup { return { inline_keyboard: [[{ text: 'Run Safe Scan', callback_data: `run:${jobId}` }, { text: 'Active Web Safe', callback_data: `webpreview:${jobId}` }], [{ text: 'Active Web Deep', callback_data: `deeppreview:${jobId}` }], [{ text: 'Status', callback_data: `status:${jobId}` }, { text: 'Hardening Plan', callback_data: `harden:${jobId}` }], [{ text: 'Menu', callback_data: 'menu' }]] }; }
function activeWebApproveButtons(jobId: string, profile: 'safe' | 'deep' = 'safe'): ReplyMarkup { const action = profile === 'deep' ? `deepweb:${jobId}` : `activeweb:${jobId}`; const label = profile === 'deep' ? 'Approve Enterprise Deep Scan' : 'Approve Active Web Safe Scan'; return { inline_keyboard: [[{ text: label, callback_data: action }], [{ text: 'Status', callback_data: `status:${jobId}` }, { text: 'Menu', callback_data: 'menu' }]] }; }
function jobButtons(jobId: string, orderId?: string): ReplyMarkup { const rows: InlineButton[][] = [[{ text: 'Status', callback_data: `status:${jobId}` }, { text: 'Report', callback_data: `report:${jobId}` }], [{ text: 'Hardening Plan', callback_data: `harden:${jobId}` }, { text: 'Menu', callback_data: 'menu' }]]; if (orderId) rows.splice(1, 0, [{ text: 'Check Payment', callback_data: `checkpay:${orderId}` }]); return { inline_keyboard: rows }; }
function sleep(ms: number): Promise<void> { return new Promise(resolve => setTimeout(resolve, ms)); }
