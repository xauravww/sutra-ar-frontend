"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { admin, type AdminUser } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useNotify } from "@/components/ui/Notify";
import Ltr from "@/components/Ltr";
import { count, date, type PluralForms } from "@/lib/num";
import {
  PageHeader,
  SearchInput,
  FilterSelect,
  EmptyState,
  ErrorState,
  StatusBadge,
  RoleBadge,
  Pagination,
} from "@/components/admin/ui";

const PAGE_SIZE = 20;

/** User counts, for the page subtitle. */
const USERS: PluralForms = {
  one: "مستخدم واحد",
  two: "مستخدمان",
  few: "مستخدمون",
  many: "مستخدمًا",
  other: "مستخدم",
};

/**
 * Role codes. The code is the API contract — only the label is translated —
 * and the map doubles as the lookup the confirm dialogs use to name a role in
 * a sentence, so a code always prints as something readable.
 */
const ROLE_LABEL: Record<string, string> = {
  admin: "مسؤول",
  owner: "المالك",
  corpus_researcher: "باحث في المدونة",
  corpus_curator: "مراجع المدونة",
  legal_practitioner: "ممارس قانوني",
  judiciary: "السلطة القضائية",
};

const ROLE_OPTIONS = [
  { value: "admin", label: ROLE_LABEL.admin },
  { value: "owner", label: ROLE_LABEL.owner },
  { value: "corpus_researcher", label: ROLE_LABEL.corpus_researcher },
  { value: "corpus_curator", label: ROLE_LABEL.corpus_curator },
  { value: "legal_practitioner", label: ROLE_LABEL.legal_practitioner },
  { value: "judiciary", label: ROLE_LABEL.judiciary },
];

const STATUS_OPTIONS = [
  { value: "active", label: "نشط" },
  { value: "pending_verification", label: "بانتظار التحقق" },
  { value: "suspended", label: "موقوف" },
  { value: "inactive", label: "غير نشط" },
];

/** Subscription status codes, as stored on the subscription row. */
const SUBSCRIPTION_LABEL: Record<string, string> = {
  active: "نشط",
  trialing: "تجريبي",
  past_due: "متأخر السداد",
  cancelled: "ملغى",
  canceled: "ملغى",
  expired: "منتهي",
  paused: "موقوف",
};

export default function AdminUsersPage() {
  const { user: me, impersonateAs } = useAuth();
  const { toast, confirm } = useNotify();
  const isOwner = me?.role === "owner";

  // Role hierarchy: owner manages everyone; admin manages everyone except
  // admins/owners (they must not deactivate or re-role their own tier).
  const canManage = (targetRole: string) =>
    me?.role === "owner" || (me?.role === "admin" && targetRole !== "admin" && targetRole !== "owner");

  const createRoles =
    me?.role === "owner" ? ROLE_OPTIONS : ROLE_OPTIONS.filter((r) => r.value !== "admin" && r.value !== "owner");

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("");
  const [status, setStatus] = useState("");
  const [busyId, setBusyId] = useState<number | null>(null);

  // Create modal
  const [showCreate, setShowCreate] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState("legal_practitioner");
  const [creating, setCreating] = useState(false);

  const fetchUsers = useCallback(() => {
    setLoading(true);
    admin
      .listUsers({
        limit: PAGE_SIZE,
        offset: (page - 1) * PAGE_SIZE,
        search: search || undefined,
        role: role || undefined,
        account_status: status || undefined,
      })
      .then((r) => {
        setUsers(r.data.data);
        setTotal(r.data.pagination?.total ?? 0);
        setLoadError("");
      })
      .catch((e) => {
        setUsers([]);
        setLoadError(e instanceof Error ? e.message : "تعذّر تحميل المستخدمين");
      })
      .finally(() => setLoading(false));
  }, [page, search, role, status]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const toggleStatus = async (u: AdminUser) => {
    const toActive = u.account_status !== "active";
    const ok = await confirm({
      title: `${toActive ? "تفعيل" : "تعطيل"} ${u.email}`,
      message: toActive
        ? "سيستعيد هذا المستخدم صلاحية الوصول فورًا."
        : "سيفقد هذا المستخدم صلاحية الوصول فورًا.",
      confirmLabel: toActive ? "تفعيل" : "تعطيل",
      tone: toActive ? "default" : "danger",
    });
    if (!ok) return;
    setBusyId(u.id);
    try {
      await admin.updateUserStatus(u.id, toActive ? "active" : "inactive");
      toast(toActive ? "تم تفعيل المستخدم" : "تم تعطيل المستخدم", "success");
      fetchUsers();
    } catch (e) {
      toast(e instanceof Error ? e.message : "تعذّر التحديث", "error");
    } finally {
      setBusyId(null);
    }
  };

  const changeRole = async (u: AdminUser, nextRole: string) => {
    const ok = await confirm({
      title: `تغيير دور ${u.email}`,
      message: `تعيين الدور إلى «${ROLE_LABEL[nextRole] ?? nextRole}»؟`,
      confirmLabel: "تغيير الدور",
    });
    if (!ok) return;
    setBusyId(u.id);
    try {
      await admin.updateUserRole(u.id, nextRole);
      toast("تم تحديث الدور", "success");
      fetchUsers();
    } catch (e) {
      toast(e instanceof Error ? e.message : "تعذّر تحديث الدور", "error");
    } finally {
      setBusyId(null);
    }
  };

  // Sign in as another account. Same tier rule as canManage (owner: everyone;
  // admin: below their tier) plus a self-check. Server audits every session.
  const impersonate = async (u: AdminUser) => {
    const ok = await confirm({
      title: `انتحال حساب ${u.email}`,
      message: `أنت على وشك تسجيل الدخول باسم ${u.email} (${ROLE_LABEL[u.role] ?? u.role}). كل إجراء يتم في هذه الجلسة يُسجَّل ضد حسابك. هل تريد المتابعة؟`,
      confirmLabel: "انتحال الحساب",
      tone: "danger",
    });
    if (!ok) return;
    setBusyId(u.id);
    try {
      // On success impersonateAs hard-redirects to the target's home page.
      await impersonateAs(u.id);
    } catch (e) {
      toast(e instanceof Error ? e.message : "تعذّر انتحال الحساب", "error");
      setBusyId(null);
    }
  };

  const handleCreate = async () => {
    if (!newEmail.trim() || !newPassword) return;
    if (!isOwner && (newRole === "admin" || newRole === "owner")) {
      toast("المالك وحده يمكنه إنشاء حسابات المسؤولين أو المالك", "error");
      return;
    }
    setCreating(true);
    try {
      await admin.createUser({ email: newEmail.trim(), password: newPassword, role: newRole });
      toast("تم إنشاء المستخدم", "success");
      setShowCreate(false);
      setNewEmail("");
      setNewPassword("");
      setNewRole("legal_practitioner");
      setPage(1);
      fetchUsers();
    } catch (e) {
      toast(e instanceof Error ? e.message : "تعذّر إنشاء المستخدم", "error");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="المستخدمون"
        subtitle={`${count(total, USERS)} إجمالًا`}
        actions={
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-1.5 bg-navy text-white rounded-xl text-[14px] font-semibold px-4 py-2.5 hover:bg-navy-dark transition-colors"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-4 h-4">
              <path d="M12 5v14M5 12h14" />
            </svg>
            مستخدم جديد
          </button>
        }
      />

      {showCreate && (
        <div className="bg-white border border-sutra-line rounded-xl p-5 mb-6">
          <h3 className="text-[15px] font-bold text-sutra-ink mb-4">إنشاء مستخدم</h3>
          <div className="grid sm:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-[13px] font-semibold text-sutra-ink-2 mb-1.5">البريد الإلكتروني *</label>
              <input
                type="email"
                dir="ltr"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="user@example.com"
                className="w-full h-11 rounded-lg border border-sutra-line bg-white px-3.5 text-[14px] text-sutra-ink outline-none focus:border-navy"
              />
            </div>
            <div>
              <label className="block text-[13px] font-semibold text-sutra-ink-2 mb-1.5">كلمة المرور *</label>
              <input
                type="password"
                dir="ltr"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="عيّن كلمة مرور أولية"
                className="w-full h-11 rounded-lg border border-sutra-line bg-white px-3.5 text-[14px] text-sutra-ink outline-none focus:border-navy"
              />
            </div>
            <div>
              <label className="block text-[13px] font-semibold text-sutra-ink-2 mb-1.5">الدور *</label>
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
                className="w-full h-11 rounded-lg border border-sutra-line bg-white px-3.5 text-[14px] text-sutra-ink outline-none focus:border-navy cursor-pointer"
              >
                {createRoles.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleCreate}
              disabled={creating}
              className="inline-flex items-center bg-navy text-white rounded-xl text-[14px] font-semibold px-5 h-11 hover:bg-navy-dark transition-colors disabled:opacity-50"
            >
              {creating ? "جارٍ الإنشاء…" : "إنشاء مستخدم"}
            </button>
            <button
              onClick={() => setShowCreate(false)}
              className="inline-flex items-center rounded-xl border border-sutra-line bg-white px-5 h-11 text-[14px] font-semibold text-sutra-ink-2 hover:bg-tint transition-colors"
            >
              إلغاء
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3 mb-6">
        <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="ابحث بالبريد الإلكتروني أو الاسم…" className="flex-1 min-w-[200px]" />
        <FilterSelect value={role} onChange={(v) => { setRole(v); setPage(1); }} options={ROLE_OPTIONS} allLabel="كل الأدوار" />
        <FilterSelect value={status} onChange={(v) => { setStatus(v); setPage(1); }} options={STATUS_OPTIONS} allLabel="كل الحالات" />
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white border border-sutra-line rounded-xl p-4">
              <div className="h-5 w-1/3 bg-sutra-line-2 rounded animate-pulse" />
            </div>
          ))}
        </div>
      ) : loadError ? (
        <ErrorState title="تعذّر تحميل المستخدمين" message={loadError} onRetry={fetchUsers} />
      ) : users.length === 0 ? (
        <EmptyState title="لا يوجد مستخدمون" description="جرّب تعديل عوامل التصفية" />
      ) : (
        <div className="bg-white border border-sutra-line rounded-xl overflow-x-auto">
          <table className="w-full min-w-[760px]">
            <thead className="border-b border-sutra-line-2 bg-sutra-bg/50">
              <tr>
                <th className="px-4 py-3 text-start text-[11px] font-bold uppercase text-sutra-ink-3">المستخدم</th>
                <th className="px-4 py-3 text-start text-[11px] font-bold uppercase text-sutra-ink-3">الدور</th>
                <th className="px-4 py-3 text-start text-[11px] font-bold uppercase text-sutra-ink-3">الحالة</th>
                <th className="px-4 py-3 text-start text-[11px] font-bold uppercase text-sutra-ink-3">الاشتراك</th>
                <th className="px-4 py-3 text-start text-[11px] font-bold uppercase text-sutra-ink-3">تاريخ الانضمام</th>
                <th className="px-4 py-3 text-end text-[11px] font-bold uppercase text-sutra-ink-3">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sutra-line-2">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-sutra-bg/40 transition-colors">
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-3">
                      <span className="w-9 h-9 rounded-full bg-navy text-white grid place-items-center font-bold text-[13px] flex-none">
                        {(u.profile?.first_name ?? u.email).charAt(0).toUpperCase()}
                      </span>
                      <div className="min-w-0">
                        <Link href={`/admin/users/${u.id}`} className="no-underline">
                          <p className="text-[13.5px] font-semibold text-sutra-ink hover:text-navy truncate">
                            {[u.profile?.first_name, u.profile?.last_name].filter(Boolean).join(" ") || "—"}
                          </p>
                          <p className="text-[12px] text-sutra-ink-3 truncate"><Ltr>{u.email}</Ltr></p>
                        </Link>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    {isOwner ? (
                      <select
                        value={u.role}
                        onChange={(e) => changeRole(u, e.target.value)}
                        disabled={busyId === u.id}
                        className="h-8 rounded-lg border border-sutra-line bg-white px-2 text-[12.5px] text-sutra-ink outline-none focus:border-focus cursor-pointer disabled:opacity-50"
                      >
                        {ROLE_OPTIONS.map((r) => (
                          <option key={r.value} value={r.value}>{r.label}</option>
                        ))}
                      </select>
                    ) : (
                      <RoleBadge role={u.role} />
                    )}
                  </td>
                  <td className="px-4 py-3.5">
                    <StatusBadge status={u.account_status} />
                  </td>
                  <td className="px-4 py-3.5">
                    {u.subscription ? (
                      <span className="text-[12.5px] font-medium text-sutra-ink-2">
                        {u.subscription.plan?.name ? <Ltr>{u.subscription.plan.name}</Ltr> : "باقة"} ·{" "}
                        {SUBSCRIPTION_LABEL[u.subscription.status] ?? <Ltr>{u.subscription.status}</Ltr>}
                      </span>
                    ) : (
                      <span className="text-[12.5px] text-sutra-ink-3">لا يوجد</span>
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-[12.5px] text-sutra-ink-3 whitespace-nowrap">
                    {date(u.created_at) || "—"}
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center justify-end gap-2">
                      {me && u.id !== me.id && canManage(u.role) && (
                        <button
                          onClick={() => impersonate(u)}
                          disabled={busyId === u.id}
                          title="تسجيل الدخول كهذا المستخدم (مُسجَّل)"
                          className="h-8 px-3 rounded-lg text-[12px] font-semibold border border-amber-dot/50 bg-amber-bg text-amber-ink hover:brightness-95 transition-colors disabled:opacity-50"
                        >
                          انتحال الحساب
                        </button>
                      )}
                      {canManage(u.role) && (
                        <button
                          onClick={() => toggleStatus(u)}
                          disabled={busyId === u.id}
                          className={`h-8 px-3 rounded-lg text-[12px] font-semibold border transition-colors disabled:opacity-50 ${
                            u.account_status === "active"
                              ? "border-sutra-line bg-white text-sutra-ink-2 hover:bg-red-50 hover:text-red-700 hover:border-red-300"
                              : "border-green-dot bg-green-bg text-green-ink hover:brightness-95"
                          }`}
                        >
                          {u.account_status === "active" ? "تعطيل" : "تفعيل"}
                        </button>
                      )}
                      <Link
                        href={`/admin/users/${u.id}`}
                        className="h-8 px-3 rounded-lg border border-navy bg-white text-navy text-[12px] font-bold inline-flex items-center hover:bg-navy hover:text-white transition-colors no-underline"
                      >
                        عرض
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
