"use client";

import { useEffect, useState } from "react";
import { admin, type AdminAuditLog } from "@/lib/api";
import { PageHeader, StatCard, ErrorState, actionLabel } from "@/components/admin/ui";
import Ltr from "@/components/Ltr";
import { compact, dateTime, n } from "@/lib/num";

interface CompStats {
  cases?: { total?: number; active?: number; delayed?: number };
  subscribers?: { total?: number; paid?: number; unpaid?: number; trial?: number };
  cvos?: { total?: number; active?: number; total_assigned_cases?: number; completed_cases?: number; pending_cases?: number };
  users?: { total?: number };
  charts?: {
    user_growth?: Array<{ month: string; new_users: string }>;
    revenue?: Array<{ month: string; revenue: string }>;
  };
}

/**
 * Axis labels for the revenue chart. The old helper hand-built Indian
 * lakh/crore short forms; `Intl` compact notation picks the Arabic scale word
 * (ألف، مليون، مليار) and renders it in Arabic-Indic digits instead.
 */
const fmtCompact = (value: string | number): string => compact(value);

/** Small CSS bar chart shared by both report cards (#1586 polish). */
function MiniBars({
  points,
  fmt,
  tone,
}: {
  points: Array<{ label: string; value: number }>;
  fmt: (n: number) => string;
  tone: "navy" | "green";
}) {
  const max = Math.max(1, ...points.map((p) => p.value));
  const stop = tone === "navy" ? "to-[#3B76D6]" : "to-[#34C98D]";
  const start = tone === "navy" ? "from-[#1E3A8A]" : "from-[#047857]";
  const isMaxColor = tone === "navy" ? "text-navy" : "text-emerald-700";
  return (
    <div className="flex items-end gap-1.5 sm:gap-2 h-36 px-0.5">
      {points.map((p) => {
        const isMax = p.value === max;
        return (
          <div key={p.label} className="flex-1 flex flex-col items-center gap-1.5 min-w-0 group" title={`${p.label}: ${fmt(p.value)}`}>
            <span className={`text-[10px] font-semibold tabular-nums leading-none ${isMax ? isMaxColor : "text-sutra-ink-3"}`}>
              {fmt(p.value)}
            </span>
            <div
              className={`w-full rounded-t-[4px] bg-gradient-to-t ${start} ${stop} transition-opacity group-hover:opacity-80`}
              style={{ height: `${Math.max(6, (p.value / max) * 100)}px`, opacity: isMax ? 1 : 0.82 }}
            />
            <span className="text-[10px] text-sutra-ink-3 truncate">{p.label}</span>
          </div>
        );
      })}
    </div>
  );
}

export default function AdminReportsPage() {
  const [stats, setStats] = useState<CompStats | null>(null);
  const [audit, setAudit] = useState<AdminAuditLog[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const load = () => {
    setError("");
    admin.comprehensiveStats().then((r) => setStats(r.data as CompStats)).catch((e) => setError(e instanceof Error ? e.message : "تعذّر التحميل"));
    admin.auditLogs({ limit: 8 }).then((r) => setAudit(r.data.data)).catch(() => setAudit([]));
  };

  const growth = stats?.charts?.user_growth ?? [];
  const revenue = stats?.charts?.revenue ?? [];

  return (
    <div>
      <PageHeader title="التقارير" subtitle="لمحة عن الأداء التشغيلي" />
      {error && !stats && <ErrorState title="تعذّر تحميل التقارير" message={error} onRetry={load} />}

      {!stats ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white border border-sutra-line rounded-xl p-5 h-28 animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-6">
            <StatCard label="إجمالي المستخدمين" value={n(stats.users?.total ?? 0)} tone="navy" />
            <StatCard label="القضايا" value={n(stats.cases?.total ?? 0)} hint={`${n(stats.cases?.active ?? 0)} نشطة · ${n(stats.cases?.delayed ?? 0)} متأخرة`} tone="blue" />
            <StatCard label="المشتركون" value={n(stats.subscribers?.total ?? 0)} hint={`${n(stats.subscribers?.paid ?? 0)} مدفوع · ${n(stats.subscribers?.trial ?? 0)} تجريبي`} tone="green" />
          </div>

          <div className="grid lg:grid-cols-2 gap-4 sm:gap-6 mb-6">
            {/* User growth bar chart */}
            <div className="bg-white border border-sutra-line rounded-xl p-5">
              <h3 className="text-[15px] font-bold text-sutra-ink mb-4">المستخدمون الجدد شهريًا</h3>
              {growth.length === 0 ? (
                <p className="text-[13px] text-sutra-ink-3">لا توجد بيانات</p>
              ) : (
                <MiniBars
                  points={growth.map((g) => ({ label: g.month, value: Number(g.new_users) }))}
                  fmt={(v) => n(v)}
                  tone="navy"
                />
              )}
            </div>

            {/* Revenue bar chart */}
            <div className="bg-white border border-sutra-line rounded-xl p-5">
              <h3 className="text-[15px] font-bold text-sutra-ink mb-4">الإيرادات الشهرية</h3>
              {revenue.length === 0 ? (
                <p className="text-[13px] text-sutra-ink-3">لا توجد بيانات</p>
              ) : (
                <MiniBars
                  points={revenue.map((r) => ({ label: r.month, value: Number(r.revenue) }))}
                  fmt={(v) => fmtCompact(v)}
                  tone="green"
                />
              )}
            </div>
          </div>
        </>
      )}

      {/* Audit snapshot */}
      <div className="bg-white border border-sutra-line rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-sutra-line-2 flex items-center justify-between">
          <h3 className="text-[15px] font-bold text-sutra-ink">أحدث النشاط</h3>
          <a href="/admin/activity-logs" className="text-[13px] font-semibold text-navy no-underline hover:underline">
            عرض الكل →
          </a>
        </div>
        {audit.length === 0 ? (
          <p className="p-5 text-[13px] text-sutra-ink-3">لا يوجد نشاط مسجَّل.</p>
        ) : (
          <div className="divide-y divide-sutra-line-2">
            {audit.map((a) => {
              const details =
                typeof a.details === "string"
                  ? a.details
                  : a.details && typeof a.details === "object"
                    ? JSON.stringify(a.details)
                    : "";
              return (
                <div key={a.id} className="px-5 py-3 flex items-center justify-between gap-3 flex-wrap">
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-sutra-ink truncate">{actionLabel(a.action)}</p>
                    {details && <p className="text-[12px] text-sutra-ink-3 truncate">{details.slice(0, 120)}</p>}
                  </div>
                  <div className="flex items-center gap-3 flex-none">
                    <span className="text-[12px] text-sutra-ink-3 max-w-[160px] truncate">{a.user?.email ? <Ltr>{a.user.email}</Ltr> : "—"}</span>
                    <span className="text-[12px] text-sutra-ink-3 whitespace-nowrap">
                      {a.created_at ? dateTime(a.created_at) : ""}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
