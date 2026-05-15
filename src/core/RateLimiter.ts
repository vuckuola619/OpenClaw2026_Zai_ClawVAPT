import { AppError } from './AppError.js';

interface Bucket { tokens: number; updatedAt: number }

export class RateLimiter {
  private buckets = new Map<string, Bucket>();
  constructor(private capacity = Number(process.env.RATE_LIMIT_CAPACITY || 20), private refillPerMinute = Number(process.env.RATE_LIMIT_REFILL_PER_MINUTE || 10)) {}

  assertAllowed(key: string, cost = 1): void {
    const now = Date.now();
    const bucket = this.buckets.get(key) || { tokens: this.capacity, updatedAt: now };
    const elapsedMinutes = Math.max(0, (now - bucket.updatedAt) / 60000);
    bucket.tokens = Math.min(this.capacity, bucket.tokens + elapsedMinutes * this.refillPerMinute);
    bucket.updatedAt = now;
    if (bucket.tokens < cost) {
      this.buckets.set(key, bucket);
      throw new AppError('RATE_LIMITED', 'RATE_LIMITED', 'Rate limit reached. Wait a bit, then retry.');
    }
    bucket.tokens -= cost;
    this.buckets.set(key, bucket);
  }
}
