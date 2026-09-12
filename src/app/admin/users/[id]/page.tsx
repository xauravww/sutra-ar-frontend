"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { admin, type AdminUser, type AdminSubscription, type AdminCase } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useNotify } from "@/components/ui/Notify";
import { PageHeader, StatusBadge, RoleBadge, EmptyState, ErrorState } from "@/components/admin/ui";
import Ltr from "@/components/Ltr";
import { date, n } from "@/lib/num";

/** Account-status codes the API stores, named for the status select. */
const STATUS_LABEL: Record<string, string> = {
  active: "نشط",
  pending_verification: "بانتظار التحقق",
  suspended: "موقوف",
  inactive: "غير نشط",
};

/** Role codes the API stores, named for the role select. */
const ROLE_LABEL: Record<string, string> = {
  admin: "مسؤول",
  owner: "المالك",
  corpus_researcher: "باحث في المدونة",
  corpus_curator: "مراجع المدونة",
  legal_practitioner: "ممارس قانوني",
  judiciary: "السلطة القضائية",
};

export default function AdminUserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const userId = Number(id);
  const { user: me } = useAuth();
  const { toast } = useNotify();
  const isOwner = me?.role === "owner";
  // Owner manages everyone; admin manages everyone except admins/owners.
  const canManage = (targetRole: string) =>
    me?.role === "owner" || (me?.role === "admin" && targetRole !== "admin" && targetRole !== "owner");

  const [user, setUser] = useState<AdminUser | null>(null);
  const [subscriptions, setSubscriptions] = useState<AdminSubscription[]>([]);
  const [cases, setCases] = useState<AdminCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = () => {
    setLoading(true);
    setError("");
    admin
      .getUser(userId)
      .then((r) => {
        setUser(r.data.user);
        setSubscriptions(Array.isArray(r.data.subscriptions) ? r.data.subscriptions : []);
        setCases(Array.isArray(r.data.cases) ? r.data.cases : []);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "تعذّر تحميل المستخدم"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const changeStatus = async (next: string) => {
    if (!user) return;
    try {
      await admin.updateUserStatus(user.id, next);
      toast(`تم تعيين الحالة إلى «${STATUS_LABEL[next] ?? next}»`, "success");
      load();
    } catch (e) {
      toast(e instanceof Error ? e.message : "تعذّر التحديث", "error");
    }
  };

  const changeRole = async (next: string) => {
    if (!user) return;
    try {
      await admin.updateUserRole(user.id, next);
      toast("تم تحديث الدور", "success");
      load();
    } catch (e) {
      toast(e instanceof Error ? e.message : "تعذّر تحديث الدور", "error");
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-56 bg-sutra-line-2 rounded animate-pulse" />
        <div className="h-48 bg-white border border-sutra-line rounded-xl animate-pulse" />
      </div>
    );
  }

  if (error) {
    return <ErrorState title="تعذّر تحميل المستخدم" message={error} onRetry={load} />;
  }
  if (!user) {
    return <EmptyState title="المستخدم غير موجود" description="ربما حُذف هذا المستخدم." />;
  }

  const fullName = [user.profile?.first_name, user.profile?.last_name].filter(Boolean).join(" ") || user.email.split("@")[0];

  return (
    <div>
      <PageHeader
        title={fullName}
        subtitle={<Ltr>{user.email}</Ltr>}
        actions={
          <Link
            href="/admin/users"
            className="inline-flex items-center gap-1.5 rounded-xl border border-sutra-line bg-white px-4 h-10 text-[13.5px] font-semibold text-sutra-ink-2 hover:bg-tint transition-colors no-underline"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="w-4 h-4">
              <path d="M19 12H5M11 18l-6-6 6-6" />
            </svg>
            الرجوع إلى المستخدمين
          </Link>
        }
      />

      {/* Profile card */}
      <div className="bg-white border border-sutra-line rounded-xl p-5 sm:p-6 mb-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="w-14 h-14 rounded-2xl bg-navy text-white grid place-items-center font-bold text-[20px]">
              {user.email.charAt(0).toUpperCase()}
            </span>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-[17px] sm:text-[19px] font-bold text-sutra-ink">{fullName}</h2>
                <RoleBadge role={user.role} />
                <StatusBadge status={user.account_status} />
              </div>
              <p className="text-[13px] text-sutra-ink-3 mt-1">
                رقم المستخدم <Ltr>{n(user.id)}</Ltr> · انضم في{" "}
                {user.created_at ? date(user.created_at) : "—"}
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            {isOwner && (
              <div className="flex items-center gap-2">
                <label className="text-[12.5px] font-semibold text-sutra-ink-2">الدور</label>
                <select
                  value={user.role}
                  onChange={(e) => changeRole(e.target.value)}
                  className="h-9 rounded-lg border border-sutra-line bg-white px-2.5 text-[13px] text-sutra-ink outline-none focus:border-focus cursor-pointer"
                >
                  {["admin", "owner", "corpus_researcher", "corpus_curator", "legal_practitioner", "judiciary"].map((r) => (
                    <option key={r} value={r}>{ROLE_LABEL[r] ?? r.replace(/_/g, " ")}</option>
                  ))}
                </select>
              </div>
            )}
            {canManage(user.role) && (
              <div className="flex items-center gap-2">
                <label className="text-[12.5px] font-semibold text-sutra-ink-2">الحالة</label>
                <select
                  value={user.account_status}
                  onChange={(e) => changeStatus(e.target.value)}
                  className="h-9 rounded-lg border border-sutra-line bg-white px-2.5 text-[13px] text-sutra-ink outline-none focus:border-focus cursor-pointer"
                >
                  {["active", "pending_verification", "suspended", "inactive"].map((s) => (
                    <option key={s} value={s}>{STATUS_LABEL[s] ?? s.replace(/_/g, " ")}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {user.profile && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-3 mt-6 pt-5 border-t border-sutra-line-2 text-[13px]">
            {[
              ["الرقم الوظيفي", user.profile.employee_id],
              ["المسمى", user.profile.designation_rank],
              ["السلك / الخدمة", user.profile.cadre_service],
              ["الولاية", user.profile.state],
              ["المنطقة", user.profile.district],
            ].map(([label, value]) => (
              <div key={label as string}>
                <p className="text-[11px] font-bold uppercase text-sutra-ink-3 mb-0.5">{label}</p>
                <p className="text-sutra-ink-2">{value ? <Ltr>{value}</Ltr> : "—"}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Subscriptions */}
        <section>
          <h3 className="text-[15px] font-bold text-sutra-ink mb-3">الاشتراكات</h3>
          {subscriptions.length === 0 ? (
            <EmptyState title="لا توجد اشتراكات" description="لا توجد اشتراكات لهذا المستخدم بعد." />
          ) : (
            <div className="bg-white border border-sutra-line rounded-xl divide-y divide-sutra-line-2">
              {subscriptions.map((s) => (
                <Link key={s.id} href={`/admin/subscriptions/${s.id}`} className="block px-4 py-3.5 hover:bg-sutra-bg/40 transition-colors no-underline">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div>
                      <p className="text-[13.5px] font-semibold text-sutra-ink">{s.plan?.name ? <Ltr>{s.plan.name}</Ltr> : "باقة"}</p>
                      <p className="text-[12px] text-sutra-ink-3">
                        {s.start_date ? date(s.start_date) : "—"} ←{" "}
                        {s.end_date ? date(s.end_date) : "—"}
                      </p>
                    </div>
                    <StatusBadge status={s.status} />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Cases */}
        <section>
          <h3 className="text-[15px] font-bold text-sutra-ink mb-3">القضايا</h3>
          {cases.length === 0 ? (
            <EmptyState title="لا توجد قضايا" description="لا توجد قضايا مرتبطة بهذا المستخدم." />
          ) : (
            <div className="bg-white border border-sutra-line rounded-xl divide-y divide-sutra-line-2">
              {cases.map((c) => (
                <div key={c.id} className="px-4 py-3.5">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <p className="text-[13.5px] font-semibold text-sutra-ink truncate">{c.case_title}</p>
                    <StatusBadge status={c.status ?? ""} />
                  </div>
                  <p className="text-[12px] text-sutra-ink-3 mt-0.5">
                    {c.updated_at ? "آخر تحديث " + date(c.updated_at) : "—"}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
