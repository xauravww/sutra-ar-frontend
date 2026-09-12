"use client";

import { useState, useEffect, useCallback } from "react";
import TopBar from "@/components/TopBar";
import Link from "next/link";
import Button, { Spinner } from "@/components/ui/Button";
import { judicialCases, type JudicialCase } from "@/lib/api";
import { useNotify } from "@/components/ui/Notify";
import { n, count, date, UNITS, type PluralForms } from "@/lib/num";
import Ltr from "@/components/Ltr";

/** Case counts, for the "you have created N cases" line. */
const CASES: PluralForms = {
  one: "قضية واحدة",
  two: "قضيتان",
  few: "قضايا",
  many: "قضية",
  other: "قضية",
};

/** Plural forms of "page" for the page-count badge. */
const PAGE_UNITS = { one: "صفحة", two: "صفحتان", few: "صفحات", many: "صفحة", other: "صفحة" };

export default function CasesPage() {
  const { toast, confirm } = useNotify();
  const [cases, setCases] = useState<JudicialCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newCaseNumber, setNewCaseNumber] = useState("");
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const fetchCases = useCallback(() => {
    judicialCases
      .list()
      .then((res) => setCases(Array.isArray(res.data) ? res.data : []))
      .catch(() => setCases([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchCases();
  }, [fetchCases]);

  const filtered = cases.filter((c) => {
    const q = search.toLowerCase();
    return (
      !q ||
      c.title.toLowerCase().includes(q) ||
      (c.case_number && c.case_number.toLowerCase().includes(q))
    );
  });

  const handleCreate = async () => {
    if (!newTitle.trim()) return;
    setCreating(true);
    try {
      await judicialCases.create({
        title: newTitle.trim(),
        case_number: newCaseNumber.trim() || undefined,
      });
      setNewTitle("");
      setNewCaseNumber("");
      setShowNew(false);
      toast("تم إنشاء القضية", "success");
      fetchCases();
    } catch (err) {
      toast(err instanceof Error ? err.message : "تعذّر إنشاء القضية", "error");
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: number) => {
    const ok = await confirm({
      title: "حذف القضية",
      message: "هل تريد حذف هذه القضية؟ لا يمكن التراجع عن هذا الإجراء.",
      confirmLabel: "حذف",
      tone: "danger",
    });
    if (!ok) return;
    setDeletingId(id);
    try {
      await judicialCases.delete(id);
      setCases((prev) => prev.filter((c) => c.id !== id));
      toast("تم حذف القضية", "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : "تعذّر حذف القضية", "error");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="min-h-dvh">
      <TopBar />
      <main id="main-content" tabIndex={-1} className="max-w-[940px] mx-auto px-4 sm:px-6 py-6 sm:py-8 pb-21">
        {/* Page header */}
        <div className="flex items-end justify-between gap-4 flex-wrap mb-6">
          <div>
            <h1 className="text-[24px] sm:text-[33px] font-bold leading-[1.12]">
              القضايا القضائية
            </h1>
            <p className="mt-1 sm:mt-1.5 text-[14px] sm:text-[16px] text-sutra-ink-3">
              ذكاء القضايا وتحليلها
            </p>
          </div>
          <button
            onClick={() => setShowNew(!showNew)}
            className={showNew
              ? "inline-flex items-center gap-1.5 bg-white text-sutra-ink-2 border border-sutra-line rounded-xl text-[14px] sm:text-[16px] font-semibold px-3.5 sm:px-5 py-2.5 sm:py-3.5 min-h-[44px] sm:min-h-[52px] transition-colors hover:bg-tint hover:border-navy/30 cursor-pointer"
              : "inline-flex items-center gap-2 bg-navy text-white border-0 rounded-xl text-[15px] sm:text-[17px] font-semibold px-4 sm:px-6 py-2.5 sm:py-3.5 min-h-[44px] sm:min-h-[52px] transition-colors hover:bg-navy-dark cursor-pointer"}
          >
            {showNew ? (
              <>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 sm:w-[18px] sm:h-[18px] rtl-flip"><path d="M15 18l-6-6 6-6" /></svg>
                {/* One text node with the tail hidden on phones (#1609) — the
                    old sibling `<span className="hidden sm:inline">` +
                    `<span className="sm:hidden">` pair read as "Back to
                    CasesBack" to anything that concatenates the button's text
                    (textContent, copy/paste, a11y text dumps). */}
                <span>رجوع<span className="hidden sm:inline"> إلى القضايا</span></span>
              </>
            ) : (
              <>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-5 h-5 sm:w-[22px] sm:h-[22px]"><path d="M12 5v14M5 12h14" /></svg>
                <span>قضية<span className="hidden sm:inline"> جديدة</span></span>
              </>
            )}
          </button>
        </div>

        {/* New case form */}
        {showNew && (
          <div className="bg-white border border-sutra-line rounded-2xl p-4 sm:p-6 mb-6">
            <h3 className="text-[16px] sm:text-[17px] font-bold text-sutra-ink mb-4">إنشاء قضية جديدة</h3>
            <div className="grid grid-cols-1 gap-4 mb-4">
              <div>
                <label className="block text-[13px] font-semibold text-sutra-ink-2 mb-1.5">
                  عنوان القضية *
                </label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="مثال: النيابة العامة ضد المتهم"
                  className="w-full h-11 rounded-lg border border-sutra-line bg-white px-3.5 text-[16px] text-sutra-ink outline-none focus:border-navy"
                />
              </div>
              <div>
                <label className="block text-[13px] font-semibold text-sutra-ink-2 mb-1.5">
                  رقم القضية
                </label>
                <input
                  type="text"
                  value={newCaseNumber}
                  onChange={(e) => setNewCaseNumber(e.target.value)}
                  placeholder="مثال: CRL/123/2026"
                  dir="ltr"
                  className="w-full h-11 rounded-lg border border-sutra-line bg-white px-3.5 text-[16px] text-sutra-ink outline-none focus:border-navy"
                />
              </div>
            </div>
            <div className="flex gap-3">
              <Button loading={creating} onClick={handleCreate}>
                {creating ? "جارٍ الإنشاء…" : "إنشاء القضية"}
              </Button>
              <button
                onClick={() => setShowNew(false)}
                className="inline-flex items-center justify-center rounded-lg border border-sutra-line bg-white px-5 h-11 text-[14px] sm:text-[15px] font-semibold text-sutra-ink-2 hover:bg-tint transition-colors"
              >
                إلغاء
              </button>
            </div>
          </div>
        )}

        {!showNew && <>
        {/* Controls */}
        <div className="flex flex-col gap-2 mb-6">
          <label className="w-full flex items-center gap-2 sm:gap-3 bg-white border border-sutra-line rounded-xl px-3 sm:px-4 min-h-[48px] sm:min-h-[56px]">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="w-5 h-5 sm:w-[22px] sm:h-[22px] text-sutra-ink-3 flex-none">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ابحث في القضايا…"
              className="border-0 bg-transparent outline-none focus:outline-none focus-visible:outline-none focus-visible:ring-0 w-full font-[inherit] text-[16px] sm:text-[17px] text-sutra-ink placeholder:text-sutra-ink-3"
            />
          </label>
          <p className="text-start text-[12px] sm:text-[13px] text-sutra-ink-3">
            لديك <b className="text-sutra-ink font-semibold">{count(cases.length, CASES)}</b> حتى الآن.
          </p>
        </div>

        {/* Cases list */}
        <div className="flex flex-col gap-3 sm:gap-4">
          {loading ? (
            <div className="space-y-3 sm:space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white border border-sutra-line rounded-2xl p-4 sm:p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="h-6 w-24 bg-sutra-line-2 rounded animate-pulse flex-none" />
                    <div className="h-6 w-20 bg-sutra-line-2 rounded-full animate-pulse flex-none" />
                  </div>
                  <div className="h-7 w-full max-w-[256px] bg-sutra-line-2 rounded animate-pulse mb-3" />
                  <div className="h-4 w-full max-w-[192px] bg-sutra-line-2 rounded animate-pulse" />
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="bg-white border border-sutra-line rounded-2xl p-8 sm:p-12 text-center">
              <div className="w-14 sm:w-16 h-14 sm:h-16 rounded-2xl bg-tint text-navy grid place-items-center mx-auto mb-4 border border-tint-2">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6 sm:w-7 sm:h-7">
                  <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
                  <path d="M14 3v5h5" />
                </svg>
              </div>
              <p className="text-[16px] sm:text-[17px] font-semibold text-sutra-ink mb-1">
                {search ? "لا توجد قضايا مطابقة لبحثك" : "لا توجد قضايا بعد"}
              </p>
              <p className="text-[14px] sm:text-[15px] text-sutra-ink-3">
                {search
                  ? "جرّب كلمة بحث أخرى"
                  : "اضغط «قضية جديدة» لإنشاء أول قضية"}
              </p>
            </div>
          ) : (
            filtered.map((c) => (
              <article
                key={c.id}
                className="relative bg-white border border-sutra-line rounded-2xl p-4 sm:p-[26px_28px_24px] overflow-hidden transition-colors hover:border-[#C7D0DC] group"
              >
                {/* Left accent bar */}
                <div className="absolute start-0 top-0 bottom-0 w-1 bg-navy transform scale-y-0 origin-top transition-transform group-hover:scale-y-100" />

                <div className="flex items-center justify-between gap-2 sm:gap-3.5 mb-2.5 sm:mb-3.5">
                  <span className="text-[13px] sm:text-[15px] font-bold text-navy bg-tint border border-tint-2 py-1 sm:py-1.5 px-2.5 sm:px-3.5 rounded-[8px] sm:rounded-[9px]">
                    <Ltr>JC-{String(c.id).padStart(4, "0")}</Ltr>
                  </span>
                  <StatusBadge status={c.status} hasDocument={Boolean(c.pdf_filename)} documentsAnalyzed={c.documents_analyzed} />
                </div>

                <h2 className="text-[18px] sm:text-[22px] font-bold leading-snug mb-1.5 sm:mb-2 break-words [overflow-wrap:anywhere]">
                  {c.title}
                </h2>

                {c.case_number && (
                  <p className="text-[13px] sm:text-[15px] text-sutra-ink-2 mb-3">
                    رقم القضية: <span className="font-semibold"><Ltr>{c.case_number}</Ltr></span>
                  </p>
                )}

                <div className="flex items-center justify-between gap-3 flex-wrap mt-3">
                  <span className="text-[13px] sm:text-[16px] text-sutra-ink-2">
                    {c.pdf_filename && (
                      <>
                        <b className="text-sutra-ink font-bold"><Ltr>{c.pdf_filename}</Ltr></b>
                        {c.page_count && <span> · {count(c.page_count, PAGE_UNITS)}</span>}
                        &nbsp;·&nbsp;
                      </>
                    )}
                    {date(c.created_at)}
                  </span>
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/cases/${c.id}`}
                      className="inline-flex items-center gap-1.5 sm:gap-2 bg-white text-navy border-2 border-navy rounded-xl text-[14px] sm:text-[16px] font-bold px-3 sm:px-5 py-2 sm:py-2.5 min-h-[40px] sm:min-h-[46px] transition-colors hover:bg-navy hover:text-white no-underline"
                    >
                      فتح
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-4 h-4 sm:w-[19px] sm:h-[19px]">
                        <path d="M5 12h14M13 6l6 6-6 6" />
                      </svg>
                    </Link>
                    <button
                      onClick={() => handleDelete(c.id)}
                      disabled={deletingId === c.id}
                      title="حذف القضية"
                      className="w-[40px] h-[40px] sm:w-[46px] sm:h-[46px] flex-none border border-sutra-line rounded-xl bg-white text-sutra-ink-3 grid place-items-center cursor-pointer hover:border-red-300 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-40 disabled:cursor-default"
                    >
                      {deletingId === c.id ? (
                        <Spinner className="w-4 h-4" />
                      ) : (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" className="w-4 h-4 sm:w-5 sm:h-5">
                          <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                          <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
              </article>
            ))
          )}
        </div>
        </>}
      </main>
    </div>
  );
}

function StatusBadge({ status, hasDocument, documentsAnalyzed }: { status: string; hasDocument: boolean; documentsAnalyzed?: boolean }) {
  const labels: Record<string, string> = {
    uploaded: hasDocument ? "تم رفع المستندات" : "بانتظار المستندات",
    processing: "جارٍ التحليل",
    structured: "اكتمل التحليل",
    failed: documentsAnalyzed ? "اكتمل تحليل المستندات" : "فشل التحليل",
  };
  const isComplete = status === "structured";
  const isProcessing = status === "processing";
  const isDocumentComplete = status === "failed" && documentsAnalyzed;
  return (
    <span
      className={`inline-flex items-center gap-1.5 sm:gap-2.5 text-[12px] sm:text-[15px] font-semibold px-2.5 sm:px-4 py-1 sm:py-1.5 rounded-full ${
        isComplete
          ? "bg-green-bg text-green-ink"
          : isProcessing
            ? "bg-blue-50 text-blue-700"
          : status === "failed" && !isDocumentComplete
            ? "bg-red-50 text-red-700"
            : "bg-amber-bg text-amber-ink"
      }`}
    >
      {isProcessing && <Spinner className="w-3 h-3 sm:w-3.5 sm:h-3.5" />}
      {!isProcessing && (
        <span
          className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full flex-none ${
            isComplete
              ? "bg-green-dot"
              : isProcessing
                ? "bg-blue-500"
              : status === "failed" && !isDocumentComplete
                ? "bg-red-500"
                  : "bg-amber-dot"
          }`}
        />
      )}
      {labels[status] ?? <Ltr>{status}</Ltr>}
    </span>
  );
}
