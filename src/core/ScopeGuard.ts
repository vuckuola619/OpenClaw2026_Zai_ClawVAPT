import { validatePublicTarget } from './TargetSafety.js';

export class ScopeGuard {
  validateUrl(raw: string): URL { return validatePublicTarget(raw); }
  createChallenge(jobId: string): string { return `clawvapt-verify-${jobId}`; }
  verifyDemo(token: string, jobId: string): boolean { return token === this.createChallenge(jobId); }
  lockScope(targetUrl: string): string { return this.validateUrl(targetUrl).hostname.toLowerCase(); }
  assertCanScan(verified: boolean, scopeLocked: boolean): void { if (!verified) throw new Error('OWNERSHIP_NOT_VERIFIED'); if (!scopeLocked) throw new Error('SCOPE_NOT_LOCKED'); }
  assertInScope(targetUrl: string, scopeHost: string): void { const host = this.validateUrl(targetUrl).hostname.toLowerCase(); if (host !== scopeHost) throw new Error('OUT_OF_SCOPE'); }
}
