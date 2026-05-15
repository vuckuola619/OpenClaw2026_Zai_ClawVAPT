import test from 'node:test';
import assert from 'node:assert/strict';
import { SecurityToolAdapters } from '../src/tools/SecurityToolAdapters.js';

test('security tool status includes best repo and web scanners', async () => {
  const tools = await new SecurityToolAdapters().status('test', 'user');
  const names = tools.map((t) => t.name);
  for (const expected of ['gitleaks', 'semgrep', 'trivy', 'RepoSecurityHeuristics', 'RepoDeepProfile', 'SafeUrlScanner']) assert.ok(names.includes(expected), `${expected} missing`);
});

test('repo security suite returns normalized findings and recommendations', async () => {
  const result = await new SecurityToolAdapters().runRepoSuite('test', 'user');
  assert.equal(result.profile, 'safe');
  assert.ok(result.tools.length >= 4);
  assert.ok(result.recommendations.some((r) => /Gitleaks/i.test(r)));
  assert.ok(Array.isArray(result.findings));
});

test('deep repo suite is tuned for vibe-coded apps', async () => {
  const result = await new SecurityToolAdapters(undefined, process.cwd(), 60000).runRepoSuite('test-deep', 'user', 'deep');
  assert.equal(result.profile, 'deep');
  const semgrepModes = result.tools.filter((t) => t.name === 'semgrep').map((t) => t.mode).join(' ');
  if (!/not_installed/.test(semgrepModes)) assert.match(semgrepModes, /owasp-top-ten|jwt|typescript/);
  const trivyMode = result.tools.find((t) => t.name === 'trivy')?.mode || '';
  if (!/not_installed/.test(trivyMode)) assert.match(trivyMode, /include_dev/);
  assert.ok(result.recommendations.some((r) => /vibe-coded/i.test(r)));
});
