#!/usr/bin/env python3
"""
Generate realistic, detailed sample PDF documents for SUTRA testing.

Outputs land in public/sample-documents/:
  * Judge flow   - two full criminal case files (FIR, Charge Sheet, Witness
                   Statements, Evidence/Exhibits, Bail Order / Framing Order)
  * Mediation    - two disputes, each with Party A (notice + evidence) and
                   Party B (reply + evidence) bundles.

Run:  python3 scripts/generate_sample_documents.py
"""

import os
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    HRFlowable, PageBreak, KeepTogether, Image,
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT, TA_JUSTIFY
from reportlab.lib.units import mm

BASE_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "public", "sample-documents")
os.makedirs(BASE_DIR, exist_ok=True)

INK = colors.HexColor("#0f172a")
SLATE = colors.HexColor("#475569")
MUTED = colors.HexColor("#64748b")
LIGHT = colors.HexColor("#f8fafc")
BORDER = colors.HexColor("#cbd5e1")
NAVY = colors.HexColor("#1e3a8a")
PURPLE = colors.HexColor("#581c87")
GREEN = colors.HexColor("#14532d")
RED = colors.HexColor("#991b1b")

styles = getSampleStyleSheet()

def S(name, **kw):
    base = kw.pop("parent", styles["Normal"])
    return ParagraphStyle(name, parent=base, **kw)

title_style = S("DocTitle", parent=styles["Heading1"], fontSize=15, leading=20,
                textColor=INK, alignment=TA_CENTER, fontName="Helvetica-Bold", spaceAfter=6)
subtitle_style = S("DocSubTitle", fontSize=9, leading=13, textColor=SLATE,
                   alignment=TA_CENTER, fontName="Helvetica-Bold", spaceAfter=14)
h1_style = S("H1", fontSize=11.5, leading=15, textColor=INK, fontName="Helvetica-Bold",
             spaceBefore=12, spaceAfter=5)
h2_style = S("H2", fontSize=10, leading=14, textColor=NAVY, fontName="Helvetica-Bold",
             spaceBefore=8, spaceAfter=4)
body_style = S("Body", fontSize=9.6, leading=14.5, textColor=SLATE, alignment=TA_JUSTIFY,
               spaceAfter=7)
small_style = S("Small", fontSize=8.4, leading=12, textColor=SLATE, alignment=TA_JUSTIFY,
                spaceAfter=5)
bold_body = S("BoldBody", fontSize=9.6, leading=14.5, textColor=INK, alignment=TA_LEFT,
              fontName="Helvetica-Bold", spaceAfter=6)
tbl_hdr = S("TblHdr", fontSize=8.4, leading=11, textColor=colors.white,
            fontName="Helvetica-Bold", alignment=TA_LEFT)
tbl_cell = S("TblCell", fontSize=8.2, leading=11.5, textColor=SLATE, alignment=TA_LEFT)
tbl_cell_b = S("TblCellB", parent=tbl_cell, fontName="Helvetica-Bold", textColor=INK)


class Doc:
    """Thin wrapper over SimpleDocTemplate with an on-page footer."""

    def __init__(self, filename, title="", watermark=""):
        self.filename = os.path.join(BASE_DIR, filename)
        self.title = title
        self.watermark = watermark
        self.doc = SimpleDocTemplate(
            self.filename, pagesize=A4,
            rightMargin=18 * mm, leftMargin=18 * mm, topMargin=16 * mm, bottomMargin=18 * mm,
        )
        self.el = []

    def footer(self, canvas, docobj):
        canvas.saveState()
        canvas.setStrokeColor(BORDER)
        canvas.setLineWidth(0.6)
        canvas.line(18 * mm, 13 * mm, A4[0] - 18 * mm, 13 * mm)
        canvas.setFont("Helvetica", 7.2)
        canvas.setFillColor(MUTED)
        canvas.drawString(18 * mm, 9.5 * mm, f"{self.title}  ·  SUTRA SAMPLE TEST BUNDLE")
        canvas.drawRightString(A4[0] - 18 * mm, 9.5 * mm, f"Page {docobj.page}")
        canvas.restoreState()

    def build(self):
        self.doc.build(self.el, onFirstPage=self.footer, onLaterPages=self.footer)
        kb = os.path.getsize(self.filename)
        print(f"  ✓ {os.path.basename(self.filename):55s} {kb/1024:6.1f} KB")


# ─────────────────────────────────────────────────────────────────────────────
# Layout helpers
# ─────────────────────────────────────────────────────────────────────────────

def court_banner(d, left_lines, right_lines, color=NAVY):
    """Top strip: court / forum on left, bundle tag on right."""
    left_txt = "<br/>".join(
        f"<b><font size=9 color='{INK}'>" + ln.replace("\x1a", "</font></b><br/><font size=7.6 color='#64748b'>")
        + "</font>" if "\x1a" in ln else f"<b><font size=9 color='{INK}'>{ln}</font></b>"
        for ln in left_lines
    )
    right_txt = "<br/>".join(
        f"<b><font size=8.2 color='{color}'>" + ln.replace("\x1a", "</font></b><br/><font size=7.4 color='#64748b'>")
        + "</font>" if "\x1a" in ln else f"<b><font size=8.2 color='{color}'>{ln}</font></b>"
        for ln in right_lines
    )
    t = Table([[Paragraph(left_txt, small_style), Paragraph(right_txt, small_style)]],
              colWidths=[128 * mm, 48 * mm])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), LIGHT),
        ("BOX", (0, 0), (-1, -1), 0.8, BORDER),
        ("INNERGRID", (0, 0), (-1, -1), 0.5, BORDER),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
    ]))
    d.el.append(t)
    d.el.append(Spacer(1, 4))


def meta_card(d, rows, color=NAVY):
    """Label/value metadata card."""
    cells = []
    for label, value in rows:
        cells.append(Paragraph(f"<b>{label}</b>", small_style))
        cells.append(Paragraph(value, tbl_cell))
    t = Table([cells[i:i + 2] for i in range(0, len(cells), 2)], colWidths=[52 * mm, 124 * mm])
    bg = colors.HexColor("#eff6ff") if color == NAVY else colors.HexColor("#faf5ff")
    border = colors.HexColor("#bfdbfe") if color == NAVY else colors.HexColor("#e9d5ff")
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), bg),
        ("BOX", (0, 0), (-1, -1), 0.8, border),
        ("INNERGRID", (0, 0), (-1, -1), 0.4, border),
        ("LEFTPADDING", (0, 0), (-1, -1), 7),
        ("RIGHTPADDING", (0, 0), (-1, -1), 7),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
    ]))
    d.el.append(t)
    d.el.append(Spacer(1, 8))


def title_block(d, title, subtitle):
    d.el.append(Paragraph(title, title_style))
    d.el.append(Paragraph(subtitle, subtitle_style))
    d.el.append(HRFlowable(width="100%", thickness=0.9, color=BORDER, spaceAfter=10))


def h1(d, text):
    d.el.append(KeepTogether(Paragraph(text, h1_style)))


def h2(d, text):
    d.el.append(KeepTogether(Paragraph(text, h2_style)))


def p(d, text, style=body_style):
    d.el.append(Paragraph(text, style))


def table(d, headers, rows, widths, hdr_bg=NAVY, zebra=True, font_size=8.2):
    hdr = [Paragraph(f"<b>{x}</b>", tbl_hdr) for x in headers]
    data = [hdr]
    cell_s = S("cell", fontSize=font_size, leading=11.5, textColor=SLATE, alignment=TA_LEFT)
    cell_b = S("cellb", parent=cell_s, fontName="Helvetica-Bold", textColor=INK)
    for r in rows:
        data.append([Paragraph(x, cell_b if i == 0 else cell_s) for i, x in enumerate(r)])
    t = Table(data, colWidths=widths, repeatRows=1)
    style = [
        ("BACKGROUND", (0, 0), (-1, 0), hdr_bg),
        ("GRID", (0, 0), (-1, -1), 0.5, BORDER),
        ("LEFTPADDING", (0, 0), (-1, -1), 5),
        ("RIGHTPADDING", (0, 0), (-1, -1), 5),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
    ]
    if zebra:
        for i in range(1, len(data)):
            if i % 2 == 0:
                style.append(("BACKGROUND", (0, i), (-1, i), LIGHT))
    t.setStyle(TableStyle(style))
    d.el.append(t)
    d.el.append(Spacer(1, 8))


def sign_block(d, left_lines, right_lines):
    d.el.append(Spacer(1, 10))
    d.el.append(HRFlowable(width="100%", thickness=0.5, color=BORDER, spaceAfter=12))
    left = "<br/><br/>".join(left_lines)
    right = "<br/><br/>".join(right_lines)
    t = Table([[Paragraph(left, small_style), Paragraph(right, small_style)]],
              colWidths=[88 * mm, 88 * mm])
    t.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 4),
        ("RIGHTPADDING", (0, 0), (-1, -1), 4),
    ]))
    d.el.append(t)


def pagebreak(d):
    d.el.append(PageBreak())


# ═══════════════════════════════════════════════════════════════════════════
# JUDGE — CASE 1 : State of Maharashtra vs. Rajesh Kumar
# Offences: IPC 420, 467, 468, 471, 120B (forgery & cheating, real-estate scam)
# ═══════════════════════════════════════════════════════════════════════════

def judge_case1_fir():
    d = Doc("Judge_Case1_FIR_FirstInformationReport.pdf",
            title="State of Maharashtra vs. Rajesh Kumar — First Information Report",
            watermark="FIR")
    court_banner(d,
        ["FIRST INFORMATION REPORT", "Form No. 8 · Rule 4.2, Criminal Manual of Practice, 2025"],
        ["CRIME NO.: 118/2026\x1aPS: MIDC ANDHERI (EAST)", "DATE: 05-Feb-2026\x1aU/S: 420, 467, 468, 471, 120B IPC"])
    title_block(d, "FIRST INFORMATION REPORT",
                "Recorded under Section 154, Code of Criminal Procedure, 1973 (as applicable)")

    meta_card(d, [
        ("POLICE STATION", "MIDC Andheri (East), Mumbai — 400093"),
        ("FIR / CRIME NUMBER", "118/2026"),
        ("DATE & TIME OF OCCURRENCE", "28-Jan-2026 between 14:00 hrs and 16:30 hrs"),
        ("DATE & TIME OF REPORT", "05-Feb-2026 at 11:45 hrs"),
        ("PLACE OF OCCURRENCE", "Office premises of M/s Sunrise Infra Ventures, 4th Floor, Plot 22, MIDC"),
        ("DISTANCE FROM PS", "1.2 km, attended within 18 minutes"),
        ("INFORMANT / COMPLAINANT", "Shri Anil Dattatreya Kulkarni, 52 yrs, proprietor of M/s Sunrise Infra Ventures"),
        ("ACCUSED", "(1) Rajesh Kumar alias R.K., s/o Suraj Prasad, 39 yrs; (2) two unidentified persons"),
    ])

    h1(d, "1. COMPLAINANT'S STATEMENT — FULL NARRATION")
    p(d, "On 28-Jan-2026 at about 10:00 hrs, the complainant Shri Anil Kulkarni received a telephone call from "
         "accused Rajesh Kumar, who introduced himself as the 'Sales & Marketing Head' of M/s Nimbus Buildcon Ltd., "
         "a reputed real-estate developer. The accused claimed that Nimbus Buildcon was launching a luxury residential "
         "project called 'The Sovereign Residences' at Tardeo, Mumbai, and offered the complainant an exclusive "
         "first-right-of-refusal on four apartments for bulk booking. The complainant was lured with a fabricated "
         "'pre-launch discount' of ₹18,00,000 per apartment, contingent on immediate advance payment.")
    p(d, "Believing the representation, the complainant transferred ₹62,00,000 through two RTGS transactions "
         "(₹35,00,000 on 28-Jan-2026 and ₹27,00,000 on 02-Feb-2026) to the account number 50100123XXXX 67890 "
         "maintained at HDFC Bank, MIDC branch, in the name of 'Nimbus Buildcon Ltd.' On 04-Feb-2026, the complainant "
         "visited the registered office of M/s Nimbus Buildcon at Nariman Point only to discover that the company "
         "had never launched any such project, that no employee by the name of Rajesh Kumar existed, and that the "
         "alleged project brochure, RERA registration number and allotment letters were all forged documents.")
    p(d, "A subsequent verification with HDFC Bank revealed that the beneficiary account was opened only on "
         "10-Jan-2026 in the name of a fictitious entity, and that the entire amount had been withdrawn in cash "
         "within 48 hours of receipt through a series of five cash withdrawals of ₹12,00,000 to ₹13,00,000 each, "
         "effected at different branches. The forged RERA brochure, fake allotment letters and bank account opening "
         "documents were handed over by the complainant to the investigating officer.")

    h1(d, "2. DESCRIPTION OF ACCUSED")
    p(d, "Accused Rajesh Kumar alias R.K., aged about 39 years, fair complexion, height approximately 5 ft 8 in, "
         "wearing a light-blue formal shirt and dark trousers at the time of meeting; speaks fluent Hindi, Marathi "
         "and English; operates through mobile number +91 98XXXX3210 and email rajesh.k.rk@gmail.com. He visited the "
         "complainant's office on three occasions (12-Jan-2026, 20-Jan-2026 and 28-Jan-2026) presenting himself with "
         "an official-looking identity card of 'Nimbus Buildcon Ltd.'. CCTV footage of the MIDC office lobby dated "
         "28-Jan-2026 has been seized and preserved.")

    h1(d, "3. MEDICAL / FORENSIC & DOCUMENTARY EVIDENCE")
    p(d, "The complainant handed over the following documents for forensic examination: (a) two forged RERA "
         "registration certificates bearing Registration No. P52000012345; (b) four 'allotment letters' bearing the "
         "purported signature of Nimbus Buildcon's Managing Director; (c) a coloured brochure of the fictitious "
         "'Sovereign Residences' project; and (d) two RTGS acknowledgement receipts. All documents were sealed and "
         "forwarded to the Directorate of Forensic Science Laboratory, Kalina, for handwriting and digital forensic "
         "examination vide forwarding letter dated 05-Feb-2026.")

    h1(d, "4. WITNESSES TO THE INCIDENT / CUSTODY AND FURTHER ACTION")
    p(d, "The following witnesses were identified during the preliminary inquiry: (1) Shri Sunil Jadhav, reception "
         "staff, MIDC office, who received the accused on his visits; (2) Shri Deepak Rane, office accountant, who "
         "witnessed the discussion of 28-Jan-2026; and (3) Shri Mohd. Irfan, security guard, who observed the accused "
         "leaving the premises in a white Hyundai Creta bearing registration MH-01-XX-4522.")
    p(d, "The case is registered and investigation is taken up under Section 156(3) CrPC. A request for issuance of "
         "Lokk Upay / look-out-circular against the accused and for freezing of the beneficiary bank account has been "
         "made. Further investigation is in progress and the accused is yet to be arrested.")

    sign_block(d,
        ["<b>Signature of informant/complainant</b>", "Shri Anil Dattatreya Kulkarni", "Dated: 05-Feb-2026, 12:10 hrs"],
        ["<b>Signature of recording officer</b>", "PSI Sandeep R. More, Officer-in-Charge", "MIDC Andheri (East) Police Station"])
    d.build()


def judge_case1_chargesheet():
    d = Doc("Judge_Case1_ChargeSheet_FinalReport.pdf",
            title="State of Maharashtra vs. Rajesh Kumar — Charge Sheet / Final Report",
            watermark="CHARGESHEET")
    court_banner(d,
        ["FINAL REPORT (CHARGE SHEET)", "Filed under Section 173(2), Code of Criminal Procedure, 1973"],
        ["CRIME NO.: 118/2026\x1aPS: MIDC ANDHERI (EAST)", "CASE FILED AS R.C./S.C. 118 of 2026"])
    title_block(d, "FINAL REPORT / CHARGE SHEET",
                "In the Court of the Chief Metropolitan Magistrate, Borivali, Mumbai")

    meta_card(d, [
        ("POLICE STATION / CRIME", "MIDC Andheri (East) — Crime No. 118/2026"),
        ("DATE OF REGISTRATION", "05-Feb-2026"),
        ("INVESTIGATING OFFICER", "PSI Sandeep R. More, MIDC (E) PS"),
        ("DATE OF SUBMISSION", "22-Mar-2026 (period of investigation: 45 days)"),
        ("ACCUSED", "Rajesh Kumar alias R.K., s/o Suraj Prasad, 39 yrs, r/o 214, Shivaji Nagar, Govandi, Mumbai"),
        ("STATUS OF ACCUSED", "Arrested on 12-Mar-2026; forwarded to judicial custody; charge-sheeted"),
        ("FINAL SECTIONS", "Sections 420, 467, 468, 471 read with 120B, Indian Penal Code"),
    ])

    h1(d, "1. SYNOPSIS OF INVESTIGATION")
    p(d, "Investigation established that the accused, in furtherance of a common criminal conspiracy with two "
         "absconding associates, dishonestly induced Shri Anil Kulkarni to part with ₹62,00,000 on the false "
         "representation of a non-existent real-estate project. The accused opened a bank account in the name of a "
         "fictitious 'Nimbus Buildcon Ltd.' using forged incorporation documents and forged specimen signatures, "
         "received the complainant's funds, and immediately withdrew the entire amount in cash. The accused was "
         "arrested on 12-Mar-2026 from a rented premise in Govandi; an amount of ₹4,75,000, a forged stamp of the "
         "company, two mobile phones and one laptop were recovered under a seizure memo attested by two independent "
         "panch witnesses.")

    h1(d, "2. STATEMENTS OF WITNESSES EXAMINED U/S 161 CrPC")
    table(d,
        ["Witness", "Name & Particulars", "Date of Statement", "Gist of Statement"],
        [
            ["PW-1", "Anil D. Kulkarni — complainant, proprietor M/s Sunrise Infra Ventures", "05-Feb-2026",
             "Narrated the cheating in detail; identified accused in TI parade on 15-Mar-2026"],
            ["PW-2", "Sunil Jadhav — reception staff, MIDC office", "07-Feb-2026",
             "Received the accused thrice; identified his photograph from mobile"],
            ["PW-3", "Deepak Rane — accountant, Sunrise Infra", "07-Feb-2026",
             "Prepared RTGS transfer instructions; verified beneficiary details"],
            ["PW-4", "Mohd. Irfan — security guard", "08-Feb-2026",
             "Saw accused leave in white Hyundai Creta MH-01-XX-4522 on 28-Jan-2026"],
            ["PW-5", "Shri R. V. Khandekar — Manager, HDFC MIDC", "12-Feb-2026",
             "Confirmed beneficiary account opened 10-Jan-2026; cash withdrawals of ₹62,00,000"],
            ["PW-6", "Raksha Rao — Asst. Registrar, Companies ROC", "18-Feb-2026",
             "Certified that 'Nimbus Buildcon Ltd.' is not a registered company"],
            ["PW-7", "Dr. Nalini Menon — Dy. Director, FSL Kalina", "05-Mar-2026",
             "Handwriting report confirms forged signatures & fabricated documents"],
            ["PW-8", "API Meera Deshmukh — Investigating Officer", "20-Mar-2026",
             "Detailed investigation summary, recovery & CCTV analysis"],
        ],
        [16 * mm, 52 * mm, 28 * mm, 80 * mm])

    h1(d, "3. LIST OF EXHIBITS / ARTICLES SEIZED & FORWARDED TO COURT")
    table(d,
        ["Exhibit", "Description", "Seized/Collected From", "Remarks"],
        [
            ["A-1", "Forged RERA certificates (2 nos.)", "Complainant", "Forwarded to FSL"],
            ["A-2", "Fake allotment letters (4 nos.)", "Complainant", "Forwarded to FSL"],
            ["A-3", "Project brochure — 'The Sovereign Residences'", "Complainant", "Forwarded to FSL"],
            ["A-4", "RTGS acknowledgement receipts (2 nos.)", "Complainant", "—"],
            ["A-5", "Beneficiary account opening file", "HDFC Bank, MIDC", "Under banker's attestation"],
            ["A-6", "Cash withdrawal vouchers (5 nos.)", "HDFC Bank", "Withdrawal of ₹62,00,000"],
            ["A-7", "Recovered cash ₹4,75,000", "Seizure 12-Mar-2026", "Under Panchanama"],
            ["A-8", "Forged company rubber stamp", "Seizure 12-Mar-2026", "Forwarded to FSL"],
            ["A-9", "Mobile phones (2 nos.)", "Seizure 12-Mar-2026", "Digital forensics pending"],
            ["A-10", "Laptop (HP ProBook)", "Seizure 12-Mar-2026", "Digital forensics pending"],
            ["A-11", "CCTV footage of MIDC office lobby", "Sunrise Infra Ventures", "Dated 28-Jan-2026"],
        ],
        [16 * mm, 62 * mm, 48 * mm, 50 * mm])

    h1(d, "4. REASON TO BELIEVE ACCUSED GUILTY")
    p(d, "The prosecution case rests on (i) the direct and credible testimony of the complainant; (ii) corroboration "
         "by independent witnesses and CCTV footage; (iii) forensic opinion of FSL, Kalina, confirming that the "
         "documents relied upon by the accused are fabricated and the purported signatures are not genuine; "
         "(iv) unimpeachable documentary evidence from HDFC Bank establishing receipt and dissipation of funds; and "
         "(v) recovery of incriminating articles from the personal custody of the accused. On the above material, "
         "there exists sufficient ground to proceed against the accused for the offences charged.")

    h1(d, "5. DOCUMENTS/CERTIFICATES FILED WITH CHARGE SHEET")
    p(d, "Copy of FIR; statements recorded u/s 161 CrPC of witnesses PW-1 to PW-8; seizure panchanamas; CCTV "
         "preservation memo; FSL report; bank verification certificate; ROC non-registration certificate; TIP "
         "proceedings report; arrest memo and medical report of the accused; and the covering report of the "
         "Investigating Officer under Section 173(2) CrPC.")

    sign_block(d,
        ["<b>Prepared by:</b>", "PSI Sandeep R. More", "Investigating Officer, MIDC (E) PS"],
        ["<b>Approved by:</b>", "ACPI Vishal S. Patil", "Zone 8, Mumbai City", "Forwarded to Court, 22-Mar-2026"])
    d.build()


def judge_case1_witnesses():
    d = Doc("Judge_Case1_WitnessStatements.pdf",
            title="State of Maharashtra vs. Rajesh Kumar — Witness Statements",
            watermark="WITNESSES")
    court_banner(d,
        ["WITNESS STATEMENTS & DEPOSITIONS", "Recorded under Section 161 CrPC / Examination-in-chief"],
        ["CRIME NO.: 118/2026\x1aPS: MIDC ANDHERI (EAST)", "STATE vs. RAJESH KUMAR"])
    title_block(d, "STATEMENTS OF PROSECUTION WITNESSES",
                "Recorded during investigation and reproduced for case analysis")

    h1(d, "PW-1 — Shri Anil Dattatreya Kulkarni (Complainant), 52 yrs")
    h2(d, "Statement u/s 161 CrPC recorded on 05-Feb-2026")
    p(d, "I am the proprietor of M/s Sunrise Infra Ventures, engaged in infrastructure contracting in Mumbai. On "
         "10-Jan-2026 I received a promotional call from one Rajesh Kumar introducing himself as Sales Head of "
         "M/s Nimbus Buildcon Ltd. He informed me about a pre-launch opportunity in a luxury project at Tardeo and "
         "offered a discount of ₹18 lakh per apartment for bulk booking of four units. He visited my office on "
         "12-Jan-2026, 20-Jan-2026 and 28-Jan-2026, showing me a glossy brochure, a RERA certificate and sample "
         "allotment letters, all of which looked authentic. On his insistence I transferred ₹35,00,000 on 28-Jan-2026 "
         "and ₹27,00,000 on 02-Feb-2026 to the account of 'Nimbus Buildcon Ltd.' at HDFC MIDC. When I visited the "
         "Nariman Point office on 04-Feb-2026, I was told no such project existed. I immediately approached the "
         "police and lodged the complaint. I later identified the accused in the Test Identification Parade conducted "
         "on 15-Mar-2026 at Arthur Road Jail.")
    h2(d, "Cross-examination highlights (recorded on 18-May-2026)")
    p(d, "I maintain that I verified the RERA number appearing on the brochure online before making the first "
         "payment; however I did not print the verification page. I agree I never visited the Tardeo site before "
         "paying. I did not independently call the 'company landline' because the accused always called from his "
         "mobile. The police returned ₹4,75,000 recovered from the accused; the balance remains un-recovered. I am "
         "aware the accused has claimed the money was a 'friendship loan' — I deny this entirely.")

    h1(d, "PW-2 — Shri Sunil Jadhav (Receptionist, Sunrise Infra Ventures)")
    h2(d, "Statement u/s 161 CrPC recorded on 07-Feb-2026")
    p(d, "I work as receptionist at Sunrise Infra Ventures for the last six years. The accused visited our office on "
         "three occasions. On each visit he waited for the proprietor and handed over his visiting card. I remember "
         "him because he was well-dressed and spoke very confidently. On 28-Jan-2026 he stayed for about two hours. "
         "He was accompanied by another person whom I did not see on earlier visits. I identified the accused from "
         "his photograph shown to me by the police.")

    h1(d, "PW-3 — Shri Deepak Rane (Accountant, Sunrise Infra Ventures)")
    h2(d, "Statement u/s 161 CrPC recorded on 07-Feb-2026")
    p(d, "As accountant I prepared the RTGS transfer request for ₹35,00,000 on 28-Jan-2026 and for ₹27,00,000 on "
         "02-Feb-2026, both favouring 'Nimbus Buildcon Ltd.' Account No. 50100123XXXX67890 at HDFC MIDC. The "
         "proprietor approved the transfers based on the documents shown by the accused. I retain the bank "
         "acknowledgements in our office records, which I handed over to the police.")

    h1(d, "PW-4 — Shri Mohd. Irfan (Security Guard)")
    h2(d, "Statement u/s 161 CrPC recorded on 08-Feb-2026")
    p(d, "I am posted at the main gate of the MIDC office complex. On 28-Jan-2026 at about 16:45 hrs I saw the "
         "accused leaving the premises and getting into a white Hyundai Creta, registration number MH-01-XX-4522. I "
         "noted the number because the car was brand new and had no number plate frame. The driver looked like the "
         "same person shown to me later by the police.")

    h1(d, "PW-7 — Dr. Nalini Menon (Deputy Director, Forensic Science Laboratory, Kalina)")
    h2(d, "Expert report dated 05-Mar-2026 (FSL/Kalina/2026/118)")
    p(d, "On examination of the questioned documents (Exhibits A-1 to A-3) against admitted signatures of the "
         "purported Managing Director of Nimbus Buildcon and of the accused, I am of the opinion that: (i) the "
         "signatures on the allotment letters and RERA certificates are not genuine and have been traced/simulated; "
         "(ii) the company stamp affixed on the documents was prepared using a crude engraved master not matching "
         "the genuine seal; and (iii) the brochures bear evidence of digital manipulation in the text layer. Full "
         "report with enlarged exhibits and spectrographic charts is annexed.")

    h1(d, "PW-8 — API Meera Deshmukh (Investigating Officer)")
    h2(d, "Statement u/s 161 CrPC recorded on 20-Mar-2026")
    p(d, "I took over investigation on 08-Feb-2026. I recorded statements of PW-1 to PW-7, seized the CCTV footage, "
         "obtained the HDFC bank account opening file and withdrawal vouchers, and obtained the FSL report. On "
         "12-Mar-2026 I arrested the accused from a rented room in Govandi and recovered ₹4,75,000, a forged company "
         "stamp, two mobile phones and a laptop. The test identification parade was conducted on 15-Mar-2026 wherein "
         "the complainant correctly identified the accused. On completion, I submitted the final report on "
         "22-Mar-2026.")

    sign_block(d,
        ["<b>Recorded & verified by:</b>", "PSI Sandeep R. More", "Investigating Officer"],
        ["<b>Witnesses:</b>", "PW-1 to PW-4, PW-7, PW-8", "As deposed above"])
    d.build()


def judge_case1_evidence():
    d = Doc("Judge_Case1_Evidence_Exhibits.pdf",
            title="State of Maharashtra vs. Rajesh Kumar — Evidence & Exhibits Register",
            watermark="EVIDENCE")
    court_banner(d,
        ["EVIDENCE & EXHIBIT REGISTER", "Inventory of exhibits marked in evidence"],
        ["CRIME NO.: 118/2026\x1aPS: MIDC ANDHERI (EAST)", "BEFORE THE CMM, BORIVALI, MUMBAI"])
    title_block(d, "REGISTER OF EXHIBITS & MATERIAL EVIDENCE",
                "Documentary, physical and digital evidence relied upon by the prosecution")

    h1(d, "1. DOCUMENTARY EVIDENCE (EXHIBITS)")
    table(d,
        ["Exhibit No.", "Particulars", "Date", "Marked / Provenance"],
        [
            ["Ex-A1", "Forged RERA Registration Certificate No. P52000012345 (2 copies)", "Undated", "Produced by PW-1"],
            ["Ex-A2", "Fake Allotment Letters for Units 701–704, 'The Sovereign Residences' (4 nos.)", "Jan-2026", "Produced by PW-1"],
            ["Ex-A3", "Coloured Project Brochure — 'The Sovereign Residences'", "Dec-2025", "Produced by PW-1"],
            ["Ex-A4", "RTGS Acknowledgement — ₹35,00,000 (HDFC)", "28-Jan-2026", "Produced by PW-3"],
            ["Ex-A5", "RTGS Acknowledgement — ₹27,00,000 (HDFC)", "02-Feb-2026", "Produced by PW-3"],
            ["Ex-A6", "HDFC Account Opening File — 'Nimbus Buildcon Ltd.'", "10-Jan-2026", "Produced by PW-5"],
            ["Ex-A7", "HDFC Withdrawal Vouchers (5 nos.) totalling ₹62,00,000", "29-Jan to 04-Feb-2026", "Produced by PW-5"],
            ["Ex-A8", "ROC Certificate of Non-Registration of Nimbus Buildcon Ltd.", "18-Feb-2026", "Produced by PW-6"],
            ["Ex-A9", "FSL Handwriting & Document Examination Report", "05-Mar-2026", "Produced by PW-7"],
            ["Ex-A10", "CCTV Footage Preservation Memo & stills", "28-Jan-2026", "Produced by IO"],
            ["Ex-A11", "Seizure Panchanama — cash ₹4,75,000 & articles", "12-Mar-2026", "Produced by IO"],
            ["Ex-A12", "Test Identification Parade Report", "15-Mar-2026", "Produced by IO"],
        ],
        [20 * mm, 88 * mm, 30 * mm, 38 * mm])

    h1(d, "2. PHYSICAL / MATERIAL EVIDENCE")
    table(d,
        ["Item", "Description", "Chain of Custody", "Status"],
        [
            ["M-1", "Recovered cash ₹4,75,000 (currency bundles with note serials)", "Seized 12-Mar-2026; kept in court custody", "Under court deposit"],
            ["M-2", "Forged rubber stamp of 'Nimbus Buildcon Ltd.'", "Seizure; FSL examined", "Marked M-2"],
            ["M-3", "Samsung Galaxy A55 mobile (white) — accused", "Seizure; forensic image taken", "Custody"],
            ["M-4", "Redmi Note 13 mobile (black) — co-accused", "Seizure; forensic image taken", "Custody"],
            ["M-5", "HP ProBook 450 laptop", "Seizure; digital forensics report annexed", "Custody"],
            ["M-6", "White Hyundai Creta MH-01-XX-4522", "Seized from M/s Shree Carz, Andheri", "Forensic inspection"],
        ],
        [18 * mm, 74 * mm, 52 * mm, 32 * mm])

    h1(d, "3. ELECTRONIC EVIDENCE")
    p(d, "(a) Call detail records of mobile No. +91 98XXXX3210 for the period 10-Jan-2026 to 05-Feb-2026, obtained "
         "from the service provider under Section 91 CrPC, showing repeated calls to the complainant's number; "
         "(b) WhatsApp chat extract between the accused and complainant containing the forged brochure and allotment "
         "letters; (c) bank trail analysis report prepared by the Economic Offences Wing collating the flow of the "
         "₹62,00,000 from the complainant's account to the fictitious account and its cash dissipation. CDRs are "
         "accompanied by the requisite certificate under Section 65B of the Indian Evidence Act, 1872.")

    h1(d, "4. MODE OF PROOF / RELEVANCE")
    p(d, "The exhibits above are relied upon cumulatively to establish the ingredients of cheating under Section 420 "
         "IPC (dishonest inducement, delivery of property), forgery under Sections 467–468 IPC (fabrication of "
         "valuable security) and use of forged documents under Section 471 IPC, committed in furtherance of a "
         "conspiracy punishable under Section 120B IPC.")

    sign_block(d,
        ["<b>Court/Investigation office:</b>", "CMM Court, Borivali, Mumbai", "Exhibit register authenticated"],
        ["<b>Prepared by:</b>", "PSI Sandeep R. More", "Investigating Officer"])
    d.build()


def judge_case1_bail():
    d = Doc("Judge_Case1_BailOrder.pdf",
            title="State of Maharashtra vs. Rajesh Kumar — Bail Order",
            watermark="BAIL ORDER")
    court_banner(d,
        ["ORDER ON BAIL APPLICATION", "B.A. No. 212 of 2026 in C.C. No. 118/2026"],
        ["BEFORE THE CMM, BORIVALI, MUMBAI\x1aCRIME NO.: 118/2026"])
    title_block(d, "ORDER ON BAIL APPLICATION",
                "Section 437, Code of Criminal Procedure, 1973 — case under IPC 420, 467, 468, 471 r/w 120B")

    h1(d, "1. FACTS IN BRIEF")
    p(d, "The applicant Rajesh Kumar has filed this application seeking bail in respect of Crime No. 118/2026 of "
         "MIDC Andheri (East) PS. The complainant alleges that the applicant dishonestly induced him to part with "
         "₹62,00,000 on the representation of a non-existent real-estate project, using forged documents. The "
         "applicant was arrested on 12-Mar-2026 and has been in judicial custody since 13-Mar-2026. Investigation "
         "has been completed and the charge sheet was filed on 22-Mar-2026.")

    h1(d, "2. SUBMISSIONS OF THE APPLICANT")
    p(d, "Learned counsel for the applicant submits that (i) the applicant is a permanent resident of Mumbai with no "
         "criminal antecedents; (ii) the amount allegedly received was a business loan from a 'friend' and the "
         "complainant has misconstrued a civil transaction as a criminal offence; (iii) all documents are in the "
         "custody of the investigating agency and there is no possibility of tampering; (iv) the charge sheet has "
         "already been filed, thereby concluding the investigation; and (v) the applicant undertakes to abide by any "
         "conditions imposed and to cooperate with the trial.")

    h1(d, "3. SUBMISSIONS OF THE STATE / COMPLAINANT")
    p(d, "The Investigating Officer opposes bail contending that the applicant is a flight risk, that he has "
         "absconded associates who remain untraced, and that the scale of the fraud (₹62,00,000 dissipated within "
         "48 hours) indicates a well-organised modus operandi. It is further contended that digital forensics on the "
         "seized devices is still underway and that the applicant may influence witnesses if released.")

    h1(d, "4. REASONING & ANALYSIS")
    p(d, "The offence of cheating and forgery is not punishable with death or imprisonment for life. The investigation "
         "stands completed and the final report has been filed. The documents relied upon by the prosecution are in "
         "judicial custody and the witnesses' statements are already recorded. Considering the totality of facts, "
         "particularly the completion of investigation, the absence of criminal antecedents, and the applicant's "
         "permanent residence, this Court is inclined to grant bail, subject to stringent conditions to safeguard "
         "the trial.")

    h1(d, "5. ORDER")
    p(d, "<b>IT IS ORDERED THAT</b> the application for bail is <b>ALLOWED</b> on the following conditions:")
    p(d, "1. The applicant shall furnish a PR bond of ₹3,00,000 with two sureties of the like amount to the "
         "satisfaction of the Court.")
    p(d, "2. The applicant shall surrender his passport before the Investigating Officer and shall not leave the "
         "jurisdiction of Mumbai without prior written permission of this Court.")
    p(d, "3. The applicant shall report to the MIDC Andheri (E) Police Station on the 1st and 15th of every month "
         "between 10:00 a.m. and 12:00 noon until the conclusion of trial.")
    p(d, "4. The applicant shall not contact or influence witnesses, directly or indirectly, and shall not change "
         "his residential address without informing the Investigating Officer.")
    p(d, "5. The applicant shall appear before the Court on every date of hearing and shall not seek unnecessary "
         "adjournments.")
    p(d, "Violation of any of the above conditions shall result in cancellation of bail. Sureties to be verified "
         "before release.")

    sign_block(d,
        ["<b>Sd/-</b>", "Hon'ble Chief Metropolitan Magistrate", "Borivali, Mumbai"],
        ["Dated: 08-Apr-2026", "C.C. No. 118/2026", "Copy to: IO, MIDC (E) PS; Prosecution"])
    d.build()


# ═══════════════════════════════════════════════════════════════════════════
# JUDGE — CASE 2 : State (CBI) vs. Suresh Yadav & Ors.
# Offences: IPC 408/409, 420, 471 r/w 120B (bank fraud / misappropriation)
# ═══════════════════════════════════════════════════════════════════════════

def judge_case2_fir():
    d = Doc("Judge_Case2_FIR_FirstInformationReport.pdf",
            title="State (CBI/BS&FC) vs. Suresh Yadav & Ors. — First Information Report",
            watermark="FIR")
    court_banner(d,
        ["FIRST INFORMATION REPORT", "Reg. No. RC-3(A)/2026/BS&FC — Economic Offences"],
        ["CBI BS&FC, NEW DELHI\x1aRC-3(A)/2026/BS&FC", "U/S: 408, 409, 420, 471 r/w 120B IPC"])
    title_block(d, "FIRST INFORMATION REPORT",
                "Registered on complaint of the Bank of Hindustan, Corporate Fraud Cell")

    meta_card(d, [
        ("AGENCY & REGISTRATION", "CBI, Bank Securities & Fraud Cell (BS&FC), New Delhi — RC-3(A)/2026/BS&FC"),
        ("DATE & TIME OF REPORT", "14-Jan-2026 at 15:20 hrs"),
        ("COMPLAINANT", "Shri Pradeep K. Menon, Chief Manager, Bank of Hindustan, Zonal Office, Connaught Place, New Delhi"),
        ("PRINCIPAL ACCUSED", "(1) Suresh Yadav — former Branch Manager, BO Ansal Plaza; (2) Vipin Arora — Relationship Manager; (3) Anita Rawat — Cashier-cum-Accountant; (4) 11 co-accused borrowers"),
        ("AMOUNT INVOLVED", "₹11,42,00,000 (Eleven Crore Forty-Two Lakh) — gross irregular; ₹9,05,00,000 outstanding"),
    ])

    h1(d, "1. COMPLAINANT'S STATEMENT — FULL NARRATION")
    p(d, "The complainant states that during an annual concurrent audit conducted between 18-Dec-2025 and "
         "08-Jan-2026, serious irregularities were detected in the Ansal Plaza branch (Delhi) of the Bank of "
         "Hindustan. It was found that between April 2024 and November 2025, the branch management sanctioned and "
         "disbursed 13 'gold loan' and 9 'cash credit' facilities totalling ₹11,42,00,000 against collateral that "
         "was either over-valued, fictitious or never deposited. The audit further revealed that branch-level "
         "software entries were made in the names of 11 dummy borrowers, and the sanctioned amounts were routed "
         "to accounts controlled by the then Branch Manager, Shri Suresh Yadav.")
    p(d, "A forensic review of the CBS (Core Banking Solution) logs established that loan limit entries and "
         "disbursement postings were authorised from the login credentials of the accused Suresh Yadav and Vipin "
         "Arora between 01-Apr-2024 and 30-Nov-2025, mostly after business hours. Physical verification of "
         "collateral revealed that the gold ornaments pledged for loans totalling ₹7,00,00,000 were never deposited "
         "in the branch strong room, and in place of the documented jewellery, the branch possessed only an "
         "unverified locker inventory. The cash credit accounts show fund rotation among 11 accounts with a common "
         "set of mobile numbers and KYC details.")
    p(d, "The complainant states that prima facie a criminal conspiracy exists among the branch officials and the "
         "borrowers to misappropriate bank funds through fabrication of loan documents and false collateral records. "
         "The bank has conducted a preliminary inquiry (PIN No. 2026/BH/017) and requests the CBI to register an FIR "
         "and investigate. No fraud has been acknowledged by the accused; a charge has not yet been recovered.")

    h1(d, "2. DESCRIPTION OF PRINCIPAL ACCUSED")
    p(d, "(1) Suresh Yadav, ~45 yrs, former Branch Manager, BO Ansal Plaza, r/o 4B, Palm Court, Dwarka, New Delhi; "
         "(2) Vipin Arora, ~34 yrs, Relationship Manager, r/o 18/32, Karol Bagh, New Delhi; (3) Anita Rawat, ~38 yrs, "
         "Cashier-cum-Accountant, r/o 902, Green Tower, Rohini, New Delhi. The 11 borrowers are identified by name "
         "and KYC record in the annexure to the FIR.")

    h1(d, "3. EVIDENCE COLLECTED AT COMPLAINT STAGE")
    p(d, "The complainant has furnished: (a) the concurrent audit report extract; (b) the preliminary inquiry report "
         "PIN 2026/BH/017; (c) a schedule of 22 irregular loan accounts with sanctioned and outstanding amounts; "
         "(d) CBS user-login audit trail extract; (e) KYC and mobile-number clustering analysis; and (f) certified "
         "copies of the sanction memos. All documents bear the requisite certificate under Section 65B of the Indian "
         "Evidence Act, 1872 where applicable.")

    h1(d, "4. ACTION TAKEN")
    p(d, "The case has been registered and investigation has been taken up. A request has been made to the bank to "
         "preserve all CBS logs, CCTV footage of the strong room and cash area for the relevant period, and to "
         "produce the attested loan files. Freezing of the identified beneficiary accounts is recommended. A "
         "combined search operation is planned. Further investigation is in progress.")

    sign_block(d,
        ["<b>Signature of complainant</b>", "Shri Pradeep K. Menon", "Chief Manager, Bank of Hindustan", "Dated: 14-Jan-2026"],
        ["<b>Received & registered by</b>", "SP V. K. Bhalla, CBI/BS&FC", "New Delhi", "Dated: 14-Jan-2026"])
    d.build()


def judge_case2_chargesheet():
    d = Doc("Judge_Case2_ChargeSheet_FinalReport.pdf",
            title="State (CBI) vs. Suresh Yadav & Ors. — Charge Sheet",
            watermark="CHARGESHEET")
    court_banner(d,
        ["FINAL REPORT (CHARGE SHEET)", "Filed under Section 173(2) CrPC"],
        ["RC-3(A)/2026/BS&FC\x1aCBI BS&FC, NEW DELHI", "BEFORE CHIEF METROPOLITAN MAGISTRATE, DELHI"])
    title_block(d, "FINAL REPORT / CHARGE SHEET",
                "In the matter of State (CBI) vs. Suresh Yadav & 13 Ors.")

    meta_card(d, [
        ("RC NUMBER", "RC-3(A)/2026/BS&FC"),
        ("DATE OF REGISTRATION", "14-Jan-2026"),
        ("SUPERINTENDENT OF POLICE", "SP V. K. Bhalla, CBI/BS&FC"),
        ("INVESTIGATION PERIOD", "14-Jan-2026 to 30-Apr-2026"),
        ("ACCUSED CHARGED", "Suresh Yadav (A-1), Vipin Arora (A-2), Anita Rawat (A-3) and 11 borrowers (A-4 to A-14)"),
        ("OFFENCES", "Sections 408, 409, 420, 471 r/w 120B IPC"),
        ("APPROX. LOSS", "₹11,42,00,000 (irregular); ₹9,05,00,000 (outstanding)"),
    ])

    h1(d, "1. SYNOPSIS OF INVESTIGATION")
    p(d, "Investigation revealed a well-orchestrated scheme by the accused. Suresh Yadav, as Branch Manager, "
         "sanctioned loan facilities to 22 accounts — 13 gold loans and 9 cash credits — without any legitimate "
         "collateral. The gold stated to be pledged (₹7,00,00,000) was never deposited. Loan limit entries and "
         "disbursements were posted using A-1's and A-2's CBS logins after banking hours, and the proceeds were "
         "transferred into a web of 11 inter-connected accounts (A-4 to A-14) which showed circular fund rotation. "
         "Anita Rawat (A-3) was instrumental in preparing forged KYC documents and signing off 'cash paid' vouchers "
         "without actual disbursement. Searches conducted on 20-Feb-2026 recovered documents, digital devices and "
         "part jewellery worth ₹1,02,00,000. The accused were arrested between 20-Feb-2026 and 05-Mar-2026 and are "
         "in judicial custody.")

    h1(d, "2. ACCUSED & ROLES")
    table(d,
        ["Accused", "Designation", "Role in offence"],
        [
            ["A-1 Suresh Yadav", "Ex-Branch Manager", "Mastermind; sanctioned dummy loans; authorised postings"],
            ["A-2 Vipin Arora", "Ex-Relationship Manager", "Prepared fake appraisal notes; opened accounts of dummy borrowers"],
            ["A-3 Anita Rawat", "Ex-Cashier-cum-Accountant", "Forged KYC; signed bogus cash vouchers"],
            ["A-4 … A-14", "11 dummy borrowers", "KYC rent-seeking; accounts used for siphoning"],
        ],
        [46 * mm, 48 * mm, 82 * mm])

    h1(d, "3. LIST OF WITNESSES")
    table(d,
        ["Witness", "Name & Particulars", "Gist of Evidence"],
        [
            ["CW-1", "Pradeep K. Menon — Chief Manager (complainant)", "Concurrent audit findings; loss computation"],
            ["CW-2", "R. Subramanian — Concurrent Auditor, Chartered Accountant", "Detected the anomalies; prepared audit extract"],
            ["CW-3", "Dr. K. L. Narang — Valuer (independent)", "Certified collateral valuation report"],
            ["CW-4", "S. Bhattacharya — DGM (CBS Administration)", "Confirmed login-based postings & audit trail"],
            ["CW-5", "Meena Sood — Branch in-charge (succeeding)", "Physical verification of strong room & lockers"],
            ["CW-6", "Vikas Thakur — IT Forensics Analyst, CBI", "Mobile & account clustering; fund rotation analysis"],
            ["CW-7", "Rajeev Tandon — Handwriting Expert", "Forgery of KYC & sanction documents"],
            ["CW-8", "API / I.O. — CBI", "Investigation summary"],
        ],
        [22 * mm, 60 * mm, 94 * mm])

    h1(d, "4. EXHIBITS")
    table(d,
        ["Exhibit", "Description", "Source"],
        [
            ["B-1", "Certified copy of FIR/RC", "CBI"],
            ["B-2", "Concurrent audit report extract", "CW-2"],
            ["B-3", "Preliminary inquiry report PIN 2026/BH/017", "Bank"],
            ["B-4", "Schedule of 22 irregular loan accounts", "Bank"],
            ["B-5", "CBS user-login audit trail (CDR/excel)", "CW-4"],
            ["B-6", "KYC & mobile clustering analysis", "CW-6"],
            ["B-7", "Collateral valuation report", "CW-3"],
            ["B-8", "Forged sanction memos & vouchers", "CW-7 / seized"],
            ["B-9", "Recovered jewellery ₹1,02,00,000", "Search 20-Feb-2026"],
            ["B-10", "Digital devices (7 phones, 3 laptops)", "Search 20-Feb-2026"],
            ["B-11", "Bank statements of 11 dummy accounts", "Bank"],
        ],
        [18 * mm, 96 * mm, 62 * mm])

    h1(d, "5. REASON TO BELIEVE GUILT & DOCUMENTS FILED")
    p(d, "The prosecution relies on the oral testimony of CW-1 to CW-8, corroborated by the documentary and digital "
         "evidence listed above, to establish criminal misappropriation, criminal breach of trust by a banker, "
         "cheating and forgery in a systematic conspiracy. Sufficient grounds exist to charge the accused. The final "
         "report is accompanied by copies of statements u/s 161 CrPC, search and seizure memos, arrest memos, "
         "forensic reports, sanction order u/s 19 P.C. Act (nil, as P.C. Act is not invoked) and the Section 65B "
         "certificates.")

    sign_block(d,
        ["<b>Prepared by:</b>", "Dy. SP Rahul Srivastava", "CBI/BS&FC, New Delhi"],
        ["<b>Approved by:</b>", "SP V. K. Bhalla", "CBI/BS&FC, New Delhi", "Filed: 30-Apr-2026"])
    d.build()


def judge_case2_witnesses():
    d = Doc("Judge_Case2_WitnessStatements.pdf",
            title="State (CBI) vs. Suresh Yadav & Ors. — Witness Statements",
            watermark="WITNESSES")
    court_banner(d,
        ["WITNESS STATEMENTS & DEPOSITIONS", "Recorded under Section 161 CrPC"],
        ["RC-3(A)/2026/BS&FC\x1aCBI BS&FC, NEW DELHI", "STATE vs. SURESH YADAV & ORS."])
    title_block(d, "STATEMENTS OF PROSECUTION WITNESSES",
                "Extracts of key depositions for case analysis")

    h1(d, "CW-1 — Shri Pradeep K. Menon (Chief Manager, Bank of Hindustan)")
    h2(d, "Statement u/s 161 CrPC recorded on 20-Jan-2026")
    p(d, "I am the Chief Manager at the Zonal Office, Connaught Place. During the concurrent audit of BO Ansal Plaza "
         "for the period Oct–Dec 2025, the auditors reported that collateral for 22 loan accounts was not traceable "
         "in the branch records. I ordered a physical verification, which revealed that the strong room contained no "
         "pledged jewellery corresponding to the 13 gold loan accounts, and the locker inventory was unsigned. The "
         "loan files contained sanction memos without the requisite committee approvals. I caused a preliminary "
         "inquiry to be conducted, which confirmed the irregularities, and thereafter lodged the complaint with the "
         "CBI. The gross irregular amount is ₹11,42,00,000 and the amount outstanding is ₹9,05,00,000.")

    h1(d, "CW-2 — Shri R. Subramanian (Concurrent Auditor)")
    h2(d, "Statement u/s 161 CrPC recorded on 22-Jan-2026")
    p(d, "While auditing BO Ansal Plaza I found that 13 gold loan accounts each reflected a sanctioned limit without "
         "a corresponding jewellery receipt. The gold loan module showed 'pledge confirmed' flags for accounts "
         "having no entry in the physical strong-room register. I also noticed that disbursements in 9 cash credit "
         "accounts occurred at irregular hours, mostly between 18:00 and 21:00 hrs, on weekends. On cross-checking "
         "the CBS audit trail, the postings traced to the login credentials of the Branch Manager, Suresh Yadav, and "
         "Relationship Manager, Vipin Arora. I compiled my findings into the audit extract annexed to the complaint.")

    h1(d, "CW-4 — Shri S. Bhattacharya (DGM, CBS Administration)")
    h2(d, "Statement u/s 161 CrPC recorded on 05-Feb-2026")
    p(d, "The CBS maintains a complete audit trail of user logins and transaction postings. For the period "
         "01-Apr-2024 to 30-Nov-2025, loan limit entry and disbursement postings for the 22 accounts in question "
         "were made through user IDs UID-2123 (Suresh Yadav) and UID-2207 (Vipin Arora). I verified the timestamps, "
         "terminal IPs and digital signatures of these postings, which were mostly executed after business hours. "
         "The printouts of this audit trail have been certified by me under the bank's seal and handed over to the "
         "CBI.")

    h1(d, "CW-6 — Shri Vikas Thakur (IT Forensics Analyst, CBI)")
    h2(d, "Statement u/s 161 CrPC recorded on 18-Mar-2026")
    p(d, "I analysed the KYC records, mobile numbers and transaction patterns of the 11 borrower accounts. The "
         "analysis established that (i) 11 accounts shared 3 common mobile numbers and a single email domain; "
         "(ii) disbursed funds were transferred in a circular fashion among these accounts over 20-day cycles; and "
         "(iii) the ultimate destination of 78% of the funds was accounts controlled by A-1. The clustering chart "
         "and fund-flow diagram form part of the evidence record. I also extracted deleted KYC images from the "
         "seized devices of A-3.")

    h1(d, "CW-7 — Shri Rajeev Tandon (Handwriting Expert)")
    h2(d, "Statement u/s 161 CrPC recorded on 25-Apr-2026")
    p(d, "I examined the specimen signatures of the 11 borrowers against the signatures on the sanction memos and "
         "cash vouchers. I am of the opinion that the signatures of 9 of the 11 borrowers on the KYC and loan "
         "documents were written by the same hand — a single writer executed these documents. This supports the "
         "prosecution's case that the borrowers were fictitious or accommodated parties. My detailed report is "
         "annexed.")

    sign_block(d,
        ["<b>Recorded by:</b>", "Dy. SP Rahul Srivastava", "CBI/BS&FC"],
        ["<b>Witnesses:</b>", "CW-1, CW-2, CW-4, CW-6, CW-7", "As deposed above"])
    d.build()


def judge_case2_evidence():
    d = Doc("Judge_Case2_Evidence_Exhibits.pdf",
            title="State (CBI) vs. Suresh Yadav & Ors. — Evidence & Exhibits Register",
            watermark="EVIDENCE")
    court_banner(d,
        ["EVIDENCE & EXHIBIT REGISTER", "Inventory of exhibits marked in evidence"],
        ["RC-3(A)/2026/BS&FC\x1aCBI BS&FC, NEW DELHI", "BEFORE CMM, DELHI"])
    title_block(d, "REGISTER OF EXHIBITS & MATERIAL EVIDENCE",
                "Documentary, physical and digital evidence relied upon by the prosecution")

    h1(d, "1. DOCUMENTARY EVIDENCE")
    table(d,
        ["Exhibit", "Particulars", "Provenance"],
        [
            ["Ex-B1", "Certified copy of RC / FIR", "CBI"],
            ["Ex-B2", "Concurrent audit report extract (10 pages)", "CW-2"],
            ["Ex-B3", "Preliminary inquiry report PIN 2026/BH/017", "Bank"],
            ["Ex-B4", "Schedule of 22 irregular loan accounts with limits", "Bank"],
            ["Ex-B5", "CBS audit-trail report — login postings (UID-2123, UID-2207)", "CW-4"],
            ["Ex-B6", "KYC & mobile clustering analysis", "CW-6"],
            ["Ex-B7", "Independent collateral valuation report", "CW-3"],
            ["Ex-B8", "Sanction memos & forged vouchers (vol. I–III)", "CW-7 / seized"],
            ["Ex-B9", "Bank statements of 11 accounts (circular rotation)", "Bank"],
            ["Ex-B10", "Section 65B certificates (2 nos.)", "IO"],
            ["Ex-B11", "Arrest & medical memos of accused", "IO"],
        ],
        [20 * mm, 92 * mm, 64 * mm])

    h1(d, "2. PHYSICAL / MATERIAL EVIDENCE")
    table(d,
        ["Item", "Description", "Status"],
        [
            ["M-7", "Gold jewellery & ornaments (recovered ₹1,02,00,000 approx.)", "Seized 20-Feb-2026; kept in bank vault"],
            ["M-8", "7 mobile phones (accused)", "Forensic imaging completed"],
            ["M-9", "3 laptops & 2 external HDDs", "Forensic analysis completed"],
            ["M-10", "Signed locker inventory book (unsigned pages)", "Seized from branch"],
            ["M-11", "Cheque books & 25 blank signed vouchers", "Seized 20-Feb-2026"],
        ],
        [22 * mm, 106 * mm, 48 * mm])

    h1(d, "3. ELECTRONIC / DIGITAL EVIDENCE")
    p(d, "(a) CBS transaction and login logs certified by CW-4; (b) mobile-tower call records of A-1's number "
         "+91 99XXXX1122 for Jan–Dec 2025; (c) WhatsApp messages between A-1, A-2 and A-3 discussing the "
         "'adjustment of loan limits'; (d) deleted KYC images recovered from A-3's device by CW-6; and (e) fund-flow "
         "diagram prepared by the IT forensics analyst. All electronic evidence is accompanied by Section 65B "
         "certificates and a chain-of-custody memo.")

    h1(d, "4. RELEVANCE")
    p(d, "The cumulative evidence establishes criminal breach of trust by a public servant / banker (Sections 408–409 "
         "IPC), cheating (Section 420 IPC), forgery and use of forged documents (Sections 471 IPC) committed in "
         "furtherance of a conspiracy (Section 120B IPC), with loss of public money exceeding ₹9 crore.")

    sign_block(d,
        ["<b>Exhibit register prepared by:</b>", "Dy. SP Rahul Srivastava", "CBI/BS&FC"],
        ["<b>Authenticated:</b>", "SP V. K. Bhalla", "CBI/BS&FC, New Delhi"])
    d.build()


def judge_case2_framing():
    d = Doc("Judge_Case2_FramingOfCharges_Order.pdf",
            title="State (CBI) vs. Suresh Yadav & Ors. — Order Framing Charges",
            watermark="ORDER")
    court_banner(d,
        ["ORDER ON FRAMING OF CHARGES", "C.C. No. 410/2026 (RC-3(A)/2026/BS&FC)"],
        ["BEFORE CHIEF METROPOLITAN MAGISTRATE, DELHI\x1aSTATE vs. SURESH YADAV & 13 ORS."])
    title_block(d, "ORDER FRAMING CHARGES",
                "Sections 228 & 240, Code of Criminal Procedure, 1973")

    h1(d, "1. BACKGROUND")
    p(d, "The accused Suresh Yadav, Vipin Arora, Anita Rawat and 11 others have been produced before this Court in "
         "respect of RC-3(A)/2026/BS&FC. The charge sheet was filed on 30-Apr-2026. The accused have been supplied "
         "copies of the relied-upon documents as mandated. Upon hearing the prosecution and the accused, this Court "
         "is required to determine whether there exists a prima facie case justifying the framing of charges.")

    h1(d, "2. PRIMA FACIE CASE AGAINST EACH ACCUSED")
    p(d, "(i) <b>A-1 Suresh Yadav:</b> CBS audit trail establishes that loan limit entries and disbursement postings "
         "for 22 accounts were made from his login; fund-flow analysis shows 78% of the funds reached accounts "
         "controlled by him; recovery of jewellery and blank signed vouchers from the branch. A prima facie case of "
         "offences under Sections 409, 420, 471 r/w 120B IPC is made out.")
    p(d, "(ii) <b>A-2 Vipin Arora:</b> Prepared appraisal notes and opened accounts of dummy borrowers; his login was "
         "used for postings; WhatsApp chats show collusion. A prima facie case under Sections 420, 471 r/w 120B IPC "
         "is made out.")
    p(d, "(iii) <b>A-3 Anita Rawat:</b> Prepared forged KYC documents; signed cash vouchers without disbursement; "
         "handwriting report indicates execution of documents for dummy borrowers. A prima facie case under Sections "
         "408, 471 r/w 120B IPC is made out.")
    p(d, "(iv) <b>A-4 to A-14 (borrowers):</b> Their accounts received the siphoned funds and were used in circular "
         "rotation; KYC mobile clustering links them to the scheme. A prima facie case under Sections 420, 471 r/w "
         "120B IPC is made out against each.")

    h1(d, "3. CHARGES FRAMED")
    p(d, "Charges are hereby framed as follows:")
    p(d, "1. <b>A-1 Suresh Yadav:</b> u/s 409, 420, 471 r/w 120B IPC.")
    p(d, "2. <b>A-2 Vipin Arora:</b> u/s 420, 471 r/w 120B IPC.")
    p(d, "3. <b>A-3 Anita Rawat:</b> u/s 408, 471 r/w 120B IPC.")
    p(d, "4. <b>A-4 to A-14:</b> u/s 420, 471 r/w 120B IPC.")

    h1(d, "4. ORDER")
    p(d, "The charges framed are read over and explained to the accused in Hindi/English as may be required. Each "
         "accused is asked whether he pleads guilty or claims trial.")
    p(d, "Upon being so asked, all accused <b>claim trial</b> and plead not guilty. The prosecution is directed to "
         "file its list of witnesses within three weeks. The matter is fixed for prosecution evidence on "
         "18-Jun-2026. The accused to be produced on the next date.")

    sign_block(d,
        ["<b>Sd/-</b>", "Chief Metropolitan Magistrate", "New Delhi"],
        ["Dated: 02-Jun-2026", "C.C. No. 410/2026", "To: Prosecution, Accused, CBI"])
    d.build()


# ═══════════════════════════════════════════════════════════════════════════
# MEDIATION — CASE 1 : M/s Shivalik Constructions (Party A / Contractor)
#                     vs. M/s Greenfield Developers (Party B / Employer)
# Construction contract: non-payment vs. defective-work counterclaim
# ═══════════════════════════════════════════════════════════════════════════

def med_case1_partyA_notice():
    d = Doc("Mediation_Case1_PartyA_LegalNotice.pdf",
            title="Party A — Detailed Claim Notice (Construction Contract)",
            watermark="LEGAL NOTICE")
    court_banner(d,
        ["BEFORE THE MEDIATOR · SECTION 5, MEDIATION ACT, 2023", "Pre-institution mediation under Commercial Courts Act, 2015"],
        ["PARTY A · CLAIMANT\x1aREF: SLG/MED/2026/061", "SERVED ON: 12-FEB-2026"])
    title_block(d, "NOTICE INVOKING MEDIATION & STATEMENT OF CLAIMS",
                "Non-payment of certified running account bills under Work Order No. GF/WO/118/2024")

    meta_card(d, [
        ("CLAIMANT (PARTY A)", "M/s Shivalik Constructions Pvt. Ltd., 2nd Floor, Meera Complex, Pune — 411001"),
        ("RESPONDENT (PARTY B)", "M/s Greenfield Developers Pvt. Ltd., Greenfield House, Wakad, Pune — 411057"),
        ("REFERENCE", "Work Order No. GF/WO/118/2024 dated 15-Apr-2024"),
        ("AMOUNT CLAIMED", "₹1,86,50,000 (principal) + interest @ 18% p.a. + costs"),
        ("MEDIATION FORUM", "Pune District Legal Services Mediation Centre / Private Mediator"),
    ])

    h1(d, "1. THE CONTRACT & SCOPE OF WORK")
    p(d, "By Work Order dated 15-Apr-2024, Greenfield Developers appointed Shivalik Constructions as the main "
         "contractor for civil, finishing and MEP works of 'Greenfield One' — a G+12 residential tower at Wakad, "
         "Pune, for a total contract value of ₹38,50,00,000 (Thirty-Eight Crore Fifty Lakh Rupees). The work "
         "comprised: excavation and RCC framework, structural RCC works, brickwork and plastering, flooring and "
         "finishing, plumbing and sanitary works, electrical and MEP works, and external development. The time for "
         "completion was fixed at 24 months from the date of site handover with a liquidated-damages clause of "
         "0.1% of contract value per week of delay, capped at 5%.")

    h1(d, "2. PROGRESS OF WORK & CERTIFIED BILLS")
    p(d, "The claimant commenced work on 02-May-2024 and has completed, as per the Joint Measurement Book and the "
         "Architect's certificates, works valued at ₹26,40,00,000 up to 31-Dec-2025. The bills raised and certified "
         "by the architect/engineer are: (i) RA Bill No. 7 dated 15-Jun-2025 for ₹3,85,00,000 — certified "
         "₹3,85,00,000; (ii) RA Bill No. 8 dated 15-Sep-2025 for ₹4,10,00,000 — certified ₹4,10,00,000; (iii) RA "
         "Bill No. 9 dated 15-Dec-2025 for ₹3,95,00,000 — certified ₹3,75,00,000. Against the aggregate certified "
         "amount of ₹11,70,00,000, the respondent has paid only ₹9,83,50,000, leaving a balance of ₹1,86,50,000 "
         "towards certified works.")

    h1(d, "3. BREACH BY RESPONDENT & DEMAND")
    p(d, "Despite repeated written reminders (letters dated 20-Aug-2025, 05-Nov-2025 and 20-Jan-2026) and the "
         "mandatory pre-arbitral/mediation notice dated 02-Feb-2026, the respondent has failed and neglected to pay "
         "the certified amounts. Clause 12.5 of the General Conditions of Contract provides that certified running "
         "account bills shall be paid within 30 days and that delayed payments attract simple interest at 18% p.a. "
         "The respondent has thus defaulted in payment of ₹1,86,50,000, and the claimant is entitled to interest "
         "amounting to ₹12,40,000 as on date, besides further interest and costs.")

    h1(d, "4. CLAIMS RAISED (PARTY A)")
    table(d,
        ["Sr.", "Head of Claim", "Amount (₹)"],
        [
            ["1", "Certified running account bills — balance unpaid", "1,86,50,000"],
            ["2", "Interest @ 18% p.a. up to 31-Jan-2026", "12,40,000"],
            ["3", "Costs of notice and mediation", "1,50,000"],
            ["4", "Total", "2,00,40,000"],
        ],
        [16 * mm, 96 * mm, 40 * mm])

    h1(d, "5. INVITATION TO MEDIATE")
    p(d, "The claimant, through this notice, invites the respondent to participate in a structured mediation "
         "under Section 5 of the Mediation Act, 2023, before a mutually agreed mediator or the Pune District Legal "
         "Services Authority, to resolve the above dispute amicably and expeditiously. The claimant is willing to "
         "consider a reasonable settlement, including a payment schedule, provided the certified principal amount "
         "is cleared. If the respondent fails to respond within 15 days of service of this notice, the claimant "
         "shall be constrained to invoke the arbitration clause (Clause 20.1 of the G.C.C.) and/or approach the "
         "competent civil/commercial court, without further notice and at the respondent's risk as to costs.")

    sign_block(d,
        ["<b>For M/s Shivalik Constructions Pvt. Ltd.</b>", "R. R. Kolhe, Managing Director", "Through: Adv. Sunita Deshmukh"],
        ["<b>Issued at:</b> Pune", "Dated: 12-Feb-2026", "Registered post / e-mail: legal@greenfield.in"])
    d.build()


def med_case1_partyA_evidence():
    d = Doc("Mediation_Case1_PartyA_EvidenceBundle.pdf",
            title="Party A — Evidence Bundle (Certified Bills & Records)",
            watermark="EVIDENCE")
    court_banner(d,
        ["BEFORE THE MEDIATOR · SECTION 5, MEDIATION ACT, 2023", "Annexure A — Claimant's documentary evidence"],
        ["PARTY A · CLAIMANT\x1aSLG/MED/2026/061", "INDEX OF DOCUMENTS: EXHIBITS A-1 TO A-14"])
    title_block(d, "EVIDENCE BUNDLE OF PARTY A (CLAIMANT)",
                "Documents relied upon in support of the certified dues of ₹1,86,50,000")

    h1(d, "1. EXECUTED CONTRACT & APPENDICES")
    table(d,
        ["Exhibit", "Description", "Page"],
        [
            ["A-1", "Work Order No. GF/WO/118/2024 dated 15-Apr-2024 with specifications", "1–9"],
            ["A-2", "Signed General Conditions of Contract (G.C.C.)", "10–28"],
            ["A-3", "Copy of Approved Drawings & BOQ", "29–55"],
            ["A-4", "Site Handover Certificate dated 02-May-2024", "56"],
        ],
        [16 * mm, 96 * mm, 30 * mm])

    h1(d, "2. CERTIFIED BILLS & MEASUREMENTS")
    table(d,
        ["Exhibit", "Description", "Page"],
        [
            ["A-5", "Joint Measurement Book (extract, signed by both parties)", "57–64"],
            ["A-6", "RA Bill No. 7 dated 15-Jun-2025 (₹3,85,00,000) + Architect's certificate", "65–70"],
            ["A-7", "RA Bill No. 8 dated 15-Sep-2025 (₹4,10,00,000) + Architect's certificate", "71–76"],
            ["A-8", "RA Bill No. 9 dated 15-Dec-2025 (₹3,75,00,000 certified) + Architect's certificate", "77–82"],
            ["A-9", "Summary of payments received (₹9,83,50,000) with bank statements", "83–90"],
        ],
        [16 * mm, 96 * mm, 30 * mm])

    h1(d, "3. CORRESPONDENCE & NOTICES")
    table(d,
        ["Exhibit", "Description", "Page"],
        [
            ["A-10", "Reminder letters dated 20-Aug-2025, 05-Nov-2025, 20-Jan-2026", "91–95"],
            ["A-11", "E-mails exchanged with Project Director (B. Mehta) 2025–2026", "96–104"],
            ["A-12", "Pre-mediation notice dated 02-Feb-2026 with AD receipt", "105–108"],
        ],
        [16 * mm, 96 * mm, 30 * mm])

    h1(d, "4. SUPPORTING TECHNICAL RECORDS")
    p(d, "Exhibits A-13 and A-14 comprise (i) the monthly progress reports certified by the site engineer and "
         "(ii) the safety and labour compliance register maintained by the claimant. These records substantiate "
         "continuous and due performance of the works through December 2025, contradicting any suggestion of "
         "abandonment or defective performance of the certified items.")

    h1(d, "5. CERTIFICATE")
    p(d, "I, R. R. Kolhe, confirm that the documents enumerated above are true copies of the originals maintained "
         "in the ordinary course of business of the claimant, and that the certified bills were prepared and "
         "certified in accordance with the contract.")

    sign_block(d,
        ["<b>For M/s Shivalik Constructions Pvt. Ltd.</b>", "R. R. Kolhe", "Through: Adv. Sunita Deshmukh"],
        ["<b>Verified at:</b> Pune", "Dated: 12-Feb-2026"])
    d.build()


def med_case1_partyB_reply():
    d = Doc("Mediation_Case1_PartyB_ReplyNotice.pdf",
            title="Party B — Reply & Counter-Claim (Defective Works)",
            watermark="REPLY")
    court_banner(d,
        ["BEFORE THE MEDIATOR · SECTION 5, MEDIATION ACT, 2023", "Reply under Section 8, Mediation Act, 2023"],
        ["PARTY B · RESPONDENT\x1aREF: SLG/MED/2026/061-R", "SERVED ON: 26-FEB-2026"])
    title_block(d, "REPLY NOTICE & COUNTER-CLAIM BY RESPONDENT",
                "Defective RCC & finishing works, delay, and right of set-off")

    meta_card(d, [
        ("RESPONDENT (PARTY B)", "M/s Greenfield Developers Pvt. Ltd., Greenfield House, Wakad, Pune"),
        ("CLAIMANT (PARTY A)", "M/s Shivalik Constructions Pvt. Ltd., Pune"),
        ("COUNTER-CLAIM", "₹2,31,00,000 (defective work, LD, third-party remedial costs)"),
        ("POSITION", "Net claim of Party B against Party A: ₹44,50,000 after set-off"),
    ])

    h1(d, "1. PRELIMINARY OBJECTIONS")
    p(d, "The respondent denies that it is liable to pay the certified amounts, and in any event, asserts a right of "
         "set-off. The respondent's preliminary objections are: (i) the claimant has not completed the works within "
         "the stipulated period and has delayed the project by over 7 months; (ii) the alleged 'certificates' relied "
         "upon (Exhibits A-6 to A-8) were issued by the claimant's own consultant, not the employer's architect, and "
         "are therefore not binding; (iii) significant defective works have been detected by an independent "
         "structural audit; and (iv) the respondent has validly withheld payment pending rectification, which is "
         "permitted under Clause 13.8 of the G.C.C.")

    h1(d, "2. DEFECTIVE WORKS & STRUCTURAL CONCERNS")
    p(d, "The respondent engaged M/s NavNirmiti Consultants (independent structural auditor) whose report dated "
         "10-Jan-2026 found: (i) honeycombing and spalling in 14 RCC columns on floors 4 to 9 due to improper "
         "vibration and curing; (ii) cover to reinforcement found deficient (32 mm against the specified 40 mm) in "
         "several beams; (iii) water seepage in the basement because of improper waterproofing at the construction "
         "joints; and (iv) cracked external plaster on the south facade. The estimated cost of remedial works is "
         "₹1,34,00,000, which is claimed from the claimant.")

    h1(d, "3. DELAY & LIQUIDATED DAMAGES")
    p(d, "The works were to be completed by 30-Apr-2026 but, as of the date of this reply, structural and finishing "
         "works are incomplete and the project is behind schedule by more than 7 months. Under Clause 10.3, the "
         "employer is entitled to liquidated damages at 0.1% of the contract value (₹38,50,000) per week of delay, "
         "capped at 5% (₹1,92,50,000). The respondent claims LD of ₹1,92,50,000, computed up to the date of actual "
         "or likely completion.")

    h1(d, "4. COUNTER-CLAIMS RAISED (PARTY B)")
    table(d,
        ["Sr.", "Head of Counter-Claim", "Amount (₹)"],
        [
            ["1", "Cost of remedial works (structural + finishing) as per audit", "1,34,00,000"],
            ["2", "Liquidated damages for delay (capped at 5%)", "1,92,50,000"],
            ["3", "Third-party scaffolding & re-curing costs incurred", "18,50,000"],
            ["4", "Total counter-claim", "3,45,00,000"],
            ["5", "Less: admitted dues of claimant (without prejudice)", "(1,86,50,000)"],
            ["6", "Net claim of respondent", "1,58,50,000"],
        ],
        [16 * mm, 96 * mm, 40 * mm])

    h1(d, "5. SETTLEMENT OUTLOOK & INVITATION")
    p(d, "The respondent remains open to a mediated settlement that (i) provides for a joint rectification plan and "
         "sharing of remedial costs, and (ii) adjusts the certified dues against the liquidated damages and defect "
         "costs. The respondent invites the claimant to a mediation session with a jointly appointed mediator and "
         "proposes that an agreed independent engineer certify the defective works. Without prejudice, the "
         "respondent is willing to pay the net difference, if any, after the audit, within 45 days of a mediated "
         "settlement agreement.")

    sign_block(d,
        ["<b>For M/s Greenfield Developers Pvt. Ltd.</b>", "K. Mehta, Director", "Through: Adv. Prashant Kulkarni"],
        ["<b>Issued at:</b> Pune", "Dated: 26-Feb-2026", "Registered post / e-mail"])
    d.build()


def med_case1_partyB_evidence():
    d = Doc("Mediation_Case1_PartyB_EvidenceBundle.pdf",
            title="Party B — Evidence Bundle (Audit & Delay Records)",
            watermark="EVIDENCE")
    court_banner(d,
        ["BEFORE THE MEDIATOR · SECTION 5, MEDIATION ACT, 2023", "Annexure B — Respondent's documentary evidence"],
        ["PARTY B · RESPONDENT\x1aSLG/MED/2026/061-R", "INDEX: EXHIBITS B-1 TO B-13"])
    title_block(d, "EVIDENCE BUNDLE OF PARTY B (RESPONDENT)",
                "Documents relied upon in support of the counter-claim of ₹3,45,00,000")

    h1(d, "1. INDEPENDENT AUDIT & DEFECT REPORTS")
    table(d,
        ["Exhibit", "Description", "Page"],
        [
            ["B-1", "Structural Audit Report by M/s NavNirmiti Consultants dated 10-Jan-2026", "1–18"],
            ["B-2", "Photographic record of defects (42 photographs, indexed)", "19–34"],
            ["B-3", "Cube-test & NDT (rebound hammer) results — 23 tests", "35–48"],
            ["B-4", "Architect's interim report on finishing defects", "49–55"],
        ],
        [16 * mm, 96 * mm, 30 * mm])

    h1(d, "2. DELAY & LIQUIDATED DAMAGES")
    table(d,
        ["Exhibit", "Description", "Page"],
        [
            ["B-5", "Programme of works / bar chart with actuals (delay analysis)", "56–66"],
            ["B-6", "Site diary extracts showing work stoppages & slow progress", "67–75"],
            ["B-7", "Computation of liquidated damages (7 months + 1 week)", "76"],
        ],
        [16 * mm, 96 * mm, 30 * mm])

    h1(d, "3. COSTS INCURRED & CORRESPONDENCE")
    table(d,
        ["Exhibit", "Description", "Page"],
        [
            ["B-8", "Third-party scaffolding & re-curing invoices", "77–82"],
            ["B-9", "Show-cause notice dated 18-Dec-2025 to claimant", "83–84"],
            ["B-10", "E-mails from employer's project director (Jan–Feb 2026)", "85–92"],
            ["B-11", "Minutes of monthly progress meetings (Sep–Dec 2025)", "93–101"],
            ["B-12", "Payment ledger showing ₹9,83,50,000 paid (without prejudice)", "102–106"],
            ["B-13", "Engineer's certification that RA-9 is under dispute", "107"],
        ],
        [16 * mm, 96 * mm, 30 * mm])

    h1(d, "4. CERTIFICATE & OFFER")
    p(d, "I, K. Mehta, confirm that the above documents are true copies maintained in the ordinary course of the "
         "respondent's business. The respondent reiterates its willingness to submit to a joint engineer's "
         "assessment and to mediate in good faith, with a view to a single net settlement payment after adjustment "
         "of verified claims.")

    sign_block(d,
        ["<b>For M/s Greenfield Developers Pvt. Ltd.</b>", "K. Mehta, Director", "Through: Adv. Prashant Kulkarni"],
        ["<b>Verified at:</b> Pune", "Dated: 26-Feb-2026"])
    d.build()


# ═══════════════════════════════════════════════════════════════════════════
# MEDIATION — CASE 2 : M/s Orion Analytics (Party A) vs. M/s Vector Systems (Party B)
# Software / data-processing services: withheld dues vs. IP & data-breach counterclaim
# ═══════════════════════════════════════════════════════════════════════════

def med_case2_partyA_notice():
    d = Doc("Mediation_Case2_PartyA_LegalNotice.pdf",
            title="Party A — Detailed Claim Notice (Data Services Agreement)",
            watermark="LEGAL NOTICE")
    court_banner(d,
        ["BEFORE THE MEDIATOR · SECTION 5, MEDIATION ACT, 2023", "Pre-institution mediation, Commercial Courts Act"],
        ["PARTY A · CLAIMANT\x1aREF: ORA/VS/2026/023", "SERVED ON: 18-MAR-2026"])
    title_block(d, "NOTICE INVOKING MEDIATION & STATEMENT OF CLAIMS",
                "Unpaid analytics-retainer fees under Data Services Agreement dated 03-Sep-2024")

    meta_card(d, [
        ("CLAIMANT (PARTY A)", "M/s Orion Analytics Pvt. Ltd., 4th Floor, Aurum Hub, Bengaluru — 560037"),
        ("RESPONDENT (PARTY B)", "M/s Vector Systems Ltd., Tower B, Cyberpark, Chennai — 600041"),
        ("REFERENCE", "Data Services Agreement No. DSA-2024-318 dated 03-Sep-2024"),
        ("AMOUNT CLAIMED", "₹58,60,000 (retainer + usage fees) + interest @ 18% p.a. + costs"),
    ])

    h1(d, "1. THE AGREEMENT & SERVICES RENDERED")
    p(d, "Orion Analytics entered into a Data Services Agreement with Vector Systems on 03-Sep-2024 for provision "
         "of (i) a custom predictive-analytics platform for inventory optimisation; (ii) managed data-engineering "
         "services; and (iii) 24×7 API support, against a monthly retainer of ₹6,20,000 (fixed) plus usage-based "
         "fees at ₹0.85 per API call. The term was 24 months, with a notice period of 90 days.")

    h1(d, "2. PERFORMANCE & INVOICES RAISED")
    p(d, "The claimant rendered services continuously and issued invoices: (i) INV-8891 dated 05-Oct-2025 "
         "(retainer) ₹6,20,000; (ii) INV-8920 dated 05-Nov-2025 (retainer + usage ₹4,10,000) ₹10,30,000; (iii) "
         "INV-8963 dated 05-Dec-2025 (retainer + usage ₹5,90,000) ₹12,10,000; (iv) INV-9001 dated 05-Jan-2026 "
         "(retainer + usage ₹5,60,000) ₹11,80,000; and (v) INV-9034 dated 05-Feb-2026 (retainer + usage ₹5,00,000) "
         "₹11,20,000. The aggregate invoiced amount is ₹51,60,000. The respondent has paid only ₹16,00,000 "
         "(10-Nov-2025), leaving a balance of ₹35,60,000. In addition, ₹7,00,000 towards usage fees for Feb-2026 "
         "(invoiced 05-Mar-2026) and ₹16,00,000 towards the March–May 2026 retainer period are claimed; total "
         "outstanding ₹58,60,000.")

    h1(d, "3. DEFAULT & TERMINATION")
    p(d, "The respondent defaulted on the November 2025 invoice onwards and, on 01-Mar-2026, issued a purported "
         "termination letter alleging 'defective deliverables and data-security breaches', which the claimant "
         "denies. The termination is wrongful inasmuch as the respondent's own utilisation data (hosted on the "
         "claimant's console) shows continuous usage of the platform until 28-Feb-2026. The claimant has not been "
         "paid for services already rendered and is entitled to the outstanding amounts with interest.")

    h1(d, "4. CLAIMS RAISED (PARTY A)")
    table(d,
        ["Sr.", "Head of Claim", "Amount (₹)"],
        [
            ["1", "Unpaid invoices (Oct-2025 to Feb-2026)", "35,60,000"],
            ["2", "Feb-2026 usage fees (invoiced 05-Mar-2026)", "7,00,000"],
            ["3", "March–May 2026 retainer (wrongful termination)", "16,00,000"],
            ["4", "Total principal", "58,60,000"],
            ["5", "Interest @ 18% p.a. up to 31-Mar-2026", "3,85,000"],
            ["6", "Total claim", "62,45,000"],
        ],
        [16 * mm, 96 * mm, 40 * mm])

    h1(d, "5. INVITATION TO MEDIATE")
    p(d, "The claimant invites the respondent to a mediation session before a mutually agreed mediator or the "
         "Bengaluru Mediation Centre, to settle the outstanding dues and the wrongful-termination claims amicably. "
         "The claimant is prepared to accept a structured payment plan of 12 monthly instalments with continuing "
         "support during the handover. Failing a response within 15 days, the claimant shall invoke Clause 17 of "
         "the Agreement (arbitration at Bengaluru) and recover its dues with costs.")

    sign_block(d,
        ["<b>For M/s Orion Analytics Pvt. Ltd.</b>", "N. Rao, CEO", "Through: Adv. Meera Iyer"],
        ["<b>Issued at:</b> Bengaluru", "Dated: 18-Mar-2026", "Registered post / e-mail: legal@vectorsystems.in"])
    d.build()


def med_case2_partyA_evidence():
    d = Doc("Mediation_Case2_PartyA_EvidenceBundle.pdf",
            title="Party A — Evidence Bundle (Agreement & Invoices)",
            watermark="EVIDENCE")
    court_banner(d,
        ["BEFORE THE MEDIATOR · SECTION 5, MEDIATION ACT, 2023", "Annexure A — Claimant's documentary evidence"],
        ["PARTY A · CLAIMANT\x1aORA/VS/2026/023", "INDEX OF DOCUMENTS: EXHIBITS A-1 TO A-11"])
    title_block(d, "EVIDENCE BUNDLE OF PARTY A (CLAIMANT)",
                "Documents relied upon in support of the outstanding fees of ₹58,60,000")

    h1(d, "1. AGREEMENT & SIGNED DOCUMENTS")
    table(d,
        ["Exhibit", "Description", "Page"],
        [
            ["A-1", "Data Services Agreement No. DSA-2024-318 dated 03-Sep-2024", "1–15"],
            ["A-2", "Signed Statement of Work (SoW) — analytics platform build", "16–24"],
            ["A-3", "Mutual NDA dated 03-Sep-2024", "25–28"],
        ],
        [16 * mm, 96 * mm, 30 * mm])

    h1(d, "2. INVOICES & UTILISATION RECORDS")
    table(d,
        ["Exhibit", "Description", "Page"],
        [
            ["A-4", "Invoices INV-8891 to INV-9034 (5 nos.) with GST", "29–40"],
            ["A-5", "API utilisation dashboard export (Oct-2025 to Feb-2026)", "41–48"],
            ["A-6", "Payment receipts (₹16,00,000) from respondent", "49–52"],
            ["A-7", "Invoice INV-9056 dated 05-Mar-2026 (usage fees)", "53"],
        ],
        [16 * mm, 96 * mm, 30 * mm])

    h1(d, "3. CORRESPONDENCE")
    table(d,
        ["Exhibit", "Description", "Page"],
        [
            ["A-8", "Reminder e-mails (Nov-2025 to Feb-2026)", "54–62"],
            ["A-9", "Respondent's termination letter dated 01-Mar-2026", "63–64"],
            ["A-10", "Claimant's denial & counter-notice dated 05-Mar-2026", "65–66"],
            ["A-11", "Chat/incident logs showing continued platform use till 28-Feb-2026", "67–72"],
        ],
        [16 * mm, 96 * mm, 30 * mm])

    h1(d, "4. CERTIFICATE")
    p(d, "I, N. Rao, confirm that the documents above are true copies of originals maintained in the ordinary "
         "course of business. The utilisation data (Exhibit A-5) is generated from the claimant's production "
         "console and is independently verifiable by the respondent's administrators.")

    sign_block(d,
        ["<b>For M/s Orion Analytics Pvt. Ltd.</b>", "N. Rao, CEO", "Through: Adv. Meera Iyer"],
        ["<b>Verified at:</b> Bengaluru", "Dated: 18-Mar-2026"])
    d.build()


def med_case2_partyB_reply():
    d = Doc("Mediation_Case2_PartyB_ReplyNotice.pdf",
            title="Party B — Reply & Counter-Claim (Data Breach / IP)",
            watermark="REPLY")
    court_banner(d,
        ["BEFORE THE MEDIATOR · SECTION 5, MEDIATION ACT, 2023", "Reply under Section 8, Mediation Act, 2023"],
        ["PARTY B · RESPONDENT\x1aREF: ORA/VS/2026/023-R", "SERVED ON: 02-APR-2026"])
    title_block(d, "REPLY NOTICE & COUNTER-CLAIM BY RESPONDENT",
                "Data-breach, downtime SLA breach and misappropriation of IP")

    meta_card(d, [
        ("RESPONDENT (PARTY B)", "M/s Vector Systems Ltd., Tower B, Cyberpark, Chennai"),
        ("CLAIMANT (PARTY A)", "M/s Orion Analytics Pvt. Ltd., Bengaluru"),
        ("COUNTER-CLAIM", "₹1,02,00,000 (SLA breach, breach notification costs, IP misuse)"),
        ("POSITION", "Respondent denies outstanding dues; claims set-off and net recovery"),
    ])

    h1(d, "1. PRELIMINARY OBJECTIONS")
    p(d, "The respondent denies liability for the claimed sums and asserts that payment was lawfully withheld. Its "
         "objections are: (i) the analytics platform repeatedly breached the agreed 99.5% uptime SLA, with 11 "
         "notified outages between Aug-2025 and Feb-2026; (ii) on 12-Jan-2026 a data breach occurred in the "
         "claimant's API layer exposing customer records, forcing the respondent to notify 40,000 data subjects and "
         "pay regulatory penalties; and (iii) the claimant used respondent's proprietary datasets to build models "
         "for a competing client, in breach of Clause 9 (IP & confidentiality).")

    h1(d, "2. SLA BREACHES & OUTAGES")
    p(d, "The respondent maintains a centralised uptime log. In the 7-month period Aug-2025 to Feb-2026, cumulative "
         "downtime was 48 hours against the 26 hours permitted by the 99.5% SLA, i.e. an excess of 22 hours. Under "
         "Schedule B of the Agreement, each hour of excess downtime entitles the respondent to service credits of "
         "₹1,50,000. The SLA credits claimed aggregate ₹33,00,000.")

    h1(d, "3. DATA BREACH & CONSEQUENTIAL COSTS")
    p(d, "The breach incident of 12-Jan-2026 was traced by an independent forensic audit (M/s Securitas) to "
         "insecure API authentication maintained by the claimant. The respondent incurred: (i) forensic audit fees "
         "₹8,50,000; (ii) data-subject notification and call-centre costs ₹9,00,000; (iii) regulatory penalties and "
         "legal costs ₹16,00,000; and (iv) estimated business loss ₹35,50,000 — totalling ₹69,00,000.")

    h1(d, "4. COUNTER-CLAIMS RAISED (PARTY B)")
    table(d,
        ["Sr.", "Head of Counter-Claim", "Amount (₹)"],
        [
            ["1", "SLA service credits (22 excess hours)", "33,00,000"],
            ["2", "Data-breach consequential costs", "69,00,000"],
            ["3", "Total counter-claim", "1,02,00,000"],
            ["4", "Less: disputed fees of claimant (without prejudice)", "(58,60,000)"],
            ["5", "Net counter-claim of respondent", "43,40,000"],
        ],
        [16 * mm, 96 * mm, 40 * mm])

    h1(d, "5. SETTLEMENT OUTLOOK")
    p(d, "The respondent is willing to mediate and to settle on terms that (i) resolve the IP dispute by a "
         "definitive licence carve-out, (ii) set off the SLA credits and breach costs against the claimant's fees, "
         "and (iii) provide for a monitored 90-day handover. The respondent proposes a neutral technical audit of "
         "uptime and breach causation before any net payment is fixed.")

    sign_block(d,
        ["<b>For M/s Vector Systems Ltd.</b>", "S. Raman, COO", "Through: Adv. Karthik Menon"],
        ["<b>Issued at:</b> Chennai", "Dated: 02-Apr-2026", "Registered post / e-mail"])
    d.build()


def med_case2_partyB_evidence():
    d = Doc("Mediation_Case2_PartyB_EvidenceBundle.pdf",
            title="Party B — Evidence Bundle (Breach & SLA Records)",
            watermark="EVIDENCE")
    court_banner(d,
        ["BEFORE THE MEDIATOR · SECTION 5, MEDIATION ACT, 2023", "Annexure B — Respondent's documentary evidence"],
        ["PARTY B · RESPONDENT\x1aORA/VS/2026/023-R", "INDEX: EXHIBITS B-1 TO B-12"])
    title_block(d, "EVIDENCE BUNDLE OF PARTY B (RESPONDENT)",
                "Documents relied upon in support of the counter-claim of ₹1,02,00,000")

    h1(d, "1. SLA & OUTAGE RECORDS")
    table(d,
        ["Exhibit", "Description", "Page"],
        [
            ["B-1", "Centralised uptime log (Aug-2025 to Feb-2026)", "1–8"],
            ["B-2", "Incident reports for 11 outages", "9–22"],
            ["B-3", "SLA credit computation sheet (22 excess hours)", "23"],
            ["B-4", "Service-desk tickets & user complaints", "24–30"],
        ],
        [16 * mm, 96 * mm, 30 * mm])

    h1(d, "2. DATA BREACH & FORENSICS")
    table(d,
        ["Exhibit", "Description", "Page"],
        [
            ["B-5", "Forensic Audit Report by M/s Securitas dated 20-Jan-2026", "31–44"],
            ["B-6", "Breach notification records (40,000 data subjects)", "45–52"],
            ["B-7", "Regulatory penalty & legal invoices", "53–58"],
            ["B-8", "Call-centre and notification cost invoices", "59–64"],
        ],
        [16 * mm, 96 * mm, 30 * mm])

    h1(d, "3. IP & CORRESPONDENCE")
    table(d,
        ["Exhibit", "Description", "Page"],
        [
            ["B-9", "IP & confidentiality clause extract (Clause 9, DSA-2024-318)", "65"],
            ["B-10", "Evidence of claimant's competing deliverable (screenshot + model output)", "66–71"],
            ["B-11", "E-mail chain — IP misuse complaint (Dec-2025 to Feb-2026)", "72–78"],
            ["B-12", "Termination letter dated 01-Mar-2026 with detailed grounds", "79–82"],
        ],
        [16 * mm, 96 * mm, 30 * mm])

    h1(d, "4. CERTIFICATE & OFFER")
    p(d, "I, S. Raman, confirm that the above are true copies of records maintained in the ordinary course of "
         "business. The respondent reiterates its readiness for a neutral technical audit and a mediated settlement "
         "resulting in a single net payment after set-off.")

    sign_block(d,
        ["<b>For M/s Vector Systems Ltd.</b>", "S. Raman, COO", "Through: Adv. Karthik Menon"],
        ["<b>Verified at:</b> Chennai", "Dated: 02-Apr-2026"])
    d.build()


# ─────────────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    print("Generating SUTRA sample documents into public/sample-documents/\n")
    print("── JUDGE · CASE 1 — Cheating & Forgery (IPC 420/467/468/471/120B) ──")
    judge_case1_fir()
    judge_case1_chargesheet()
    judge_case1_witnesses()
    judge_case1_evidence()
    judge_case1_bail()

    print("\n── JUDGE · CASE 2 — Bank Fraud (CBI, IPC 408/409/420/471/120B) ──")
    judge_case2_fir()
    judge_case2_chargesheet()
    judge_case2_witnesses()
    judge_case2_evidence()
    judge_case2_framing()

    print("\n── MEDIATION · CASE 1 — Construction Contract Dispute ──")
    med_case1_partyA_notice()
    med_case1_partyA_evidence()
    med_case1_partyB_reply()
    med_case1_partyB_evidence()

    print("\n── MEDIATION · CASE 2 — Data Services Agreement Dispute ──")
    med_case2_partyA_notice()
    med_case2_partyA_evidence()
    med_case2_partyB_reply()
    med_case2_partyB_evidence()

    print("\nAll 18 sample documents generated successfully.")
