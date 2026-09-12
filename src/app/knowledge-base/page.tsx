"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AdminShell from "@/components/admin/AdminShell";
import { useAuth } from "@/lib/auth-context";
import { corpusService, type CorpusDocument, type CorpusFacets } from "@/lib/corpus";
import { Spinner } from "@/components/ui/Button";
import { SearchInput, FilterSelect, EmptyState, ErrorState, StatusBadge } from "@/components/admin/ui";
import Ltr from "@/components/Ltr";
import { count, dateTime, n, type PluralForms } from "@/lib/num";

const OFFICIAL_CONSTITUTION_URL = "https://www.legislative.gov.in/documents/constitution-of-india/constitution-of-india-AjN2EjMtQWa?pageTitle=Constitution-of-India";
const LEGISLATIVE_DOCUMENTS_URL = "https://www.legislative.gov.in/documents?page=1";
const ENGLISH_CONSTITUTION_PDF_URL = "https://www.legislative.gov.in/static/uploads/2025/07/c9fe9c9b6840524844316f74bb1c556c.pdf";

/** Published-source counts, for the result line. */
const SOURCES: PluralForms = {
  one: "مصدر واحد",
  two: "مصدران",
  few: "مصادر",
  many: "مصدرًا",
  other: "مصدر",
};

/** Active-filter counts, for the clear-filters button. */
const FILTERS: PluralForms = {
  one: "مرشّح واحد",
  two: "مرشّحان",
  few: "مرشّحات",
  many: "مرشّحًا",
  other: "مرشّح",
};

/**
 * Corpus language codes. The column is a free VarChar(10) defaulting to "en",
 * so this is a lookup with a fall-through rather than a closed enum — an
 * untaught code prints as itself instead of disappearing.
 */
const LANGUAGE_LABEL: Record<string, string> = {
  en: "الإنجليزية",
  hi: "الهندية",
  ar: "العربية",
  ur: "الأردية",
  fa: "الفارسية",
  fr: "الفرنسية",
};

/**
 * Corpus metadata (citations, party names, court names, bench labels) is
 * stored as Latin text. It is data, not prose, so it is isolated rather than
 * translated — an unisolated Latin run inside an RTL paragraph reorders
 * around the punctuation and the digits beside it.
 */
const data = (s?: string | null) => (s ? <Ltr>{s}</Ltr> : "—");

/** One label/value row inside the document viewer. */
function Meta({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="py-2.5 border-b border-sutra-line-2 last:border-b-0">
      <p className="text-[10.5px] font-bold uppercase text-sutra-ink-3 mb-1">{label}</p>
      <div className="text-[13px] text-sutra-ink break-words">{value}</div>
    </div>
  );
}

export default function KnowledgeBasePage() {
  const router = useRouter();
  const { user } = useAuth();
  const [documents, setDocuments] = useState<CorpusDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [search, setSearch] = useState("");
  // The box is debounced into this; the selects below apply immediately.
  const [appliedSearch, setAppliedSearch] = useState("");
  const [facets, setFacets] = useState<CorpusFacets | null>(null);
  const [court, setCourt] = useState("");
  const [courtType, setCourtType] = useState("");
  const [caseType, setCaseType] = useState("");
  const [stateFilter, setStateFilter] = useState("");
  const [judge, setJudge] = useState("");
  const [year, setYear] = useState("");
  const [viewDoc, setViewDoc] = useState<CorpusDocument | null>(null);
  // The `pdf_url` on a corpus document is the bare Wasabi object URL, and that
  // bucket denies public reads — linking it straight from the row lands the
  // user on an AccessDenied XML page. Only the /source endpoint returns a
  // presigned URL, so the viewer fetches it when it opens.
  const [viewPdf, setViewPdf] = useState<string | null>(null);
  const [viewPdfState, setViewPdfState] = useState<"loading" | "ready" | "failed">("loading");

  const isOwner = !!user && user.role === "owner";

  useEffect(() => {
    if (user && user.role !== "owner") {
      router.replace("/curation");
    }
  }, [router, user]);

  // Search runs server-side (citation/title/parties — see
  // CorpusDocumentService.buildListWhere). Only the text box is debounced;
  // dropdowns apply on change, so they must not sit behind the timer.
  useEffect(() => {
    const t = setTimeout(() => setAppliedSearch(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  // Filter vocabulary is read from the corpus itself rather than hardcoded —
  // a hardcoded "Bombay" that no published judgment carries is a filter that
  // silently returns nothing. Cached server-side for 5 minutes.
  useEffect(() => {
    if (!isOwner) return;
    let cancelled = false;
    corpusService
      .getFacets()
      .then((f) => { if (!cancelled) setFacets(f); })
      .catch(() => { if (!cancelled) setFacets(null); });
    return () => { cancelled = true; };
  }, [isOwner]);

  useEffect(() => {
    if (!isOwner) return;
    let cancelled = false;
    // The timer keeps setLoading out of the effect body, and `cancelled` stops
    // a slow response from overwriting a newer query's results.
    const t = setTimeout(() => {
      setLoading(true);
      corpusService
        .listDocuments({
          status: "published",
          limit: 100,
          sort_by: "updated_at",
          sort_dir: "desc",
          search: appliedSearch || undefined,
          court: court || undefined,
          court_type: courtType || undefined,
          case_type: caseType || undefined,
          state: stateFilter || undefined,
          judge: judge || undefined,
          year: year ? Number(year) : undefined,
        })
        .then((result) => {
          if (cancelled) return;
          setDocuments(result.items);
          setLoadError("");
        })
        .catch((e) => {
          if (cancelled) return;
          setDocuments([]);
          setLoadError(e instanceof Error ? e.message : "تعذّر تحميل المصادر");
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 0);
    return () => { cancelled = true; clearTimeout(t); };
  }, [appliedSearch, court, courtType, caseType, stateFilter, judge, year, isOwner]);

  // Resolve the presigned PDF for whichever document the viewer has open.
  // Reset happens in openView (an event handler) so this effect body stays free
  // of synchronous setState.
  const viewId = viewDoc?.id;
  useEffect(() => {
    if (viewId == null) return;
    let cancelled = false;
    corpusService
      .getPublishedSource(viewId)
      .then((source) => {
        if (cancelled) return;
        setViewPdf(source.pdf_url);
        setViewPdfState(source.pdf_url ? "ready" : "failed");
      })
      .catch(() => {
        if (cancelled) return;
        setViewPdf(null);
        setViewPdfState("failed");
      });
    return () => { cancelled = true; };
  }, [viewId]);

  const openView = (doc: CorpusDocument) => {
    // Only reset when switching documents — reopening the same one leaves
    // `viewId` unchanged, so the effect above would not re-run and the viewer
    // would sit on "Preparing secure link…" forever.
    if (doc.id !== viewDoc?.id) {
      setViewPdf(null);
      setViewPdfState("loading");
    }
    setViewDoc(doc);
  };

  if (!isOwner) {
    return <div className="min-h-dvh bg-sutra-bg" />;
  }

  const query = appliedSearch;

  // Values drawn from a closed enum (court/bench/case type) arrive snake_cased
  // — "supreme_court". Label them readably, but keep the raw value: it is what
  // the API validates against.
  const toOptions = (values: string[] | undefined) =>
    (values ?? []).map((v) => ({
      value: v,
      label: v.includes("_")
        ? v.split("_").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")
        : v,
    }));

  // Only offer a year range that actually spans something — a single published
  // year makes the select a no-op.
  const years: string[] = [];
  if (facets?.year_min != null && facets.year_max != null && facets.year_max > facets.year_min) {
    for (let y = facets.year_max; y >= facets.year_min; y -= 1) years.push(String(y));
  }

  const filterCount = [court, courtType, caseType, stateFilter, judge, year].filter(Boolean).length;

  const clearFilters = () => {
    setCourt("");
    setCourtType("");
    setCaseType("");
    setStateFilter("");
    setJudge("");
    setYear("");
  };

  return (
    <AdminShell>
      <div className="max-w-[940px] mx-auto py-2 sm:py-4">
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <p className="text-[12px] font-bold uppercase text-navy mb-2">مساحة عمل المالك</p>
            <h1 className="text-[28px] sm:text-[34px] font-bold text-sutra-ink">قاعدة المعرفة</h1>
            <p className="text-[14px] sm:text-[15px] text-sutra-ink-3 mt-1">إدارة المصادر القانونية المعتمدة التي تُستند إليها إجابات الذكاء الاصطناعي.</p>
          </div>
          <Link href="/knowledge-base/upload" className="inline-flex items-center gap-2 rounded-xl bg-navy text-white px-4 py-2.5 text-[13px] font-semibold hover:bg-navy-dark">
            <span className="text-lg leading-none">+</span> إضافة مصدر
          </Link>
        </div>

        <section className="bg-white border border-sutra-line rounded-2xl p-4 sm:p-5 mb-5">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-tint text-navy grid place-items-center flex-none" aria-hidden="true">⚖</div>
            <div className="min-w-0 flex-1">
              <h2 className="text-[16px] font-bold text-sutra-ink">تهيئة دستور الهند</h2>
              <p className="text-[13px] text-sutra-ink-3 mt-1 max-w-2xl">استخدم النسخة الرسمية الصادرة عن الدائرة التشريعية، ثم ارفعها للاستخراج والمراجعة والنشر. يبقى المصدر محفوظًا بإصداراته ويمكن استبداله عند صدور نسخة أحدث.</p>
              <div className="flex flex-wrap items-center gap-3 mt-3">
                <a href={OFFICIAL_CONSTITUTION_URL} target="_blank" rel="noreferrer" className="text-[13px] font-semibold text-navy hover:underline">فتح صفحة الدستور ↗</a>
                <a href={ENGLISH_CONSTITUTION_PDF_URL} target="_blank" rel="noreferrer" className="text-[13px] font-semibold text-navy hover:underline">ملف PDF بالإنجليزية ↗</a>
                <a href={LEGISLATIVE_DOCUMENTS_URL} target="_blank" rel="noreferrer" className="text-[13px] font-semibold text-navy hover:underline">كل الوثائق ↗</a>
                <Link href="/knowledge-base/upload" className="text-[13px] font-semibold text-navy hover:underline">رفع هذه النسخة</Link>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-white border border-sutra-line rounded-2xl p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="text-[16px] font-bold text-sutra-ink">المصادر القانونية المنشورة</h2>
              <p className="text-[13px] text-sutra-ink-3 mt-0.5">المصادر المنشورة فقط هي المتاحة لاسترجاع الإجابات.</p>
            </div>
            <Link href="/knowledge-base/queue" className="text-[13px] font-semibold text-navy hover:underline flex-none">إدارة قائمة الانتظار</Link>
          </div>

          <div className="flex flex-wrap items-center gap-3 mb-4">
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="ابحث بالعنوان أو الاستشهاد أو الأطراف…"
              className="flex-1 min-w-[220px]"
            />
            {(facets?.court_types?.length ?? 0) > 0 && (
              <FilterSelect value={courtType} onChange={setCourtType} options={toOptions(facets?.court_types)} allLabel="كل أنواع المحاكم" />
            )}
            {(facets?.courts?.length ?? 0) > 0 && (
              <FilterSelect value={court} onChange={setCourt} options={toOptions(facets?.courts)} allLabel="كل المحاكم" />
            )}
            {(facets?.case_types?.length ?? 0) > 0 && (
              <FilterSelect value={caseType} onChange={setCaseType} options={toOptions(facets?.case_types)} allLabel="كل أنواع الدعاوى" />
            )}
            {(facets?.states?.length ?? 0) > 0 && (
              <FilterSelect value={stateFilter} onChange={setStateFilter} options={toOptions(facets?.states)} allLabel="كل الولايات" />
            )}
            {(facets?.judges?.length ?? 0) > 0 && (
              <FilterSelect value={judge} onChange={setJudge} options={toOptions(facets?.judges)} allLabel="كل القضاة" />
            )}
            {years.length > 0 && (
              <FilterSelect value={year} onChange={setYear} options={years.map((y) => ({ value: y, label: y }))} allLabel="كل السنوات" />
            )}
            {filterCount > 0 && (
              <button
                onClick={clearFilters}
                className="h-[42px] px-3 rounded-xl border border-sutra-line bg-white text-sutra-ink-2 text-[13px] font-semibold hover:border-navy/40 hover:text-navy transition-colors"
              >
                مسح {count(filterCount, FILTERS)}
              </button>
            )}
          </div>

          {loading ? (
            <div className="py-8 grid place-items-center"><Spinner className="w-6 h-6 text-navy" /></div>
          ) : loadError ? (
            <ErrorState title="تعذّر تحميل المصادر" message={loadError} />
          ) : documents.length === 0 ? (
            query || filterCount > 0 ? (
              <div className="rounded-xl border border-dashed border-sutra-line-2 bg-slate-50 px-4 py-8 text-center text-[13px] text-sutra-ink-3">
                <p>
                  لا توجد مصادر منشورة مطابقة
                  {query ? ` لـ «${query}»` : ""}
                  {filterCount > 0 ? ` مع ${count(filterCount, FILTERS)} مطبَّق` : ""}.
                </p>
                {filterCount > 0 && (
                  <button onClick={clearFilters} className="mt-2 text-[13px] font-semibold text-navy hover:underline">
                    مسح عوامل التصفية
                  </button>
                )}
              </div>
            ) : (
              <EmptyState
                title="لا توجد مصادر منشورة بعد"
                description="ارفع مصدرًا رسميًا وانشره لتبدأ الاستناد إليه في الإجابات."
              />
            )
          ) : (
            <>
              <p className="text-[12px] text-sutra-ink-3 mb-2">
                {count(documents.length, SOURCES)}
                {query ? ` مطابقة لـ «${query}»` : ""}
                {filterCount > 0 ? ` مع ${count(filterCount, FILTERS)} مطبَّق` : ""}
              </p>
              <div className="space-y-2">
                {documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-sutra-line-2 px-3.5 py-3 hover:border-navy/40 hover:bg-tint/20 transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-[14px] font-semibold text-sutra-ink truncate">{doc.title}</p>
                      <p className="text-[12px] text-sutra-ink-3 mt-0.5 truncate">
                        {[doc.citation, doc.court, doc.year].filter(Boolean).join(" · ") || "مصدر قانوني منشور"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-none">
                      <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">منشور</span>
                      <button
                        onClick={() => openView(doc)}
                        className="h-8 px-3 rounded-lg border border-navy bg-white text-navy text-[12px] font-bold inline-flex items-center hover:bg-navy hover:text-white transition-colors"
                      >
                        عرض
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </section>
      </div>

      {viewDoc && (
        <div className="fixed inset-0 z-50 grid place-items-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setViewDoc(null)} />
          <div className="relative w-full max-w-2xl max-h-[85vh] overflow-y-auto bg-white rounded-xl border border-sutra-line shadow-xl">
            <div className="flex items-center justify-between gap-3 px-5 py-3.5 border-b border-sutra-line sticky top-0 bg-white z-10">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="text-[11px] font-bold text-sutra-ink-3 whitespace-nowrap">المصدر <Ltr>#{viewDoc.id}</Ltr></span>
                <StatusBadge status={viewDoc.status} />
              </div>
              <button
                onClick={() => setViewDoc(null)}
                className="h-8 w-8 rounded-lg border border-sutra-line bg-white text-sutra-ink-2 grid place-items-center hover:bg-tint hover:text-sutra-ink transition-colors flex-none"
                aria-label="إغلاق"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-4 h-4"><path d="M18 6 6 18M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="p-5">
              <h3 className="text-[16px] font-bold text-sutra-ink mb-1">{viewDoc.title}</h3>
              <p className="text-[13px] text-sutra-ink-3 mb-4">{data(viewDoc.citation) === "—" ? "لا يوجد استشهاد مسجّل" : <Ltr>{viewDoc.citation}</Ltr>}</p>

              <div className="rounded-xl border border-sutra-line px-4 py-1">
                <Meta label="الأطراف" value={data(viewDoc.parties)} />
                <Meta label="المحكمة" value={data([viewDoc.court, viewDoc.court_type].filter(Boolean).join(" · "))} />
                <Meta label="الدائرة" value={data([viewDoc.bench, viewDoc.bench_type].filter(Boolean).join(" · "))} />
                <Meta label="القضاة" value={data(viewDoc.judges)} />
                <Meta label="الولاية" value={data(viewDoc.state)} />
                <Meta label="السنة" value={viewDoc.year ? n(viewDoc.year) : "—"} />
                <Meta label="تاريخ القرار" value={data(viewDoc.decision_date)} />
                <Meta label="نوع الدعوى" value={data(viewDoc.case_type)} />
                <Meta label="النتيجة" value={data(viewDoc.outcome)} />
                <Meta label="اللغة" value={viewDoc.language ? (LANGUAGE_LABEL[viewDoc.language] ?? <Ltr>{viewDoc.language}</Ltr>) : "—"} />
                <Meta label="المقاطع المفهرسة" value={viewDoc._count?.chunks != null ? n(viewDoc._count.chunks) : "—"} />
                <Meta label="رفعه" value={viewDoc.uploader?.email ? <Ltr>{viewDoc.uploader.email}</Ltr> : "—"} />
                <Meta label="تاريخ الإنشاء" value={dateTime(viewDoc.created_at) || "—"} />
                <Meta label="آخر تحديث" value={dateTime(viewDoc.updated_at) || "—"} />
                <Meta
                  label="رابط المصدر"
                  value={
                    viewDoc.source_url
                      ? <a href={viewDoc.source_url} target="_blank" rel="noreferrer" className="text-navy font-semibold break-all hover:underline">{viewDoc.source_url} ↗</a>
                      : "—"
                  }
                />
                <Meta
                  label="ملف PDF"
                  value={
                    viewPdfState === "loading" ? (
                      <span className="text-sutra-ink-3">جارٍ تجهيز رابط آمن…</span>
                    ) : viewPdfState === "ready" && viewPdf ? (
                      <a href={viewPdf} target="_blank" rel="noreferrer" className="text-navy font-semibold break-all hover:underline">فتح ملف PDF ↗</a>
                    ) : (
                      <span className="text-sutra-ink-3">
                        {viewDoc.pdf_url ? "الرابط غير متاح — حاول مرة أخرى." : "لا يوجد ملف PDF مرفق."}
                      </span>
                    )
                  }
                />
                <Meta
                  label="بصمة الملف"
                  value={<code className="font-mono text-[11.5px] text-sutra-ink-2 break-all">{viewDoc.file_hash || "—"}</code>}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  );
}
