from reportlab.lib.pagesizes import landscape, A4
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_LEFT
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase import pdfmetrics

OUT = 'submission/OpenClaw2026_Zai_ClawVAPT.pdf'
W, H = landscape(A4)
styles = getSampleStyleSheet()
styles.add(ParagraphStyle(name='TitleBig', parent=styles['Title'], fontSize=30, leading=34, textColor=colors.HexColor('#0F172A'), alignment=TA_LEFT, spaceAfter=18))
styles.add(ParagraphStyle(name='SlideTitle', parent=styles['Heading1'], fontSize=25, leading=29, textColor=colors.HexColor('#0F172A'), spaceAfter=14))
styles.add(ParagraphStyle(name='BodyBig', parent=styles['BodyText'], fontSize=14, leading=19, textColor=colors.HexColor('#1F2937'), spaceAfter=8))
styles.add(ParagraphStyle(name='Small', parent=styles['BodyText'], fontSize=10, leading=13, textColor=colors.HexColor('#475569')))
styles.add(ParagraphStyle(name='Pill', parent=styles['BodyText'], fontSize=12, leading=15, textColor=colors.white))

ACCENT = colors.HexColor('#2563EB')
GREEN = colors.HexColor('#16A34A')
DARK = colors.HexColor('#0F172A')
LIGHT = colors.HexColor('#EFF6FF')


def bullets(items):
    return [Paragraph(f'• {x}', styles['BodyBig']) for x in items]


def slide(title, body):
    story.append(Paragraph(title, styles['SlideTitle']))
    story.extend(body)
    story.append(PageBreak())


def tag(text, color=ACCENT):
    t = Table([[Paragraph(text, styles['Pill'])]], colWidths=[220])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), color),
        ('BOX', (0,0), (-1,-1), 0, color),
        ('LEFTPADDING', (0,0), (-1,-1), 10),
        ('RIGHTPADDING', (0,0), (-1,-1), 10),
        ('TOPPADDING', (0,0), (-1,-1), 6),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
    ]))
    return t

story = []
doc = SimpleDocTemplate(OUT, pagesize=(W,H), rightMargin=38, leftMargin=38, topMargin=34, bottomMargin=28)

# Slide 1
story.append(Paragraph('ClawVAPT', styles['TitleBig']))
story.append(Paragraph('Telegram-first multi-agent VAPT assistant with verified scope, QRIS credits, public GitHub scanning, and report automation.', styles['BodyBig']))
story.append(Spacer(1, 16))
story.append(tag('OpenClaw2026_Zai_ClawVAPT', DARK))
story.append(Spacer(1, 16))
story.extend(bullets([
    'Built for security operators and small teams that need fast, safe vulnerability triage.',
    'Runs from Telegram: no dashboard needed for MVP.',
    'Live bot: @capithon_bot | Repo: github.com/vuckuola619/OpenClaw2026_Zai_ClawVAPT',
]))
story.append(PageBreak())

# Slide 2
slide('Problem', bullets([
    'VAPT tools are powerful but easy to misuse without ownership verification and scope control.',
    'Operators waste time stitching together scanners, payment/access control, evidence redaction, and reports.',
    'Small teams need client-ready output, not raw terminal logs.',
    'Payment gating is usually outside the security workflow, making monetization awkward.',
]))

# Slide 3
slide('Solution', bullets([
    'Telegram bot guides the user through web target verification, scan approval, credit checks, and report delivery.',
    'Web scans require HTTP/DNS ownership proof and a locked scope before any scanner runs.',
    'Public GitHub repo scans are standalone, limited to one scan per repo/account, and cost 25 credits.',
    'Pakasir QRIS top-up is integrated directly into the agent flow.',
    'Reports are delivered automatically: PDF, JSON, and manual-review checklist.',
]))

# Slide 4
story.append(Paragraph('Multi-Agent Workflow', styles['SlideTitle']))
flow = [
    ['TrustVerifierPaymentAgent', 'Ownership proof, scope lock, credits, Pakasir QRIS'],
    ['RedTeamRepoScannerAgent', 'Safe/deep web checks, public repo scans, tool adapters'],
    ['BlueTeamHardeningReportAgent', 'PDF/JSON/manual review reports and remediation guidance'],
    ['MainOrchestrator', 'State machine, audit trail, safety gates, Telegram UX'],
]
t = Table([[Paragraph('<b>Agent</b>', styles['BodyBig']), Paragraph('<b>Responsibility</b>', styles['BodyBig'])]] + [[Paragraph(a, styles['BodyBig']), Paragraph(b, styles['BodyBig'])] for a,b in flow], colWidths=[230, 500])
t.setStyle(TableStyle([
    ('BACKGROUND', (0,0), (-1,0), LIGHT),
    ('GRID', (0,0), (-1,-1), 0.4, colors.HexColor('#CBD5E1')),
    ('VALIGN', (0,0), (-1,-1), 'TOP'),
    ('LEFTPADDING', (0,0), (-1,-1), 10),
    ('RIGHTPADDING', (0,0), (-1,-1), 10),
    ('TOPPADDING', (0,0), (-1,-1), 8),
    ('BOTTOMPADDING', (0,0), (-1,-1), 8),
]))
story.append(t)
story.append(Spacer(1, 16))
story.extend(bullets([
    'Autonomous loop: validate → verify/pay → run tools → redact → report → persist audit trail.',
    'Optional OpenClawBridge sends sanitized advisory envelopes for AI security review.',
]))
story.append(PageBreak())

# Slide 5
story.append(Paragraph('Impact & Roadmap', styles['SlideTitle']))
story.extend(bullets([
    'Impact: safer, faster security triage for freelancers, agencies, and small product teams.',
    'Real-world deployability: Node.js, TypeScript, SQLite, PM2, Telegram, Pakasir QRIS, reproducible README.',
    'Current: Telegram-first MVP, verified web scans, public GitHub scans, QRIS credits, reports.',
    'Roadmap: dashboard UI, GitHub App for private repos, RAG remediation knowledge base, team workspaces.',
]))

doc.build(story)
print(OUT)
