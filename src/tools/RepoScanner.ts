import { readdir, readFile, stat } from 'node:fs/promises';
import { join, relative } from 'node:path';
import type { Finding } from '../types/index.js';
import { Redactor } from '../core/Redactor.js';
export class RepoScanner {
  constructor(private root = process.cwd(), private redactor = new Redactor()) {}
  async scan(): Promise<Finding[]> { const files = await this.walk(this.root); const findings: Finding[]=[]; const names = new Set(files.map(f=>relative(this.root,f).replace(/\\/g,'/')));
    if (names.has('.env')) findings.push(this.finding('REPO-ENV-COMMITTED','Runtime .env exists in workspace','HIGH','.env present locally; ensure not committed and never exposed.','.env'));
    if (!names.has('SECURITY.md')) findings.push(this.finding('REPO-SECURITY-MISSING','Missing SECURITY.md','LOW','Security policy is absent.','SECURITY.md'));
    if (!names.has('.github/dependabot.yml') && !names.has('.github/dependabot.yaml')) findings.push(this.finding('REPO-DEPENDABOT-MISSING','Missing Dependabot config','LOW','Dependency update automation absent.','.github/dependabot.yml'));
    for (const f of files.filter(f=>/\.(ts|js|json|yml|yaml|Dockerfile|md)$|Dockerfile$/.test(f))) { const rel=relative(this.root,f); const text=await readFile(f,'utf8').catch(()=> ''); const safe = this.redactor.redactString(text);
      if (/Access-Control-Allow-Origin['"]?\s*[:=]\s*['"]\*/i.test(text) || /origin\s*:\s*['"]\*['"]/i.test(text)) findings.push(this.finding('REPO-WILDCARD-CORS','Wildcard CORS pattern','MEDIUM','Wildcard CORS pattern detected.',rel));
      if (/express\(/i.test(text) && !/helmet\(/i.test(text)) findings.push(this.finding('REPO-EXPRESS-NO-HELMET','Express app without Helmet pattern','MEDIUM','Express usage found without local Helmet pattern.',rel));
      if (!/\.md$/i.test(rel) && /(password|api[_-]?key|token|secret)[A-Za-z0-9_-]*['"]?\s*[:=]\s*['"][A-Za-z0-9_-]{24,}/i.test(text)) findings.push(this.finding('REPO-SECRET-LIKE','Secret-like pattern redacted','HIGH',`Potential secret-like assignment detected in ${rel}`,rel));
      if (/FROM\s+/i.test(text) && /Dockerfile$/.test(rel) && !/USER\s+\w+/i.test(text)) findings.push(this.finding('REPO-DOCKER-ROOT','Dockerfile may run as root','MEDIUM','Dockerfile has no USER directive.',rel));
      if (/FROM\s+/i.test(text) && /Dockerfile$/.test(rel) && !/HEALTHCHECK/i.test(text)) findings.push(this.finding('REPO-DOCKER-HEALTHCHECK','Dockerfile missing HEALTHCHECK','LOW','Dockerfile has no HEALTHCHECK.',rel));
      if (/pull_request_target/i.test(text)) findings.push(this.finding('REPO-GHA-UNSAFE','Potential unsafe GitHub Actions trigger','HIGH','pull_request_target requires careful permission scoping.',rel));
    }
    return findings; }
  private async walk(dir:string): Promise<string[]> { const entries=await readdir(dir,{withFileTypes:true}).catch(()=>[]); let out:string[]=[]; for(const e of entries){ if(['node_modules','.git','.worktrees','dist','reports','logs','data'].includes(e.name)) continue; const p=join(dir,e.name); if(e.isDirectory()) out=out.concat(await this.walk(p)); else if((await stat(p)).size < 300_000) out.push(p);} return out; }
  private finding(id:string,title:string,severity: Finding['severity'],description:string,path:string): Finding { return { id,title,severity,status:'OPEN',description,remediation:'Review evidence, patch safely, and retest before closing.',source:'BUILTIN_REPO', evidence:[{type:'file',path,summary:description,redacted:true}]}; }
}
