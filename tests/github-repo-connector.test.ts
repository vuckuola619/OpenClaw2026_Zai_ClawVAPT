import test from 'node:test';
import assert from 'node:assert/strict';
import { parseGitHubRepo, publicGitEnv } from '../src/tools/GitHubRepoConnector.js';

test('github repo parser accepts safe github formats', () => {
  assert.equal(parseGitHubRepo('vuckuola619/clawthon').cloneUrl, 'https://github.com/vuckuola619/clawthon.git');
  assert.equal(parseGitHubRepo('https://github.com/owner/repo.git').htmlUrl, 'https://github.com/owner/repo');
});

test('github repo parser blocks credentials and non-github hosts', () => {
  assert.throws(() => parseGitHubRepo('https://user:pass@github.com/owner/repo'), /BLOCKED_REPO_URL/);
  assert.throws(() => parseGitHubRepo('https://evil.example.com/owner/repo'), /BLOCKED_REPO_URL/);
  assert.throws(() => parseGitHubRepo('file:///tmp/repo'), /BLOCKED_REPO_URL|INVALID_REPO_URL/);
});

test('public github clone env strips private auth tokens', () => {
  const oldGithub = process.env.GITHUB_TOKEN;
  const oldGh = process.env.GH_TOKEN;
  process.env.GITHUB_TOKEN = 'ghp_private';
  process.env.GH_TOKEN = 'ghp_private2';
  const env = publicGitEnv();
  assert.equal(env.GITHUB_TOKEN, undefined);
  assert.equal(env.GH_TOKEN, undefined);
  if (oldGithub === undefined) delete process.env.GITHUB_TOKEN; else process.env.GITHUB_TOKEN = oldGithub;
  if (oldGh === undefined) delete process.env.GH_TOKEN; else process.env.GH_TOKEN = oldGh;
});
