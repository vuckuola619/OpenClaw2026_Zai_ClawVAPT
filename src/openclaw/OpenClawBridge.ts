import { randomUUID, createHash } from 'node:crypto';
import type { AgentEnvelope, AgentName, AgentTask } from '../agents/types.js';
import type { AgentResult } from '../types/index.js';

export type BridgeStatus = 'disabled' | 'sent' | 'skipped' | 'failed';

export interface BridgeResult {
  status: BridgeStatus;
  runId?: string;
  reason?: string;
  gatewayUrl?: string;
}

interface RpcResponse {
  type?: string;
  id?: string;
  ok?: boolean;
  payload?: unknown;
  error?: { code?: string; message?: string; details?: unknown };
}

export class OpenClawBridge {
  readonly enabled: boolean;
  readonly gatewayUrl: string;
  readonly token?: string;
  readonly timeoutMs: number;

  constructor(env: NodeJS.ProcessEnv = process.env) {
    this.enabled = env.OPENCLAW_BRIDGE_ENABLED === 'true';
    this.gatewayUrl = env.OPENCLAW_GATEWAY_URL || 'ws://127.0.0.1:18789';
    this.token = env.OPENCLAW_GATEWAY_TOKEN?.trim() || undefined;
    this.timeoutMs = Number(env.OPENCLAW_BRIDGE_TIMEOUT_MS || 8000);
  }

  async publishAgentEnvelope(envelope: AgentEnvelope, summary: string): Promise<BridgeResult> {
    if (!this.enabled) return { status: 'disabled', reason: 'OPENCLAW_BRIDGE_ENABLED_NOT_TRUE' };
    if (!this.token) return { status: 'skipped', reason: 'OPENCLAW_GATEWAY_TOKEN_MISSING' };
    if (!this.isLoopbackGateway(this.gatewayUrl)) return { status: 'skipped', reason: 'GATEWAY_URL_NOT_LOOPBACK' };
    if (typeof WebSocket === 'undefined') return { status: 'failed', reason: 'WEBSOCKET_UNAVAILABLE' };

    const redacted = this.redact(summary).slice(0, 3000);
    const sessionKey = `clawvapt:${envelope.job_id}`;
    const message = [
      'ClawVAPT secure bridge event.',
      `Agent: ${envelope.agent}`,
      `Task: ${envelope.task}`,
      `Job: ${envelope.job_id}`,
      `Status: ${envelope.status}`,
      'Rules: advisory only; do not execute external actions; preserve consent gates; return concise risk notes only.',
      '',
      redacted
    ].join('\n');

    try {
      const payload = await this.chatSend({ sessionKey, message, idempotencyKey: `clawvapt-${envelope.job_id}-${envelope.agent}-${envelope.task}` });
      const runId = this.extractRunId(payload);
      return { status: 'sent', runId, gatewayUrl: this.maskUrl(this.gatewayUrl) };
    } catch (error) {
      return { status: 'failed', reason: this.safeError(error) };
    }
  }

  describe(): { enabled: boolean; gatewayUrl: string; tokenHash: string | null; timeoutMs: number } {
    return {
      enabled: this.enabled,
      gatewayUrl: this.maskUrl(this.gatewayUrl),
      tokenHash: this.token ? createHash('sha256').update(this.token).digest('hex').slice(0, 12) : null,
      timeoutMs: this.timeoutMs
    };
  }

  redact(input: string): string {
    return input
      .replace(/\b\d{8,}:[A-Za-z0-9_-]{20,}\b/g, '[redacted:telegram-token]')
      .replace(/\bgh[pousr]_[A-Za-z0-9_]{20,}\b/g, '[redacted:github-token]')
      .replace(/(password|token|secret|api[_-]?key)\s*[:=]\s*[^\s]+/gi, '$1=[redacted]');
  }

  private async chatSend(params: { sessionKey: string; message: string; idempotencyKey: string }): Promise<unknown> {
    const ws = new WebSocket(this.gatewayUrl);
    const pending = new Map<string, { resolve: (value: unknown) => void; reject: (error: Error) => void }>();
    const timer = setTimeout(() => {
      pending.forEach((p) => p.reject(new Error('OPENCLAW_BRIDGE_TIMEOUT')));
      pending.clear();
      try { ws.close(); } catch {}
    }, this.timeoutMs);

    const request = (method: string, requestParams: unknown): Promise<unknown> => {
      const id = randomUUID();
      const frame = { type: 'req', id, method, params: requestParams };
      const promise = new Promise<unknown>((resolve, reject) => pending.set(id, { resolve, reject }));
      ws.send(JSON.stringify(frame));
      return promise;
    };

    return await new Promise<unknown>((resolve, reject) => {
      ws.addEventListener('open', () => {
        setTimeout(() => {
          void request('connect', {
            minProtocol: 3,
            maxProtocol: 3,
            client: { id: 'gateway-client', displayName: 'clawvapt-bridge', version: '0.1.0', platform: 'node', mode: 'backend', instanceId: 'clawvapt' },
            role: 'operator',
            scopes: ['operator.read', 'operator.write'],
            auth: { token: this.token },
            caps: ['tool-events'],
            userAgent: 'clawvapt-bridge/0.1.0',
            locale: 'en'
          }).then(() => request('chat.send', {
            sessionKey: params.sessionKey,
            message: params.message,
            idempotencyKey: params.idempotencyKey,
            deliver: false,
            timeoutMs: this.timeoutMs
          })).then((payload) => {
            clearTimeout(timer);
            try { ws.close(); } catch {}
            resolve(payload);
          }).catch((error) => {
            clearTimeout(timer);
            try { ws.close(); } catch {}
            reject(error instanceof Error ? error : new Error(String(error)));
          });
        }, 300);
      });
      ws.addEventListener('message', (event) => {
        const msg = this.parseResponse(String(event.data));
        if (!msg || msg.type !== 'res' || !msg.id) return;
        const waiter = pending.get(msg.id);
        if (!waiter) return;
        pending.delete(msg.id);
        if (msg.ok) waiter.resolve(msg.payload);
        else waiter.reject(new Error(msg.error?.message || msg.error?.code || 'OPENCLAW_BRIDGE_RPC_FAILED'));
      });
      ws.addEventListener('error', () => reject(new Error('OPENCLAW_BRIDGE_WS_ERROR')));
      ws.addEventListener('close', () => {
        if (pending.size > 0) reject(new Error('OPENCLAW_BRIDGE_CLOSED'));
      });
    });
  }

  private parseResponse(raw: string): RpcResponse | null {
    try {
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? parsed as RpcResponse : null;
    } catch {
      return null;
    }
  }

  private extractRunId(payload: unknown): string | undefined {
    if (payload && typeof payload === 'object' && 'runId' in payload) {
      const runId = (payload as { runId?: unknown }).runId;
      return typeof runId === 'string' ? runId : undefined;
    }
    return undefined;
  }

  private isLoopbackGateway(url: string): boolean {
    try {
      const u = new URL(url);
      return (u.protocol === 'ws:' || u.protocol === 'wss:') && ['127.0.0.1', 'localhost', '[::1]', '::1'].includes(u.hostname);
    } catch {
      return false;
    }
  }

  private maskUrl(url: string): string {
    try {
      const u = new URL(url);
      u.username = '';
      u.password = '';
      return u.toString();
    } catch {
      return 'invalid-url';
    }
  }

  private safeError(error: unknown): string {
    const message = error instanceof Error ? error.message : String(error);
    return this.redact(message).slice(0, 180);
  }
}
