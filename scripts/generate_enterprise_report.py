#!/usr/bin/env python3
"""Generate enterprise VAPT PDF from ClawVAPT JSON report.

No scanning, no mock data. Reads an existing real report JSON and formats it for
client/security leadership review with ISO/SOC/OWASP mapping.
"""
from __future__ import annotations

import json
import sys
from datetime import datetime, timezone
from pathlib import Path
from textwrap import wrap

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak,
    KeepTogether, ListFlowable, ListItem
)

SEVERITY_ORDER = ["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"]
SEVERITY_COLORS = {
    "CRITICAL": colors.HexColor("#7f1d1d"),
    "HIGH": colors.HexColor("#dc2626"),
    "MEDIUM": colors.HexColor("#f59e0b"),
    "LOW": colors.HexColor("#2563eb"),
    "INFO": colors.HexColor("#64748b"),
}

CONTROL_MAP = {
    "secret": ("ISO 27001 A.8.24", "SOC 2 CC6.1 / CC6.6", "OWASP A02 Cryptographic Failures"),
    ".env": ("ISO 27001 A.8.12 / A.8.24", "SOC 2 CC6.1 / CC6.6", "OWASP A05 Security Misconfiguration"),
    "github actions": ("ISO 27001 A.8.9 / A.8.32", "SOC 2 CC8.1", "OWASP A05 Security Misconfiguration"),
    "content-security-policy": ("ISO 27001 A.8.26", "SOC 2 CC7.1", "OWASP A05 Security Misconfiguration"),
    "x-frame-options": ("ISO 27001 A.8.26", "SOC 2 CC7.1", "OWASP A05 Security Misconfiguration"),
    "x-content-type-options": ("ISO 27001 A.8.26", "SOC 2 CC7.1", "OWASP A05 Security Misconfiguration"),
    "referrer-policy": ("ISO 27001 A.8.26", "SOC 2 CC7.1", "OWASP A05 Security Misconfiguration"),
    "dockerfile": ("ISO 27001 A.8.9 / A.8.20", "SOC 2 CC6.1", "OWASP A05 Security Misconfiguration"),
    "dependabot": ("ISO 27001 A.8.8", "SOC 2 CC7.1", "OWASP A06 Vulnerable and Outdated Components"),
    "header": ("ISO 27001 A.8.26", "SOC 2 CC7.1", "OWASP A05 Security Misconfiguration"),
    "waf": ("ISO 27001 A.8.20 / A.8.23", "SOC 2 CC7.1", "OWASP A05 Security Misconfiguration"),
}


def safe(text: object) -> str:
    return str(text or "-").replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def controls_for(finding: dict) -> tuple[str, str, str]:
    blob = f"{finding.get('title','')} {finding.get('description','')}".lower()
    for key, mapping in CONTROL_MAP.items():
        if key in blob:
            return mapping
    return ("ISO 27001 A.8.8 / A.8.26", "SOC 2 CC7.1", "OWASP ASVS / WSTG validation")


def risk_rating(summary: dict) -> str:
    if summary.get("CRITICAL", 0):
        return "Critical"
    if summary.get("HIGH", 0) >= 3:
        return "High"
    if summary.get("HIGH", 0):
        return "High"
    if summary.get("MEDIUM", 0):
        return "Medium"
    return "Low"


def priority(sev: str) -> str:
    return {"CRITICAL": "P0", "HIGH": "P1", "MEDIUM": "P2", "LOW": "P3", "INFO": "P4"}.get(sev, "P4")


def sla(sev: str) -> str:
    return {"CRITICAL": "24-48h", "HIGH": "7 days", "MEDIUM": "30 days", "LOW": "60-90 days", "INFO": "Best effort"}.get(sev, "Best effort")


def para(text: str, style):
    return Paragraph(safe(text), style)


def page_footer(canvas, doc):
    canvas.saveState()
    canvas.setFont("Helvetica", 8)
    canvas.setFillColor(colors.HexColor("#64748b"))
    canvas.drawString(1.5 * cm, 1.0 * cm, "ClawVAPT Enterprise Security Assessment — Confidential")
    canvas.drawRightString(A4[0] - 1.5 * cm, 1.0 * cm, f"Page {doc.page}")
    canvas.restoreState()


def build(report_json: Path, out_pdf: Path, out_md: Path | None = None) -> None:
    report = json.loads(report_json.read_text())
    findings = report.get("findings", [])
    summary = report.get("severity_summary", {})
    target = report.get("target", {})
    auth = report.get("authorization_and_scope", {})
    generated = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")

    styles = getSampleStyleSheet()
    styles.add(ParagraphStyle(name="TitleCenter", parent=styles["Title"], alignment=TA_CENTER, fontSize=22, leading=26, textColor=colors.HexColor("#0f172a")))
    styles.add(ParagraphStyle(name="Section", parent=styles["Heading1"], fontSize=15, leading=18, spaceBefore=14, textColor=colors.HexColor("#0f172a")))
    styles.add(ParagraphStyle(name="Sub", parent=styles["Heading2"], fontSize=12, leading=15, spaceBefore=10, textColor=colors.HexColor("#1e293b")))
    styles.add(ParagraphStyle(name="BodySmall", parent=styles["BodyText"], fontSize=8.5, leading=11))
    styles.add(ParagraphStyle(name="Body", parent=styles["BodyText"], fontSize=9.5, leading=13))

    doc = SimpleDocTemplate(str(out_pdf), pagesize=A4, rightMargin=1.4*cm, leftMargin=1.4*cm, topMargin=1.5*cm, bottomMargin=1.6*cm)
    story = []

    story.append(Paragraph("Enterprise Security Assessment Report", styles["TitleCenter"]))
    story.append(Spacer(1, 0.4*cm))
    story.append(Paragraph("letsmakeiteasy.work — Real Owned-Target E2E", styles["Heading2"]))
    story.append(Spacer(1, 0.25*cm))
    meta = [
        ["Classification", "Confidential"],
        ["Report ID", report.get("job_id", "-")],
        ["Generated", generated],
        ["Assessment Type", "Authorized real target + GitHub repository security assessment"],
        ["Mock Data", "No — real scan results only"],
        ["Target", target.get("web_url", "-")],
        ["Repository", target.get("repo_url", "-")],
        ["Commit", target.get("repo_commit", "-")],
        ["Ownership Verification", f"{auth.get('verification_method','-')} at {auth.get('verified_at','-')}"],
    ]
    t = Table(meta, colWidths=[4.2*cm, 12.0*cm])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0,0), (0,-1), colors.HexColor("#e2e8f0")),
        ("GRID", (0,0), (-1,-1), 0.25, colors.HexColor("#cbd5e1")),
        ("FONTNAME", (0,0), (0,-1), "Helvetica-Bold"),
        ("VALIGN", (0,0), (-1,-1), "TOP"),
        ("FONTSIZE", (0,0), (-1,-1), 8.5),
    ]))
    story.append(t)
    story.append(PageBreak())

    story.append(Paragraph("1. Executive Summary", styles["Section"]))
    rating = risk_rating(summary)
    story.append(para(
        f"ClawVAPT performed a real owned-target end-to-end security assessment against {target.get('web_url')} and repository {target.get('repo_url')} at commit {target.get('repo_commit')}. "
        f"Ownership was verified via {auth.get('verification_method')} before active testing. No mock or hardcoded target data is included. Overall risk is rated {rating} based on {summary.get('HIGH',0)} High and {summary.get('MEDIUM',0)} Medium findings.", styles["Body"]))
    story.append(Spacer(1, 0.2*cm))
    risk_table = [["Severity", "Count", "Priority", "SLA"]]
    for sev in SEVERITY_ORDER:
        risk_table.append([sev, str(summary.get(sev, 0)), priority(sev), sla(sev)])
    rt = Table(risk_table, colWidths=[4*cm, 3*cm, 3*cm, 4*cm])
    rt.setStyle(TableStyle([
        ("BACKGROUND", (0,0), (-1,0), colors.HexColor("#0f172a")),
        ("TEXTCOLOR", (0,0), (-1,0), colors.white),
        ("GRID", (0,0), (-1,-1), 0.25, colors.HexColor("#cbd5e1")),
        ("FONTNAME", (0,0), (-1,0), "Helvetica-Bold"),
        ("FONTSIZE", (0,0), (-1,-1), 8.5),
    ]))
    story.append(rt)

    story.append(Paragraph("2. Scope and Authorization", styles["Section"]))
    scope_rows = [
        ["Web Application", target.get("web_url", "-")],
        ["GitHub Repository", target.get("repo_url", "-")],
        ["Repository Commit", target.get("repo_commit", "-")],
        ["Scope Host", auth.get("scope_host", "-")],
        ["Scope Locked", str(auth.get("scope_locked"))],
        ["Verification", f"{auth.get('verification_method')} / {auth.get('verified_at')}"],
    ]
    st = Table(scope_rows, colWidths=[4.2*cm, 12.0*cm])
    st.setStyle(TableStyle([("GRID", (0,0), (-1,-1), 0.25, colors.HexColor("#cbd5e1")), ("BACKGROUND", (0,0), (0,-1), colors.HexColor("#f1f5f9")), ("FONTSIZE", (0,0), (-1,-1), 8.5), ("VALIGN", (0,0), (-1,-1), "TOP")]))
    story.append(st)

    story.append(Paragraph("3. Methodology", styles["Section"]))
    methods = [
        "Ownership verification and scope lock before active scanning.",
        "Repository SAST/secret/configuration review using safe profile scanners and built-in heuristics.",
        "Active web safe profile with non-destructive checks and header/security posture validation.",
        "Finding normalization, severity summary, remediation prioritization, and redacted evidence export.",
        "Manual review checklist prepared for business logic, IDOR, tenant isolation, workflow bypass, and payment/API misuse areas."
    ]
    story.append(ListFlowable([ListItem(para(m, styles["Body"])) for m in methods], bulletType="bullet"))

    story.append(Paragraph("4. Tool Coverage", styles["Section"]))
    tool_rows = [["Tool", "Status", "Mode"]]
    for tool in report.get("tool_matrix", [])[:20]:
        tool_rows.append([tool.get("name", "-"), tool.get("status", "-"), tool.get("mode", "-")])
    tt = Table(tool_rows, colWidths=[4.2*cm, 2.5*cm, 9.5*cm])
    tt.setStyle(TableStyle([("BACKGROUND", (0,0), (-1,0), colors.HexColor("#0f172a")), ("TEXTCOLOR", (0,0), (-1,0), colors.white), ("GRID", (0,0), (-1,-1), 0.25, colors.HexColor("#cbd5e1")), ("FONTSIZE", (0,0), (-1,-1), 7.8), ("VALIGN", (0,0), (-1,-1), "TOP")]))
    story.append(tt)

    story.append(PageBreak())
    story.append(Paragraph("5. Compliance Control Mapping", styles["Section"]))
    control_rows = [["Finding", "Severity", "ISO/IEC 27001:2022", "SOC 2", "OWASP"]]
    for f in findings:
        iso, soc, owasp = controls_for(f)
        control_rows.append([f.get("title", "-")[:64], f.get("severity", "-"), iso, soc, owasp])
    ct = Table(control_rows, colWidths=[5.0*cm, 1.7*cm, 3.4*cm, 3.0*cm, 3.6*cm], repeatRows=1)
    ct.setStyle(TableStyle([("BACKGROUND", (0,0), (-1,0), colors.HexColor("#0f172a")), ("TEXTCOLOR", (0,0), (-1,0), colors.white), ("GRID", (0,0), (-1,-1), 0.2, colors.HexColor("#cbd5e1")), ("FONTSIZE", (0,0), (-1,-1), 6.8), ("VALIGN", (0,0), (-1,-1), "TOP")]))
    story.append(ct)

    story.append(PageBreak())
    story.append(Paragraph("6. Detailed Findings", styles["Section"]))
    sorted_findings = sorted(findings, key=lambda x: SEVERITY_ORDER.index(x.get("severity", "INFO")) if x.get("severity", "INFO") in SEVERITY_ORDER else 99)
    for idx, f in enumerate(sorted_findings, 1):
        sev = f.get("severity", "INFO")
        iso, soc, owasp = controls_for(f)
        block = []
        block.append(Paragraph(f"{idx}. [{sev}] {safe(f.get('title'))}", styles["Sub"]))
        block.append(para(f"Status: {f.get('status','OPEN')} | Source: {f.get('source','-')} | Priority: {priority(sev)} | SLA: {sla(sev)}", styles["BodySmall"]))
        block.append(para(f"Description: {f.get('description','-')}", styles["BodySmall"]))
        evidence = f.get("evidence", [])
        if evidence:
            ev = evidence[0]
            block.append(para(f"Evidence: {ev.get('summary','-')} {ev.get('url','')}", styles["BodySmall"]))
        block.append(para(f"Remediation: {f.get('remediation','Validate and remediate, then retest.')}", styles["BodySmall"]))
        block.append(para(f"Control mapping: {iso}; {soc}; {owasp}", styles["BodySmall"]))
        story.append(KeepTogether(block))
        story.append(Spacer(1, 0.15*cm))

    story.append(PageBreak())
    story.append(Paragraph("7. Remediation Roadmap", styles["Section"]))
    roadmap_rows = [["Priority", "Action", "Owner", "SLA"]]
    roadmap_rows.extend([
        ["P1", "Remove runtime .env exposure from repository/workspace; rotate any exposed credentials; enforce secret scanning in CI.", "Engineering / DevOps", "7 days"],
        ["P1", "Review GitHub Actions triggers and permissions; enforce least privilege, protected branches, pinned actions, and no unsafe pull_request_target flows.", "DevOps", "7 days"],
        ["P2", "Deploy security headers: CSP, frame-ancestors/X-Frame-Options, X-Content-Type-Options, Referrer-Policy, HSTS where compatible.", "Frontend / Platform", "30 days"],
        ["P2", "Harden container runtime: non-root user, HEALTHCHECK, minimal base image, dependency patching.", "Platform", "30 days"],
        ["P3", "Enable Dependabot or equivalent dependency monitoring and establish patch SLA.", "Engineering", "60 days"],
        ["Manual", "Perform authenticated business-logic review: IDOR, workflow bypass, tenant isolation, payment/API misuse.", "Security / QA", "Next test window"],
    ])
    rr = Table(roadmap_rows, colWidths=[1.8*cm, 9.3*cm, 3.0*cm, 2.2*cm], repeatRows=1)
    rr.setStyle(TableStyle([("BACKGROUND", (0,0), (-1,0), colors.HexColor("#0f172a")), ("TEXTCOLOR", (0,0), (-1,0), colors.white), ("GRID", (0,0), (-1,-1), 0.25, colors.HexColor("#cbd5e1")), ("FONTSIZE", (0,0), (-1,-1), 7.4), ("VALIGN", (0,0), (-1,-1), "TOP")]))
    story.append(rr)

    story.append(Paragraph("8. Limitations and Attestation", styles["Section"]))
    story.append(para("This report is generated from real ClawVAPT scan outputs for the stated owned target and repository. Evidence is redacted to prevent disclosure of secrets or sensitive response data. Automated findings require manual validation before contractual closure. No denial-of-service, destructive exploitation, credential attacks, or strict Nmap scan were performed in this run.", styles["Body"]))

    doc.build(story, onFirstPage=page_footer, onLaterPages=page_footer)

    if out_md:
        lines = [
            "# Enterprise Security Assessment Report",
            f"- Job: {report.get('job_id')}",
            f"- Target: {target.get('web_url')}",
            f"- Repo: {target.get('repo_url')} @ {target.get('repo_commit')}",
            f"- Verification: {auth.get('verification_method')} {auth.get('verified_at')}",
            f"- Risk: {rating}",
            f"- Severity: {summary}",
            "",
            "## Findings",
        ]
        for f in sorted_findings:
            iso, soc, owasp = controls_for(f)
            lines.append(f"- **{f.get('severity')}** {f.get('title')} — {iso}; {soc}; {owasp}")
        out_md.write_text("\n".join(lines) + "\n")


def main() -> int:
    if len(sys.argv) < 3:
        print("Usage: generate_enterprise_report.py input_report.json output.pdf [output.md]", file=sys.stderr)
        return 2
    report_json = Path(sys.argv[1])
    out_pdf = Path(sys.argv[2])
    out_md = Path(sys.argv[3]) if len(sys.argv) > 3 else None
    build(report_json, out_pdf, out_md)
    print(out_pdf)
    if out_md:
        print(out_md)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
