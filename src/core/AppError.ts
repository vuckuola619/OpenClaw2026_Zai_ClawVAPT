export type AppErrorCode =
  | 'RATE_LIMITED'
  | 'INVALID_URL'
  | 'UNSUPPORTED_PROTOCOL'
  | 'BLOCKED_TARGET'
  | 'OWNERSHIP_OR_SCOPE_GATE_BLOCKED'
  | 'OWNERSHIP_NOT_VERIFIED'
  | 'SCOPE_NOT_LOCKED'
  | 'OUT_OF_SCOPE'
  | 'PAYMENT_REQUIRED'
  | 'JOB_NOT_FOUND'
  | 'REPORT_NOT_READY'
  | 'INTERNAL_ERROR';

export class AppError extends Error {
  constructor(public code: AppErrorCode, message: string, public safeMessage = message, public details: Record<string, unknown> = {}) {
    super(message);
    this.name = 'AppError';
  }
}

export function toAppError(error: unknown): AppError {
  if (error instanceof AppError) return error;
  const message = error instanceof Error ? error.message : String(error);
  if (message.startsWith('PAYMENT_REQUIRED:')) return new AppError('PAYMENT_REQUIRED', message, `Payment required. Order: ${message.split(':')[1] || '-'}`);
  if (message === 'JOB_NOT_FOUND') return new AppError('JOB_NOT_FOUND', message, 'Job not found. Use /my_jobs or create a new scan.');
  if (message === 'OWNERSHIP_OR_SCOPE_GATE_BLOCKED') return new AppError('OWNERSHIP_OR_SCOPE_GATE_BLOCKED', message, 'Scan blocked: ownership verification and scope lock required.');
  if (message === 'OWNERSHIP_NOT_VERIFIED') return new AppError('OWNERSHIP_NOT_VERIFIED', message, 'Ownership not verified.');
  if (message === 'SCOPE_NOT_LOCKED') return new AppError('SCOPE_NOT_LOCKED', message, 'Scope not locked.');
  if (message === 'OUT_OF_SCOPE') return new AppError('OUT_OF_SCOPE', message, 'Target is outside locked scope.');
  if (message === 'Invalid URL') return new AppError('INVALID_URL', message, 'Invalid URL. Use https://example.com.');
  if (message === 'UNSUPPORTED_PROTOCOL') return new AppError('UNSUPPORTED_PROTOCOL', message, 'Only http:// and https:// URLs are allowed.');
  if (message.startsWith('BLOCKED_TARGET')) return new AppError('BLOCKED_TARGET', message, 'Target blocked by safety policy. Public http(s) targets only.');
  return new AppError('INTERNAL_ERROR', message, 'Request failed safely. Try /help or retry later.');
}

export function formatSafeError(error: unknown): string {
  const appError = toAppError(error);
  return `Error ${appError.code}: ${appError.safeMessage}`
    .replace(/[A-Za-z0-9_\-]{20,}\.[A-Za-z0-9_\-]{20,}\.[A-Za-z0-9_\-]{20,}/g, '[REDACTED]')
    .replace(/\b\d{8,}:[A-Za-z0-9_-]{20,}\b/g, '[REDACTED]');
}
