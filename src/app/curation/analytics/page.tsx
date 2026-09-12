"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  corpusService,
  corpusErrorMessage,
  type CorpusSearchAnalytics,
  type CorpusFeedbackSummary,
} from "@/lib/corpus";
import { useNotify } from "@/components/ui/Notify";
import { Icon } from "@/components/curation/icons";
import Ltr from "@/components/Ltr";
import { count, date, dateTime, n, percent } from "@/lib/num";

/**
 * Search analytics and relevance feedback.
 *
 * The two lists that matter are the ones nobody enjoys reading: zero-result
 * queries (users asked, we had nothing) and worst-rated documents (we had
 * something, it did not help). Both are sourcing and curation work-lists,
 * which is why they are given more room than the vanity totals.
 */

const WINDOWS = [7, 30, 90, 365];

/** Arabic forms of "day", for the window selector. */
const DAYS = {
  one: "يوم",
  two: "يومان",
  few: "أيام",
  many: "يومًا",
  other: "يوم",
};

/** Arabic forms of "open", for the source-click count. */
const OPENS = {
  one: "فتحة واحدة",
  two: "فتحتان",
  few: "فتحات",
  many: "فتحة",
  other: "فتحة",
};

export default function CurationAnalyticsPage() {
  const { toast } = useNotify();
  const [days, setDays] = useState(30);
  const [search, setSearch] = useState<CorpusSearchAnalytics | null>(null);
  const [feedback, setFeedback] = useState<CorpusFeedbackSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [searchData, feedbackData] = await Promise.all([
        corpusService.getSearchAnalytics(days),
        corpusService.getFeedbackSummary(days),
      ]);
      setSearch(searchData);
      setFeedback(feedbackData);
    } catch (error) {
      toast(corpusErrorMessage(error, "تعذّر تحميل التحليلات"), "error");
    } finally {
      setLoading(false);
    }
  }, [days, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const zeroRate = search ? Math.round(search.zero_result_rate * 100) : 0;
  const relevanceRate =
    feedback?.relevance_rate === null || feedback === null
      ? null
      : Math.round(feedback.relevance_rate * 100);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-sutra-ink">التحليلات</h1>
          <p className="text-sm text-sutra-ink-3 mt-1">
            ما بحث عنه المستخدمون، وما لم يجدوا له نتائج، وهل كانت النتائج
            مفيدة.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-sutra-line bg-white overflow-hidden">
            {WINDOWS.map((option) => (
              <button
                key={option}
                onClick={() => setDays(option)}
                className={`px-3 py-2 text-sm font-semibold transition-colors ${
                  days === option
                    ? "bg-navy text-white"
                    : "text-sutra-ink-2 hover:bg-tint"
                }`}
              >
                {count(option, DAYS)}
              </button>
            ))}
          </div>
          <button
            onClick={load}
            disabled={loading}
            className="p-2.5 border border-sutra-line rounded-lg text-sutra-ink-2 hover:bg-white transition-colors disabled:opacity-50"
            title="تحديث"
          >
            <Icon name="refresh" className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <Tile label="عمليات البحث" value={search?.searches ?? 0} />
        <Tile
          label="نسبة البحث بلا نتائج"
          value={percent(zeroRate)}
          tone={zeroRate > 20 ? "bad" : "neutral"}
        />
        <Tile label="النقرات على المصادر" value={search?.source_clicks ?? 0} />
        <Tile label="مستخدمون مختلفون" value={search?.distinct_users ?? 0} />
        <Tile
          label="عُدّت ذات صلة"
          value={relevanceRate === null ? "لا تقييمات" : percent(relevanceRate)}
          tone={
            relevanceRate === null
              ? "neutral"
              : relevanceRate < 60
              ? "bad"
              : "good"
          }
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Panel
          icon={<Icon name="search-x" className="text-red-700" />}
          title="استعلامات بلا نتائج"
          hint="لم يطابقها أي منشور. هذه قائمة ما ينقص المجموعة."
          empty="لا توجد عمليات بحث بلا نتائج في هذه الفترة."
          count={search?.zero_result_queries.length ?? 0}
          loading={loading}
        >
          {search?.zero_result_queries.map((row) => (
            <li key={row.query} className="flex items-start justify-between gap-3 p-3">
              <span className="text-sm text-sutra-ink break-words min-w-0">
                {row.query}
              </span>
              <span className="text-xs text-sutra-ink-3 whitespace-nowrap flex-shrink-0">
                {n(row.searches)}× · {date(row.last_seen)}
              </span>
            </li>
          ))}
        </Panel>

        <Panel
          icon={<Icon name="search" className="text-sutra-ink-3" />}
          title="أكثر الاستعلامات"
          hint="ما يُسأل عنه فعليًا في المجموعة."
          empty="لا توجد عمليات بحث مسجّلة في هذه الفترة."
          count={search?.top_queries.length ?? 0}
          loading={loading}
        >
          {search?.top_queries.map((row) => (
            <li key={row.query} className="flex items-start justify-between gap-3 p-3">
              <span className="text-sm text-sutra-ink break-words min-w-0">
                {row.query}
              </span>
              <span className="text-xs text-sutra-ink-3 whitespace-nowrap flex-shrink-0">
                {n(row.searches)}× · بمعدل {n(row.avg_results)} نتيجة
              </span>
            </li>
          ))}
        </Panel>

        <Panel
          icon={<Icon name="pointer" className="text-sutra-ink-3" />}
          title="أكثر الأحكام فتحًا"
          hint="المصادر المستشهد بها التي نقر عليها المستخدمون فعلًا."
          empty="لا توجد نقرات على المصادر في هذه الفترة."
          count={search?.most_clicked.length ?? 0}
          loading={loading}
        >
          {search?.most_clicked.map((row) => (
            <li
              key={row.document_id}
              className="flex items-start justify-between gap-3 p-3"
            >
              <Link
                href={`/curation/${row.document_id}`}
                className="text-sm text-sutra-ink hover:underline break-words min-w-0 no-underline"
              >
                <Ltr>{row.citation}</Ltr>
              </Link>
              <span className="text-xs text-sutra-ink-3 whitespace-nowrap flex-shrink-0">
                {count(row.clicks, OPENS)}
              </span>
            </li>
          ))}
        </Panel>

        <Panel
          icon={<Icon name="thumbs-down" className="text-amber-ink" />}
          title="أحكام ذات تقييمات سلبية"
          hint="تُسترجع كثيرًا وتُقيَّم كغير مفيدة. راجع البيانات الوصفية والتقسيم."
          empty="لا توجد تقييمات سلبية في هذه الفترة."
          count={feedback?.worst_documents.length ?? 0}
          loading={loading}
        >
          {feedback?.worst_documents.map((row) => (
            <li
              key={row.document_id}
              className="flex items-start justify-between gap-3 p-3"
            >
              <Link
                href={`/curation/${row.document_id}`}
                className="text-sm text-sutra-ink hover:underline break-words min-w-0 no-underline"
              >
                <Ltr>{row.citation}</Ltr>
              </Link>
              <span className="text-xs text-amber-ink whitespace-nowrap flex-shrink-0">
                {n(row.irrelevant)} من {n(row.votes)} غير مفيدة
              </span>
            </li>
          ))}
        </Panel>
      </div>

      <section className="bg-white rounded-xl border border-sutra-line overflow-hidden">
        <header className="px-4 py-3 border-b border-sutra-line">
          <h2 className="text-sm font-bold text-sutra-ink">
            أحدث التقييمات
          </h2>
          <p className="text-xs text-sutra-ink-3 mt-0.5">
            الاستعلام الذي قُيِّم عليه كل صوت — اقرأهما معًا، فالصوت بلا سؤاله
            لا يعني شيئًا.
          </p>
        </header>
        {!feedback || feedback.recent.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-sutra-ink-3">
            لم يقيّم أحد أي نتيجة في هذه الفترة.
          </p>
        ) : (
          <ul className="divide-y divide-sutra-line">
            {feedback.recent.map((entry) => (
              <li key={entry.id} className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-semibold ${
                          entry.relevant
                            ? "bg-green-bg text-green-ink"
                            : "bg-red-50 text-red-700"
                        }`}
                      >
                        {entry.relevant ? "مفيد" : "غير مفيد"}
                      </span>
                      <Link
                        href={`/curation/${entry.document.id}`}
                        className="text-sm font-semibold text-sutra-ink hover:underline truncate no-underline"
                      >
                        <Ltr>{entry.document.citation}</Ltr>
                      </Link>
                    </div>
                    <p className="text-xs text-sutra-ink-2 mt-1.5 break-words">
                      &ldquo;{entry.query}&rdquo;
                    </p>
                    {entry.note && (
                      <p className="text-xs text-sutra-ink-3 mt-1 break-words">
                        {entry.note}
                      </p>
                    )}
                  </div>
                  <time className="text-xs text-sutra-ink-3 whitespace-nowrap flex-shrink-0">
                    {dateTime(entry.created_at)}
                  </time>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="flex items-start gap-2 text-xs text-sutra-ink-3">
        <Icon name="info" className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
        لكل مستخدم تقييم واحد لكل استعلام لكل مستند — وإعادة التقييم تستبدل
        السابق، لذا تعكس هذه النسب آراءً ثابتة لا نقرات عابرة.
      </p>
    </div>
  );
}

function Tile({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: number | string;
  tone?: "neutral" | "good" | "bad";
}) {
  const valueTone =
    tone === "bad"
      ? "text-red-700"
      : tone === "good"
      ? "text-green-ink"
      : "text-sutra-ink";
  return (
    <div className="bg-white rounded-xl border border-sutra-line p-4">
      <p className="text-xs text-sutra-ink-3">{label}</p>
      <p className={`text-2xl font-bold mt-1 tabular-nums ${valueTone}`}>
        {typeof value === "number" ? n(value) : value}
      </p>
    </div>
  );
}

function Panel({
  icon,
  title,
  hint,
  empty,
  count,
  loading,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  hint: string;
  empty: string;
  count: number;
  loading: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-white rounded-xl border border-sutra-line overflow-hidden">
      <header className="px-4 py-3 border-b border-sutra-line">
        <div className="flex items-center gap-2">
          {icon}
          <h2 className="text-sm font-bold text-sutra-ink">{title}</h2>
        </div>
        <p className="text-xs text-sutra-ink-3 mt-0.5">{hint}</p>
      </header>
      {loading ? (
        <div className="p-4 space-y-2 animate-pulse">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-4 bg-sutra-line-2 rounded" />
          ))}
        </div>
      ) : count === 0 ? (
        <p className="px-4 py-8 text-center text-sm text-sutra-ink-3">{empty}</p>
      ) : (
        <ul className="divide-y divide-sutra-line max-h-96 overflow-y-auto">
          {children}
        </ul>
      )}
    </section>
  );
}
