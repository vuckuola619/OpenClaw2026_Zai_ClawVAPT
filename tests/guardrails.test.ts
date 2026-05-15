import test from 'node:test';
import assert from 'node:assert/strict';
import { validatePublicTarget, isPrivateIp } from '../src/core/TargetSafety.js';
import { RateLimiter } from '../src/core/RateLimiter.js';
import { AppError, formatSafeError } from '../src/core/AppError.js';

test('target safety blocks private and local targets', () => {
  assert.throws(() => validatePublicTarget('http://127.0.0.1'), /BLOCKED_TARGET/);
  assert.throws(() => validatePublicTarget('http://192.168.1.1'), /BLOCKED_TARGET/);
  assert.throws(() => validatePublicTarget('file:///etc/passwd'), /UNSUPPORTED_PROTOCOL/);
  assert.equal(validatePublicTarget('https://example.com/path#x').toString(), 'https://example.com/path');
  assert.equal(validatePublicTarget('https://demo-owned-site.local').hostname, 'demo-owned-site.local');
});

test('private ip helper covers common ranges', () => {
  assert.equal(isPrivateIp('10.0.0.1'), true);
  assert.equal(isPrivateIp('172.16.0.1'), true);
  assert.equal(isPrivateIp('172.32.0.1'), false);
  assert.equal(isPrivateIp('8.8.8.8'), false);
});

test('rate limiter fails closed when empty', () => {
  const limiter = new RateLimiter(1, 0);
  limiter.assertAllowed('u');
  assert.throws(() => limiter.assertAllowed('u'), /RATE_LIMITED/);
});

test('safe error formatter hides internals', () => {
  assert.equal(formatSafeError(new AppError('BLOCKED_TARGET', 'BLOCKED_TARGET_IP:127.0.0.1', 'Target blocked.')), 'Error BLOCKED_TARGET: Target blocked.');
});
