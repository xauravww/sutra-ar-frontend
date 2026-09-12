"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { admin } from "@/lib/api";
import { PageHeader, StatCard, ErrorState } from "@/components/admin/ui";
import Ltr from "@/components/Ltr";
import { amount } from "@/lib/currency";
import { n } from "@/lib/num";

interface CompStats {
  cases?: { total?: number; active?: number; delayed?: number };
  subscribers?: { total?: number; paid?: number; unpaid?: number; trial?: number };
  cvos?: { total?: number; active?: number; completed_cases?: number; pending_cases?: number };
  users?: { total?: number };
  charts?: {
    user_growth?: Array<{ month: string; new_users: string; active_users: string }>;
    revenue?: Array<{ month: string; revenue: string }>;
  };
}

/** Plan revenue carries no currency of its own; see `@/lib/currency`. */
const fmtMoney = (value: string | number) => amount(value);

export default function AdminDashboard() {
  const [stats, setStats] = useState<CompStats | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    setError("");
    admin
      .comprehensiveStats()
      .then((r) => setStats(r.data as CompStats))
      .catch((e) => setError(e instanceof Error ? e.message : "تعذّر تحميل الإحصاءات"));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const growth = stats?.charts?.user_growth ?? [];
  const revenue = stats?.charts?.revenue ?? [];
  const maxGrowth = Math.max(1, ...growth.map((g) => Number(g.new_users)));
  const maxRevenue = Math.max(1, ...revenue.map((r) => Number(r.revenue)));

  return (
    <div>
      <PageHeader
        title="لوحة التحكم"
        subtitle="نظرة عامة على المنصة"
        actions={
          <Link
            href="/admin/reports"
            className="inline-flex items-center gap-1.5 bg-navy text-white rounded-xl text-[14px] font-semibold px-4 py-2.5 hover:bg-navy-dark transition-colors no-underline"
          >
            التقارير الكاملة
          </Link>
        }
      />

      {error && !stats && <ErrorState title="تعذّر تحميل لوحة التحكم" message={error} onRetry={load} />}
      {error && stats && (
        <div className="mb-4">
          <ErrorState title="تعذّر تحديث لوحة التحكم" message={error} onRetry={load} />
        </div>
      )}

      {!stats && !error && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white border border-sutra-line rounded-xl p-5">
              <div className="h-3 w-16 bg-sutra-line-2 rounded animate-pulse mb-3" />
              <div className="h-7 w-12 bg-sutra-line-2 rounded animate-pulse" />
            </div>
          ))}
        </div>
      )}

      {stats && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
            <StatCard
              label="إجمالي المستخدمين"
              value={n(stats.users?.total ?? 0)}
              tone="navy"
              icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" className="w-5 h-5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></svg>}
            />
            <StatCard
              label="القضايا"
              value={n(stats.cases?.total ?? 0)}
              hint={`${n(stats.cases?.active ?? 0)} نشطة · ${n(stats.cases?.delayed ?? 0)} متأخرة`}
              tone="blue"
              icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" className="w-5 h-5"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8zM14 3v5h5" /></svg>}
            />
            <StatCard
              label="مشتركون مدفوعون"
              value={n(stats.subscribers?.paid ?? 0)}
              hint={`${n(stats.subscribers?.trial ?? 0)} تجريبي · ${n(stats.subscribers?.unpaid ?? 0)} غير مدفوع`}
              tone="green"
              icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" className="w-5 h-5"><path d="M2 7h20v10H2zM2 10h20" /></svg>}
            />
            <StatCard
              label="المشتركون"
              value={n(stats.subscribers?.total ?? 0)}
              hint={`${n(stats.subscribers?.paid ?? 0)} مدفوع · ${n(stats.subscribers?.trial ?? 0)} تجريبي`}
              tone="amber"
              icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" className="w-5 h-5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" /></svg>}
            />
          </div>

          <div className="grid lg:grid-cols-2 gap-4 sm:gap-6">
            {/* User growth */}
            <div className="bg-white border border-sutra-line rounded-xl p-5">
              <h3 className="text-[15px] font-bold text-sutra-ink mb-4">نمو المستخدمين (٦ أشهر)</h3>
              {growth.length === 0 ? (
                <p className="text-[13px] text-sutra-ink-3">لا توجد بيانات</p>
              ) : (
                <div className="flex items-end gap-2 h-36">
                  {growth.map((g) => (
                    <div key={g.month} className="flex-1 flex flex-col items-center gap-1.5 min-w-0">
                      <span className="text-[10px] text-sutra-ink-3 font-semibold">{n(g.new_users)}</span>
                      <div
                        className="w-full bg-navy rounded-t-md transition-all"
                        style={{ height: `${Math.max(4, (Number(g.new_users) / maxGrowth) * 100)}px` }}
                      />
                      <span className="text-[10px] text-sutra-ink-3 truncate"><Ltr>{g.month}</Ltr></span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Revenue */}
            <div className="bg-white border border-sutra-line rounded-xl p-5">
              <h3 className="text-[15px] font-bold text-sutra-ink mb-4">الإيرادات الشهرية (٦ أشهر)</h3>
              {revenue.length === 0 ? (
                <p className="text-[13px] text-sutra-ink-3">لا توجد بيانات</p>
              ) : (
                <div className="flex items-end gap-2 h-36">
                  {revenue.map((r) => (
                    <div key={r.month} className="flex-1 flex flex-col items-center gap-1.5 min-w-0">
                      <span className="text-[10px] text-sutra-ink-3 font-semibold">{fmtMoney(r.revenue)}</span>
                      <div
                        className="w-full bg-green-bg border border-green-dot rounded-t-md"
                        style={{ height: `${Math.max(4, (Number(r.revenue) / maxRevenue) * 100)}px` }}
                      />
                      <span className="text-[10px] text-sutra-ink-3 truncate"><Ltr>{r.month}</Ltr></span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
