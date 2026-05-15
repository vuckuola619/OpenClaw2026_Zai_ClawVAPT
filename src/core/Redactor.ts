import { createHash } from 'node:crypto';
export class Redactor {
  private patterns = [/[A-Za-z0-9_\-]{20,}\.[A-Za-z0-9_\-]{20,}\.[A-Za-z0-9_\-]{20,}/g, /\b\d{8,}:[A-Za-z0-9_-]{20,}\b/g, /(api[_-]?key|token|secret|password)\s*[:=]\s*[^\s"']+/gi];
  redact(value: unknown): unknown { if (typeof value === 'string') return this.redactString(value); if (Array.isArray(value)) return value.map(v=>this.redact(v)); if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([k,v]) => [k, /secret|token|key|password/i.test(k) ? '[REDACTED]' : this.redact(v)])); return value; }
  redactString(s: string): string { return this.patterns.reduce((acc,r)=>acc.replace(r,'[REDACTED]'), s); }
  hash(s: string): string { return createHash('sha256').update(s).digest('hex').slice(0,16); }
}
