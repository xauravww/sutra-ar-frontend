"use client";

import { useEffect, useState } from "react";
import {
  corpusService,
  corpusErrorMessage,
  type CorpusListParams,
} from "@/lib/corpus";
import { useNotify } from "@/components/ui/Notify";
import { count, n, type PluralForms } from "@/lib/num";

/**
 * One-click bulk publish of the review backlog, behind a risk acknowledgement.
 *
 * Publishing normally means a curator has read the extracted text of a
 * judgment. This skips that for every "needs review" document at once, so the
 * only thing standing between bad ingestion output and user-facing search is
 * the person pressing the button. The typed confirmation is deliberate
 * friction — it makes the operation impossible to trigger by muscle memory.
 *
 * Scope is fixed server-side to `needs_review`: drafts, failed and processing
 * documents cannot be published this way, whatever filters are active.
 */

/**
 * Typed exactly to arm the action. Case-sensitive on purpose.
 *
 * Arabic, like the rest of the surface — the friction comes from having to type
 * a phrase at all, and a Latin phrase in an Arabic dialog would read as a
 * stray identifier rather than as a sentence.
 */
const CONFIRM_PHRASE = "نشر الكل";

/** Document counts — "٣ مستندات". */
const DOCUMENTS: PluralForms = {
  one: "مستند واحد",
  two: "مستندان",
  few: "مستندات",
  many: "مستندًا",
  other: "مستند",
};

export type BulkPublishFilters = Omit<
  CorpusListParams,
  "limit" | "offset" | "sort_by" | "sort_dir" | "status"
>;

export default function BulkPublishDialog({
  open,
  onClose,
  filters,
  onPublished,
}: {
  open: boolean;
  onClose: () => void;
  /** Metadata filters from the queue. Status is not one of them — see above. */
  filters: BulkPublishFilters;
  onPublished: () => void;
}) {
  const { toast } = useNotify();
  const [confirmText, setConfirmText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [matched, setMatched] = useState<number | null>(null);
  const [publishMode, setPublishMode] = useState<"all" | "count">("all");
  const [publishCount, setPublishCount] = useState("");

  // A fresh open must never inherit an armed confirmation from last time.
  useEffect(() => {
    if (open) {
      setConfirmText("");
      setSubmitting(false);
      setPublishMode("all");
      setPublishCount("");
    }
  }, [open]);

  /**
   * Count the documents this will actually publish. The queue's own total
   * follows whichever status tab is selected, so reusing it would promise a
   * number the operation does not deliver.
   */
  useEffect(() => {
    if (!open) {
      setMatched(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const list = await corpusService.listDocuments({
          ...filters,
          status: "needs_review",
          limit: 1,
        });
        if (!cancelled) setMatched(list.total);
      } catch {
        // The warning and the typed confirmation are the safeguards that
        // matter; a missing count must not block the dialog.
        if (!cancelled) setMatched(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, filters]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !submitting) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, submitting, onClose]);

  if (!open) return null;

  const requestedCount = Number(publishCount);
  const hasValidCount =
    Number.isInteger(requestedCount) &&
    requestedCount > 0 &&
    (matched === null || requestedCount <= matched);
  const armed =
    confirmText === CONFIRM_PHRASE &&
    (publishMode === "all" || hasValidCount) &&
    !submitting;

  const handlePublish = async () => {
    if (!armed) return;
    setSubmitting(true);
    try {
      const result = await corpusService.bulkPublish({
        filters,
        ...(publishMode === "count" ? { limit: requestedCount } : {}),
      });

      if (result.published === 0) {
        toast(
          result.matched === 0
            ? "لا شيء بانتظار المراجعة — لم يُنشر أي مستند."
            : "تعذّر نشر أي مستند. تأكد من أن لها مقاطع مفهرسة.",
          "info"
        );
      } else {
        toast(
          `تم نشر ${count(result.published, DOCUMENTS)}.`,
          "success"
        );
      }

      if (result.skipped_no_chunks > 0) {
        toast(
          `${count(result.skipped_no_chunks, DOCUMENTS)} تم تخطّيه — بلا مقاطع مفهرسة. أعد معالجتها قبل النشر.`,
          "info"
        );
      }
      if (result.remaining > 0) {
        toast(
          `${count(result.remaining, DOCUMENTS)} مطابقة لم تُضمَّن.`,
          "info"
        );
      }

      onPublished();
      onClose();
    } catch (error) {
      toast(corpusErrorMessage(error, "تعذّر النشر الجماعي"), "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-sutra-ink/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="bulk-publish-title"
    >
      <div className="w-full max-w-lg overflow-hidden rounded-xl bg-white shadow-xl border border-sutra-line">
        <div className="flex items-start justify-between gap-4 border-b border-sutra-line p-5">
          <div className="flex gap-3">
            <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-red-50 text-red-700">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px]">
                <path d="M12 9v4M12 17h.01" />
                <path d="M10.3 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.7 3.86a2 2 0 0 0-3.4 0z" />
              </svg>
            </span>
            <div>
              <h2
                id="bulk-publish-title"
                className="text-base font-bold text-sutra-ink"
              >
                نشر المستندات قيد المراجعة
              </h2>
              <p className="mt-0.5 text-[13.5px] text-sutra-ink-3">
                {matched === null
                  ? "كل ما هو بانتظار المراجعة حاليًا."
                  : matched === 0
                  ? "لا شيء بانتظار المراجعة الآن."
                  : `${count(matched, DOCUMENTS)} بانتظار المراجعة ستصبح منشورة.`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={submitting}
            aria-label="إغلاق"
            className="rounded p-1 text-sutra-ink-3 transition-colors hover:text-sutra-ink disabled:opacity-40"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-[18px] h-[18px]">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-4 p-5">
          <div className="rounded-lg border border-red-300 bg-red-50 p-4">
            <p className="text-sm font-bold text-red-800">
              استخدم هذا على مسؤوليتك.
            </p>
            <p className="mt-1.5 text-sm leading-relaxed text-red-700">
              لا تفعل هذا إلا إذا كنت تثق في مصدر البيانات وفي خط الفهرسة. كل حكم
              قيد المراجعة يصبح متاحًا في بحث المستخدمين دون أن يقرأه مراجع أولًا
              — والاستخراجات الخاطئة والبيانات الوصفية الخاطئة والأحكام المسندة
              خطأً ستُقتبس للمستخدمين على أنها موثوقة.
            </p>
          </div>

          <ul className="space-y-1.5 text-sm text-sutra-ink-2">
            <li>
              &middot; لا تُنشر إلا المستندات في حالة <strong>بحاجة إلى
              مراجعة</strong>. لا تُمس المسودات ولا المستندات الفاشلة أو قيد
              المعالجة.
            </li>
            <li>
              &middot; المستندات التي لا تحتوي على مقاطع مفهرسة تُتخطّى ولا
              تُنشر.
            </li>
            <li>
              &middot; يُسجَّل كل نشر في سجل التغييرات باسم حسابك.
            </li>
            <li>
              &middot; يمكن التراجع عنه مستندًا مستندًا من صفحة كل مستند — لا
              يوجد تراجع جماعي.
            </li>
          </ul>

          <fieldset className="space-y-2">
            <legend className="text-sm font-semibold text-sutra-ink-2">
              كم مستندًا يجب نشره؟
            </legend>
            <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-sutra-line p-3 transition-colors has-[:checked]:border-navy has-[:checked]:bg-tint">
              <input
                type="radio"
                name="publish-mode"
                checked={publishMode === "all"}
                onChange={() => setPublishMode("all")}
                disabled={submitting}
                className="mt-0.5 h-4 w-4 accent-[#1E4E79]"
              />
              <span className="text-sm text-sutra-ink">
                <span className="font-semibold">كل المستندات المطابقة</span>
                <span className="mt-0.5 block text-sutra-ink-3">
                  {matched === null
                    ? "نشر كل مستند قيد المراجعة حاليًا."
                    : `نشر ${count(matched, DOCUMENTS)} قيد المراجعة حاليًا.`}
                </span>
              </span>
            </label>
            <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-sutra-line p-3 transition-colors has-[:checked]:border-navy has-[:checked]:bg-tint">
              <input
                type="radio"
                name="publish-mode"
                checked={publishMode === "count"}
                onChange={() => setPublishMode("count")}
                disabled={submitting}
                className="mt-0.5 h-4 w-4 accent-[#1E4E79]"
              />
              <span className="min-w-0 flex-1 text-sm text-sutra-ink">
                <span className="font-semibold">عدد محدّد</span>
                <span className="mt-0.5 block text-sutra-ink-3">
                  اختر كم مستندًا مطابقًا تنشره الآن.
                </span>
                <input
                  type="number"
                  min={1}
                  max={matched ?? undefined}
                  step={1}
                  inputMode="numeric"
                  value={publishCount}
                  onChange={(e) => setPublishCount(e.target.value)}
                  onFocus={() => setPublishMode("count")}
                  disabled={submitting}
                  aria-label="عدد المستندات المطلوب نشرها"
                  placeholder={matched === null ? "أدخل رقمًا" : `بحد أقصى ${n(matched)}`}
                  className="mt-2 w-full rounded-lg border border-sutra-line bg-white px-3 py-2 text-sm tabular-nums transition-colors focus:border-navy outline-none focus-visible:ring-2 focus-visible:ring-focus/30 disabled:bg-sutra-bg"
                />
                {publishMode === "count" && !hasValidCount && publishCount && (
                  <span className="mt-1 block text-xs text-red-700">
                    أدخل عددًا صحيحًا{matched === null ? " أكبر من صفر." : ` من ١ إلى ${n(matched)}.`}
                  </span>
                )}
              </span>
            </label>
          </fieldset>

          <label className="block">
            <span className="text-sm font-semibold text-sutra-ink-2">
              اكتب <span className="font-semibold text-sutra-ink">{CONFIRM_PHRASE}</span>{" "}
              للتأكيد
            </span>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              disabled={submitting}
              autoFocus
              autoComplete="off"
              spellCheck={false}
              placeholder={CONFIRM_PHRASE}
              className="mt-1.5 w-full rounded-lg border border-sutra-line bg-white px-3 py-2 text-sm transition-colors focus:border-navy outline-none focus-visible:ring-2 focus-visible:ring-focus/30 disabled:bg-sutra-bg"
            />
          </label>
        </div>

        <div className="flex justify-end gap-2 border-t border-sutra-line bg-sutra-bg/60 px-5 py-4">
          <button
            onClick={onClose}
            disabled={submitting}
            className="rounded-lg border border-sutra-line bg-white px-4 py-2 text-sm font-semibold text-sutra-ink-2 transition-colors hover:bg-tint disabled:opacity-50"
          >
            إلغاء
          </button>
          <button
            onClick={handlePublish}
            disabled={!armed}
            className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-red-300"
          >
            {submitting && (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="w-[15px] h-[15px] animate-spin">
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
              </svg>
            )}
            {submitting
              ? "جارٍ النشر…"
              : publishMode === "all"
              ? "نشر الكل"
              : `نشر ${hasValidCount ? n(requestedCount) : "المحدّد"}`}
          </button>
        </div>
      </div>
    </div>
  );
}
