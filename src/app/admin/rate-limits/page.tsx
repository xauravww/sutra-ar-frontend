"use client";

import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import {
  rateLimits,
  type RateLimitPolicyInfo,
  type RateLimitPolicyClient,
  type RateLimitUserRow,
} from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useNotify } from "@/components/ui/Notify";
import {
  PageHeader,
  StatCard,
  EmptyState,
  ErrorState,
  SearchInput,
  Th,
  Td,
} from "@/components/admin/ui";
import { count, duration, n } from "@/lib/num";
import Ltr from "@/components/Ltr";

/* ------------------------------------------------------------------ */
/*  Display helpers                                                     */
/* ------------------------------------------------------------------ */

/** Arabic forms for a counted "counter", used by the reset toasts. */
const COUNTERS = { one: "عدّاد", two: "عدّادان", few: "عدّادات", many: "عدّادًا", other: "عدّاد" };

const KIND_META: Record<string, { label: string; cls: string }> = {
  global: { label: "عام", cls: "bg-purple-50 text-purple-700 border border-purple-200" },
  group: { label: "مجموعة", cls: "bg-tint text-navy border border-tint-2" },
  specific: { label: "نقطة نهاية", cls: "bg-amber-50 text-amber-700 border border-amber-200" },
};

function KindBadge({ kind }: { kind: string }) {
  const m = KIND_META[kind] ?? KIND_META.group;
  return (
    <span className={`inline-flex items-center text-[10.5px] font-semibold px-2 py-0.5 rounded-md whitespace-nowrap ${m.cls}`}>
      {m.label}
    </span>
  );
}

/** "1 min" / "30 sec" / "3 hr" from a minutes value. */
function fmtWindow(minutes: number): string {
  return duration(minutes * 60);
}

/** Live counter bar: how full the current window is vs the limit. */
function UsageBar({ policy }: { policy: RateLimitPolicyInfo }) {
  const limit = Math.max(1, policy.limit);
  const hits = Math.min(policy.usage.hits, limit * 2);
  const pct = Math.min(100, Math.round((hits / limit) * 100));
  const blocked = pct >= 100;
  const barCls = blocked
    ? "bg-gradient-to-r from-red-600 to-red-500"
    : pct >= 75
      ? "bg-gradient-to-r from-amber-500 to-amber-400"
      : "bg-gradient-to-r from-[#1E3A8A] to-[#3B76D6]";

  return (
    <div className="flex items-center gap-2 min-w-[180px]">
      <div className="flex-1 h-2 rounded-full bg-sutra-bg overflow-hidden">
        <div className={`h-full rounded-full transition-all ${barCls}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[12px] tabular-nums text-sutra-ink-2 whitespace-nowrap w-[104px] text-end">
        <span className={`font-semibold ${blocked ? "text-red-600" : "text-sutra-ink"}`}>{n(policy.usage.hits)}</span>
        {" / "}
        {n(policy.limit)}
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function AdminRateLimitsPage() {
  const { user: me } = useAuth();
  const { toast, confirm } = useNotify();
  const isOwner = me?.role === "owner";

  const [policies, setPolicies] = useState<RateLimitPolicyInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [auto, setAuto] = useState(true);

  // Inline edit state
  const [editingCode, setEditingCode] = useState<string | null>(null);
  const [draftLimit, setDraftLimit] = useState("");
  const [draftWindow, setDraftWindow] = useState("");
  const [saving, setSaving] = useState(false);
  const busySeq = useRef(0); // guard overlapping enable/save toggles

  // Client drill-down state
  const [expanded, setExpanded] = useState<string | null>(null);
  const [clients, setClients] = useState<RateLimitPolicyClient[]>([]);
  const [clientsLoading, setClientsLoading] = useState(false);

  // Per-user lookup
  const [email, setEmail] = useState("");
  const [userRow, setUserRow] = useState<{ userId: number; rows: RateLimitUserRow[] } | null>(null);
  const [userLoading, setUserLoading] = useState(false);

  const loadOverview = useCallback(async (silent = false) => {
    if (!silent) setRefreshing(true);
    try {
      const res = await rateLimits.overview();
      setPolicies(res.data.policies);
      setError("");
    } catch (e) {
      if (!silent) setError(e instanceof Error ? e.message : "تعذّر تحميل حدود المعدل");
    } finally {
      if (!silent) setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void (async () => {
      // Non-silent: a first-load failure must surface as ErrorState. A silent
      // load would leave `error` empty and render the empty-policies state,
      // which is indistinguishable from a real outage (missing migration,
      // stale Prisma client, 403) and never self-corrects.
      await loadOverview();
      setLoading(false);
    })();
  }, [loadOverview]);

  // Gentle auto-refresh so the live counters stay current while the page is open.
  useEffect(() => {
    if (!auto) return;
    const t = setInterval(() => void loadOverview(true), 10000);
    return () => clearInterval(t);
  }, [auto, loadOverview]);

  const togglePolicy = async (p: RateLimitPolicyInfo) => {
    if (!isOwner || saving) return;
    const seq = ++busySeq.current;
    setSaving(true);
    try {
      await rateLimits.updatePolicy(p.code, { enabled: !p.enabled });
      toast(!p.enabled ? `تم تفعيل "${p.label}"` : `تم إيقاف "${p.label}" مؤقتًا`, !p.enabled ? "success" : "info");
      await loadOverview(true);
    } catch (e) {
      toast(e instanceof Error ? e.message : "تعذّر تحديث السياسة.", "error");
    } finally {
      if (seq === busySeq.current) setSaving(false);
    }
  };

  const startEdit = (p: RateLimitPolicyInfo) => {
    setEditingCode(p.code);
    setDraftLimit(String(p.limit));
    setDraftWindow(String(p.window_minutes));
  };

  const savePolicy = async (p: RateLimitPolicyInfo) => {
    const limit = Number(draftLimit);
    const windowMinutes = Number(draftWindow);
    if (!Number.isInteger(limit) || limit < 1) return toast("يجب أن يكون الحدّ عددًا صحيحًا موجبًا.", "error");
    if (!Number.isInteger(windowMinutes) || windowMinutes < 1) return toast("يجب أن تكون النافذة عددًا صحيحًا موجبًا من الدقائق.", "error");
    setSaving(true);
    try {
      await rateLimits.updatePolicy(p.code, { limit, window_minutes: windowMinutes });
      setEditingCode(null);
      toast(`تم تحديث "${p.label}"`, "success");
      await loadOverview(true);
    } catch (e) {
      toast(e instanceof Error ? e.message : "تعذّر حفظ السياسة.", "error");
    } finally {
      setSaving(false);
    }
  };

  const cancelEdit = () => {
    setEditingCode(null);
    setDraftLimit("");
    setDraftWindow("");
  };

  const resetPolicy = async (p: RateLimitPolicyInfo) => {
    const ok = await confirm({
      message: `إعادة تعيين كل العدّادات الجارية للسياسة ${p.label} (${p.code})؟`,
      confirmLabel: "إعادة تعيين السياسة",
      tone: "danger",
    });
    if (!ok) return;
    try {
      const res = await rateLimits.reset({ target: "policy", code: p.code });
      toast(`تم مسح ${count(res.data.cleared, COUNTERS)}.`, "success");
      await loadOverview(true);
    } catch (e) {
      toast(e instanceof Error ? e.message : "تعذّرت إعادة التعيين.", "error");
    }
  };

  const resetAll = async () => {
    if (!isOwner) return;
    const ok = await confirm({
      message: "إعادة تعيين كل عدّادات حدود المعدل على المنصة (جميع السياسات، جميع المستخدمين وعناوين IP)؟",
      confirmLabel: "إعادة تعيين الكل",
      tone: "danger",
    });
    if (!ok) return;
    try {
      const res = await rateLimits.reset({ target: "all" });
      toast(`تم مسح ${count(res.data.cleared, COUNTERS)}.`, "success");
      await loadOverview(true);
    } catch (e) {
      toast(e instanceof Error ? e.message : "تعذّرت إعادة التعيين.", "error");
    }
  };

  const toggleClients = async (code: string) => {
    if (expanded === code) {
      setExpanded(null);
      setClients([]);
      return;
    }
    setExpanded(code);
    setClientsLoading(true);
    try {
      const res = await rateLimits.policyClients(code);
      setClients(res.data.clients);
    } catch (e) {
      setClients([]);
      toast(e instanceof Error ? e.message : "تعذّر تحميل العملاء.", "error");
    } finally {
      setClientsLoading(false);
    }
  };

  const resetClient = async (c: RateLimitPolicyClient) => {
    const ok = await confirm({
      message: `إعادة تعيين عدّادات حدود المعدل لهذا ${c.kind === "user" ? "المستخدم" : "عنوان IP"} (${c.identifier}) على السياسة ${expanded}؟`,
      confirmLabel: "إعادة تعيين",
      tone: "danger",
    });
    if (!ok) return;
    try {
      const target = c.kind === "user" ? "user" : "ip";
      const res = await rateLimits.reset({ target, id: c.kind === "user" ? Number(c.identifier) : c.identifier });
      toast(`تم مسح ${count(res.data.cleared, COUNTERS)}.`, "success");
      await toggleClients(expanded as string);
    } catch (e) {
      toast(e instanceof Error ? e.message : "تعذّرت إعادة التعيين.", "error");
    }
  };

  const lookupUser = async () => {
    const em = email.trim();
    if (!em) return;
    setUserLoading(true);
    try {
      const res = await rateLimits.userUsageByEmail(em);
      setUserRow({ userId: res.data.userId, rows: res.data.rows });
    } catch (e) {
      setUserRow(null);
      toast(e instanceof Error ? e.message : "لم يتم العثور على المستخدم.", "error");
    } finally {
      setUserLoading(false);
    }
  };

  const resetUser = async () => {
    if (!userRow) return;
    const ok = await confirm({
      message: `إعادة تعيين كل عدّادات حدود المعدل للمستخدم ${email.trim()} (المعرّف ${userRow.userId})؟`,
      confirmLabel: "إعادة تعيين المستخدم",
      tone: "danger",
    });
    if (!ok) return;
    try {
      const res = await rateLimits.reset({ target: "user", id: userRow.userId });
      toast(`تم مسح ${count(res.data.cleared, COUNTERS)}.`, "success");
      await lookupUser();
    } catch (e) {
      toast(e instanceof Error ? e.message : "تعذّرت إعادة التعيين.", "error");
    }
  };

  const statRows = policies.reduce(
    (acc, p) => {
      acc.policies++;
      if (p.enabled) acc.enabled++;
      acc.hits += p.usage.hits;
      acc.blocked += p.usage.blocked;
      return acc;
    },
    { policies: 0, enabled: 0, hits: 0, blocked: 0 }
  );

  return (
    <div>
      <PageHeader
        title="حدود المعدل"
        subtitle="حدود الطلبات القابلة للضبط من المالك. تُطبَّق التعديلات خلال ٣ ثوانٍ تقريبًا — دون حاجة إلى إعادة نشر. القيم الافتراضية مطابقة لما كان التطبيق يفرضه قبل هذه اللوحة."
        actions={
          <>
            <label className="flex items-center gap-2 text-[13px] text-sutra-ink-2 cursor-pointer select-none">
              <input type="checkbox" checked={auto} onChange={(e) => setAuto(e.target.checked)} className="accent-[#1E3A8A] w-3.5 h-3.5" />
              تحديث تلقائي
            </label>
            <button
              onClick={() => loadOverview()}
              disabled={refreshing}
              className="inline-flex items-center gap-1.5 h-[38px] px-4 rounded-xl border border-sutra-line bg-white text-[13px] font-semibold text-sutra-ink hover:border-focus transition-colors disabled:opacity-60"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                <path d="M21 12a9 9 0 1 1-2.64-6.36" />
                <path d="M21 3v6h-6" />
              </svg>
              {refreshing ? "جارٍ التحديث…" : "تحديث"}
            </button>
            {isOwner && (
              <button
                onClick={resetAll}
                className="inline-flex items-center gap-1.5 h-[38px] px-4 rounded-xl bg-red-700 text-white text-[13px] font-semibold hover:bg-red-800 transition-colors"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                  <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                  <path d="M3 3v5h5" />
                </svg>
                إعادة تعيين الكل
              </button>
            )}
          </>
        }
      />

      {error && !loading && <div className="mb-5"><ErrorState title="تعذّر تحميل حدود المعدل" message={error} onRetry={() => loadOverview()} /></div>}

      {loading ? (
        <div className="bg-white border border-sutra-line rounded-xl p-10 text-center text-[14px] text-sutra-ink-3">جارٍ تحميل السياسات…</div>
      ) : policies.length === 0 ? (
        <EmptyState title="لا توجد سياسات لحدود المعدل" description="تُسجَّل كل سياسة عند بدء الخادم. إذا بقي هذا القسم فارغًا، فذلك يعني أن الواجهة الخلفية لم تتمكن من الوصول إلى قاعدة بياناتها — أعد تحميل الصفحة، وتحقق من سجل الخادم بحثًا عن فشل في التسجيل المسبق." />
      ) : (
        <div className="space-y-5">
          {/* Top stat cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <StatCard label="السياسات" value={statRows.policies} hint={`${n(statRows.enabled)} مفعّلة · ${n(statRows.policies - statRows.enabled)} متوقفة`} tone="navy" />
            <StatCard label="الطلبات (النافذة)" value={n(statRows.hits)} hint="الطلبات الجارية عبر السياسات المفعّلة" tone="blue" />
            <StatCard label="المحجوبة (429)" value={n(statRows.blocked)} hint="الطلبات المرفوضة في هذه النافذة" tone="red" />
          </div>

          {/* Policy rows */}
          <div className="bg-white border border-sutra-line rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-start border-collapse">
                <thead>
                  <tr className="border-b border-sutra-line bg-sutra-bg/60">
                    <Th className="w-[34%]">السياسة</Th>
                    <Th>المعدل</Th>
                    <Th>النافذة</Th>
                    <Th>الاستخدام الآن</Th>
                    <Th>المحجوبة</Th>
                    <Th>الحالة</Th>
                    <Th className="text-end">الإجراءات</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-sutra-line">
                  {policies.map((p) => {
                    const editing = editingCode === p.code;
                    return (
                      <Fragment key={p.code}>
                        <tr className="hover:bg-sutra-bg/40 transition-colors align-top">
                          <Td>
                            <div className="flex items-start gap-2">
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-semibold text-sutra-ink text-[13.5px]">{p.label}</span>
                                  <KindBadge kind={p.kind} />
                                  {p.kind === "specific" && p.path && (
                                    <code className="text-[10.5px] text-sutra-ink-3 bg-sutra-bg border border-sutra-line px-1.5 py-0.5 rounded"><Ltr>{p.method} {p.path}</Ltr></code>
                                  )}
                                </div>
                                {p.description && <p className="text-[12px] text-sutra-ink-3 mt-0.5">{p.description}</p>}
                                <code className="text-[10.5px] text-navy/70 font-mono"><Ltr>{p.code}</Ltr></code>
                              </div>
                            </div>
                          </Td>
                          <Td>
                            {editing && isOwner ? (
                              <div className="flex flex-col gap-1.5 w-[150px]">
                                <input
                                  type="number"
                                  min={1}
                                  value={draftLimit}
                                  onChange={(e) => setDraftLimit(e.target.value)}
                                  className="h-8 w-full rounded-lg border border-sutra-line px-2 text-[13px] tabular-nums outline-none focus:border-focus"
                                  aria-label="الطلبات لكل نافذة"
                                />
                                <span className="text-[10.5px] text-sutra-ink-3 px-0.5">طلبات لكل نافذة</span>
                              </div>
                            ) : (
                              <span className="text-[13.5px] font-semibold tabular-nums text-sutra-ink">{n(p.limit)}</span>
                            )}
                          </Td>
                          <Td>
                            {editing && isOwner ? (
                              <div className="flex flex-col gap-1.5 w-[150px]">
                                <input
                                  type="number"
                                  min={1}
                                  value={draftWindow}
                                  onChange={(e) => setDraftWindow(e.target.value)}
                                  className="h-8 w-full rounded-lg border border-sutra-line px-2 text-[13px] tabular-nums outline-none focus:border-focus"
                                  aria-label="دقائق النافذة"
                                />
                                <span className="text-[10.5px] text-sutra-ink-3 px-0.5">دقائق لكل نافذة</span>
                              </div>
                            ) : (
                              <span className="text-[13px] text-sutra-ink-2 whitespace-nowrap">{fmtWindow(p.window_minutes)}</span>
                            )}
                          </Td>
                          <Td>
                            <UsageBar policy={p} />
                            {p.usage.resetInSeconds != null && (
                              <p className="text-[10.5px] text-sutra-ink-3 mt-1 whitespace-nowrap">يُعاد التعيين بعد {duration(p.usage.resetInSeconds)}</p>
                            )}
                          </Td>
                          <Td>
                            {p.usage.blocked > 0 ? (
                              <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-red-600">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5"><path d="M12 3l8 4v5c0 5-3.5 8-8 9-4.5-1-8-4-8-9V7z" /></svg>
                                {n(p.usage.blocked)}
                              </span>
                            ) : (
                              <span className="text-[12px] text-sutra-ink-3">—</span>
                            )}
                          </Td>
                          <Td>
                            {isOwner ? (
                              <button
                                onClick={() => togglePolicy(p)}
                                disabled={saving}
                                className={`inline-flex items-center gap-1.5 text-[11.5px] font-semibold px-2.5 h-7 rounded-lg border transition-colors disabled:opacity-60 ${
                                  p.enabled
                                    ? "text-green-700 border-green-200 bg-green-50 hover:bg-green-100"
                                    : "text-sutra-ink-3 border-sutra-line bg-sutra-bg hover:bg-sutra-line"
                                }`}
                                title={p.enabled ? "اضغط لإيقاف هذه السياسة مؤقتًا" : "اضغط لتفعيل هذه السياسة"}
                              >
                                <span className={`w-1.5 h-1.5 rounded-full ${p.enabled ? "bg-green-500" : "bg-sutra-ink-3"}`} />
                                {p.enabled ? "مفعّلة" : "متوقفة"}
                              </button>
                            ) : (
                              <span className={`inline-flex items-center gap-1.5 text-[11.5px] font-semibold px-2.5 h-7 rounded-lg border ${p.enabled ? "text-green-700 border-green-200 bg-green-50" : "text-sutra-ink-3 border-sutra-line bg-sutra-bg"}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${p.enabled ? "bg-green-500" : "bg-sutra-ink-3"}`} />
                                {p.enabled ? "مفعّلة" : "متوقفة"}
                              </span>
                            )}
                          </Td>
                          <Td>
                            <div className="flex items-center justify-end gap-1.5 flex-wrap">
                              {editing && isOwner ? (
                                <>
                                  <button
                                    onClick={() => savePolicy(p)}
                                    disabled={saving}
                                    className="inline-flex items-center h-7 px-2.5 rounded-lg bg-navy text-white text-[11.5px] font-semibold hover:opacity-90 transition-opacity disabled:opacity-60"
                                  >
                                    {saving ? "جارٍ الحفظ…" : "حفظ"}
                                  </button>
                                  <button
                                    onClick={cancelEdit}
                                    className="inline-flex items-center h-7 px-2.5 rounded-lg border border-sutra-line text-[11.5px] font-semibold text-sutra-ink-2 hover:bg-sutra-bg transition-colors"
                                  >
                                    إلغاء
                                  </button>
                                </>
                              ) : (
                                isOwner && (
                                  <button
                                    onClick={() => startEdit(p)}
                                    className="inline-flex items-center gap-1 h-7 px-2.5 rounded-lg border border-sutra-line text-[11.5px] font-semibold text-sutra-ink-2 hover:border-focus hover:text-sutra-ink transition-colors"
                                  >
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" /></svg>
                                    تعديل
                                  </button>
                                )
                              )}
                              <button
                                onClick={() => resetPolicy(p)}
                                title="إعادة تعيين العدّادات الجارية لهذه السياسة"
                                className="inline-flex items-center gap-1 h-7 px-2.5 rounded-lg border border-sutra-line text-[11.5px] font-semibold text-sutra-ink-2 hover:border-red-200 hover:text-red-600 transition-colors"
                              >
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /></svg>
                                إعادة تعيين
                              </button>
                              <button
                                onClick={() => toggleClients(p.code)}
                                className={`inline-flex items-center gap-1 h-7 px-2.5 rounded-lg text-[11.5px] font-semibold transition-colors ${
                                  expanded === p.code ? "bg-tint text-navy" : "border border-sutra-line text-sutra-ink-2 hover:border-focus hover:text-sutra-ink"
                                }`}
                              >
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
                                العملاء
                              </button>
                            </div>
                          </Td>
                        </tr>

                        {expanded === p.code && (
                          <tr>
                            <td colSpan={7} className="px-4 pb-4 bg-sutra-bg/40">
                              <div className="rounded-xl border border-sutra-line bg-white overflow-hidden">
                                {clientsLoading ? (
                                  <p className="p-6 text-center text-[13px] text-sutra-ink-3">جارٍ تحميل أكثر المستهلكين…</p>
                                ) : clients.length === 0 ? (
                                  <p className="p-6 text-center text-[13px] text-sutra-ink-3">
                                    لا توجد عدّادات جارية في هذه النافذة بعد. يظهر المستخدمون وعناوين IP هنا فور تسجيلهم طلبات على <Ltr>{p.code}</Ltr>.
                                  </p>
                                ) : (
                                  <table className="w-full text-start">
                                    <thead>
                                      <tr className="border-b border-sutra-line bg-sutra-bg/60">
                                        <Th>المعرّف</Th>
                                        <Th>النوع</Th>
                                        <Th className="text-end">الطلبات</Th>
                                        <Th>يُعاد التعيين بعد</Th>
                                        <Th className="text-end">الإجراء</Th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-sutra-line">
                                      {clients.map((c) => (
                                        <tr key={`${c.kind}:${c.identifier}`} className="hover:bg-sutra-bg/40 transition-colors">
                                          <Td><code className="text-[12.5px] font-mono text-sutra-ink"><Ltr className="inline-block">{c.identifier}</Ltr></code></Td>
                                          <Td>
                                            <span className={`inline-flex text-[10.5px] font-semibold px-2 py-0.5 rounded-md ${
                                              c.kind === "user" ? "bg-tint text-navy border border-tint-2" : "bg-sutra-bg text-sutra-ink-2 border border-sutra-line"
                                            }`}>
                                              {c.kind === "user" ? "مستخدم" : <Ltr className="inline-block">IP</Ltr>}
                                            </span>
                                          </Td>
                                          <Td className="text-end tabular-nums font-semibold text-sutra-ink">{n(c.hits)}</Td>
                                          <Td className="text-sutra-ink-2 text-[13px]">{c.resetInSeconds != null ? duration(c.resetInSeconds) : "—"}</Td>
                                          <Td className="text-end">
                                            {isOwner && (
                                              <button
                                                onClick={() => resetClient(c)}
                                                className="text-[11.5px] font-semibold text-red-600 hover:text-red-700 hover:underline"
                                              >
                                                {c.kind === "user" ? "إعادة تعيين المستخدم" : "إعادة تعيين عنوان IP"}
                                              </button>
                                            )}
                                          </Td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Per-user drill-down */}
          <div className="bg-white border border-sutra-line rounded-xl p-5">
            <h2 className="text-[15px] font-bold text-sutra-ink mb-1">مستخدم واحد</h2>
            <p className="text-[12.5px] text-sutra-ink-3 mb-4">ابحث عن العدّادات الجارية لمستخدم واحد عبر جميع السياسات باستخدام البريد الإلكتروني.</p>
            <div className="flex items-center gap-2 max-w-xl">
              <div className="flex-1">
                <SearchInput value={email} onChange={setEmail} placeholder="user@example.com" />
              </div>
              <button
                onClick={lookupUser}
                disabled={userLoading || !email.trim()}
                className="inline-flex items-center h-[42px] px-4 rounded-xl bg-navy text-white text-[13px] font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {userLoading ? "جارٍ البحث…" : "بحث"}
              </button>
            </div>

            {userRow && (
              <div className="mt-5">
                {userRow.rows.every((r) => r.hits === 0) ? (
                  <p className="text-[13px] text-sutra-ink-3">لا توجد عدّادات جارية لهذا المستخدم الآن.</p>
                ) : (
                  <div className="rounded-xl border border-sutra-line overflow-x-auto">
                    <table className="w-full text-start">
                      <thead>
                        <tr className="border-b border-sutra-line bg-sutra-bg/60">
                          <Th>السياسة</Th>
                          <Th className="text-end">الطلبات</Th>
                          <Th className="text-end">الحدّ</Th>
                          <Th className="text-end">النافذة</Th>
                          <Th>يُعاد التعيين بعد</Th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-sutra-line">
                        {userRow.rows
                          .filter((r) => r.hits > 0)
                          .map((r) => (
                            <tr key={r.code} className="hover:bg-sutra-bg/40 transition-colors">
                              <Td>
                                <span className="text-[13px] font-medium text-sutra-ink">{r.label}</span>
                                <code className="ms-2 text-[10.5px] text-navy/70 font-mono"><Ltr>{r.code}</Ltr></code>
                              </Td>
                              <Td className="text-end tabular-nums font-semibold text-sutra-ink">{n(r.hits)}</Td>
                              <Td className="text-end tabular-nums text-sutra-ink-2">{n(r.limit)}</Td>
                              <Td className="text-end text-sutra-ink-2 whitespace-nowrap">{fmtWindow(r.window_minutes)}</Td>
                              <Td className="text-sutra-ink-2 text-[13px]">{r.resetInSeconds != null ? duration(r.resetInSeconds) : "—"}</Td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                )}
                {isOwner && (
                  <button
                    onClick={resetUser}
                    className="mt-4 inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg border border-red-200 text-red-700 text-[12.5px] font-semibold hover:bg-red-50 transition-colors"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /></svg>
                    إعادة تعيين كل العدّادات لهذا المستخدم
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
