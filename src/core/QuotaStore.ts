import type { QuotaSnapshot } from './PersistentStore.js';

export const INITIAL_CREDITS = 10;
export const SAFE_SCAN_COST = 5;
export const DEEP_SCAN_COST = 10;
export const REPO_SCAN_COST = 10;

export class QuotaStore {
  private scans = new Map<string, number>();
  private credits = new Map<string, number>();

  constructor(initial: QuotaSnapshot[] = [], private onChange: (snapshot: QuotaSnapshot) => void = () => {}) {
    for (const item of initial) {
      this.scans.set(item.userHash, item.scans);
      this.credits.set(item.userHash, item.credits);
    }
  }

  ensureUser(userHash: string): QuotaSnapshot {
    if (!this.credits.has(userHash)) {
      this.scans.set(userHash, this.scans.get(userHash) || 0);
      this.credits.set(userHash, INITIAL_CREDITS);
      this.emit(userHash);
    }
    return this.snapshot(userHash);
  }

  check(userHash: string, cost = SAFE_SCAN_COST): { allowed: boolean; reason: 'CREDITS'|'PAYMENT_REQUIRED'; credits: number; cost: number } {
    const credits = this.ensureUser(userHash).credits;
    if (credits >= cost) return { allowed: true, reason: 'CREDITS', credits, cost };
    return { allowed: false, reason: 'PAYMENT_REQUIRED', credits, cost };
  }

  consume(userHash: string, cost = SAFE_SCAN_COST): void {
    this.ensureUser(userHash);
    const count = this.scans.get(userHash) || 0;
    this.credits.set(userHash, Math.max(0, (this.credits.get(userHash) || 0) - cost));
    this.scans.set(userHash, count + 1);
    this.emit(userHash);
  }

  addCredits(userHash: string, amount = 10): void {
    this.ensureUser(userHash);
    this.credits.set(userHash, (this.credits.get(userHash) || 0) + amount);
    this.emit(userHash);
  }

  snapshot(userHash: string): QuotaSnapshot {
    return { userHash, scans: this.scans.get(userHash) || 0, credits: this.credits.has(userHash) ? this.credits.get(userHash)! : INITIAL_CREDITS };
  }

  private emit(userHash: string): void { this.onChange(this.snapshot(userHash)); }
}
