import test from 'node:test';
import assert from 'node:assert/strict';
import { ScopeGuard } from '../src/core/ScopeGuard.js';
import { Redactor } from '../src/core/Redactor.js';
import { QuotaStore } from '../src/core/QuotaStore.js';
import { PakasirAdapter, isPaidPakasirStatus, normalizePakasirStatus } from '../src/tools/PakasirAdapter.js';

test('ownership challenge generation and demo verification', () => { const s=new ScopeGuard(); const token=s.createChallenge('JOB-1'); assert.equal(token,'clawvapt-verify-JOB-1'); assert.equal(s.verifyDemo(token,'JOB-1'), true); assert.equal(s.verifyDemo('bad','JOB-1'), false); });
test('scope lock enforcement blocks unverified and out of scope', () => { const s=new ScopeGuard(); assert.throws(()=>s.assertCanScan(false,false), /OWNERSHIP/); const host=s.lockScope('https://example.com/a'); assert.equal(host,'example.com'); assert.throws(()=>s.assertInScope('https://evil.com',host), /OUT_OF_SCOPE/); });
test('first scan free, second requires payment', () => { const q=new QuotaStore(); assert.deepEqual(q.check('u').reason,'FREE'); q.consume('u'); assert.equal(q.check('u').allowed,false); q.addCredits('u',10); assert.deepEqual(q.check('u').reason,'CREDITS'); });
test('pakasir payment url generation', () => { const p=new PakasirAdapter(); const url=p.createPaymentUrl('ORDER-1',25000); assert.match(url,/order_id=ORDER-1/); assert.match(url,/25000/); });

test('pakasir completed status counts as paid', () => {
  assert.equal(normalizePakasirStatus('completed'), 'COMPLETED');
  assert.equal(isPaidPakasirStatus('completed'), true);
  assert.equal(isPaidPakasirStatus('PAID'), true);
  assert.equal(isPaidPakasirStatus('pending'), false);
});
test('secret redaction', () => { const r=new Redactor(); const out=r.redactString('api_key=abcdef1234567890abcdef1234567890'); assert.doesNotMatch(out,/abcdef1234567890abcdef/); });
