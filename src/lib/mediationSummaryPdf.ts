"use client";

import { MediationSession } from "./api";
import { CASE_TYPE_OPTIONS } from "./corpus";
import { date, dateTime, n } from "./num";

/** Corpus case-type codes named for the summary; untaught codes print raw. */
const CASE_TYPE_LABELS = new Map(
  CASE_TYPE_OPTIONS.map((option) => [option.value, option.label])
);

/**
 * Mediation case summary → PDF, via the browser's own print-to-PDF.
 *
 * ## Why this is not a PDF library any more
 *
 * This module used to draw the document with jsPDF on its standard `times` and
 * `courier` fonts. Those fonts carry no Arabic glyphs, jsPDF does no Arabic
 * shaping and no bidi reordering, and the previous `legalize()` helper stripped
 * every character outside WinAnsi — which deleted the entire Arabic body text
 * before it reached the page. The output for an Arabic session was a document
 * with the headings missing and the prose gone.
 *
 * Embedding a shaped Arabic font and a bidi engine into jsPDF is a large piece
 * of work that duplicates what the browser already does correctly. So the
 * summary is now laid out as real DOM — RTL, in the app's own Arabic font, with
 * the browser's shaper and bidi algorithm — and `window.print()` turns it into a
 * PDF. The reader picks "Save as PDF" in the print dialog.
 *
 * ## How the print happens
 *
 * The document tree is appended to `<body>` as `.sutra-print-root`, and a
 * `@media print` rule in `globals.css` hides every other direct child of
 * `<body>` while it is present. Nothing else about the app changes.
 *
 * `document.fonts.ready` is awaited before printing. Without it the dialog can
 * open before the Arabic webfont has loaded and the preview renders in a
 * fallback face — or, worse, in a font with no Arabic coverage at all.
 *
 * `document.title` is swapped for the duration of the print so the browser's
 * save dialog offers a meaningful filename; there is no API to set it directly.
 *
 * ## Legal framing
 *
 * The old caption cited "THE INDIAN MEDIATION ACT, 2023". The corpus and the
 * country list are aimed at the Arab world, so the caption now cites the
 * applicable mediation law generically rather than naming one country's statute
 * — see `ARABIC.md`. If a deployment needs a specific national statute named,
 * that belongs in this caption.
 */

export type SummaryMode = "party_a" | "party_b" | "combined";

/** Class on the injected root; `globals.css` keys the print rules off it. */
const PRINT_ROOT = "sutra-print-root";

// ============================================================
// FORMATTING HELPERS
// ============================================================

/** Escape for interpolation into markup. Every value below goes through this. */
function esc(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * An identifier — case number, citation, file name, URL.
 *
 * Wrapped in a bidi isolate so a Latin identifier sitting in an Arabic
 * paragraph cannot reorder the words around it.
 */
function idn(value: unknown): string {
  return `<span dir="ltr" class="ident">${esc(value)}</span>`;
}

/** Arabic-Indic percentage, e.g. `٧٥٪`. */
function pct(value: unknown, fallback = 50): string {
  const num = Number(value ?? fallback);
  return n(Number.isFinite(num) ? num : fallback) + "٪";
}

/** A `YYYY-MM-DD` or ISO timestamp as a written Arabic date. */
function day(value?: string | null): string {
  return value ? date(value) : date(new Date().toISOString());
}

// ============================================================
// API ENUM LABELS
// ============================================================

/**
 * Values the API stores for each field, rendered in Arabic.
 *
 * Everything here falls back to the raw value, so a code the frontend has not
 * been taught still appears on the document rather than vanishing from it — a
 * legal summary that silently drops a field is worse than one that prints a
 * code the reader has to look up.
 */
const STATUS: Record<string, string> = {
  active: "قيد الوساطة",
  settled: "تمت التسوية",
  closed: "مغلقة",
  archived: "مؤرشفة",
  pending: "قيد الانتظار",
  completed: "مكتملة",
};

const STRENGTH: Record<string, string> = {
  high: "قوية",
  medium: "متوسطة",
  low: "ضعيفة",
  strong: "قوية",
  moderate: "متوسطة",
  weak: "ضعيفة",
};

const EVIDENTIARY: Record<string, string> = {
  proven: "ثابت",
  established: "ثابت",
  disputed: "محل نزاع",
  unproven: "غير ثابت",
  pending: "قيد التقييم",
  under_evaluation: "قيد التقييم",
  insufficient: "غير كافٍ",
};

const PARTY: Record<string, string> = {
  PARTY_A: "الطرف الأول",
  PARTY_B: "الطرف الثاني",
  BOTH: "كلا الطرفين",
};

/** A coded value rendered in Arabic, or the code itself when unknown. */
function label(map: Record<string, string>, value?: string | null, fallback = ""): string {
  if (!value) return fallback;
  return map[value] ?? map[value.toLowerCase()] ?? esc(value);
}

// ============================================================
// ANALYSIS SHAPES (the API returns `unknown` for this column)
// ============================================================

interface FavourablePoint {
  point: string;
  strength?: string;
  precedent_citation?: string;
}

interface Allegation {
  allegation: string;
  raised_by: string;
  counter_argument?: string;
  evidentiary_status?: string;
}

interface Question {
  question: string;
  target_party?: string;
  objective?: string;
}

interface SimilarCase {
  title?: string;
  citation?: string;
  court?: string;
  year?: number | string;
  case_type?: string;
  outcome?: string;
  similarity?: number;
  excerpt?: string;
}

interface AnalysisData {
  party_a_strength_score?: number | null;
  party_b_strength_score?: number | null;
  dominating_party?: string | null;
  party_a_favorable_points?: FavourablePoint[];
  party_b_favorable_points?: FavourablePoint[];
  allegation_matrix?: Allegation[];
  recommended_questions?: Question[];
  similar_cases?: SimilarCase[];
  settlement_notes?: string;
  analyzed_at?: string;
}

interface DocData {
  original_filename?: string;
  party_type?: string;
  document_type?: string;
}

interface SessionExtras {
  session_code?: string;
  party_a_advocate?: string;
  party_b_advocate?: string;
}

// ============================================================
// DOCUMENT ASSEMBLY
// ============================================================

class SummaryDoc {
  private sections: string[] = [];
  /** Section counter, in Arabic-Indic digits when rendered. */
  private sectionNo = 0;

  /** `1.` … `9.` in Arabic-Indic digits. */
  private nextSection(): string {
    this.sectionNo += 1;
    return `${n(this.sectionNo)}.`;
  }

  private section(title: string, body: string): void {
    this.sections.push(
      `<section class="sec"><h2><span class="sec-no">${this.nextSection()}</span>${esc(title)}</h2>${body}</section>`
    );
  }

  /** `FIELD  value`, aligned as a two-column row. */
  field(label: string, value: string): string {
    return `<div class="field"><dt>${esc(label)}</dt><dd>${value || "—"}</dd></div>`;
  }

  /** A numbered clause, `٤.١  …`. */
  private clause(parent: number, index: number, text: string): string {
    return `<p class="clause"><span class="clause-no">${n(parent)}.${n(index)}</span>${esc(text)}</p>`;
  }

  private note(text: string): string {
    return `<p class="note">${esc(text)}</p>`;
  }

  // ---------- sections ----------

  preliminary(session: MediationSession, analysis: AnalysisData): void {
    const extras = session as unknown as SessionExtras;
    const code = extras.session_code || `MED-${String(session.id).padStart(4, "0")}`;
    this.section(
      "السجل الأولي",
      `<dl class="fields">
        ${this.field("رقم الجلسة", idn(code))}
        ${this.field("الحالة", label(STATUS, session.status, "—"))}
        ${this.field("العنوان", esc(session.title))}
        ${this.field("الطرف الأول", esc(session.party_a_name))}
        ${this.field("الطرف الثاني", esc(session.party_b_name))}
        ${this.field("تاريخ التحليل", esc(day(analysis.analyzed_at)))}
      </dl>`
    );
  }

  background(session: MediationSession): void {
    const text =
      session.dispute_summary ||
      "لم تُسجَّل خلفية للنزاع في جلسة الوساطة هذه.";
    this.section("خلفية النزاع", `<p class="para">${esc(text)}</p>`);
  }

  assessment(
    session: MediationSession,
    analysis: AnalysisData,
    aScore: string,
    bScore: string
  ): void {
    const aName = session.party_a_name || "الطرف الأول";
    const bName = session.party_b_name || "الطرف الثاني";

    let dom: string;
    if (analysis.dominating_party === "PARTY_A") {
      dom = `يرجّح الميزان لصالح ${esc(aName)} (الطرف الأول).`;
    } else if (analysis.dominating_party === "PARTY_B") {
      dom = `يرجّح الميزان لصالح ${esc(bName)} (الطرف الثاني).`;
    } else {
      dom = "مواقف الطرفين متوازنة؛ ولا يملك أي منهما أفضلية واضحة.";
    }

    this.section(
      "تقييم موقف الأطراف",
      `<p class="para">بعد مقارنة ما هو مدرج في الأوراق، قُدِّر موقف الطرف الأول
        ${esc(aName)} بنسبة ${aScore}، وموقف الطرف الثاني ${esc(bName)} بنسبة ${bScore}.</p>
      <table class="scores">
        <tbody>
          <tr><th>الطرف الأول</th><td>${esc(aName)}</td><td class="num">${aScore}</td></tr>
          <tr><th>الطرف الثاني</th><td>${esc(bName)}</td><td class="num">${bScore}</td></tr>
        </tbody>
      </table>
      <p class="para"><span class="lead">التقييم:</span> ${dom}</p>`
    );
  }

  favourablePoints(
    heading: string,
    points: FavourablePoint[],
    parent: number
  ): void {
    let body = "";
    if (points.length === 0) {
      body = this.note("لم تُستخرج نقاط لصالح هذا الطرف في هذه المرحلة.");
    } else {
      points.forEach((point, i) => {
        body += this.clause(parent, i + 1, point.point);
        if (point.precedent_citation) {
          body += `<p class="note">السند: ${idn(point.precedent_citation)}</p>`;
        }
        if (point.strength) {
          body += `<p class="note">قوة الإثبات: ${label(STRENGTH, point.strength, "—")}</p>`;
        }
      });
    }
    this.section(heading, body);
  }

  allegations(
    heading: string,
    rows: Allegation[],
    session: MediationSession,
    parent: number
  ): void {
    const aName = session.party_a_name || "الطرف الأول";
    const bName = session.party_b_name || "الطرف الثاني";
    let body = "";
    if (rows.length === 0) {
      body = this.note("لا توجد ادعاءات مدرجة في هذه الأوراق.");
    } else {
      rows.forEach((row, i) => {
        const raiser = row.raised_by === "PARTY_A" ? aName : bName;
        body += this.clause(parent, i + 1, row.allegation);
        body += this.note(`أُثير من: ${raiser}`);
        if (row.counter_argument) {
          body += this.note(`الرد: ${row.counter_argument}`);
        }
        body += this.note(
          `حالة الإثبات: ${label(EVIDENTIARY, row.evidentiary_status, "قيد التقييم")}`
        );
      });
    }
    this.section(heading, body);
  }

  questions(rows: Question[], parent: number): void {
    let body = "";
    if (rows.length === 0) {
      body = this.note("لم تُقترح أسئلة في هذه المرحلة.");
    } else {
      rows.forEach((row, i) => {
        body += this.clause(parent, i + 1, row.question);
        if (row.objective) body += this.note(`الهدف: ${row.objective}`);
        body += this.note(
          `الموجَّه إلى: ${label(PARTY, row.target_party, "كلا الطرفين")}`
        );
      });
    }
    this.section("الأسئلة المقترحة لجلسة الوساطة", body);
  }

  evidence(docs: DocData[], parent: number): void {
    let body = "";
    if (docs.length === 0) {
      body = this.note("لم تُرفع أدلة مستندية في هذه المرحلة.");
    } else {
      docs.forEach((doc, i) => {
        body += this.clause(parent, i + 1, doc.original_filename || "مستند بلا عنوان");
        body += this.note(
          `مقدَّم من: ${label(PARTY, doc.party_type, "—")} • النوع: ${esc(
            doc.document_type || "عام"
          )}`
        );
      });
    }
    this.section("الأدلة المدرجة", body);
  }

  similarCases(rows: SimilarCase[], parent: number): void {
    let body = "";
    rows.forEach((row, i) => {
      const title = row.title || "قضية بلا عنوان";
      const citation = row.citation ? ` (${row.citation})` : "";
      body += this.clause(parent, i + 1, title);
      if (row.citation) body += `<p class="note">المرجع: ${idn(row.citation)}</p>`;
      if (row.court || row.year) {
        const year = row.year ? `، ${n(row.year)}` : "";
        const type = row.case_type
          ? ` [${esc(CASE_TYPE_LABELS.get(row.case_type) ?? row.case_type)}]`
          : "";
        body += this.note(`المحكمة: ${esc(row.court || "غير محددة")}${year}${type}`);
      }
      if (row.outcome) body += this.note(`المنطوق: ${row.outcome}`);
      if (row.similarity) body += this.note(`مدى الصلة: ${pct(row.similarity * 100)}`);
      if (row.excerpt) {
        body += `<p class="quote">${esc(row.excerpt.slice(0, 400))}</p>`;
      }
      void citation;
    });
    this.section("قضايا مشابهة من المجموعة", body);
  }

  settlementNotes(notes?: string): void {
    const text =
      notes && notes.trim()
        ? esc(notes)
        : "لم تُسجَّل ملاحظات تسوية في هذه المرحلة. الملاحظات المدرجة عملا بنظام الوساطة المعمول به قد تكون أساسا لاتفاق تسوية واجب النفاذ.";
    this.section("ملاحظات تسوية الوسيط", `<p class="para">${text}</p>`);
  }

  signature(): void {
    const year = n(new Date().getFullYear());
    this.sections.push(
      `<section class="sign">
        <p>حُرِّر في ______ من شهر ____________ سنة ${year}</p>
        <div class="sign-line"><span>الوسيط</span></div>
        <p class="sign-cap">توقيع الوسيط</p>
      </section>`
    );
  }

  render(session: MediationSession, mode: SummaryMode, meta: string): string {
    const extras = session as unknown as SessionExtras;
    const code = extras.session_code || `MED-${String(session.id).padStart(4, "0")}`;
    const aName = session.party_a_name || "الطرف الأول";
    const bName = session.party_b_name || "الطرف الثاني";

    const title =
      mode === "combined"
        ? "ملخّص موحّد لقضية الوساطة"
        : mode === "party_a"
        ? `ملخّص القضية — ${esc(aName)}`
        : `ملخّص القضية — ${esc(bName)}`;

    const aAdvocate = extras.party_a_advocate
      ? `<p class="cap-adv">(${esc(extras.party_a_advocate)})</p>`
      : "";
    const bAdvocate = extras.party_b_advocate
      ? `<p class="cap-adv">(${esc(extras.party_b_advocate)})</p>`
      : "";

    return `
      <div class="page">
        <p class="conf">سرّي — مشمول بسرية الوساطة</p>

        <header class="cap">
          <p class="cap-l1">أمام الوسيط</p>
          <p class="cap-l2">في شأن إجراءات الوساطة</p>
          <p class="cap-l3">بموجب نظام الوساطة المعمول به</p>
          <hr class="rule-strong" />
          <p class="cap-no">قضية وساطة رقم ${idn(code)}</p>
          <hr class="rule-strong" />
          <p class="cap-party">بين: <b>${esc(aName)}</b> ......... المدعي</p>
          ${aAdvocate}
          <p class="cap-and">و</p>
          <p class="cap-party"><b>${esc(bName)}</b> ......... المدعى عليه</p>
          ${bAdvocate}
        </header>

        <h1 class="title">${title}</h1>
        <hr class="rule-seal" />
        <p class="meta">${esc(meta)}</p>

        ${this.sections.join("\n")}
      </div>
    `;
  }
}

/**
 * The document body for a session, as an HTML string.
 *
 * Exported so the layout can be inspected without opening a print dialog — the
 * caller only ever needs `downloadSummaryPdf`.
 */
export function buildSummaryHtml(session: MediationSession, mode: SummaryMode): string {
  const analysis = (session.analysis || {}) as AnalysisData;
  const documents = (session.documents || []) as DocData[];
  const aName = session.party_a_name || "الطرف الأول";
  const bName = session.party_b_name || "الطرف الثاني";
  const aScore = pct(analysis.party_a_strength_score);
  const bScore = pct(analysis.party_b_strength_score);

  const aPoints = analysis.party_a_favorable_points || [];
  const bPoints = analysis.party_b_favorable_points || [];
  const matrix = analysis.allegation_matrix || [];
  const questions = analysis.recommended_questions || [];
  const similar = analysis.similar_cases || [];
  const aDocs = documents.filter((d) => d.party_type === "PARTY_A");
  const bDocs = documents.filter((d) => d.party_type === "PARTY_B");

  const doc = new SummaryDoc();
  doc.preliminary(session, analysis);
  doc.background(session);
  doc.assessment(session, analysis, aScore, bScore);

  // Party-specific modes omit the other side's favourable points; the shared
  // document omits nothing. Section numbers come out of `nextSection()` in the
  // order they are added, so a party summary numbers 1..6 and the consolidated
  // one numbers 1..9 without either hardcoding a number.
  if (mode === "combined" || mode === "party_a") {
    doc.favourablePoints(`نقاط لصالح ${aName} (الطرف الأول)`, aPoints, 4);
  }
  if (mode === "combined" || mode === "party_b") {
    doc.favourablePoints(`نقاط لصالح ${bName} (الطرف الثاني)`, bPoints, 5);
  }

  const relevantMatrix = matrix.filter((row) =>
    mode === "combined"
      ? true
      : mode === "party_a"
      ? row.raised_by === "PARTY_B"
      : row.raised_by === "PARTY_A"
  );
  doc.allegations(
    mode === "combined"
      ? "الادعاءات والردود"
      : mode === "party_a"
      ? `الادعاءات الموجَّهة إلى ${aName}`
      : `الادعاءات الموجَّهة إلى ${bName}`,
    relevantMatrix,
    session,
    6
  );

  const relevantQuestions = questions.filter((q) =>
    mode === "combined"
      ? true
      : q.target_party === (mode === "party_a" ? "PARTY_A" : "PARTY_B") ||
        q.target_party === "BOTH"
  );
  doc.questions(relevantQuestions, 7);

  if (mode === "combined") {
    doc.evidence([...aDocs, ...bDocs], 8);
    if (similar.length > 0) doc.similarCases(similar, 9);
    doc.settlementNotes(analysis.settlement_notes);
  }

  doc.signature();

  const meta = `أُعدّ بمساعدة تحليل آلي • تاريخ الإصدار ${day(
    new Date().toISOString()
  )} • الحالة: ${label(STATUS, session.status, "—")} • آخر تحليل ${dateTime(
    analysis.analyzed_at
  )}`;

  return doc.render(session, mode, meta);
}

// ============================================================
// PRINT
// ============================================================

/** Scoped styling for the printed document. */
const PRINT_CSS = `
.${PRINT_ROOT} {
  direction: rtl;
  text-align: start;
  color: #1a1816;
  font-family: var(--font-plex-arabic), "IBM Plex Sans Arabic", "Segoe UI", system-ui, sans-serif;
  font-size: 11.5pt;
  line-height: 1.7;
}
.${PRINT_ROOT} .page { max-width: 46rem; margin-inline: auto; }
.${PRINT_ROOT} .conf {
  margin: 0 0 1.5rem;
  padding-block: 0.35rem;
  border-block: 0.5pt solid #6e645c;
  text-align: center;
  font-size: 8pt;
  letter-spacing: 0;
  color: #5c5650;
}
.${PRINT_ROOT} .cap { text-align: center; margin-block-end: 1.5rem; }
.${PRINT_ROOT} .cap p { margin: 0; }
.${PRINT_ROOT} .cap-l1 { font-weight: 700; font-size: 12pt; }
.${PRINT_ROOT} .cap-l2, .${PRINT_ROOT} .cap-l3 { font-size: 10pt; }
.${PRINT_ROOT} .cap-no { font-weight: 700; font-size: 11pt; padding-block: 0.15rem; }
.${PRINT_ROOT} .rule-strong { border: 0; border-block-start: 0.9pt solid #6e645c; margin: 0.4rem 0; }
.${PRINT_ROOT} .cap-party { font-size: 10.5pt; margin-block-start: 0.9rem !important; }
.${PRINT_ROOT} .cap-adv { font-size: 9pt; color: #5c5650; }
.${PRINT_ROOT} .cap-and { margin-block: 0.5rem !important; font-size: 10pt; }
.${PRINT_ROOT} .title {
  margin: 1.25rem 0 0;
  text-align: center;
  font-size: 15pt;
  font-weight: 700;
  line-height: 1.5;
}
.${PRINT_ROOT} .rule-seal {
  width: 9rem; margin: 0.6rem auto;
  border: 0; border-block-start: 1.2pt solid #342b4a;
}
.${PRINT_ROOT} .meta {
  margin: 0 0 1.75rem;
  text-align: center;
  font-size: 9pt;
  color: #5c5650;
}
.${PRINT_ROOT} .sec { margin-block-end: 1.4rem; break-inside: auto; }
.${PRINT_ROOT} .sec h2 {
  margin: 0 0 0.5rem;
  padding-block-end: 0.3rem;
  border-block-end: 0.5pt solid #6e645c;
  font-size: 12.5pt;
  font-weight: 700;
  color: #342b4a;
  break-after: avoid;
}
.${PRINT_ROOT} .sec-no { margin-inline-end: 0.4rem; }
.${PRINT_ROOT} .para { margin: 0 0 0.6rem; text-align: justify; }
.${PRINT_ROOT} .clause { margin: 0.6rem 0 0.2rem; text-align: justify; }
.${PRINT_ROOT} .clause-no { font-weight: 700; margin-inline-end: 0.5rem; }
.${PRINT_ROOT} .note { margin: 0.15rem 0 0.15rem 0; padding-inline-start: 1.6rem; font-size: 10pt; color: #3f3a35; }
.${PRINT_ROOT} .quote {
  margin: 0.35rem 0 0.6rem;
  padding-inline-start: 1.6rem;
  font-size: 9.5pt;
  color: #3f3a35;
  text-align: justify;
}
.${PRINT_ROOT} .lead { font-weight: 700; }
.${PRINT_ROOT} .fields { margin: 0; }
.${PRINT_ROOT} .field { display: flex; gap: 1rem; margin-block-end: 0.25rem; break-inside: avoid; }
.${PRINT_ROOT} .field dt {
  flex: 0 0 8.5rem;
  font-size: 9.5pt;
  font-weight: 700;
  color: #5c5650;
}
.${PRINT_ROOT} .field dd { margin: 0; flex: 1 1 auto; }
.${PRINT_ROOT} .scores { width: 100%; border-collapse: collapse; margin-block: 0.6rem 0.8rem; }
.${PRINT_ROOT} .scores th, .${PRINT_ROOT} .scores td {
  border-block-end: 0.5pt solid #cfc7bf;
  padding: 0.3rem 0.5rem;
  text-align: start;
  font-weight: 400;
}
.${PRINT_ROOT} .scores th { font-weight: 700; color: #5c5650; font-size: 9.5pt; white-space: nowrap; }
.${PRINT_ROOT} .scores .num { text-align: end; font-weight: 700; white-space: nowrap; }
.${PRINT_ROOT} .ident { unicode-bidi: isolate; }
.${PRINT_ROOT} .sign { margin-block-start: 2.5rem; break-inside: avoid; text-align: end; }
.${PRINT_ROOT} .sign p { margin: 0 0 0.4rem; }
.${PRINT_ROOT} .sign-line {
  width: 12rem;
  margin: 2.5rem 0 0.35rem auto;
  padding-block-start: 0.35rem;
  border-block-start: 0.7pt solid #1a1816;
  text-align: center;
  font-weight: 700;
}
.${PRINT_ROOT} .sign-cap { font-size: 9.5pt; color: #5c5650; text-align: center; width: 12rem; margin-inline-start: auto !important; }
`;

/** The filename the browser's save dialog should offer, without extension. */
function summaryFilename(session: MediationSession, mode: SummaryMode): string {
  const extras = session as unknown as SessionExtras;
  const code = extras.session_code || `MED-${String(session.id).padStart(4, "0")}`;
  const suffix =
    mode === "combined"
      ? "ملخص-موحّد"
      : mode === "party_a"
      ? "ملخص-الطرف-الأول"
      : "ملخص-الطرف-الثاني";
  return `${code}_${suffix}`;
}

/**
 * Open the print dialog for a session summary.
 *
 * Resolves once the dialog has been dismissed and the tree removed, so a caller
 * that wants to await it (rather than fire-and-forget) can.
 */
export async function downloadSummaryPdf(
  session: MediationSession,
  mode: SummaryMode
): Promise<void> {
  if (typeof window === "undefined" || typeof document === "undefined") return;

  // A second click before the first dialog closes would leave two trees behind,
  // and both would print.
  document.querySelector(`.${PRINT_ROOT}`)?.remove();

  const root = document.createElement("div");
  root.className = PRINT_ROOT;
  root.setAttribute("dir", "rtl");
  root.setAttribute("lang", "ar");
  root.innerHTML = `<style>${PRINT_CSS}</style>${buildSummaryHtml(session, mode)}`;

  const previousTitle = document.title;
  document.title = summaryFilename(session, mode);

  const cleanup = () => {
    root.remove();
    document.title = previousTitle;
    window.removeEventListener("afterprint", cleanup);
  };
  window.addEventListener("afterprint", cleanup);

  document.body.appendChild(root);

  try {
    // Wait for the Arabic webfont, or the preview renders in a fallback face.
    // `fonts.ready` resolves immediately when nothing is pending, so this costs
    // nothing on a warm page.
    await document.fonts?.ready;
    window.print();
  } catch (error) {
    console.error("Could not open the print dialog", error);
    cleanup();
    throw error;
  }
}
