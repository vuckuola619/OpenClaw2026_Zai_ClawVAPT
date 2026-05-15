import type { QuotaSnapshot } from './PersistentStore.js';

export class QuotaStore {
  private scans = new Map<string, number>();
  private credits = new Map<string, number>();

  constructor(initial: QuotaSnapshot[] = [], private onChange: (snapshot: QuotaSnapshot) => void = () => {}) {
    for (const item of initial) {
      this.scans.set(item.userHash, item.scans);
      this.credits.set(item.userHash, item.credits);
    }
  }

  check(userHash: string): { allowed: boolean; reason: 'FREE'|'CREDITS'|'PAYMENT_REQUIRED'; credits: number } {
    const count = this.scans.get(userHash) || 0;
    const credits = this.credits.get(userHash) || 0;
    if (count === 0) return { allowed: true, reason: 'FREE', credits };
    if (credits >= 10) return { allowed: true, reason: 'CREDITS', credits };
    return { allowed: false, reason: 'PAYMENT_REQUIRED', credits };
  }

  consume(userHash: string): void {
    const count = this.scans.get(userHash) || 0;
    if (count > 0) this.credits.set(userHash, Math.max(0, (this.credits.get(userHash) || 0) - 10));
    this.scans.set(userHash, count + 1);
    this.emit(userHash);
  }

  addCredits(userHash: string, amount = 10): void {
    this.credits.set(userHash, (this.credits.get(userHash) || 0) + amount);
    this.emit(userHash);
  }

  snapshot(userHash: string): QuotaSnapshot {
    return { userHash, scans: this.scans.get(userHash) || 0, credits: this.credits.get(userHash) || 0 };
  }

  private emit(userHash: string): void { this.onChange(this.snapshot(userHash)); }
}
