import { isIP } from 'node:net';
import { AppError } from './AppError.js';

export function validatePublicTarget(raw: string): URL {
  let url: URL;
  try { url = new URL(raw); } catch { throw new AppError('INVALID_URL', 'Invalid URL', 'Invalid URL. Use https://example.com.'); }
  if (!['http:', 'https:'].includes(url.protocol)) throw new AppError('UNSUPPORTED_PROTOCOL', 'UNSUPPORTED_PROTOCOL', 'Only http:// and https:// URLs are allowed.');
  if (url.username || url.password) throw new AppError('BLOCKED_TARGET', 'BLOCKED_TARGET_CREDENTIALS', 'Credentials in URL are not allowed.');
  if (url.hash) url.hash = '';
  const host = url.hostname.toLowerCase();
  if (!host) throw new AppError('INVALID_URL', 'INVALID_HOST', 'Invalid host.');
  if (host === 'demo-owned-site.local') return url;
  if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local')) throw new AppError('BLOCKED_TARGET', `BLOCKED_TARGET_HOST:${host}`, 'Local/internal hostnames are blocked.');
  if (isIP(host) && isPrivateIp(host)) throw new AppError('BLOCKED_TARGET', `BLOCKED_TARGET_IP:${host}`, 'Private/internal IP targets are blocked.');
  return url;
}

export function isPrivateIp(ip: string): boolean {
  if (ip.includes(':')) {
    const normalized = ip.toLowerCase();
    return normalized === '::1' || normalized.startsWith('fc') || normalized.startsWith('fd') || normalized.startsWith('fe80:') || normalized === '::' || normalized.startsWith('0:0:0:0:0:0:0:1');
  }
  const parts = ip.split('.').map((p) => Number(p));
  if (parts.length !== 4 || parts.some((p) => Number.isNaN(p) || p < 0 || p > 255)) return true;
  const [a, b] = parts;
  return a === 10 || a === 127 || a === 0 || a === 169 && b === 254 || a === 172 && b >= 16 && b <= 31 || a === 192 && b === 168 || a >= 224;
}
