"use client";

import { useEffect, useState, useCallback } from "react";
import { admin, type AdminAuditLog } from "@/lib/api";
import {
  PageHeader,
  SearchInput,
  FilterSelect,
  EmptyState,
  ErrorState,
  Pagination,
  ACTION_LABELS,
  ACTION_ORDER,
  actionLabel,
} from "@/components/admin/ui";
import Ltr from "@/components/Ltr";
import { count, dateTime, n, type PluralForms } from "@/lib/num";

const PAGE_SIZE = 20;

/** Recorded-action counts, for the page subtitle. */
const ACTIONS: PluralForms = {
  one: "إجراء مسجَّل واحد",
  two: "إجراءان مسجَّلان",
  few: "إجراءات مسجَّلة",
  many: "إجراءً مسجَّلًا",
  other: "إجراء مسجَّل",
};

/**
 * Actions shown in the filter dropdown. The value is the audit code the API
 * filters on and stays Latin; only the label is translated. The labels come
 * from the shared map so the reports snapshot names the same codes the same way.
 */
const ACTION_OPTIONS = ACTION_ORDER.map((value) => ({ value, label: ACTION_LABELS[value] }));

/**
 * Uptime spans. The unit letters are Arabic rather than the Latin h/m/s the
 * API's own numbers were dressed with — the value is a duration, so it is
 * localised like every other quantity even though it sits in a monospace cell.
 */
const fmtUptime = (s: number) => {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  const parts: string[] = [];
  if (h) parts.push(`${n(h)} س`);
  if (m || h) parts.push(`${n(m)} د`);
  parts.push(`${n(sec)} ث`);
  return parts.join(" ");
};

interface SystemStatus {
  uptime_seconds: number;
  started_at: string;
  pid: number;
  node_env: string;
  node_version: string;
  platform: string;
  arch: string;
}

export default function AdminActivityLogsPage() {
  const [logs, setLogs] = useState<AdminAuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [action, setAction] = useState("");
  const [viewLog, setViewLog] = useState<AdminAuditLog | null>(null);

  // Live server health — refreshed every 30s.
  const [sys, setSys] = useState<SystemStatus | null>(null);
  useEffect(() => {
    let alive = true;
    const load = () =>
      admin
        .systemStatus()
        .then((r) => { if (alive) setSys(r.data); })
        .catch(() => undefined);
    load();
    const t = setInterval(load, 30000);
    return () => { alive = false; clearInterval(t); };
  }, []);

  const fetchLogs = useCallback(() => {
    setLoading(true);
    admin
      .auditLogs({
        limit: PAGE_SIZE,
        offset: (page - 1) * PAGE_SIZE,
        search: search || undefined,
        action: action || undefined,
      })
      .then((r) => {
        setLogs(r.data.data);
        setTotal(r.data.total);
        setLoadError("");
      })
      .catch((e) => {
        setLogs([]);
        setLoadError(e instanceof Error ? e.message : "تعذّر تحميل السجل");
      })
      .finally(() => setLoading(false));
  }, [page, search, action]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // IP recorded on the log's details blob, or "" when the action carries none.
  // Node reports IPv4 clients as IPv4-mapped IPv6 (`::ffff:1.2.3.4`) — strip the
  // prefix so the column reads as a plain address.
  const logIp = (a: AdminAuditLog): string => {
    const raw = a.details;
    if (raw == null) return "";
    let obj: unknown = raw;
    if (typeof raw === "string") {
      try {
        obj = JSON.parse(raw);
      } catch {
        return "";
      }
    }
    if (typeof obj !== "object" || obj === null || Array.isArray(obj)) return "";
    const ip = (obj as Record<string, unknown>).ip;
    return typeof ip === "string" && ip ? ip.replace(/^::ffff:/i, "") : "";
  };

  // Parse details into a flat key→value map so admins see readable rows
  // instead of a raw JSON blob. Returns null when details aren't an object.
  const detailEntries = (a: AdminAuditLog): [string, unknown][] | null => {
    const raw = a.details;
    if (raw == null) return null;
    let obj = raw;
    if (typeof raw === "string") {
      try {
        obj = JSON.parse(raw);
      } catch {
        return null;
      }
    }
    if (typeof obj === "object" && obj !== null && !Array.isArray(obj)) {
      return Object.entries(obj);
    }
    return null;
  };

  const formatValue = (v: unknown): string => {
    if (v == null) return "—";
    if (typeof v === "object") {
      try {
        return JSON.stringify(v, null, 2);
      } catch {
        return String(v);
      }
    }
    return String(v);
  };

  /** Real account behind an impersonated-session action, if present. */
  const impersonatedBy = (a: AdminAuditLog): string | null => {
    const d = a.details;
    if (d && typeof d === "object" && !Array.isArray(d)) {
      const imp = (d as Record<string, unknown>).impersonated_by;
      if (imp && typeof imp === "object") {
        const e = (imp as { email?: string }).email;
        if (e) return e;
        const id = (imp as { id?: number }).id;
        if (id) return `#${id}`;
      }
    }
    return null;
  };

  const isSystem = (a: AdminAuditLog) => a.action?.startsWith("SYSTEM_");

  return (
    <div>
      <PageHeader title="سجل النشاط" subtitle={`${count(total, ACTIONS)}`} />

      {/* Server health / uptime card */}
      <div className="mb-6 bg-white border border-sutra-line rounded-xl px-5 py-4 flex flex-wrap items-center gap-x-8 gap-y-3">
        <div className="flex items-center gap-2.5">
          <span className="w-2 h-2 rounded-full bg-green-dot animate-pulse" aria-hidden />
          <div>
            <p className="text-[11px] font-bold uppercase text-sutra-ink-3">الخادم يعمل</p>
            <p className="text-[16px] font-bold text-sutra-ink font-mono">{sys ? fmtUptime(sys.uptime_seconds) : "…"}</p>
          </div>
        </div>
        <div>
          <p className="text-[11px] font-bold uppercase text-sutra-ink-3">وقت التشغيل</p>
          <p className="text-[13px] font-semibold text-sutra-ink">{sys ? dateTime(sys.started_at) : "…"}</p>
        </div>
        <div>
          <p className="text-[11px] font-bold uppercase text-sutra-ink-3">إصدار Node</p>
          <p className="text-[13px] font-semibold text-sutra-ink font-mono">{sys?.node_version ?? "…"}</p>
        </div>
        <div>
          <p className="text-[11px] font-bold uppercase text-sutra-ink-3">البيئة</p>
          <p className="text-[13px] font-semibold text-sutra-ink capitalize">{sys?.node_env ?? "…"}</p>
        </div>
        <div className="hidden md:block">
          <p className="text-[11px] font-bold uppercase text-sutra-ink-3">PID</p>
          <p className="text-[13px] font-semibold text-sutra-ink font-mono">{sys?.pid ?? "…"}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-6">
        <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="ابحث بالإجراء أو المستخدم أو رقم القضية…" className="flex-1 min-w-[200px]" />
        <FilterSelect
          value={action}
          onChange={(v) => { setAction(v); setPage(1); }}
          options={ACTION_OPTIONS}
          allLabel="كل الإجراءات"
          className="min-w-[180px]"
        />
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white border border-sutra-line rounded-xl p-4">
              <div className="h-5 w-1/2 bg-sutra-line-2 rounded animate-pulse" />
            </div>
          ))}
        </div>
      ) : loadError ? (
        <ErrorState title="تعذّر تحميل السجل" message={loadError} onRetry={fetchLogs} />
      ) : logs.length === 0 ? (
        <EmptyState title="لا يوجد نشاط" description="جرّب تعديل البحث أو التصفية" />
      ) : (
        <div className="bg-white border border-sutra-line rounded-xl overflow-x-auto">
          <table className="w-full min-w-[820px]">
            <thead className="border-b border-sutra-line-2 bg-sutra-bg/50">
              <tr>
                <th className="px-4 py-3 text-start text-[11px] font-bold uppercase text-sutra-ink-3">ID</th>
                <th className="px-4 py-3 text-start text-[11px] font-bold uppercase text-sutra-ink-3">الإجراء</th>
                <th className="px-4 py-3 text-start text-[11px] font-bold uppercase text-sutra-ink-3">IP</th>
                <th className="px-4 py-3 text-start text-[11px] font-bold uppercase text-sutra-ink-3">المستخدم</th>
                <th className="px-4 py-3 text-start text-[11px] font-bold uppercase text-sutra-ink-3">الطابع الزمني</th>
                <th className="px-4 py-3 text-end text-[11px] font-bold uppercase text-sutra-ink-3">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sutra-line-2">
              {logs.map((a) => {
                const imp = impersonatedBy(a);
                const system = isSystem(a);
                return (
                  <tr key={a.id} className="hover:bg-sutra-bg/40 transition-colors">
                    <td className="px-4 py-3.5 text-[12px] font-bold text-navy"><Ltr>#{a.id}</Ltr></td>
                    <td className="px-4 py-3.5">
                      <span
                        className={`text-[12px] font-semibold px-2 py-0.5 rounded-md whitespace-nowrap ${
                          system
                            ? "bg-sutra-bg text-sutra-ink-3 border border-sutra-line"
                            : a.action?.startsWith("IMPERSONATE_")
                              ? "bg-amber-bg text-amber-ink"
                              : "bg-tint text-navy"
                        }`}
                      >
                        {actionLabel(a.action)}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-[12px] text-sutra-ink-2 whitespace-nowrap font-mono">{logIp(a) || "—"}</td>
                    <td className="px-4 py-3.5 text-[12.5px] text-sutra-ink-2 truncate max-w-[220px]">
                      {system ? (
                        <span className="text-[11px] font-bold uppercase text-sutra-ink-3">النظام</span>
                      ) : (
                        <div className="min-w-0">
                          <p className="truncate">
                            {a.user?.email ? <Ltr>{a.user.email}</Ltr> : a.user_id ? <Ltr>#{a.user_id}</Ltr> : "—"}
                          </p>
                          {imp && (
                            <p className="text-[11px] font-semibold text-amber-ink truncate" title={`بانتحال حساب ${imp}`}>
                              عبر {imp}
                            </p>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-[12px] text-sutra-ink-3 whitespace-nowrap">{dateTime(a.created_at) || "—"}</td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center justify-end">
                        <button
                          onClick={() => setViewLog(a)}
                          className="h-8 px-3 rounded-lg border border-navy bg-white text-navy text-[12px] font-bold inline-flex items-center hover:bg-navy hover:text-white transition-colors"
                        >
                          عرض
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Pagination page={page} pageSize={PAGE_SIZE} total={total} onPage={setPage} />

      {viewLog && (
        <div className="fixed inset-0 z-50 grid place-items-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setViewLog(null)} />
          <div className="relative w-full max-w-2xl max-h-[85vh] overflow-y-auto bg-white rounded-xl border border-sutra-line shadow-xl selection:bg-blue-100 selection:text-blue-900">
            {/* Header */}
            <div className="flex items-center justify-between gap-3 px-5 py-3.5 border-b border-sutra-line sticky top-0 bg-white z-10">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="text-[11px] font-bold text-sutra-ink-3 whitespace-nowrap">السجل <Ltr>#{viewLog.id}</Ltr></span>
                <span className="text-[12px] font-semibold px-2.5 py-1 rounded-md bg-tint text-navy whitespace-nowrap">{actionLabel(viewLog.action)}</span>
              </div>
              <button
                onClick={() => setViewLog(null)}
                className="h-8 w-8 rounded-lg border border-sutra-line bg-white text-sutra-ink-2 grid place-items-center hover:bg-tint hover:text-sutra-ink transition-colors flex-none"
                aria-label="إغلاق"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-4 h-4"><path d="M18 6 6 18M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="p-5 space-y-5">
              {/* Who / when */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[10.5px] font-bold uppercase text-sutra-ink-3 mb-1">المستخدم</p>
                  <p className="text-[13.5px] font-semibold text-sutra-ink">{viewLog.user?.email ? <Ltr>{viewLog.user.email}</Ltr> : viewLog.user_id ? <Ltr>#{viewLog.user_id}</Ltr> : "—"}</p>
                  {impersonatedBy(viewLog) && (
                    <p className="text-[12px] font-semibold text-amber-ink mt-0.5">عبر {impersonatedBy(viewLog)}</p>
                  )}
                </div>
                <div>
                  <p className="text-[10.5px] font-bold uppercase text-sutra-ink-3 mb-1">الطابع الزمني</p>
                  <p className="text-[13.5px] font-semibold text-sutra-ink">{dateTime(viewLog.created_at) || "—"}</p>
                </div>
              </div>

              {/* Details — human-friendly key/value rows */}
              <div>
                <p className="text-[10.5px] font-bold uppercase text-sutra-ink-3 mb-2">التفاصيل</p>
                {(() => {
                  const entries = detailEntries(viewLog);
                  if (entries) {
                    return (
                      <div className="space-y-2.5">
                        {entries.map(([key, val]) => (
                          <div key={key} className="border border-sutra-line rounded-lg overflow-hidden">
                            <div className="px-3 py-1.5 bg-sutra-bg/70 border-b border-sutra-line">
                              <p className="text-[11px] font-bold text-navy uppercase font-mono">{key}</p>
                            </div>
                            <div className="px-3 py-2.5">
                              {typeof val === "object" && val !== null ? (
                                <pre className="text-[12px] font-mono text-sutra-ink leading-relaxed whitespace-pre-wrap break-words">{formatValue(val)}</pre>
                              ) : (
                                <p className="text-[13px] text-sutra-ink">{formatValue(val)}</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  }
                  return (
                    <p className="text-[13px] text-sutra-ink bg-sutra-bg border border-sutra-line rounded-lg px-3 py-3 break-words">
                      {viewLog.details ? String(viewLog.details) : "—"}
                    </p>
                  );
                })()}
              </div>

              {/* Integrity hashes */}
              {(viewLog.previous_hash || viewLog.current_hash) && (
                <div className="space-y-2.5">
                  {viewLog.previous_hash && (
                    <div>
                      <p className="text-[10.5px] font-bold uppercase text-sutra-ink-3 mb-1">البصمة السابقة</p>
                      <code className="block font-mono text-[11px] text-sutra-ink-2 bg-sutra-bg border border-sutra-line rounded-lg px-3 py-2 break-all">{viewLog.previous_hash}</code>
                    </div>
                  )}
                  {viewLog.current_hash && (
                    <div>
                      <p className="text-[10.5px] font-bold uppercase text-sutra-ink-3 mb-1">البصمة الحالية</p>
                      <code className="block font-mono text-[11px] text-sutra-ink-2 bg-sutra-bg border border-sutra-line rounded-lg px-3 py-2 break-all">{viewLog.current_hash}</code>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
