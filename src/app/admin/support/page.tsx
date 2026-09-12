"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { supportService, type SupportTicket, type TicketStats } from "@/lib/support";
import {
  PageHeader,
  SearchInput,
  FilterSelect,
  EmptyState,
  ErrorState,
  Pagination,
  StatCard,
} from "@/components/admin/ui";
import Ltr from "@/components/Ltr";
import { count, dayMonth, n, type PluralForms } from "@/lib/num";

const PAGE_SIZE = 20;

/** Ticket counts, for the page subtitle. */
const TICKETS: PluralForms = {
  one: "تذكرة واحدة",
  two: "تذكرتان",
  few: "تذاكر",
  many: "تذكرة",
  other: "تذكرة",
};

/**
 * Ticket vocabularies. Each map is the single source for both the filter
 * dropdown and the row, so a code can never read one way in the filter and
 * another in the table.
 */
const STATUS_LABEL: Record<string, string> = {
  open: "مفتوح",
  in_progress: "قيد المعالجة",
  resolved: "محلول",
  closed: "مغلق",
};

const PRIORITY_LABEL: Record<string, string> = {
  low: "منخفضة",
  medium: "متوسطة",
  high: "عالية",
  urgent: "عاجلة",
};

const CATEGORY_LABEL: Record<string, string> = {
  billing: "الفوترة",
  technical: "تقني",
  account: "الحساب",
  feature_request: "طلب ميزة",
  bug_report: "بلاغ عن خلل",
  other: "أخرى",
};

const toOptions = (map: Record<string, string>) =>
  Object.entries(map).map(([value, label]) => ({ value, label }));

const STATUS_OPTIONS = toOptions(STATUS_LABEL);
const PRIORITY_OPTIONS = toOptions(PRIORITY_LABEL);
const CATEGORY_OPTIONS = toOptions(CATEGORY_LABEL);

/** Falls through to the raw code, isolated, for anything a map does not teach. */
const labelOf = (map: Record<string, string>, code: string) =>
  map[code] ?? <Ltr>{code.replace(/_/g, " ")}</Ltr>;

const PRIORITY_STYLE: Record<string, string> = {
  low: "bg-sutra-line-2 text-sutra-ink-2",
  medium: "bg-tint text-navy",
  high: "bg-amber-bg text-amber-ink",
  urgent: "bg-red-50 text-red-700",
};

function ticketStatusStyle(status: string) {
  switch (status) {
    case "open":
      return "bg-blue-50 text-blue-700";
    case "in_progress":
      return "bg-amber-bg text-amber-ink";
    case "resolved":
      return "bg-green-bg text-green-ink";
    case "closed":
      return "bg-sutra-line-2 text-sutra-ink-2";
    default:
      return "bg-tint text-navy";
  }
}

export default function AdminSupportPage() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [stats, setStats] = useState<TicketStats | null>(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");
  const [category, setCategory] = useState("");

  const fetchTickets = useCallback(() => {
    setLoading(true);
    supportService
      .list({
        status: status || undefined,
        priority: priority || undefined,
        category: category || undefined,
        q: search || undefined,
        page,
        limit: PAGE_SIZE,
      })
      .then((r) => {
        setTickets(r.data);
        setTotal(r.total);
        setLoadError("");
      })
      .catch((e) => {
        setTickets([]);
        setLoadError(e instanceof Error ? e.message : "تعذّر تحميل التذاكر");
      })
      .finally(() => setLoading(false));
  }, [page, search, status, priority, category]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  useEffect(() => {
    supportService.stats().then(setStats).catch(() => setStats(null));
  }, []);

  return (
    <div>
      <PageHeader title="مكتب المساعدة" subtitle={`${count(total, TICKETS)} إجمالًا`} />

      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <StatCard label="مفتوحة" value={n(stats.open)} tone="blue" />
          <StatCard label="قيد المعالجة" value={n(stats.in_progress)} tone="amber" />
          <StatCard label="محلولة" value={n(stats.resolved)} tone="green" />
          <StatCard label="مغلقة" value={n(stats.closed)} tone="navy" />
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3 mb-6">
        <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="ابحث بالموضوع أو البريد الإلكتروني…" className="flex-1 min-w-[200px]" />
        <FilterSelect value={status} onChange={(v) => { setStatus(v); setPage(1); }} options={STATUS_OPTIONS} allLabel="كل الحالات" />
        <FilterSelect value={priority} onChange={(v) => { setPriority(v); setPage(1); }} options={PRIORITY_OPTIONS} allLabel="كل الأولويات" />
        <FilterSelect value={category} onChange={(v) => { setCategory(v); setPage(1); }} options={CATEGORY_OPTIONS} allLabel="كل التصنيفات" />
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white border border-sutra-line rounded-xl p-4">
              <div className="h-5 w-1/2 bg-sutra-line-2 rounded animate-pulse" />
            </div>
          ))}
        </div>
      ) : loadError ? (
        <ErrorState title="تعذّر تحميل التذاكر" message={loadError} onRetry={fetchTickets} />
      ) : tickets.length === 0 ? (
        <EmptyState title="لا توجد تذاكر" description="جرّب تعديل عوامل التصفية" />
      ) : (
        <div className="bg-white border border-sutra-line rounded-xl overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead className="border-b border-sutra-line-2 bg-sutra-bg/50">
              <tr>
                <th className="px-4 py-3 text-start text-[11px] font-bold uppercase text-sutra-ink-3">التذكرة</th>
                <th className="px-4 py-3 text-start text-[11px] font-bold uppercase text-sutra-ink-3">المستخدم</th>
                <th className="px-4 py-3 text-start text-[11px] font-bold uppercase text-sutra-ink-3">التصنيف</th>
                <th className="px-4 py-3 text-start text-[11px] font-bold uppercase text-sutra-ink-3">الأولوية</th>
                <th className="px-4 py-3 text-start text-[11px] font-bold uppercase text-sutra-ink-3">الحالة</th>
                <th className="px-4 py-3 text-start text-[11px] font-bold uppercase text-sutra-ink-3">المسؤول</th>
                <th className="px-4 py-3 text-start text-[11px] font-bold uppercase text-sutra-ink-3">آخر تحديث</th>
                <th className="px-4 py-3 text-end text-[11px] font-bold uppercase text-sutra-ink-3">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sutra-line-2">
              {tickets.map((t) => (
                <tr key={t.id} className="hover:bg-sutra-bg/40 transition-colors">
                  <td className="px-4 py-3.5">
                    <Link href={`/admin/support/${t.id}`} className="no-underline">
                      <p className="text-[13.5px] font-semibold text-sutra-ink hover:text-navy truncate max-w-[260px]">
                        <Ltr>#{t.id}</Ltr> {t.subject}
                      </p>
                      <p className="text-[11.5px] text-sutra-ink-3 truncate max-w-[260px]">{t.description}</p>
                    </Link>
                  </td>
                  <td className="px-4 py-3.5 text-[12.5px] text-sutra-ink-2 truncate max-w-[180px]">{t.user?.email ? <Ltr>{t.user.email}</Ltr> : "—"}</td>
                  <td className="px-4 py-3.5">
                    <span className="text-[11.5px] font-semibold px-2 py-0.5 rounded-md bg-tint text-navy">
                      {labelOf(CATEGORY_LABEL, t.category)}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className={`text-[11.5px] font-semibold px-2 py-0.5 rounded-full ${PRIORITY_STYLE[t.priority] ?? "bg-tint text-navy"}`}>
                      {labelOf(PRIORITY_LABEL, t.priority)}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className={`inline-flex items-center gap-1.5 text-[12px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ${ticketStatusStyle(t.status)}`}>
                      {labelOf(STATUS_LABEL, t.status)}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    {t.assignee ? (
                      <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold px-2.5 py-1 rounded-full bg-tint text-navy">
                        <Ltr>{t.assignee.email}</Ltr>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold px-2.5 py-1 rounded-full bg-sutra-line-2 text-sutra-ink-2">
                        غير مُعيَّن
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-[12.5px] text-sutra-ink-3 whitespace-nowrap">
                    {dayMonth(t.updated_at)}
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center justify-end">
                      <Link
                        href={`/admin/support/${t.id}`}
                        className="h-8 w-8 rounded-lg border border-navy bg-white text-navy grid place-items-center hover:bg-navy hover:text-white transition-colors"
                        title={`عرض التذكرة رقم ${n(t.id)}`}
                        aria-label={`عرض التذكرة رقم ${n(t.id)}`}
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                          <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Pagination page={page} pageSize={PAGE_SIZE} total={total} onPage={setPage} />
    </div>
  );
}
