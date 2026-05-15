import type { Finding } from '../types/index.js';
export class SafeUrlScanner {
  async scan(targetUrl: string): Promise<Finding[]> {
    const url = new URL(targetUrl);
    if (url.hostname.endsWith('.local')) return this.demoFindings(targetUrl);
    const controller = new AbortController(); const timeout = setTimeout(()=>controller.abort(), 5000);
    const findings: Finding[] = [];
    try {
      const res = await fetch(targetUrl, { method: 'GET', redirect: 'manual', signal: controller.signal, headers: { 'User-Agent': 'ClawVAPT-safe-scanner/0.1' } });
      const headers = res.headers;
      const required = ['content-security-policy','x-frame-options','x-content-type-options','referrer-policy'];
      for (const h of required) if (!headers.has(h)) findings.push(this.finding(`URL-${h}`, `Missing ${h}`, 'MEDIUM', `Header ${h} absent`, targetUrl));
      if (headers.get('server')) findings.push(this.finding('URL-server-header', 'Server header disclosure', 'LOW', 'Server header is present; value redacted in report.', targetUrl));
      if (res.status >= 300 && res.status < 400) findings.push(this.finding('URL-redirect', 'Redirect observed', 'INFO', `HTTP ${res.status} redirect observed`, targetUrl));
    } finally { clearTimeout(timeout); }
    return findings;
  }
  private demoFindings(url: string): Finding[] { return [this.finding('URL-CSP-MISSING','Missing Content-Security-Policy','MEDIUM','Demo fixture indicates CSP header is absent.',url), this.finding('URL-SERVER-DISCLOSURE','Server header disclosure','LOW','Demo fixture indicates server header exists; value redacted.',url), this.finding('URL-ENV-CHECK','Exposed .env check performed','INFO','Only status was checked; content was never fetched or dumped.',url)]; }
  private finding(id:string,title:string,severity: Finding['severity'],description:string,url:string): Finding { return { id,title,severity,status:'OPEN',description, remediation:'Add secure defaults and verify with retest before marking fixed.', source:'BUILTIN_URL', evidence:[{type:'url',url,summary:description,redacted:true}]}; }
}
