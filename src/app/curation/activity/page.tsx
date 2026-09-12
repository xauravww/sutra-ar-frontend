"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  corpusService,
  corpusErrorMessage,
  type CorpusAuditEntry,
} from "@/lib/corpus";
import { useNotify } from "@/components/ui/Notify";
import { Icon } from "@/components/curation/icons";
import Ltr from "@/components/Ltr";
import { dateTime, n } from "@/lib/num";

const PAGE_SIZE = 50;

/** Colour cue per action family so the feed is scannable. */
const ACTION_TONE: Record<string, string> = {
  uploaded: "bg-blue-50 text-blue-700",
  published: "bg-green-bg text-green-ink",
  unpublished: "bg-amber-bg text-amber-ink",
  archived: "bg-sutra-line-2 text-sutra-ink-2",
  deleted: "bg-red-50 text-red-700",
  ingestion_failed: "bg-red-50 text-red-700",
  ingestion_completed: "bg-green-bg text-green-ink",
  metadata_updated: "bg-tint text-navy",
  reprocess_requested: "bg-blue-50 text-blue-700",
};

/**
 * Arabic labels for the audit action keys.
 *
 * An unrecognised action falls back to its raw key rather than being run
 * through a `replace(/_/g, " ")` prettifier: the old fallback produced English
 * words ("reprocess requested") in the middle of an Arabic list, and a raw key
 * at least reads as the identifier it is and can be matched against the API.
 */
const ACTION_LABEL: Record<string, string> = {
  uploaded: "تم الرفع",
  published: "تم النشر",
  unpublished: "أُلغي النشر",
  archived: "تمت الأرشفة",
  deleted: "تم الحذف",
  ingestion_failed: "فشلت الفهرسة",
  ingestion_completed: "اكتملت الفهرسة",
  metadata_updated: "تحديث البيانات الوصفية",
  reprocess_requested: "طُلب إعادة المعالجة",
};

export default function CurationActivityPage() {
  const { toast } = useNotify();
  const [entries, setEntries] = useState<CorpusAuditEntry[]>([]);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(
    async (silent = false) => {
      if (silent) setRefreshing(true);
      else setLoading(true);
      try {
        setEntries(await corpusService.getRecentAudit(PAGE_SIZE, offset));
      } catch (error) {
        toast(corpusErrorMessage(error, "تعذّر تحميل النشاط"), "error");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [offset, toast]
  );

  useEffect(() => {
    load();
  }, [load]);

  const page = Math.floor(offset / PAGE_SIZE) + 1;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-sutra-ink">النشاط</h1>
          <p className="text-sm text-sutra-ink-3 mt-1">
            كل عملية رفع أو تعديل أو نشر في المجموعة، الأحدث أولًا.
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

      <div className="bg-white rounded-xl border border-sutra-line overflow-hidden">
        {loading ? (
          <div className="divide-y divide-sutra-line">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="p-4 animate-pulse">
                <div className="h-3 bg-sutra-line-2 rounded w-1/4 mb-2" />
                <div className="h-3 bg-sutra-line-2 rounded w-2/3" />
              </div>
            ))}
          </div>
        ) : entries.length === 0 ? (
          <div className="p-12 text-center">
            <Icon name="history" className="mx-auto w-7 h-7 text-sutra-line mb-3" />
            <p className="text-sutra-ink font-bold">لا يوجد نشاط بعد</p>
            <p className="text-sm text-sutra-ink-3 mt-1">
              تظهر الإجراءات هنا بمجرد رفع المستندات أو مراجعتها.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-sutra-line">
            {entries.map((entry) => (
              <li key={entry.id} className="p-4 hover:bg-sutra-bg/40">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-semibold ${
                          ACTION_TONE[entry.action] ??
                          "bg-sutra-line-2 text-sutra-ink-2"
                        }`}
                      >
                        {formatAction(entry.action)}
                      </span>
                      {entry.document && (
                        <Link
                          href={`/curation/${entry.document.id}`}
                          className="text-sm font-semibold text-sutra-ink hover:underline truncate no-underline"
                        >
                          <Ltr>{entry.document.citation}</Ltr>
                        </Link>
                      )}
                    </div>
                    <p className="text-xs text-sutra-ink-3 mt-1.5">
                      {entry.actor}
                    </p>
                    {entry.detail && (
                      <p className="text-xs text-sutra-ink-3 mt-1 font-mono break-all">
                        {entry.detail}
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

        {(offset > 0 || entries.length === PAGE_SIZE) && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-sutra-line bg-sutra-bg/50">
            <span className="text-sm text-sutra-ink-3">صفحة {n(page)}</span>
            <div className="flex gap-1">
              <button
                onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
                disabled={offset === 0}
                className="p-2 rounded-lg border border-sutra-line text-sutra-ink-2 hover:bg-white disabled:opacity-40 transition-colors"
              >
                <Icon name="chevron-left" className="w-4 h-4 rtl-flip" />
              </button>
              <button
                onClick={() => setOffset(offset + PAGE_SIZE)}
                disabled={entries.length < PAGE_SIZE}
                className="p-2 rounded-lg border border-sutra-line text-sutra-ink-2 hover:bg-white disabled:opacity-40 transition-colors"
              >
                <Icon name="chevron-right" className="w-4 h-4 rtl-flip" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function formatAction(action: string): string {
  return ACTION_LABEL[action] ?? action;
}
