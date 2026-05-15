import test from 'node:test';
import assert from 'node:assert/strict';
import { SecurityToolAdapters } from '../src/tools/SecurityToolAdapters.js';

test('security tool status includes best repo and web scanners', async () => {
  const tools = await new SecurityToolAdapters().status('test', 'user');
  const names = tools.map((t) => t.name);
  for (const expected of ['gitleaks', 'semgrep', 'trivy', 'RepoSecurityHeuristics', 'SafeUrlScanner']) assert.ok(names.includes(expected), `${expected} missing`);
});

test('repo security suite returns normalized findings and recommendations', async () => {
  const result = await new SecurityToolAdapters().runRepoSuite('test', 'user');
  assert.ok(result.tools.length >= 4);
  assert.ok(result.recommendations.some((r) => /Gitleaks/i.test(r)));
  assert.ok(Array.isArray(result.findings));
});
