import test from 'node:test';
import assert from 'node:assert/strict';
import { parseGitHubRepo } from '../src/tools/GitHubRepoConnector.js';

test('github repo parser accepts safe github formats', () => {
  assert.equal(parseGitHubRepo('vuckuola619/clawthon').cloneUrl, 'https://github.com/vuckuola619/clawthon.git');
  assert.equal(parseGitHubRepo('https://github.com/owner/repo.git').htmlUrl, 'https://github.com/owner/repo');
});

test('github repo parser blocks credentials and non-github hosts', () => {
  assert.throws(() => parseGitHubRepo('https://user:pass@github.com/owner/repo'), /BLOCKED_REPO_URL/);
  assert.throws(() => parseGitHubRepo('https://evil.example.com/owner/repo'), /BLOCKED_REPO_URL/);
  assert.throws(() => parseGitHubRepo('file:///tmp/repo'), /BLOCKED_REPO_URL|INVALID_REPO_URL/);
});
