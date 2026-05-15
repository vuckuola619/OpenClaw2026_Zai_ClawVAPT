import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
const roots = ['src','tests','scripts'];
const bad = [/PAKASIR_API_KEY\s*=\s*[^\n]+[A-Za-z0-9_\-]{12,}/, /TELEGRAM_BOT_TOKEN\s*=\s*\d+:[A-Za-z0-9_-]+/];
async function files(dir){ let out=[]; for(const e of await readdir(dir,{withFileTypes:true}).catch(()=>[])){ const p=join(dir,e.name); if(e.isDirectory()) out=out.concat(await files(p)); else if(/\.(ts|js|mjs|md|yml|yaml|json)$/.test(p)) out.push(p);} return out; }
let failures=[];
for (const root of roots) for (const f of await files(root)) { const s=await readFile(f,'utf8'); if (s.includes('\t')) failures.push(`${f}: tab character`); for (const r of bad) if (r.test(s)) failures.push(`${f}: possible raw secret`); }
if (failures.length) { console.error(failures.join('\n')); process.exit(1); }
console.log('lint ok');
