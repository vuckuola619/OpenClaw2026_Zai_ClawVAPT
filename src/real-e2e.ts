import { writeFile, mkdir } from 'node:fs/promises';
import { MainOrchestrator } from './orchestrator/MainOrchestrator.js';
import { loadEnv } from './core/env.js';
import { validatePublicTarget } from './core/TargetSafety.js';
import type { ScanProfile } from './types/index.js';

type RepoProfile = 'safe' | 'deep';
type WebProfile = 'safe' | 'deep';

export interface RealE2EConfig {
  targetUrl: string;
  repoUrl: string;
  operatorId: string;
  repoProfile: RepoProfile;
  webProfile: WebProfile;
  approveActiveScan: boolean;
  approveNmap: boolean;
}

export interface RealE2EResult {
  jobId: string;
  targetUrl: string;
  repoUrl: string;
  repoCommit?: string;
  verificationMethod?: string;
  repoFindings: number;
  webFindings: number;
  nmapFindings: number;
  totalFindings: number;
  reports: { json: string; pdf: string };
  scanProfiles: ScanProfile[];
}

export function configFromEnv(env = process.env): RealE2EConfig {
  const targetUrl = required(env.REAL_E2E_TARGET_URL, 'REAL_E2E_TARGET_URL');
  const repoUrl = required(env.REAL_E2E_REPO_URL, 'REAL_E2E_REPO_URL');
  const operatorId = required(env.REAL_E2E_OPERATOR_ID || env.OPERATOR_USER_IDS?.split(',')[0], 'REAL_E2E_OPERATOR_ID');
  const repoProfile = env.REAL_E2E_REPO_PROFILE === 'deep' ? 'deep' : 'safe';
  const webProfile = env.REAL_E2E_WEB_PROFILE === 'deep' ? 'deep' : 'safe';
  return {
    targetUrl,
    repoUrl,
    operatorId,
    repoProfile,
    webProfile,
    approveActiveScan: env.REAL_E2E_APPROVE_ACTIVE_SCAN === 'true',
    approveNmap: env.REAL_E2E_APPROVE_NMAP === 'true'
  };
}

export function validateRealE2EConfig(config: RealE2EConfig): void {
  const url = validatePublicTarget(config.targetUrl);
  if (url.hostname === 'demo-owned-site.local') throw new Error('REAL_E2E_REFUSES_DEMO_TARGET');
  if (/example\.(com|org|net)$/i.test(url.hostname)) throw new Error('REAL_E2E_REFUSES_PLACEHOLDER_TARGET');
  if (!/^https:\/\/github\.com\/[^/]+\/[^/]+(?:\.git)?$/i.test(config.repoUrl) && !/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(config.repoUrl)) throw new Error('REAL_E2E_REQUIRES_GITHUB_REPO');
}

export async function runRealE2E(config: RealE2EConfig, orchestrator = new MainOrchestrator()): Promise<RealE2EResult> {
  validateRealE2EConfig(config);
  const job = await orchestrator.createScan(config.operatorId, config.targetUrl);
  const challenge = await orchestrator.createChallenge(job);
  const verification = await orchestrator.verifyOwnership(job.id);
  if (verification.status !== 'DONE') {
    const instructions = challenge.evidence[0]?.summary || orchestrator.challengeInstructions(job.id);
    throw new Error(`REAL_E2E_OWNERSHIP_PROOF_REQUIRED\nJob: ${job.id}\n${instructions}`);
  }

  const connected = await orchestrator.connectRepo(job.id, config.operatorId, config.repoUrl);
  const repo = await orchestrator.runRepoSecuritySuite(config.operatorId, config.repoProfile, job.id);

  let webFindings = 0;
  const scanProfiles: ScanProfile[] = [config.repoProfile];
  if (config.approveActiveScan) {
    const web = await orchestrator.runActiveWebScan(job.id, config.operatorId, true, config.webProfile);
    webFindings = web.findings.length;
    scanProfiles.push(config.webProfile);
  }

  let nmapFindings = 0;
  if (config.approveNmap) {
    const nmap = await orchestrator.runStrictNmapScan(job.id, config.operatorId, true);
    nmapFindings = nmap.findings.length;
    scanProfiles.push('nmap-strict');
  }

  const reports = await orchestrator.refreshReport(job.id);
  const finalJob = orchestrator.getJob(job.id) || connected;
  const result: RealE2EResult = {
    jobId: job.id,
    targetUrl: finalJob.targetUrl,
    repoUrl: finalJob.repoUrl || config.repoUrl,
    repoCommit: finalJob.repoCommit,
    verificationMethod: finalJob.verificationMethod,
    repoFindings: repo.findings.length,
    webFindings,
    nmapFindings,
    totalFindings: finalJob.findings.length,
    reports,
    scanProfiles
  };
  await writeRealE2ESummary(result);
  return result;
}

async function writeRealE2ESummary(result: RealE2EResult): Promise<void> {
  await mkdir('reports', { recursive: true });
  await writeFile(`reports/${result.jobId}_real_e2e_summary.json`, JSON.stringify({ ...result, generatedAt: new Date().toISOString(), mock: false, hardcodedTarget: false }, null, 2));
}

function required(value: string | undefined, name: string): string {
  const clean = value?.trim();
  if (!clean) throw new Error(`${name}_REQUIRED`);
  return clean;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  loadEnv();
  try {
    const result = await runRealE2E(configFromEnv());
    console.log(JSON.stringify({ status: 'DONE', mock: false, hardcoded: false, ...result }, null, 2));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(message);
    process.exitCode = message.startsWith('REAL_E2E_OWNERSHIP_PROOF_REQUIRED') ? 2 : 1;
  }
}
