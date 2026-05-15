import test from 'node:test';
import assert from 'node:assert/strict';
import { configFromEnv, validateRealE2EConfig } from '../src/real-e2e.js';

test('real e2e requires explicit target repo and operator', () => {
  assert.throws(() => configFromEnv({}), /REAL_E2E_TARGET_URL_REQUIRED/);
  assert.throws(() => configFromEnv({ REAL_E2E_TARGET_URL: 'https://owned.test' }), /REAL_E2E_REPO_URL_REQUIRED/);
  assert.throws(() => configFromEnv({ REAL_E2E_TARGET_URL: 'https://owned.test', REAL_E2E_REPO_URL: 'owner/repo' }), /REAL_E2E_OPERATOR_ID_REQUIRED/);
});

test('real e2e refuses demo and placeholder targets', () => {
  assert.throws(() => validateRealE2EConfig({ targetUrl: 'https://demo-owned-site.local', repoUrl: 'owner/repo', operatorId: 'u', repoProfile: 'safe', webProfile: 'safe', approveActiveScan: false, approveNmap: false }), /REAL_E2E_REFUSES_DEMO_TARGET/);
  assert.throws(() => validateRealE2EConfig({ targetUrl: 'https://example.com', repoUrl: 'owner/repo', operatorId: 'u', repoProfile: 'safe', webProfile: 'safe', approveActiveScan: false, approveNmap: false }), /REAL_E2E_REFUSES_PLACEHOLDER_TARGET/);
});

test('real e2e accepts public target and github repo config', () => {
  const config = configFromEnv({ REAL_E2E_TARGET_URL: 'https://app.real-owned.invalid', REAL_E2E_REPO_URL: 'https://github.com/owner/repo', REAL_E2E_OPERATOR_ID: 'operator-test', REAL_E2E_APPROVE_ACTIVE_SCAN: 'true', REAL_E2E_REPO_PROFILE: 'deep' });
  assert.equal(config.approveActiveScan, true);
  assert.equal(config.repoProfile, 'deep');
  assert.equal(config.jobId, undefined);
  assert.doesNotThrow(() => validateRealE2EConfig(config));
});

test('real e2e supports stable job resume id', () => {
  const config = configFromEnv({ REAL_E2E_TARGET_URL: 'https://app.real-owned.invalid', REAL_E2E_REPO_URL: 'owner/repo', REAL_E2E_OPERATOR_ID: 'operator-test', REAL_E2E_JOB_ID: 'JOB-abcd1234' });
  assert.equal(config.jobId, 'JOB-abcd1234');
});

test('real e2e rejects non github repos', () => {
  assert.throws(() => validateRealE2EConfig({ targetUrl: 'https://app.real-owned.invalid', repoUrl: 'https://gitlab.com/owner/repo', operatorId: 'u', repoProfile: 'safe', webProfile: 'safe', approveActiveScan: false, approveNmap: false }), /REAL_E2E_REQUIRES_GITHUB_REPO/);
});
