"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  corpusService,
  corpusErrorMessage,
  type CorpusDocument,
  type CorpusStats,
  type CorpusStatus,
  type CorpusSortField,
  CORPUS_SORT_OPTIONS,
  CASE_TYPE_OPTIONS,
  CORPUS_COURT_TYPES,
  CORPUS_COURT_TYPE_LABELS,
  CORPUS_BENCH_TYPES,
  CORPUS_BENCH_TYPE_LABELS,
  MONTH_LABELS,
} from "@/lib/corpus";
import { canCurate } from "@/lib/corpus-roles";
import { useAuth } from "@/lib/auth-context";
import { useNotify } from "@/components/ui/Notify";
import CorpusStatusBadge from "@/components/curation/CorpusStatusBadge";
import FacetSelect, { type FacetOption } from "@/components/curation/FacetSelect";
import BulkPublishDialog from "@/components/curation/BulkPublishDialog";
import { Icon } from "@/components/curation/icons";
import Ltr from "@/components/Ltr";
import { n, count, arabicDigits, type PluralForms } from "@/lib/num";

const PAGE_SIZE_OPTIONS = [20, 50, 100];

/** Chunk counts, bare — "٣ مقاطع". */
const CHUNK_PLAIN: PluralForms = {
  one: "مقطع",
  two: "مقطعان",
  few: "مقاطع",
  many: "مقطعًا",
  other: "مقطع",
};

/** Chunk counts carrying the "indexed" adjective, so the phrase agrees. */
const CHUNK_INDEXED: PluralForms = {
  one: "مقطع مُفهرس",
  two: "مقطعان مُفهران",
  few: "مقاطع مُفهرسة",
  many: "مقطعًا مُفهرسًا",
  other: "مقطع مُفهرس",
};

/** Judgment counts — "٣ أحكام". */
const JUDGMENT_FORMS: PluralForms = {
  one: "حكم",
  two: "حكمان",
  few: "أحكام",
  many: "حكمًا",
  other: "حكم",
};

/** Statuses that change on their own — their presence drives auto-refresh. */
const IN_FLIGHT: CorpusStatus[] = ["draft", "processing"];

const STATUS_TABS: Array<{ value: CorpusStatus | "all"; label: string }> = [
  { value: "all", label: "الكل" },
  { value: "needs_review", label: "بحاجة إلى مراجعة" },
  { value: "processing", label: "قيد المعالجة" },
  { value: "published", label: "منشور" },
  { value: "failed", label: "فشل" },
  { value: "archived", label: "مُؤرشف" },
];

const CASE_TYPE_LABELS = new Map(
  CASE_TYPE_OPTIONS.map((option) => [option.value, option.label])
);

/** Closed vocabularies — listed in full rather than derived from what exists,
    so a curator can filter for a bucket that is currently empty and see that. */
const COURT_TYPE_OPTIONS: FacetOption[] = CORPUS_COURT_TYPES.map((value) => ({
  value,
  label: CORPUS_COURT_TYPE_LABELS[value],
}));

const BENCH_TYPE_OPTIONS: FacetOption[] = CORPUS_BENCH_TYPES.map((value) => ({
  value,
  label: CORPUS_BENCH_TYPE_LABELS[value],
}));

const MONTH_OPTIONS: FacetOption[] = MONTH_LABELS.map((label, i) => ({
  value: String(i + 1),
  label,
}));

export default function CurationQueuePage() {
  const { user } = useAuth();
  const { toast } = useNotify();
  const isCurator = user ? canCurate(user.role) : false;

  const [documents, setDocuments] = useState<CorpusDocument[]>([]);
  const [stats, setStats] = useState<CorpusStats | null>(null);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[0]);
  const [status, setStatus] = useState<CorpusStatus | "all">("needs_review");
  const [state, setState] = useState("");
  const [court, setCourt] = useState("");
  const [courtType, setCourtType] = useState("");
  const [benchType, setBenchType] = useState("");
  const [caseType, setCaseType] = useState("");
  const [year, setYear] = useState("");
  const [month, setMonth] = useState("");
  // Free-text metadata: bench registries, judge and party names are open sets,
  // so these are substring matches typed by hand rather than facet pickers.
  const [benchInput, setBenchInput] = useState("");
  const [bench, setBench] = useState("");
  const [judgeInput, setJudgeInput] = useState("");
  const [judge, setJudge] = useState("");
  const [partyInput, setPartyInput] = useState("");
  const [party, setParty] = useState("");
  const [sortBy, setSortBy] = useState<CorpusSortField>("created_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [bulkPublishOpen, setBulkPublishOpen] = useState(false);

  // Debounce the search box so typing doesn't fire a request per keystroke.
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput.trim());
      setOffset(0);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Same treatment for the typed metadata filters.
  useEffect(() => {
    const timer = setTimeout(() => {
      setBench(benchInput.trim());
      setJudge(judgeInput.trim());
      setParty(partyInput.trim());
      setOffset(0);
    }, 350);
    return () => clearTimeout(timer);
  }, [benchInput, judgeInput, partyInput]);

  // Stats describe the whole corpus, so they only need reloading when documents
  // could have changed — not on every page turn or sort change.
  const loadStats = useCallback(async () => {
    try {
      setStats(await corpusService.getStats());
    } catch {
      /* The list is the page; stale counts are not worth a toast. */
    }
  }, []);

  const load = useCallback(
    async (silent = false) => {
      if (silent) setRefreshing(true);
      else setLoading(true);

      try {
        const list = await corpusService.listDocuments({
          ...(status !== "all" ? { status } : {}),
          ...(state ? { state } : {}),
          ...(court ? { court } : {}),
          ...(courtType ? { court_type: courtType } : {}),
          ...(bench ? { bench } : {}),
          ...(benchType ? { bench_type: benchType } : {}),
          ...(caseType ? { case_type: caseType } : {}),
          ...(year ? { year: Number(year) } : {}),
          // The backend rejects a month without a year, and month reads
          // decision_date — documents that only carry a year drop out.
          ...(year && month ? { month: Number(month) } : {}),
          ...(judge ? { judge } : {}),
          ...(party ? { party } : {}),
          ...(search ? { search } : {}),
          sort_by: sortBy,
          sort_dir: sortDir,
          limit: pageSize,
          offset,
        });
        setDocuments(list.items);
        setTotal(list.total);
      } catch (error) {
        toast(corpusErrorMessage(error, "تعذّر تحميل قائمة الانتظار"), "error");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [status, state, court, courtType, bench, benchType, caseType, year, month, judge, party, search, sortBy, sortDir, pageSize, offset, toast]
  );

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  // Ingestion runs in the background, so poll while anything is still moving.
  const hasInFlight = useMemo(
    () => documents.some((doc) => IN_FLIGHT.includes(doc.status)),
    [documents]
  );

  useEffect(() => {
    if (!hasInFlight) return;
    const interval = setInterval(() => {
      load(true);
      loadStats();
    }, 5000);
    return () => clearInterval(interval);
  }, [hasInFlight, load, loadStats]);

  const stateOptions: FacetOption[] = useMemo(
    () =>
      (stats?.by_state ?? [])
        .filter((row): row is { state: string; count: number } => Boolean(row.state))
        .sort((a, b) => a.state.localeCompare(b.state))
        .map((row) => ({ value: row.state, label: row.state, count: row.count })),
    [stats]
  );

  const courtOptions: FacetOption[] = useMemo(
    () =>
      (stats?.by_court ?? [])
        .filter((row): row is { court: string; count: number } => Boolean(row.court))
        .map((row) => ({ value: row.court, label: row.court, count: row.count })),
    [stats]
  );

  const caseTypeOptions: FacetOption[] = useMemo(
    () =>
      (stats?.by_case_type ?? [])
        .filter((row): row is { case_type: string; count: number } =>
          Boolean(row.case_type)
        )
        .map((row) => ({
          value: row.case_type,
          label: CASE_TYPE_LABELS.get(row.case_type) ?? row.case_type,
          count: row.count,
        }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    [stats]
  );

  const yearOptions: FacetOption[] = useMemo(
    () =>
      (stats?.by_year ?? [])
        .filter((row): row is { year: number; count: number } => row.year !== null)
        .map((row) => ({
          value: String(row.year),
          label: arabicDigits(String(row.year)),
          count: row.count,
        })),
    [stats]
  );

  const activeFilters = [
    state,
    court,
    courtType,
    bench,
    benchType,
    caseType,
    year,
    // A month with no year is not sent, so it does not count as active either.
    year && month,
    judge,
    party,
  ].filter(Boolean).length;

  const resetFilters = () => {
    setState("");
    setCourt("");
    setCourtType("");
    setBenchInput("");
    setBench("");
    setBenchType("");
    setCaseType("");
    setYear("");
    setMonth("");
    setJudgeInput("");
    setJudge("");
    setPartyInput("");
    setParty("");
    setOffset(0);
  };

  /** Any filter change invalidates the current page position. */
  const withReset = (setter: (value: string) => void) => (value: string) => {
    setter(value);
    setOffset(0);
  };

  /** Month is only meaningful with a year, so dropping the year drops it too. */
  const handleYearChange = (value: string) => {
    setYear(value);
    if (!value) setMonth("");
    setOffset(0);
  };

  const handleSort = (field: CorpusSortField) => {
    if (field === sortBy) {
      setSortDir((dir) => (dir === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(field);
      setSortDir(
        CORPUS_SORT_OPTIONS.find((o) => o.value === field)?.defaultDir ?? "desc"
      );
    }
    setOffset(0);
  };

  /**
   * Metadata filters the bulk publish acts on. Status is deliberately absent:
   * the operation is fixed to `needs_review` server-side, so passing the
   * queue's current tab would only suggest a scope it does not have.
   */
  const bulkFilters = useMemo(
    () => ({
      ...(state ? { state } : {}),
      ...(court ? { court } : {}),
      ...(courtType ? { court_type: courtType } : {}),
      ...(bench ? { bench } : {}),
      ...(benchType ? { bench_type: benchType } : {}),
      ...(caseType ? { case_type: caseType } : {}),
      ...(year ? { year: Number(year) } : {}),
      ...(year && month ? { month: Number(month) } : {}),
      ...(judge ? { judge } : {}),
      ...(party ? { party } : {}),
      ...(search ? { search } : {}),
    }),
    [state, court, courtType, bench, benchType, caseType, year, month, judge, party, search]
  );

  const page = Math.floor(offset / pageSize) + 1;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const rangeStart = total === 0 ? 0 : offset + 1;
  const rangeEnd = Math.min(offset + pageSize, total);
  const needsReview = stats?.by_status?.needs_review ?? 0;

  return (
    <div className="space-y-5">
      {/* Header — the backlog count is the headline, because it is the one
          number that tells a curator whether there is work to do. */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold text-sutra-ink-3">
            مدونة الأحكام القضائية
          </p>
          <h1 className="mt-1 text-2xl font-bold text-sutra-ink">
            {isCurator ? "قائمة انتظار المراجعة" : "مرفوعاتك"}
          </h1>
          <p className="mt-1 text-sm text-sutra-ink-3">
            {isCurator
              ? needsReview > 0
                ? `${count(needsReview, JUDGMENT_FORMS)} في انتظار المراجعة.`
                : "لا شيء في انتظار المراجعة."
              : "ارفع الأحكام وتابع حالة معالجتها."}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Curator-only escape hatch for trusted, already-verified batches.
              Styled as a danger action because it bypasses per-document review. */}
          {isCurator && (
            <button
              onClick={() => setBulkPublishOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl border border-red-300 bg-white px-4 py-2.5 text-sm font-semibold text-red-700 transition-colors hover:bg-red-50"
            >
              <Icon name="shield-alert" className="w-4 h-4" />
              نشر الكل
            </button>
          )}
          <Link
            href="/curation/upload"
            className="inline-flex items-center gap-2 rounded-xl bg-navy px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-navy-dark no-underline"
          >
            <Icon name="upload" className="w-4 h-4" />
            رفع حكم
          </Link>
        </div>
      </div>

      {/* Corpus summary — a single strip rather than four cards. The pipeline
          reads left to right in the order documents actually move through it. */}
      <div className="overflow-hidden rounded-xl border border-sutra-line bg-white">
        <dl className="grid grid-cols-2 divide-sutra-line sm:grid-cols-3 sm:divide-x lg:grid-cols-6">
          <SummaryCell
            label="المستندات"
            value={stats?.total_documents}
            hint={count(stats?.total_chunks ?? 0, CHUNK_INDEXED)}
          />
          <SummaryCell label="قيد المعالجة" value={stats?.by_status?.processing} />
          <SummaryCell
            label="بحاجة إلى مراجعة"
            value={needsReview}
            emphasis={needsReview > 0}
          />
          <SummaryCell label="منشور" value={stats?.by_status?.published} />
          <SummaryCell label="فشل" value={stats?.by_status?.failed} />
          <SummaryCell label="مُؤرشف" value={stats?.by_status?.archived} />
        </dl>
      </div>

      {/* Controls */}
      <div className="space-y-3 rounded-xl border border-sutra-line bg-white p-4">
        <div className="flex flex-wrap gap-1.5">
          {STATUS_TABS.map((tab) => {
            const tabCount =
              tab.value === "all"
                ? stats?.total_documents
                : stats?.by_status?.[tab.value];
            const isActive = status === tab.value;
            return (
              <button
                key={tab.value}
                onClick={() => {
                  setStatus(tab.value);
                  setOffset(0);
                }}
                aria-pressed={isActive}
                className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors ${
                  isActive
                    ? "bg-navy text-white"
                    : "bg-tint text-sutra-ink-2 hover:bg-tint-2"
                }`}
              >
                {tab.label}
                {tabCount !== undefined && tabCount > 0 && (
                  <span
                    className={`ms-1.5 text-xs tabular-nums ${
                      isActive ? "text-white/60" : "text-sutra-ink-3"
                    }`}
                  >
                    {n(tabCount)}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[16rem] flex-1">
            <Icon
              name="search"
              className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sutra-ink-3"
            />
            <input
              type="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="ابحث في الاستشهاد أو العنوان أو الأطراف"
              className="w-full rounded-lg border border-sutra-line bg-white py-2 ps-9 pe-9 text-sm outline-none focus:border-navy"
            />
            {searchInput && (
              <button
                onClick={() => setSearchInput("")}
                aria-label="مسح البحث"
                className="absolute end-2.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-sutra-ink-3 transition-colors hover:text-sutra-ink"
              >
                <Icon name="x" className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <button
            onClick={() => setFiltersOpen((open) => !open)}
            aria-expanded={filtersOpen}
            className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold transition-colors ${
              activeFilters > 0
                ? "border-navy bg-navy text-white"
                : "border-sutra-line text-sutra-ink-2 hover:bg-tint"
            }`}
          >
            <Icon name="sliders" className="w-[15px] h-[15px]" />
            عوامل التصفية
            {activeFilters > 0 && (
              <span className="rounded bg-white/20 px-1.5 text-xs tabular-nums">
                {n(activeFilters)}
              </span>
            )}
          </button>

          <SortControl
            sortBy={sortBy}
            sortDir={sortDir}
            onSortBy={handleSort}
            onToggleDir={() => {
              setSortDir((dir) => (dir === "asc" ? "desc" : "asc"));
              setOffset(0);
            }}
          />

          <button
            onClick={() => {
              load(true);
              loadStats();
            }}
            disabled={refreshing}
            title="تحديث"
            aria-label="تحديث قائمة الانتظار"
            className="rounded-lg border border-sutra-line p-2 text-sutra-ink-2 transition-colors hover:bg-tint disabled:opacity-50"
          >
            <Icon name="refresh" className={refreshing ? "animate-spin" : ""} />
          </button>
        </div>

        {filtersOpen && (
          <div className="grid gap-2 border-t border-sutra-line-2 pt-3 sm:grid-cols-2 lg:grid-cols-4">
            <FacetSelect
              label="الولاية"
              allLabel="كل الولايات"
              value={state}
              options={stateOptions}
              onChange={withReset(setState)}
            />
            <FacetSelect
              label="نوع المحكمة"
              allLabel="كل أنواع المحاكم"
              value={courtType}
              options={COURT_TYPE_OPTIONS}
              onChange={withReset(setCourtType)}
            />
            <FacetSelect
              label="المحكمة"
              allLabel="كل المحاكم"
              value={court}
              options={courtOptions}
              onChange={withReset(setCourt)}
            />
            <FacetSelect
              label="تشكيل الدائرة"
              allLabel="كل تشكيلات الدوائر"
              value={benchType}
              options={BENCH_TYPE_OPTIONS}
              onChange={withReset(setBenchType)}
            />
            <FacetSelect
              label="نوع القضية"
              allLabel="كل أنواع القضايا"
              value={caseType}
              options={caseTypeOptions}
              onChange={withReset(setCaseType)}
            />
            <FacetSelect
              label="السنة"
              allLabel="كل السنوات"
              value={year}
              options={yearOptions}
              onChange={handleYearChange}
            />
            {/* Month reads the full decision date, which many sources do not
                report — pick a year first, and expect year-only documents to
                fall out of the result. */}
            <FacetSelect
              label="الشهر"
              allLabel={year ? "كل الأشهر" : "اختر السنة أولًا"}
              value={month}
              options={MONTH_OPTIONS}
              disabled={!year}
              onChange={withReset(setMonth)}
            />
            <TextFilter
              label="مقر الدائرة"
              placeholder="مقر الدائرة، مثال: الرياض"
              value={benchInput}
              onChange={setBenchInput}
            />
            <TextFilter
              label="القاضي"
              placeholder="اسم القاضي"
              value={judgeInput}
              onChange={setJudgeInput}
            />
            <TextFilter
              label="الطرف"
              placeholder="اسم الطرف"
              value={partyInput}
              onChange={setPartyInput}
            />
          </div>
        )}

        {activeFilters > 0 && (
          <div className="flex flex-wrap items-center gap-2 border-t border-sutra-line-2 pt-3">
            {state && <FilterChip label={state} onClear={() => withReset(setState)("")} />}
            {courtType && (
              <FilterChip
                label={
                  CORPUS_COURT_TYPE_LABELS[
                    courtType as keyof typeof CORPUS_COURT_TYPE_LABELS
                  ] ?? courtType
                }
                onClear={() => withReset(setCourtType)("")}
              />
            )}
            {court && <FilterChip label={court} onClear={() => withReset(setCourt)("")} />}
            {bench && (
              <FilterChip
                label={`Bench: ${bench}`}
                onClear={() => {
                  setBenchInput("");
                  withReset(setBench)("");
                }}
              />
            )}
            {benchType && (
              <FilterChip
                label={
                  CORPUS_BENCH_TYPE_LABELS[
                    benchType as keyof typeof CORPUS_BENCH_TYPE_LABELS
                  ] ?? benchType
                }
                onClear={() => withReset(setBenchType)("")}
              />
            )}
            {caseType && (
              <FilterChip
                label={CASE_TYPE_LABELS.get(caseType) ?? caseType}
                onClear={() => withReset(setCaseType)("")}
              />
            )}
            {year && (
              <FilterChip label={year} onClear={() => handleYearChange("")} />
            )}
            {year && month && (
              <FilterChip
                label={MONTH_LABELS[Number(month) - 1]}
                onClear={() => withReset(setMonth)("")}
              />
            )}
            {judge && (
              <FilterChip
                label={`Judge: ${judge}`}
                onClear={() => {
                  setJudgeInput("");
                  withReset(setJudge)("");
                }}
              />
            )}
            {party && (
              <FilterChip
                label={`Party: ${party}`}
                onClear={() => {
                  setPartyInput("");
                  withReset(setParty)("");
                }}
              />
            )}
            <button
              onClick={resetFilters}
              className="text-sm font-semibold text-sutra-ink-3 underline-offset-4 transition-colors hover:text-sutra-ink hover:underline"
            >
              Clear all
            </button>
          </div>
        )}
      </div>

      {/* Results */}
      <div className="overflow-hidden rounded-xl border border-sutra-line bg-white">
        {loading ? (
          <ul className="divide-y divide-sutra-line">
            {Array.from({ length: 6 }).map((_, i) => (
              <li key={i} className="animate-pulse p-4">
                <div className="mb-2 h-4 w-1/3 rounded bg-sutra-line-2" />
                <div className="h-3 w-1/2 rounded bg-sutra-line-2" />
              </li>
            ))}
          </ul>
        ) : documents.length === 0 ? (
          <div className="p-12 text-center">
            <Icon name="file-text" className="mx-auto mb-3 w-8 h-8 text-sutra-line" />
            <p className="font-bold text-sutra-ink">لا توجد نتائج مطابقة</p>
            <p className="mt-1 text-sm text-sutra-ink-3">
              {search || activeFilters > 0 || status !== "all"
                ? "وسّع المرشّحات أو امسح البحث لعرض المزيد."
                : "ارفع ملف حكم بصيغة PDF لبدء بناء المجموعة."}
            </p>
            {(search || activeFilters > 0) && (
              <button
                onClick={() => {
                  setSearchInput("");
                  resetFilters();
                }}
                className="mt-4 rounded-lg border border-sutra-line bg-white px-3.5 py-2 text-sm font-semibold text-sutra-ink-2 transition-colors hover:bg-tint"
              >
                Clear search and filters
              </button>
            )}
          </div>
        ) : (
          <ul className="divide-y divide-sutra-line">
            {documents.map((doc) => (
              <li key={doc.id}>
                <Link
                  href={`/curation/${doc.id}`}
                  className="group block p-4 transition-colors hover:bg-tint/50 no-underline"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="truncate font-bold text-sutra-ink">
                          {doc.title}
                        </h3>
                        <CorpusStatusBadge status={doc.status} />
                      </div>
                      <p className="mt-1 truncate font-mono text-sm text-sutra-ink-3">
                        {doc.citation}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-sutra-ink-3">
                        {doc.court && <span>{doc.court}</span>}
                        {doc.bench && <span>&middot; {doc.bench}</span>}
                        {doc.state && <span>&middot; {doc.state}</span>}
                        {/* The full date when the source gave one; the year is
                            all most judgments carry. */}
                        {(doc.decision_date || doc.year) && (
                          <span>&middot; {doc.decision_date ?? doc.year}</span>
                        )}
                        {doc.bench_type && (
                          <span>
                            &middot;{" "}
                            {CORPUS_BENCH_TYPE_LABELS[
                              doc.bench_type as keyof typeof CORPUS_BENCH_TYPE_LABELS
                            ] ?? doc.bench_type}
                          </span>
                        )}
                        <span>
                          &middot;{" "}
                          {doc._count?.chunks
                            ? count(doc._count.chunks, CHUNK_INDEXED)
                            : "غير مفهرس"}
                        </span>
                        {doc.uploader && (
                          <span className="truncate">
                            &middot; {doc.uploader.email}
                          </span>
                        )}
                      </div>
                    </div>
                    <Icon
                      name="chevron-right"
                      className="mt-1 flex-shrink-0 w-[18px] h-[18px] text-sutra-line transition-colors group-hover:text-sutra-ink-3 rtl-flip"
                    />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}

        {!loading && documents.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-sutra-line bg-sutra-bg/60 px-4 py-3">
            <div className="flex items-center gap-3">
              <p className="text-sm tabular-nums text-sutra-ink-3">
                {n(rangeStart)}–{n(rangeEnd)} من {n(total)}
              </p>
              <label className="flex items-center gap-1.5 text-sm text-sutra-ink-3">
                <span className="sr-only">عدد المستندات في الصفحة</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setOffset(0);
                  }}
                  className="rounded-md border border-sutra-line bg-white py-1 ps-2 pe-6 text-sm text-sutra-ink-2 outline-none"
                >
                  {PAGE_SIZE_OPTIONS.map((size) => (
                    <option key={size} value={size}>
                      {n(size)} في الصفحة
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {pageCount > 1 && (
              <div className="flex items-center gap-1">
                <PageButton
                  onClick={() => setOffset(0)}
                  disabled={page === 1}
                  label="الصفحة الأولى"
                >
                  <Icon name="chevrons-left" className="w-4 h-4 rtl-flip" />
                </PageButton>
                <PageButton
                  onClick={() => setOffset(Math.max(0, offset - pageSize))}
                  disabled={page === 1}
                  label="الصفحة السابقة"
                >
                  <Icon name="chevron-left" className="w-4 h-4 rtl-flip" />
                </PageButton>
                <span className="px-2 text-sm tabular-nums text-sutra-ink-3">
                  {n(page)} / {n(pageCount)}
                </span>
                <PageButton
                  onClick={() => setOffset(offset + pageSize)}
                  disabled={page >= pageCount}
                  label="الصفحة التالية"
                >
                  <Icon name="chevron-right" className="w-4 h-4 rtl-flip" />
                </PageButton>
                <PageButton
                  onClick={() => setOffset((pageCount - 1) * pageSize)}
                  disabled={page >= pageCount}
                  label="الصفحة الأخيرة"
                >
                  <Icon name="chevrons-right" className="w-4 h-4 rtl-flip" />
                </PageButton>
              </div>
            )}
          </div>
        )}
      </div>

      <BulkPublishDialog
        open={bulkPublishOpen}
        onClose={() => setBulkPublishOpen(false)}
        filters={bulkFilters}
        onPublished={() => {
          load(true);
          loadStats();
        }}
      />
    </div>
  );
}

function SortControl({
  sortBy,
  sortDir,
  onSortBy,
  onToggleDir,
}: {
  sortBy: CorpusSortField;
  sortDir: "asc" | "desc";
  onSortBy: (field: CorpusSortField) => void;
  onToggleDir: () => void;
}) {
  const current = CORPUS_SORT_OPTIONS.find((o) => o.value === sortBy);

  return (
    <div className="flex items-stretch overflow-hidden rounded-lg border border-sutra-line">
      <label className="relative">
        <span className="sr-only">الترتيب حسب</span>
        <select
          value={sortBy}
          onChange={(e) => onSortBy(e.target.value as CorpusSortField)}
          className="h-full appearance-none [background-image:none] bg-white py-2 ps-3 pe-7 text-sm text-sutra-ink-2 outline-none"
        >
          {CORPUS_SORT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <Icon
          name="chevron-down"
          className="pointer-events-none absolute end-2 top-1/2 -translate-y-1/2 w-3 h-3 text-sutra-ink-3"
        />
      </label>
      <button
        onClick={onToggleDir}
        title={sortDir === "asc" ? "تصاعدي" : "تنازلي"}
        aria-label={`مرتّب حسب ${current?.label ?? sortBy}، ${
          sortDir === "asc" ? "تصاعديًا" : "تنازليًا"
        }. اعكس الترتيب.`}
        className="border-s border-sutra-line bg-white px-2.5 text-sutra-ink-3 transition-colors hover:bg-tint hover:text-sutra-ink"
      >
        {sortDir === "asc" ? <Icon name="arrow-up" /> : <Icon name="arrow-down" />}
      </button>
    </div>
  );
}

/**
 * A typed filter for open-ended metadata (bench, judge, party). These columns
 * are free text, so a dropdown of everything that exists would be unusable —
 * the backend matches on a substring instead.
 */
function TextFilter({
  label,
  placeholder,
  value,
  onChange,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const active = value.trim() !== "";

  return (
    <label className="relative block">
      <span className="sr-only">{label}</span>
      <input
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className={`w-full rounded-lg border py-2 ps-3 pe-8 text-sm outline-none ${
          active
            ? "border-navy bg-white font-semibold text-sutra-ink"
            : "border-sutra-line bg-white text-sutra-ink-2 hover:border-sutra-ink-3"
        }`}
      />
      {active && (
        <button
          onClick={() => onChange("")}
          aria-label={`مسح مرشّح ${label}`}
          className="absolute end-2.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-sutra-ink-3 transition-colors hover:text-sutra-ink"
        >
          <Icon name="x" className="w-3 h-3" />
        </button>
      )}
    </label>
  );
}

function FilterChip({ label, onClear }: { label: string; onClear: () => void }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-tint py-1 ps-3 pe-1.5 text-sm text-navy font-semibold">
      {label}
      <button
        onClick={onClear}
        aria-label={`إزالة مرشّح ${label}`}
        className="rounded-full p-0.5 text-sutra-ink-3 transition-colors hover:bg-tint-2 hover:text-sutra-ink"
      >
        <Icon name="x" className="w-3 h-3" />
      </button>
    </span>
  );
}

function PageButton({
  onClick,
  disabled,
  label,
  children,
}: {
  onClick: () => void;
  disabled: boolean;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="rounded-lg border border-sutra-line bg-white p-2 text-sutra-ink-2 transition-colors hover:bg-tint disabled:cursor-not-allowed disabled:opacity-40"
    >
      {children}
    </button>
  );
}

function SummaryCell({
  label,
  value,
  hint,
  emphasis = false,
}: {
  label: string;
  value?: number;
  hint?: string;
  emphasis?: boolean;
}) {
  return (
    <div className={`px-4 py-3 ${emphasis ? "bg-amber-bg/60" : ""}`}>
      <dt className="text-[11px] font-bold uppercase text-sutra-ink-3">
        {label}
      </dt>
      <dd
        className={`mt-0.5 text-xl font-bold tabular-nums ${
          emphasis ? "text-amber-ink" : "text-sutra-ink"
        }`}
      >
        {(value ?? 0).toLocaleString()}
      </dd>
      {hint && <p className="mt-0.5 text-xs text-sutra-ink-3">{hint}</p>}
    </div>
  );
}
