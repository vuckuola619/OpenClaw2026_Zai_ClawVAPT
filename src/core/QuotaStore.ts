export class QuotaStore { private scans = new Map<string, number>(); private credits = new Map<string, number>();
  check(userHash: string): { allowed: boolean; reason: 'FREE'|'CREDITS'|'PAYMENT_REQUIRED'; credits: number } { const count=this.scans.get(userHash)||0; const credits=this.credits.get(userHash)||0; if(count===0) return {allowed:true, reason:'FREE', credits}; if(credits>=10) return {allowed:true, reason:'CREDITS', credits}; return {allowed:false, reason:'PAYMENT_REQUIRED', credits}; }
  consume(userHash: string): void { const count=this.scans.get(userHash)||0; if(count>0) this.credits.set(userHash, Math.max(0,(this.credits.get(userHash)||0)-10)); this.scans.set(userHash,count+1); }
  addCredits(userHash: string, amount=10): void { this.credits.set(userHash,(this.credits.get(userHash)||0)+amount); }
}
