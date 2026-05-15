import { resolveTxt } from 'node:dns/promises';
import type { Job } from '../types/index.js';
import { ScopeGuard } from './ScopeGuard.js';

export type VerificationMethod = 'demo' | 'http' | 'dns';
export interface VerificationResult { ok: boolean; method?: VerificationMethod; evidence: string }

export class OwnershipVerifier {
  private scope = new ScopeGuard();
  constructor(private timeoutMs = Number(process.env.OWNERSHIP_VERIFY_TIMEOUT_MS || 8000)) {}

  challengeToken(job: Job): string { return job.ownershipToken || this.scope.createChallenge(job.id); }

  instructions(job: Job): string {
    const token = this.challengeToken(job);
    const host = this.scope.lockScope(job.targetUrl);
    return [
      `Token: ${token}`,
      '',
      'HTTP option:',
      `Create: https://${host}/.well-known/clawvapt/${token}.txt`,
      `Body must contain exactly: ${token}`,
      '',
      'DNS option:',
      `Create TXT record: _clawvapt.${host}`,
      `TXT value: ${token}`
    ].join('\n');
  }

  async verify(job: Job): Promise<VerificationResult> {
    const host = this.scope.lockScope(job.targetUrl);
    const token = this.challengeToken(job);
    if (host === 'demo-owned-site.local') return { ok: true, method: 'demo', evidence: 'demo fixture ownership accepted' };
    const http = await this.verifyHttp(host, token);
    if (http.ok) return http;
    const dns = await this.verifyDns(host, token);
    if (dns.ok) return dns;
    return { ok: false, evidence: `HTTP failed: ${http.evidence}; DNS failed: ${dns.evidence}` };
  }

  private async verifyHttp(host: string, token: string): Promise<VerificationResult> {
    const url = `https://${host}/.well-known/clawvapt/${encodeURIComponent(token)}.txt`;
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), this.timeoutMs);
    try {
      const res = await fetch(url, { signal: ac.signal, redirect: 'follow' });
      if (!res.ok) return { ok: false, evidence: `HTTP ${res.status}` };
      const body = (await res.text()).trim();
      return body === token ? { ok: true, method: 'http', evidence: url } : { ok: false, evidence: 'HTTP token mismatch' };
    } catch (error) {
      return { ok: false, evidence: error instanceof Error ? error.name : 'HTTP fetch failed' };
    } finally {
      clearTimeout(timer);
    }
  }

  private async verifyDns(host: string, token: string): Promise<VerificationResult> {
    const name = `_clawvapt.${host}`;
    try {
      const records = await resolveTxt(name);
      const values = records.map((parts) => parts.join(''));
      return values.includes(token) ? { ok: true, method: 'dns', evidence: name } : { ok: false, evidence: 'DNS token mismatch' };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'DNS lookup failed';
      const code = typeof error === 'object' && error && 'code' in error ? String((error as { code?: unknown }).code) : '';
      return { ok: false, evidence: code || message };
    }
  }
}
