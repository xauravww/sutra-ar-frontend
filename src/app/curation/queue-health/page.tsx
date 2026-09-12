"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  corpusService,
  corpusErrorMessage,
  type CorpusQueueHealth,
  CORPUS_STATUS_META,
} from "@/lib/corpus";
import { useNotify } from "@/components/ui/Notify";
import { Icon } from "@/components/curation/icons";
import Ltr from "@/components/Ltr";
import { count, dateTime, n } from "@/lib/num";

/**
 * Ingestion queue monitor.
 *
 * Two independent sources of truth, deliberately shown side by side: BullMQ
 * knows about jobs, the database knows about documents. A document stuck in
 * `processing` with no job behind it is invisible to the queue but very
 * visible here — that mismatch is the failure mode worth catching.
 */

/**
 * Job states BullMQ reports, in the order a job moves through them.
 *
 * The keys are BullMQ's own state names and are sent to the API verbatim; only
 * the labels are Arabic. They were previously rendered raw with `capitalize`,
 * which would have shown an Arabic reader the English state name.
 */
const COUNT_ORDER = ["waiting", "active", "delayed", "completed", "failed", "paused"] as const;

const COUNT_LABELS: Record<(typeof COUNT_ORDER)[number], string> = {
  waiting: "في الانتظار",
  active: "قيد التنفيذ",
  delayed: "مؤجلة",
  completed: "مكتملة",
  failed: "فاشلة",
  paused: "متوقفة",
};

/** Arabic forms of "attempt", for the per-job retry count. */
const ATTEMPTS = {
  one: "محاولة واحدة",
  two: "محاولتان",
  few: "محاولات",
  many: "محاولة",
  other: "محاولة",
};

/** Arabic forms of "second", for the auto-refresh cadence. */
const SECONDS = {
  one: "ثانية",
  two: "ثانيتان",
  few: "ثوانٍ",
  many: "ثانية",
  other: "ثانية",
};

const AUTO_REFRESH_MS = 20_000;

export default function CurationQueueHealthPage() {
  const { toast } = useNotify();
  const [data, setData] = useState<CorpusQueueHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (silent = false) => {
    if (silent) setRefreshing(true);
    else setLoading(true);
    try {
      setData(await corpusService.getQueueHealth());
    } catch (error) {
      toast(corpusErrorMessage(error, "تعذّر تحميل حالة قائمة الانتظار"), "error");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
    // A monitor that needs a manual refresh is not a monitor.
    const timer = setInterval(() => load(true), AUTO_REFRESH_MS);
    return () => clearInterval(timer);
  }, [load]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-sutra-ink">
            قائمة انتظار الفهرسة
          </h1>
          <p className="text-sm text-sutra-ink-3 mt-1">
            عمق المهام والمهام الفاشلة والمستندات التي توقّف تقدّمها. يتم التحديث كل{" "}
            {count(AUTO_REFRESH_MS / 1000, SECONDS)}.
          </p>
        </div>
        <button
          onClick={() => load(true)}
          disabled={refreshing}
          className="p-2.5 border border-sutra-line rounded-lg text-sutra-ink-2 hover:bg-white transition-colors disabled:opacity-50"
          title="تحديث"
        >
          <Icon name="refresh" className={refreshing ? "animate-spin" : ""} />
        </button>
      </div>

      {data && !data.queue_reachable && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-bg p-4">
          <Icon name="wifi-off" className="w-[18px] h-[18px] text-amber-ink mt-0.5 flex-shrink-0" />
          <div className="text-sm">
            <p className="font-bold text-amber-ink">قائمة الانتظار غير متاحة</p>
            <p className="text-amber-ink mt-0.5">
              لم يستجب Redis، لذلك تظهر أعداد المهام فارغة بدل أن تظهر صفرًا.
              عمليات الرفع ما زالت تنجح، وتُستأنف المعالجة بمجرد أن يعيد العامل
              الاتصال.
            </p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 animate-pulse">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-20 bg-white rounded-xl border border-sutra-line" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
          {COUNT_ORDER.map((key) => (
            <div
              key={key}
              className="bg-white rounded-xl border border-sutra-line p-4"
            >
              <p className="text-xs text-sutra-ink-3">{COUNT_LABELS[key]}</p>
              <p
                className={`text-2xl font-bold mt-1 tabular-nums ${
                  key === "failed" && (data?.counts[key] ?? 0) > 0
                    ? "text-red-700"
                    : "text-sutra-ink"
                }`}
              >
                {data?.queue_reachable ? n(data.counts[key] ?? 0) : "—"}
              </p>
            </div>
          ))}
        </div>
      )}

      <section className="bg-white rounded-xl border border-sutra-line overflow-hidden">
        <header className="flex items-center gap-2 px-4 py-3 border-b border-sutra-line">
          <Icon name="alert-triangle" className="w-4 h-4 text-red-700" />
          <h2 className="text-sm font-bold text-sutra-ink">المهام الفاشلة</h2>
          <span className="text-xs text-sutra-ink-3">
            {n(data?.failed.length ?? 0)} معروضة
          </span>
        </header>
        {!data || data.failed.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-sutra-ink-3">
            لا توجد مهام فاشلة. إذا ظهرت مهمة هنا، أعد معالجة المستند من صفحته.
          </p>
        ) : (
          <ul className="divide-y divide-sutra-line">
            {data.failed.map((job) => (
              <li key={job.job_id} className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap text-sm">
                      {job.document_id ? (
                        <Link
                          href={`/curation/${job.document_id}`}
                          className="font-semibold text-sutra-ink hover:underline no-underline"
                        >
                          مستند رقم <Ltr>{job.document_id}</Ltr>
                        </Link>
                      ) : (
                        <span className="font-semibold text-sutra-ink">
                          المهمة <Ltr>{job.job_id}</Ltr>
                        </span>
                      )}
                      <span className="text-xs text-sutra-ink-3">
                        {count(job.attempts, ATTEMPTS)}
                      </span>
                    </div>
                    {job.failed_reason && (
                      <p className="mt-1.5 text-xs font-mono text-red-700 break-all" dir="ltr">
                        {job.failed_reason}
                      </p>
                    )}
                  </div>
                  <time className="text-xs text-sutra-ink-3 whitespace-nowrap flex-shrink-0">
                    {job.failed_at ? dateTime(job.failed_at) : "وقت غير معروف"}
                  </time>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="bg-white rounded-xl border border-sutra-line overflow-hidden">
        <header className="flex items-center gap-2 px-4 py-3 border-b border-sutra-line">
          <Icon name="clock" className="w-4 h-4 text-amber-ink" />
          <h2 className="text-sm font-bold text-sutra-ink">
            مستندات متعثّرة
          </h2>
          <span className="text-xs text-sutra-ink-3">
            بدون تغيير لأكثر من ٣٠ دقيقة
          </span>
        </header>
        {!data || data.stalled.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-sutra-ink-3">
            لا يوجد متعثّر. كل المستندات في المسودة أو قيد المعالجة تتقدّم.
          </p>
        ) : (
          <ul className="divide-y divide-sutra-line">
            {data.stalled.map((doc) => (
              <li
                key={doc.id}
                className="flex items-center justify-between gap-4 p-4"
              >
                <div className="min-w-0">
                  <Link
                    href={`/curation/${doc.id}`}
                    className="text-sm font-semibold text-sutra-ink hover:underline truncate block no-underline"
                  >
                    <Ltr>{doc.citation}</Ltr>
                  </Link>
                  <p className="text-xs text-sutra-ink-3 mt-0.5">
                    {CORPUS_STATUS_META[doc.status]?.label ?? doc.status}
                  </p>
                </div>
                <time className="text-xs text-sutra-ink-3 whitespace-nowrap flex-shrink-0">
                  آخر تغيير {dateTime(doc.updated_at)}
                </time>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="flex items-start gap-2 text-xs text-sutra-ink-3">
        <Icon name="activity" className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
        أعداد المهام تأتي من BullMQ، والمستندات المتعثّرة تأتي من قاعدة البيانات.
        المستند المتعثّر بلا مهمة فاشلة يعني عادةً أن العامل توقّف أثناء التنفيذ —
        أعد معالجته.
      </p>
    </div>
  );
}
