"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { admin, type AdminSubscription } from "@/lib/api";
import { useNotify } from "@/components/ui/Notify";
import { PageHeader, StatusBadge, EmptyState } from "@/components/admin/ui";
import { date, money } from "@/lib/num";
import Ltr from "@/components/Ltr";

/** Dates route through the shared Arabic formatter; a dash fills the gap. */
const fmtDate = (d?: string | null) => date(d) || "—";

/** Money routes through the shared Arabic formatter (Arabic-Indic digits). */
const fmtMoney = (v?: number | null) => money(v) || "—";

/** Subscription statuses. The values stay Latin — only the labels are Arabic. */
const SUB_STATUS_LABELS: Record<string, string> = {
  active: "نشط",
  cancelled: "ملغى",
  past_due: "متأخر السداد",
  trialing: "فترة تجريبية",
};

export default function AdminSubscriptionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const subId = Number(id);
  const { toast } = useNotify();

  const [sub, setSub] = useState<AdminSubscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = () => {
    setLoading(true);
    setError("");
    admin
      .getSubscription(subId)
      .then((r) => setSub(r.data))
      .catch((e) => setError(e instanceof Error ? e.message : "تعذّر تحميل الاشتراك"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subId]);

  const changeStatus = async (next: string) => {
    if (!sub) return;
    try {
      await admin.updateSubscription(sub.id, { status: next });
      toast(`تم تعيين الحالة إلى ${SUB_STATUS_LABELS[next] ?? next}`, "success");
      load();
    } catch (e) {
      toast(e instanceof Error ? e.message : "تعذّر التحديث", "error");
    }
  };

  const resend = async () => {
    if (!sub) return;
    try {
      await admin.resendReminder(sub.id);
      toast("تم إرسال البريد التذكيري", "success");
    } catch (e) {
      toast(e instanceof Error ? e.message : "تعذّر إرسال التذكير", "error");
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-56 bg-sutra-line-2 rounded animate-pulse" />
        <div className="h-56 bg-white border border-sutra-line rounded-xl animate-pulse" />
      </div>
    );
  }

  if (error || !sub) {
    return <EmptyState title="الاشتراك غير موجود" description={error || "ربما تمت إزالة هذا الاشتراك."} />;
  }

  return (
    <div>
      <PageHeader
        title={`الاشتراك رقم ${sub.id}`}
        subtitle={sub.user?.email ?? "لا يوجد مستخدم مرتبط"}
        actions={
          <Link
            href="/admin/subscriptions"
            className="inline-flex items-center gap-1.5 rounded-xl border border-sutra-line bg-white px-4 h-10 text-[13.5px] font-semibold text-sutra-ink-2 hover:bg-tint transition-colors no-underline"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="w-4 h-4 rtl-flip">
              <path d="M19 12H5M11 18l-6-6 6-6" />
            </svg>
            رجوع
          </Link>
        }
      />

      <div className="bg-white border border-sutra-line rounded-xl p-5 sm:p-6 mb-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="w-12 h-12 rounded-xl bg-tint text-navy border border-tint-2 grid place-items-center">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" className="w-6 h-6">
                <path d="M2 7h20v10H2zM2 10h20" />
              </svg>
            </span>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-[17px] sm:text-[19px] font-bold text-sutra-ink">{sub.plan?.name ?? "باقة"}</h2>
                <StatusBadge status={sub.status} />
              </div>
              <p className="text-[13px] text-sutra-ink-3 mt-1">
                {sub.user ? (
                  <>
                    <Ltr>{sub.user.email}</Ltr>
                    {" · مستخدم "}
                    <Ltr>#{sub.user.id}</Ltr>
                  </>
                ) : (
                  "لا يوجد مستخدم مرتبط"
                )}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={resend}
              className="inline-flex items-center rounded-xl border border-sutra-line bg-white px-4 h-10 text-[13px] font-semibold text-sutra-ink-2 hover:bg-tint transition-colors"
            >
              إعادة إرسال التذكير
            </button>
            <select
              value={sub.status}
              onChange={(e) => changeStatus(e.target.value)}
              className="h-10 rounded-xl border border-sutra-line bg-white px-3 text-[13px] text-sutra-ink outline-none focus:border-focus cursor-pointer"
            >
              {["active", "cancelled", "past_due", "trialing"].map((s) => (
                <option key={s} value={s}>{SUB_STATUS_LABELS[s] ?? s.replace(/_/g, " ")}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-6 pt-5 border-t border-sutra-line-2 text-[13px]">
          <div>
            <p className="text-[11px] font-bold uppercase text-sutra-ink-3 mb-0.5">تاريخ البدء</p>
            <p className="font-semibold text-sutra-ink">{fmtDate(sub.start_date)}</p>
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase text-sutra-ink-3 mb-0.5">تاريخ الانتهاء</p>
            <p className="font-semibold text-sutra-ink">{fmtDate(sub.end_date)}</p>
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase text-sutra-ink-3 mb-0.5">المبلغ المدفوع</p>
            <p className="font-semibold text-sutra-ink">{fmtMoney(sub.amount_paid)}</p>
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase text-sutra-ink-3 mb-0.5">الباقة</p>
            <p className="font-semibold text-sutra-ink">{sub.plan?.name ?? "—"}</p>
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase text-sutra-ink-3 mb-0.5">آخر تذكير مُرسَل</p>
            <p className="font-semibold text-sutra-ink">{fmtDate(sub.last_reminder_sent_at)}</p>
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase text-sutra-ink-3 mb-0.5">تاريخ الإنشاء</p>
            <p className="font-semibold text-sutra-ink">{fmtDate(sub.created_at)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
