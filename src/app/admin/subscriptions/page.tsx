"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { admin, type AdminSubscription, type AdminPlan, type AdminUser } from "@/lib/api";
import { useNotify } from "@/components/ui/Notify";
import Ltr from "@/components/Ltr";
import { count, dayMonth, n, type PluralForms } from "@/lib/num";
import {
  PageHeader,
  SearchInput,
  FilterSelect,
  EmptyState,
  ErrorState,
  StatusBadge,
  Pagination,
} from "@/components/admin/ui";

const PAGE_SIZE = 20;

/** Subscription counts, for the page subtitle. */
const SUBSCRIPTIONS: PluralForms = {
  one: "اشتراك واحد",
  two: "اشتراكان",
  few: "اشتراكات",
  many: "اشتراكًا",
  other: "اشتراك",
};

const SUB_STATUSES = [
  { value: "active", label: "نشط" },
  { value: "cancelled", label: "ملغى" },
  { value: "past_due", label: "متأخر السداد" },
  { value: "trialing", label: "تجريبي" },
];

export default function AdminSubscriptionsPage() {
  const { toast, confirm } = useNotify();

  const [subs, setSubs] = useState<AdminSubscription[]>([]);
  const [plans, setPlans] = useState<AdminPlan[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [planId, setPlanId] = useState("");

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AdminSubscription | null>(null);
  const [form, setForm] = useState({ user_id: "", plan_id: "", status: "active", start_date: "", end_date: "" });
  const [saving, setSaving] = useState(false);

  // User picker — accepts a pasted numeric id or a debounced email/name search.
  const [userQuery, setUserQuery] = useState("");
  const [userPicked, setUserPicked] = useState<{ id: number; email: string } | null>(null);
  const [userResults, setUserResults] = useState<AdminUser[]>([]);
  const [userSearching, setUserSearching] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const userBoxRef = useRef<HTMLDivElement>(null);

  // Plan picker — the plan list is small and loaded once, so the debounce
  // filters client-side rather than round-tripping on every keystroke.
  const [planQuery, setPlanQuery] = useState("");
  const [planFilter, setPlanFilter] = useState("");
  const [planPicked, setPlanPicked] = useState<{ id: number; name: string } | null>(null);
  const [planOpen, setPlanOpen] = useState(false);
  const [plansLoading, setPlansLoading] = useState(true);
  const planBoxRef = useRef<HTMLDivElement>(null);

  const resetPickers = () => {
    setUserQuery("");
    setUserPicked(null);
    setUserResults([]);
    setUserOpen(false);
    setUserSearching(false);
    setPlanQuery("");
    setPlanFilter("");
    setPlanPicked(null);
    setPlanOpen(false);
  };

  // Plans feed both the modal picker and the table's plan filter, so load them
  // on mount — previously they were fetched only from openCreate/openEdit, which
  // left the filter empty until the modal had been opened at least once.
  useEffect(() => {
    let cancelled = false;
    admin
      .listPlans({ limit: 100 })
      .then((r) => { if (!cancelled) setPlans(r.data.data); })
      .catch(() => { if (!cancelled) setPlans([]); })
      .finally(() => { if (!cancelled) setPlansLoading(false); });
    return () => { cancelled = true; };
  }, []);

  // Debounce the typed plan text before it drives the client-side filter.
  useEffect(() => {
    const t = setTimeout(() => setPlanFilter(planQuery), 200);
    return () => clearTimeout(t);
  }, [planQuery]);

  // Debounced lookup. A bare numeric id needs no round trip, and a query that
  // already equals the picked user's email shouldn't re-search after selection.
  useEffect(() => {
    if (!modalOpen) return;
    const term = userQuery.trim();
    if (!term || term === userPicked?.email || /^\d+$/.test(term)) return;
    let cancelled = false;
    const t = setTimeout(() => {
      admin
        .listUsers({ search: term, limit: 8 })
        .then((r) => { if (!cancelled) setUserResults(r.data.data); })
        .catch(() => { if (!cancelled) setUserResults([]); })
        .finally(() => { if (!cancelled) setUserSearching(false); });
    }, 350);
    return () => { cancelled = true; clearTimeout(t); };
  }, [userQuery, userPicked, modalOpen]);

  // Close whichever suggestion list is open on an outside click.
  useEffect(() => {
    if (!userOpen && !planOpen) return;
    const onDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (!userBoxRef.current?.contains(target)) setUserOpen(false);
      if (!planBoxRef.current?.contains(target)) setPlanOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [userOpen, planOpen]);

  /** Plans matching the debounced query; plans are few, so filter in memory. */
  const planMatches = plans.filter((p) =>
    p.name.toLowerCase().includes(planFilter.trim().toLowerCase())
  );

  const pickPlan = (p: AdminPlan) => {
    setForm((f) => ({ ...f, plan_id: String(p.id) }));
    setPlanQuery(p.name);
    setPlanFilter(p.name);
    setPlanPicked({ id: p.id, name: p.name });
    setPlanOpen(false);
  };

  const onPlanQueryChange = (v: string) => {
    setPlanQuery(v);
    setPlanOpen(true);
    setPlanPicked(null);
    // Editing the text invalidates the previous choice — force a fresh pick.
    setForm((f) => ({ ...f, plan_id: "" }));
  };

  const pickUser = (u: AdminUser) => {
    setForm((f) => ({ ...f, user_id: String(u.id) }));
    setUserQuery(u.email);
    setUserPicked({ id: u.id, email: u.email });
    setUserResults([]);
    setUserOpen(false);
    setUserSearching(false);
  };

  const onUserQueryChange = (v: string) => {
    const term = v.trim();
    const asId = /^\d+$/.test(term);
    setUserQuery(v);
    setUserOpen(true);
    setUserPicked(null);
    setUserResults([]);
    // A pasted id is usable as-is; anything else must resolve through search.
    setForm((f) => ({ ...f, user_id: asId ? term : "" }));
    setUserSearching(!asId && term.length > 0);
  };

  const fetchSubs = useCallback(() => {
    setLoading(true);
    admin
      .listSubscriptions({
        limit: PAGE_SIZE,
        offset: (page - 1) * PAGE_SIZE,
        status: status || undefined,
        user: search || undefined,
        planId: planId ? Number(planId) : undefined,
      })
      .then((r) => {
        setSubs(r.data.data);
        setTotal(r.data.total);
        setLoadError("");
      })
      .catch((e) => {
        setSubs([]);
        setLoadError(e instanceof Error ? e.message : "تعذّر تحميل الاشتراكات");
      })
      .finally(() => setLoading(false));
  }, [page, search, status, planId]);

  useEffect(() => {
    fetchSubs();
  }, [fetchSubs]);

  const openCreate = () => {
    setEditing(null);
    setForm({ user_id: "", plan_id: "", status: "active", start_date: new Date().toISOString().slice(0, 10), end_date: "" });
    resetPickers();
    setModalOpen(true);
  };

  const openEdit = (s: AdminSubscription) => {
    setEditing(s);
    setForm({
      user_id: String(s.user_id ?? ""),
      plan_id: String(s.plan_id ?? ""),
      status: s.status,
      start_date: s.start_date?.slice(0, 10) ?? "",
      end_date: s.end_date?.slice(0, 10) ?? "",
    });
    // Prefer the email so the admin sees who they're editing; fall back to the
    // raw id when the row's user relation isn't loaded.
    if (s.user?.email) {
      setUserQuery(s.user.email);
      setUserPicked({ id: s.user.id, email: s.user.email });
    } else {
      setUserQuery(s.user_id ? String(s.user_id) : "");
      setUserPicked(null);
    }
    setUserResults([]);
    setUserOpen(false);
    setUserSearching(false);
    // The list endpoint usually embeds the plan; fall back to the already-loaded
    // plan list so an edit never opens with an empty-looking plan field.
    const knownPlan = s.plan?.name
      ? { id: s.plan.id, name: s.plan.name }
      : plans.find((p) => p.id === s.plan_id);
    if (knownPlan) {
      setPlanQuery(knownPlan.name);
      setPlanFilter(knownPlan.name);
      setPlanPicked({ id: knownPlan.id, name: knownPlan.name });
    } else {
      setPlanQuery("");
      setPlanFilter("");
      setPlanPicked(null);
    }
    setPlanOpen(false);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    resetPickers();
  };

  const handleSave = async () => {
    const payload = {
      user_id: Number(form.user_id),
      plan_id: Number(form.plan_id),
      status: form.status,
      start_date: form.start_date || new Date().toISOString(),
      ...(form.end_date ? { end_date: form.end_date } : {}),
    };
    setSaving(true);
    try {
      if (editing) {
        await admin.updateSubscription(editing.id, payload);
        toast("تم تحديث الاشتراك", "success");
      } else {
        await admin.createSubscription(payload);
        toast("تم إنشاء الاشتراك", "success");
      }
      closeModal();
      fetchSubs();
    } catch (e) {
      toast(e instanceof Error ? e.message : "تعذّر الحفظ", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (s: AdminSubscription) => {
    const ok = await confirm({
      title: "حذف الاشتراك",
      message: `حذف الاشتراك رقم ${n(s.id)}؟ لا يمكن التراجع عن هذا الإجراء.`,
      confirmLabel: "حذف",
      tone: "danger",
    });
    if (!ok) return;
    try {
      await admin.deleteSubscription(s.id);
      toast("تم حذف الاشتراك", "success");
      fetchSubs();
    } catch (e) {
      toast(e instanceof Error ? e.message : "تعذّر الحذف", "error");
    }
  };

  const handleResend = async (s: AdminSubscription) => {
    try {
      await admin.resendReminder(s.id);
      toast("تم إرسال التذكير", "success");
    } catch (e) {
      toast(e instanceof Error ? e.message : "تعذّر إرسال التذكير", "error");
    }
  };

  return (
    <div>
      <PageHeader
        title="الاشتراكات"
        subtitle={`${count(total, SUBSCRIPTIONS)} إجمالًا`}
        actions={
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-1.5 bg-navy text-white rounded-xl text-[14px] font-semibold px-4 py-2.5 hover:bg-navy-dark transition-colors"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-4 h-4">
              <path d="M12 5v14M5 12h14" />
            </svg>
            اشتراك جديد
          </button>
        }
      />

      <div className="bg-amber-bg border border-amber-ink/20 rounded-xl px-4 py-3 mb-6 flex items-start gap-3">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-amber-ink flex-none mt-0.5">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 8h.01" />
          <path d="M12 12v4" />
        </svg>
        <div>
          <p className="text-[13.5px] font-semibold text-amber-ink">الاشتراكات غير مُفعَّلة حاليًا</p>
          <p className="text-[12.5px] text-amber-ink/90 mt-0.5">
            هذا القسم غير نشط في الإصدار الحالي. قد تكون البيانات أدناه قديمة أو فارغة — لا تعتمد عليها في اتخاذ القرارات.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-6">
        <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="ابحث ببريد المستخدم الإلكتروني…" className="flex-1 min-w-[200px]" />
        <FilterSelect value={status} onChange={(v) => { setStatus(v); setPage(1); }} options={SUB_STATUSES} allLabel="كل الحالات" />
        <FilterSelect
          value={planId}
          onChange={(v) => { setPlanId(v); setPage(1); }}
          options={plans.map((p) => ({ value: String(p.id), label: p.name }))}
          allLabel="كل الباقات"
        />
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
        <ErrorState title="تعذّر تحميل الاشتراكات" message={loadError} onRetry={fetchSubs} />
      ) : subs.length === 0 ? (
        <EmptyState title="لا توجد اشتراكات" description="جرّب تعديل عوامل التصفية" />
      ) : (
        <div className="bg-white border border-sutra-line rounded-xl overflow-x-auto">
          <table className="w-full min-w-[820px]">
            <thead className="border-b border-sutra-line-2 bg-sutra-bg/50">
              <tr>
                <th className="px-4 py-3 text-start text-[11px] font-bold uppercase text-sutra-ink-3">ID</th>
                <th className="px-4 py-3 text-start text-[11px] font-bold uppercase text-sutra-ink-3">المستخدم</th>
                <th className="px-4 py-3 text-start text-[11px] font-bold uppercase text-sutra-ink-3">الباقة</th>
                <th className="px-4 py-3 text-start text-[11px] font-bold uppercase text-sutra-ink-3">الحالة</th>
                <th className="px-4 py-3 text-start text-[11px] font-bold uppercase text-sutra-ink-3">الفترة</th>
                <th className="px-4 py-3 text-end text-[11px] font-bold uppercase text-sutra-ink-3">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sutra-line-2">
              {subs.map((s) => (
                <tr key={s.id} className="hover:bg-sutra-bg/40 transition-colors">
                  <td className="px-4 py-3.5">
                    <Link href={`/admin/subscriptions/${s.id}`} className="text-[13px] font-bold text-navy no-underline hover:underline">
                      <Ltr>#{s.id}</Ltr>
                    </Link>
                  </td>
                  <td className="px-4 py-3.5">
                    <p className="text-[13px] font-semibold text-sutra-ink truncate max-w-[200px]">{s.user?.email ? <Ltr>{s.user.email}</Ltr> : "—"}</p>
                    {s.user?.first_name && <p className="text-[11.5px] text-sutra-ink-3 truncate">{s.user.first_name} {s.user.last_name}</p>}
                  </td>
                  <td className="px-4 py-3.5 text-[12.5px] text-sutra-ink-2">{s.plan?.name ? <Ltr>{s.plan.name}</Ltr> : "—"}</td>
                  <td className="px-4 py-3.5"><StatusBadge status={s.status} /></td>
                  <td className="px-4 py-3.5 text-[12px] text-sutra-ink-3 whitespace-nowrap">
                    {s.start_date ? dayMonth(s.start_date) : "—"}
                    {" ← "}
                    {s.end_date ? dayMonth(s.end_date) : "—"}
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleResend(s)}
                        className="h-8 px-3 rounded-lg border border-sutra-line bg-white text-[12px] font-semibold text-sutra-ink-2 hover:bg-tint transition-colors"
                        title="إعادة إرسال التذكير بالبريد"
                      >
                        تذكير
                      </button>
                      <button
                        onClick={() => openEdit(s)}
                        className="h-8 px-3 rounded-lg border border-sutra-line bg-white text-[12px] font-semibold text-sutra-ink-2 hover:bg-tint transition-colors"
                      >
                        تعديل
                      </button>
                      <button
                        onClick={() => handleDelete(s)}
                        className="h-8 px-3 rounded-lg border border-sutra-line bg-white text-[12px] font-semibold text-sutra-ink-2 hover:bg-red-50 hover:text-red-700 hover:border-red-300 transition-colors"
                      >
                        حذف
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Pagination page={page} pageSize={PAGE_SIZE} total={total} onPage={setPage} />

      {modalOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={closeModal} />
          <div className="relative w-full max-w-md bg-white rounded-xl p-5">
            <h3 className="text-[15px] font-bold text-sutra-ink mb-4">
              {editing ? `تعديل الاشتراك رقم ${n(editing.id)}` : "اشتراك جديد"}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-[13px] font-semibold text-sutra-ink-2 mb-1.5">المستخدم *</label>
                <div ref={userBoxRef} className="relative">
                  <input
                    type="text"
                    value={userQuery}
                    onChange={(e) => onUserQueryChange(e.target.value)}
                    onFocus={() => setUserOpen(true)}
                    onKeyDown={(e) => { if (e.key === "Escape") setUserOpen(false); }}
                    placeholder="البريد الإلكتروني أو رقم المستخدم"
                    autoComplete="off"
                    className="w-full h-11 rounded-lg border border-sutra-line bg-white px-3.5 pe-9 text-[14px] text-sutra-ink outline-none focus:border-navy"
                  />
                  {userSearching && (
                    <span className="absolute end-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full border-2 border-sutra-line border-t-navy animate-spin" aria-hidden />
                  )}
                  {userOpen && userResults.length > 0 && (
                    <ul className="absolute z-20 start-0 end-0 top-[calc(100%+4px)] max-h-56 overflow-y-auto bg-white border border-sutra-line rounded-lg shadow-lg py-1">
                      {userResults.map((u) => (
                        <li key={u.id}>
                          <button
                            type="button"
                            onClick={() => pickUser(u)}
                            className="w-full text-start px-3 py-2 hover:bg-tint transition-colors"
                          >
                            <span className="block text-[13px] font-semibold text-sutra-ink truncate"><Ltr>{u.email}</Ltr></span>
                            <span className="block text-[11px] text-sutra-ink-3">
                              <Ltr>#{u.id}</Ltr>
                              {[u.first_name, u.last_name].filter(Boolean).length > 0 && ` · ${[u.first_name, u.last_name].filter(Boolean).join(" ")}`}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                  {userOpen && !userSearching && userResults.length === 0
                    && userQuery.trim() !== "" && !userPicked && !/^\d+$/.test(userQuery.trim()) && (
                    <p className="absolute z-20 start-0 end-0 top-[calc(100%+4px)] bg-white border border-sutra-line rounded-lg shadow-lg px-3 py-2 text-[12.5px] text-sutra-ink-3">
                      لا يوجد مستخدمون مطابقون لـ «{userQuery.trim()}»
                    </p>
                  )}
                </div>
                <p className="text-[11.5px] text-sutra-ink-3 mt-1">
                  {userPicked
                    ? `تم اختيار المستخدم رقم ${n(userPicked.id)}`
                    : /^\d+$/.test(userQuery.trim())
                      ? `سيُستخدم رقم المستخدم ${n(Number(userQuery.trim()))}`
                      : "اكتب بريدًا إلكترونيًا للبحث، أو الصق رقم المستخدم."}
                </p>
              </div>
              <div>
                <label className="block text-[13px] font-semibold text-sutra-ink-2 mb-1.5">الباقة *</label>
                <div ref={planBoxRef} className="relative">
                  <input
                    type="text"
                    value={planQuery}
                    onChange={(e) => onPlanQueryChange(e.target.value)}
                    onFocus={() => setPlanOpen(true)}
                    onKeyDown={(e) => { if (e.key === "Escape") setPlanOpen(false); }}
                    placeholder={plansLoading ? "جارٍ تحميل الباقات…" : "ابحث عن باقة بالاسم"}
                    autoComplete="off"
                    className="w-full h-11 rounded-lg border border-sutra-line bg-white px-3.5 text-[14px] text-sutra-ink outline-none focus:border-navy"
                  />
                  {planOpen && planMatches.length > 0 && (
                    <ul className="absolute z-20 start-0 end-0 top-[calc(100%+4px)] max-h-56 overflow-y-auto bg-white border border-sutra-line rounded-lg shadow-lg py-1">
                      {planMatches.map((p) => (
                        <li key={p.id}>
                          <button
                            type="button"
                            onClick={() => pickPlan(p)}
                            className="w-full text-start px-3 py-2 hover:bg-tint transition-colors"
                          >
                            <span className="block text-[13px] font-semibold text-sutra-ink truncate"><Ltr>{p.name}</Ltr></span>
                            <span className="block text-[11px] text-sutra-ink-3">
                              <Ltr>#{p.id}</Ltr>
                              {p.price_monthly != null && ` · ${n(p.price_monthly)} شهريًا`}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                  {planOpen && planMatches.length === 0 && (
                    <p className="absolute z-20 start-0 end-0 top-[calc(100%+4px)] bg-white border border-sutra-line rounded-lg shadow-lg px-3 py-2 text-[12.5px] text-sutra-ink-3">
                      {plans.length === 0
                        ? "لا توجد باقات مُعدّة بعد."
                        : `لا توجد باقات مطابقة لـ «${planQuery.trim()}»`}
                    </p>
                  )}
                </div>
                <p className="text-[11.5px] text-sutra-ink-3 mt-1">
                  {planPicked ? `تم اختيار ${planPicked.name}` : "ابحث عن باقة واخترها."}
                </p>
              </div>
              <div>
                <label className="block text-[13px] font-semibold text-sutra-ink-2 mb-1.5">الحالة</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                  className="w-full h-11 rounded-lg border border-sutra-line bg-white px-3.5 text-[14px] text-sutra-ink outline-none focus:border-navy cursor-pointer"
                >
                  {SUB_STATUSES.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[13px] font-semibold text-sutra-ink-2 mb-1.5">تاريخ البداية</label>
                  <input
                    type="date"
                    value={form.start_date}
                    onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                    className="w-full h-11 rounded-lg border border-sutra-line bg-white px-3.5 text-[14px] text-sutra-ink outline-none focus:border-navy"
                  />
                </div>
                <div>
                  <label className="block text-[13px] font-semibold text-sutra-ink-2 mb-1.5">تاريخ النهاية</label>
                  <input
                    type="date"
                    value={form.end_date}
                    onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                    className="w-full h-11 rounded-lg border border-sutra-line bg-white px-3.5 text-[14px] text-sutra-ink outline-none focus:border-navy"
                  />
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button
                onClick={handleSave}
                disabled={saving || !form.user_id || !form.plan_id}
                className="inline-flex items-center bg-navy text-white rounded-xl text-[14px] font-semibold px-5 h-11 hover:bg-navy-dark transition-colors disabled:opacity-50"
              >
                {saving ? "جارٍ الحفظ…" : editing ? "تحديث" : "إنشاء"}
              </button>
              <button
                onClick={closeModal}
                className="inline-flex items-center rounded-xl border border-sutra-line bg-white px-5 h-11 text-[14px] font-semibold text-sutra-ink-2 hover:bg-tint transition-colors"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
