import { mkdirSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { AppError } from '../core/AppError.js';

export interface ConnectedRepo { repoUrl: string; repoPath: string; owner: string; repo: string; commit: string }

export class GitHubRepoConnector {
  constructor(private baseDir = resolve(process.env.REPO_CACHE_DIR || './data/repos')) {}

  connect(jobId: string, raw: string): ConnectedRepo {
    const parsed = parseGitHubRepo(raw);
    const repoPath = resolve(this.baseDir, jobId);
    if (!repoPath.startsWith(resolve(this.baseDir))) throw new AppError('BLOCKED_TARGET', 'REPO_PATH_ESCAPE', 'Repository path blocked.');
    mkdirSync(this.baseDir, { recursive: true });
    rmSync(repoPath, { recursive: true, force: true });
    const clone = spawnSync('git', ['clone', '--depth', '1', parsed.cloneUrl, repoPath], { encoding: 'utf8', timeout: 120000, maxBuffer: 1_000_000, env: publicGitEnv() });
    if (clone.status !== 0) throw new AppError('REPO_CONNECT_FAILED', 'REPO_CONNECT_FAILED', 'Could not clone GitHub repo. Public GitHub repos only for now. Private repo SSO/GitHub App support is on the roadmap.');
    const head = spawnSync('git', ['-C', repoPath, 'rev-parse', '--short=12', 'HEAD'], { encoding: 'utf8', timeout: 10000 });
    return { repoUrl: parsed.htmlUrl, repoPath, owner: parsed.owner, repo: parsed.repo, commit: head.stdout.trim() || 'unknown' };
  }
}

export function publicGitEnv(): NodeJS.ProcessEnv {
  const env = { ...process.env };
  delete env.GITHUB_TOKEN;
  delete env.GH_TOKEN;
  delete env.GIT_ASKPASS;
  delete env.SSH_ASKPASS;
  return env;
}

export function parseGitHubRepo(raw: string): { owner: string; repo: string; htmlUrl: string; cloneUrl: string } {
  const input = raw.trim();
  let owner = '';
  let repo = '';
  if (/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(input)) {
    [owner, repo] = input.split('/');
  } else {
    let url: URL;
    try { url = new URL(input); } catch { throw new AppError('INVALID_URL', 'INVALID_REPO_URL', 'Use https://github.com/owner/repo'); }
    if (url.protocol !== 'https:' || url.hostname.toLowerCase() !== 'github.com' || url.username || url.password) throw new AppError('BLOCKED_TARGET', 'BLOCKED_REPO_URL', 'Only https://github.com/owner/repo URLs are allowed.');
    const parts = url.pathname.replace(/^\/+|\/+$/g, '').split('/');
    owner = parts[0] || '';
    repo = (parts[1] || '').replace(/\.git$/i, '');
  }
  if (!/^[A-Za-z0-9_.-]{1,100}$/.test(owner) || !/^[A-Za-z0-9_.-]{1,100}$/.test(repo)) throw new AppError('INVALID_URL', 'INVALID_REPO_SLUG', 'Use https://github.com/owner/repo');
  return { owner, repo, htmlUrl: `https://github.com/${owner}/${repo}`, cloneUrl: `https://github.com/${owner}/${repo}.git` };
}
