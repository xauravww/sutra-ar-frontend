"use client";

import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import {
  aiUsage,
  type AiUsageSummary,
  type AiUserUsageRow,
  type AiResourceUsageRow,
  type AiUsageRange,
  type AiUsageConfig,
  type AiBudgetInfo,
  type AiModelPrice,
} from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useNotify } from "@/components/ui/Notify";
import {
  PageHeader,
  StatCard,
  EmptyState,
  ErrorState,
  FilterSelect,
  Th,
  Td,
} from "@/components/admin/ui";
import { compact, count, date, money, monthShort, n, percent, time, UNITS, weekday } from "@/lib/num";
import Ltr from "@/components/Ltr";

/* ------------------------------------------------------------------ */
/*  Display helpers                                                     */
/* ------------------------------------------------------------------ */

const RANGE_OPTIONS: Array<{ value: AiUsageRange; label: string }> = [
  { value: "day", label: "اليوم" },
  { value: "week", label: "آخر ٧ أيام" },
  { value: "month", label: "هذا الشهر" },
  { value: "year", label: "هذه السنة" },
  { value: "all", label: "كل الفترات" },
];

const FEATURE_LABELS: Record<string, string> = {
  ai_gateway: "بوابة الذكاء الاصطناعي",
  judicial_chat: "المحادثة القضائية",
  judicial_structure_extract: "استخراج الهيكل القضائي",
  judicial_page_summary: "ملخص الصفحة القضائية",
  defence_draft: "مسودة الدفاع",
  officer_chat: "محادثة الموظف",
  translation: "الترجمة",
  legal_draft_translation: "ترجمة المسودة القانونية",
  document_classification: "تصنيف المستندات",
  case_questions: "أسئلة القضية",
  draft_inline_edit: "التحرير المضمّن للمسودة",
  mediation_smart_fill: "التعبئة الذكية للوساطة",
  mediation_doc_classify: "تصنيف مستندات الوساطة",
  mediation_comparative_scan: "المسح المقارن للوساطة",
  mediation_chat: "محادثة الوساطة",
  corpus_intake: "استقبال المدوّنة",
  corpus_chat: "محادثة المدوّنة",
  corpus_rerank: "إعادة ترتيب المدوّنة",
  workspace_page_summary: "ملخص صفحة مساحة العمل",
};

const RESOURCE_TYPE_LABELS: Record<string, string> = {
  CASE: "قضية",
  JUDICIAL_CASE: "قضية قضائية",
  MEDIATION: "وساطة",
  DOCUMENT: "مستند",
  WORKSPACE: "مساحة عمل",
  CORPUS: "مدوّنة",
};

/**
 * AI spend. This one is genuinely USD: the per-model rates the usage table is
 * priced against are OpenAI's published dollar prices, not the plan currency
 * in `@/lib/currency`.
 */
function fmtMoney(v: number): string {
  const abs = Math.abs(v);
  const max = abs > 0 && abs < 1 ? 4 : 2;
  return money(v, "USD", max);
}

/** Compact token count: 1.2M, 340k, 9.1B. */
function fmtTokens(value: number): string {
  return compact(value);
}

/** Numeric input/output legs for a stored model price (plain number = both same). */
function priceLegNums(p: AiModelPrice | null | undefined): { input: number; output: number } {
  if (typeof p === "number") return { input: p, output: p };
  if (p && typeof p === "object") {
    return { input: Number(p.input) || 0, output: Number(p.output) || 0 };
  }
  return { input: 0, output: 0 };
}

/** String legs for the editor (keeps truly-absent values blank). */
function priceLegStrings(p: AiModelPrice | null | undefined): { input: string; output: string } {
  if (typeof p === "number") return { input: String(p), output: String(p) };
  if (p && typeof p === "object") {
    return {
      input: typeof p.input === "number" ? String(p.input) : "",
      output: typeof p.output === "number" ? String(p.output) : "",
    };
  }
  return { input: "", output: "" };
}

/** Untaught codes fall through as the raw code rather than Title Case English. */
function featLabel(feature: string): string {
  return FEATURE_LABELS[feature] ?? feature;
}

function typeLabel(t: string): string {
  return RESOURCE_TYPE_LABELS[t] ?? t;
}

const SOURCE_META: Record<AiBudgetInfo["source"], { label: string; cls: string }> = {
  owner: { label: "حُدّد من المالك", cls: "bg-navy text-white" },
  plan: { label: "من الباقة", cls: "bg-tint text-navy border border-tint-2" },
  default: { label: "افتراضي", cls: "bg-tint text-navy border border-tint-2" },
  none: { label: "غير محدود", cls: "bg-sutra-line-2 text-sutra-ink-3" },
};

function SourceChip({ source }: { source: AiBudgetInfo["source"] }) {
  const m = SOURCE_META[source];
  return (
    <span className={`inline-flex items-center text-[11px] font-semibold px-2 py-0.5 rounded-md whitespace-nowrap ${m.cls}`}>
      {m.label}
    </span>
  );
}

/** Compact CSS bar chart of spend across the selected window. */
function SpendBars({ points }: { points: Array<{ label: string; value: number }> }) {
  if (points.length === 0) return <p className="text-[13px] text-sutra-ink-3 py-2">لا توجد تكلفة للذكاء الاصطناعي في هذه النافذة.</p>;
  const max = Math.max(1, ...points.map((p) => p.value));
  return (
    <div className="flex items-end gap-1 sm:gap-1.5 h-32 overflow-x-auto pb-1">
      {points.map((p) => {
        const isMax = p.value === max;
        return (
          <div key={p.label} className="flex-1 min-w-[14px] flex flex-col items-center gap-1 group" title={`${p.label}: ${fmtMoney(p.value)}`}>
            <div
              className={`w-full max-w-[26px] mx-auto rounded-t-[4px] bg-gradient-to-t from-[#1E3A8A] to-[#3B76D6] transition-opacity group-hover:opacity-80 ${isMax ? "" : "opacity-80"}`}
              style={{ height: `${Math.max(4, (p.value / max) * 100)}px` }}
            />
            <span className="text-[9.5px] text-sutra-ink-3 truncate max-w-[52px]">{p.label}</span>
          </div>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function AdminAiUsagePage() {
  const { user: me } = useAuth();
  const { toast, confirm } = useNotify();
  const isOwner = me?.role === "owner";

  const [range, setRange] = useState<AiUsageRange>("month");
  const [resType, setResType] = useState("");

  const [summary, setSummary] = useState<AiUsageSummary | null>(null);
  const [users, setUsers] = useState<AiUserUsageRow[]>([]);
  const [resources, setResources] = useState<AiResourceUsageRow[]>([]);
  /** Every resource type seen so far — keeps the filter dropdown intact while one type is active. */
  const [typeCatalog, setTypeCatalog] = useState<string[]>([]);
  const [config, setConfig] = useState<AiUsageConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [loadingResources, setLoadingResources] = useState(false);

  // Budget editing state
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draftBudget, setDraftBudget] = useState("");
  const [savingBudget, setSavingBudget] = useState(false);

  // Config editing state
  const [cfgEditing, setCfgEditing] = useState(false);
  const [defaultBudgetDraft, setDefaultBudgetDraft] = useState("");
  const [priceRows, setPriceRows] = useState<Array<{ key: number; model: string; input: string; output: string }>>([]);
  const priceSeq = useRef(0);
  const [savingCfg, setSavingCfg] = useState(false);

  const loadSummary = useCallback(
    (r: AiUsageRange) =>
      aiUsage
        .summary(r)
        .then((res) => {
          setSummary(res.data);
          setError("");
        })
        .catch((e) => setError(e instanceof Error ? e.message : "تعذّر تحميل الاستخدام")),
    []
  );

  const loadUsers = useCallback(
    (r: AiUsageRange) =>
      aiUsage.users(r).then((res) => setUsers(res.data)).catch(() => setUsers([])),
    []
  );

  const loadResources = useCallback(
    (r: AiUsageRange, t: string) => {
      setLoadingResources(true);
      return aiUsage
        .resources(r, t || undefined)
        .then((res) => {
          setResources(res.data);
          setTypeCatalog((prev) => Array.from(new Set([...prev, ...res.data.map((x) => x.resource_type)])));
        })
        .catch(() => setResources([]))
        .finally(() => setLoadingResources(false));
    },
    []
  );

  const loadConfig = useCallback(() => {
    aiUsage
      .config()
      .then((res) => {
        setConfig(res.data);
        setDefaultBudgetDraft(res.data.default_budget_usd == null ? "" : String(res.data.default_budget_usd));
      })
      .catch(() => setConfig(null));
  }, []);

  useEffect(() => {
    setLoading(true);
    Promise.all([loadSummary(range), loadUsers(range), loadResources(range, "")])
      .catch(() => undefined)
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range]);

  useEffect(() => {
    loadResources(range, resType);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resType]);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  const changeRange = (v: string) => {
    setRange(v as AiUsageRange);
    setResType("");
  };

  const retry = () => {
    loadSummary(range);
    loadUsers(range);
    loadResources(range, resType);
  };

  const totals = summary?.totals;
  const seriesPoints = (summary?.series ?? [])
    .map((s) => ({
      label: bucketLabel(s.bucket, range),
      value: s.cost_usd,
    }))
    .filter((p) => p.value > 0 || p.label);
  // Cap the bar count so very long "all time" windows stay legible.
  const chartPoints = seriesPoints.length > 28 ? seriesPoints.slice(-28) : seriesPoints;

  const featureRows = summary?.features ?? [];
  const filterableTypes = resType ? [resType, ...typeCatalog.filter((t) => t !== resType)] : typeCatalog;

  /* ---- Budget actions ---- */
  const startEditBudget = (row: AiUserUsageRow) => {
    setEditingId(row.user_id);
    setDraftBudget(row.budget.override_monthly_limit_usd != null
      ? String(row.budget.override_monthly_limit_usd)
      : row.budget.limit_usd != null
        ? String(row.budget.limit_usd)
        : "");
  };

  const cancelEditBudget = () => {
    setEditingId(null);
    setDraftBudget("");
  };

  const saveBudget = async (userId: number) => {
    const amount = Number(draftBudget);
    if (!Number.isFinite(amount) || amount < 0) {
      toast("أدخل مبلغًا بالدولار غير سالب.", "error");
      return;
    }
    setSavingBudget(true);
    try {
      await aiUsage.setBudget(userId, amount);
      toast("تم حفظ الميزانية.", "success");
      cancelEditBudget();
      loadUsers(range);
    } catch (e) {
      toast(e instanceof Error ? e.message : "تعذّر حفظ الميزانية.", "error");
    } finally {
      setSavingBudget(false);
    }
  };

  const clearBudget = async (row: AiUserUsageRow) => {
    const ok = await confirm({
      title: `إزالة التجاوز الخاص بالمستخدم ${row.name}`,
      message: "سيعود هذا المستخدم إلى ميزانية الذكاء الاصطناعي الافتراضية (أو إلى باقته عندما تتضمن الباقات ميزانية).",
      confirmLabel: "إزالة التجاوز",
      tone: "danger",
    });
    if (!ok) return;
    try {
      await aiUsage.deleteBudget(row.user_id);
      toast("تمت إزالة التجاوز.", "success");
      loadUsers(range);
    } catch (e) {
      toast(e instanceof Error ? e.message : "تعذّرت إزالة التجاوز.", "error");
    }
  };

  /* ---- Config actions (owner) ---- */
  const openConfigEditor = () => {
    if (!config) return;
    setDefaultBudgetDraft(config.default_budget_usd == null ? "" : String(config.default_budget_usd));
    const rows = Object.entries(config.model_prices ?? {}).map(([model, price]) => ({
      key: ++priceSeq.current,
      model,
      ...priceLegStrings(price),
    }));
    if (rows.length === 0) rows.push({ key: ++priceSeq.current, model: "", input: "", output: "" });
    setPriceRows(rows);
    setCfgEditing(true);
  };

  const addPriceRow = () => setPriceRows((r) => [...r, { key: ++priceSeq.current, model: "", input: "", output: "" }]);

  const patchPriceRow = (key: number, patch: Partial<{ model: string; input: string; output: string }>) =>
    setPriceRows((r) => r.map((row) => (row.key === key ? { ...row, ...patch } : row)));

  const removePriceRow = (key: number) =>
    setPriceRows((r) => {
      const next = r.filter((row) => row.key !== key);
      return next.length === 0 ? [{ key: ++priceSeq.current, model: "", input: "", output: "" }] : next;
    });

  const saveConfig = async () => {
    const payload: { default_budget_usd?: number; model_prices?: Record<string, AiModelPrice> } = {};
    if (defaultBudgetDraft.trim() !== "") {
      const amount = Number(defaultBudgetDraft);
      if (!Number.isFinite(amount) || amount < 0) {
        toast("يجب أن تكون الميزانية الافتراضية رقمًا غير سالب.", "error");
        return;
      }
      payload.default_budget_usd = amount;
    }
    const prices: Record<string, AiModelPrice> = {};
    const seen = new Set<string>();
    for (const row of priceRows) {
      const model = row.model.trim();
      if (!model) {
        toast("يحتاج كل صف نموذج إلى اسم نموذج.", "error");
        return;
      }
      if (seen.has(model)) {
        toast(`نموذج مكرر: ${model}`, "error");
        return;
      }
      seen.add(model);
      const input = Number(row.input);
      const output = Number(row.output);
      if (!Number.isFinite(input) || input < 0 || row.input.trim() === "") {
        toast(`يجب أن يكون سعر الإدخال للنموذج "${model}" رقمًا غير سالب.`, "error");
        return;
      }
      if (!Number.isFinite(output) || output < 0 || row.output.trim() === "") {
        toast(`يجب أن يكون سعر الإخراج للنموذج "${model}" رقمًا غير سالب.`, "error");
        return;
      }
      prices[model] = { input, output };
    }
    payload.model_prices = prices;
    setSavingCfg(true);
    try {
      await aiUsage.updateConfig(payload);
      toast("تم حفظ الإعدادات.", "success");
      setCfgEditing(false);
      loadConfig();
      loadSummary(range);
      loadUsers(range);
    } catch (e) {
      toast(e instanceof Error ? e.message : "تعذّر حفظ الإعدادات.", "error");
    } finally {
      setSavingCfg(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="استخدام الذكاء الاصطناعي والتكلفة"
        subtitle={
          summary
            ? `${rangeTitle(range)} · ${count(totals?.calls ?? 0, UNITS.call)} · ابتداءً من ${date(summary.window_start)}`
            : "تابع الرموز المستهلكة والتكلفة لكل مستخدم وميزة وقضية"
        }
        actions={
          <FilterSelect
            value={range}
            onChange={changeRange}
            options={RANGE_OPTIONS}
            aria-label="نافذة الاستخدام"
          />
        }
      />

      {error && !summary && <ErrorState title="تعذّر تحميل استخدام الذكاء الاصطناعي" message={error} onRetry={retry} />}

      {loading && !summary ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white border border-sutra-line rounded-xl p-5 h-28 animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          {/* Top stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
            <StatCard label="التكلفة" value={fmtMoney(totals?.cost_usd ?? 0)} hint={rangeHint(range)} tone="navy" />
            <StatCard label="طلبات الذكاء الاصطناعي" value={n(totals?.calls ?? 0)} hint={`متوسط الطلب: ${(totals?.cost_usd ?? 0) > 0 ? fmtMoney((totals?.cost_usd ?? 0) / Math.max(1, totals?.calls ?? 1)) : "—"}`} tone="blue" />
            <StatCard label="الرموز" value={fmtTokens(totals?.total_tokens ?? 0)} hint={`إدخال ${fmtTokens(totals?.prompt_tokens ?? 0)} · إخراج ${fmtTokens(totals?.completion_tokens ?? 0)}`} tone="green" />
            <StatCard
              label="الميزانية الافتراضية / مستخدم"
              value={config?.default_budget_usd == null ? "غير محدود" : fmtMoney(config.default_budget_usd)}
              hint="لكل مستخدم، شهريًا"
              tone="amber"
            />
          </div>

          {/* Spend + features */}
          <div className="grid lg:grid-cols-3 gap-4 sm:gap-6 mb-6">
            <div className="lg:col-span-2 bg-white border border-sutra-line rounded-xl p-5">
              <h3 className="text-[15px] font-bold text-sutra-ink mb-4">تكلفة الذكاء الاصطناعي بمرور الوقت</h3>
              <SpendBars points={chartPoints} />
            </div>
            <div className="bg-white border border-sutra-line rounded-xl p-5">
              <h3 className="text-[15px] font-bold text-sutra-ink mb-4">حسب الميزة</h3>
              {featureRows.length === 0 ? (
                <p className="text-[13px] text-sutra-ink-3 py-2">لا يوجد استخدام بعد.</p>
              ) : (
                <ul className="divide-y divide-sutra-line-2">
                  {featureRows.slice(0, 8).map((f) => (
                    <li key={f.feature} className="py-2 flex items-center justify-between gap-3">
                      <span className="text-[12.5px] font-medium text-sutra-ink truncate">{featLabel(f.feature)}</span>
                      <span className="text-[12.5px] font-semibold text-sutra-ink-2 tabular-nums whitespace-nowrap">{fmtMoney(f.cost_usd)}</span>
                    </li>
                  ))}
                  {featureRows.length > 8 && (
                    <li className="py-2 text-[11.5px] text-sutra-ink-3">+{n(featureRows.length - 8)} ميزات أخرى</li>
                  )}
                </ul>
              )}
            </div>
          </div>

          {/* Per-user table */}
          <div className="bg-white border border-sutra-line rounded-xl overflow-hidden mb-6">
            <div className="px-5 py-4 border-b border-sutra-line-2 flex items-center justify-between gap-3 flex-wrap">
              <div>
                <h3 className="text-[15px] font-bold text-sutra-ink">الاستخدام حسب المستخدم</h3>
                <p className="text-[12px] text-sutra-ink-3 mt-0.5">تعكس التكلفة النافذة المحددة؛ والميزانية هي الحدّ الشهري.</p>
              </div>
            </div>
            {users.length === 0 ? (
              <div className="p-5">
                <EmptyState title="لا يوجد استخدام في هذه النافذة" description="يظهر المستخدمون هنا بعد إجراء أول طلب ذكاء اصطناعي." />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px]">
                  <thead className="border-b border-sutra-line-2 bg-sutra-bg/50">
                    <tr>
                      <Th>المستخدم</Th>
                      <Th className="text-end">الطلبات</Th>
                      <Th className="text-end">الرموز</Th>
                      <Th className="text-end">التكلفة</Th>
                      <Th>الميزانية الشهرية</Th>
                      {isOwner && <Th className="text-end">الإجراء</Th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-sutra-line-2">
                    {users.map((row) => {
                      const isEditing = editingId === row.user_id;
                      const limit = row.budget.limit_usd;
                      const usedPct = range === "month" && limit && limit > 0 ? (row.cost_usd / limit) * 100 : null;
                      return (
                        <tr key={row.user_id} className="hover:bg-sutra-bg/40 transition-colors">
                          <Td>
                            <div className="flex items-center gap-3 min-w-0">
                              <span className="w-9 h-9 rounded-full bg-navy text-white grid place-items-center font-bold text-[13px] flex-none">
                                {(row.name || row.email).charAt(0).toUpperCase()}
                              </span>
                              <div className="min-w-0">
                                <p className="text-[13.5px] font-semibold text-sutra-ink truncate">{row.name}</p>
                                <p className="text-[12px] text-sutra-ink-3 truncate"><Ltr className="inline-block">{row.email}</Ltr></p>
                              </div>
                            </div>
                          </Td>
                          <Td className="text-end tabular-nums text-sutra-ink-2 whitespace-nowrap">{n(row.calls)}</Td>
                          <Td className="text-end tabular-nums text-sutra-ink-2 whitespace-nowrap">{fmtTokens(row.total_tokens)}</Td>
                          <Td className="text-end tabular-nums font-semibold whitespace-nowrap">{fmtMoney(row.cost_usd)}</Td>
                          <Td>
                            {isEditing ? (
                              <div className="flex items-center gap-1.5">
                                <span className="text-[12.5px] text-sutra-ink-3">$</span>
                                <input
                                  autoFocus
                                  type="number"
                                  min={0}
                                  step="any"
                                  value={draftBudget}
                                  onChange={(e) => setDraftBudget(e.target.value)}
                                  placeholder="غير محدود"
                                  className="w-24 h-8 rounded-lg border border-sutra-line bg-white px-2 text-[13px] text-sutra-ink outline-none focus:border-navy"
                                />
                                <button
                                  onClick={() => saveBudget(row.user_id)}
                                  disabled={savingBudget}
                                  className="h-8 px-2.5 rounded-lg bg-navy text-white text-[12px] font-semibold disabled:opacity-50"
                                >
                                  حفظ
                                </button>
                                <button
                                  onClick={cancelEditBudget}
                                  className="h-8 px-2.5 rounded-lg border border-sutra-line text-[12px] font-semibold text-sutra-ink-2 hover:bg-sutra-bg"
                                >
                                  إلغاء
                                </button>
                              </div>
                            ) : (
                              <div className="min-w-[150px]">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-[13px] font-semibold tabular-nums">
                                    {limit == null ? "—" : fmtMoney(limit)}
                                  </span>
                                  <SourceChip source={row.budget.source} />
                                </div>
                                {usedPct != null && (
                                  <div className="mt-1.5 flex items-center gap-2">
                                    <div className="w-20 h-1.5 rounded-full bg-sutra-line-2 overflow-hidden">
                                      <div
                                        className={`h-full rounded-full ${usedPct >= 100 ? "bg-red-500" : usedPct >= 75 ? "bg-amber-dot" : "bg-emerald-500"}`}
                                        style={{ width: `${Math.min(100, usedPct)}%` }}
                                      />
                                    </div>
                                    <span className="text-[10.5px] text-sutra-ink-3 tabular-nums">مُستهلك {percent(usedPct)}</span>
                                  </div>
                                )}
                              </div>
                            )}
                          </Td>
                          {isOwner && (
                            <Td className="text-end">
                              {isEditing ? null : (
                                <div className="inline-flex gap-1.5">
                                  <button
                                    onClick={() => startEditBudget(row)}
                                    className="h-8 px-3 rounded-lg border border-navy bg-white text-navy text-[12px] font-bold hover:bg-navy hover:text-white transition-colors"
                                  >
                                    {row.budget.override_monthly_limit_usd != null ? "تعديل" : "تعيين"}
                                  </button>
                                  {row.budget.override_monthly_limit_usd != null && (
                                    <button
                                      onClick={() => clearBudget(row)}
                                      title="إزالة التجاوز — العودة إلى الافتراضي أو الباقة"
                                      className="h-8 px-3 rounded-lg border border-sutra-line text-[12px] font-semibold text-sutra-ink-3 hover:bg-red-50 hover:text-red-700 hover:border-red-200"
                                    >
                                      إعادة تعيين
                                    </button>
                                  )}
                                </div>
                              )}
                            </Td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Cost per matter */}
          <div className="bg-white border border-sutra-line rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-sutra-line-2 flex items-center justify-between gap-3 flex-wrap">
              <div>
                <h3 className="text-[15px] font-bold text-sutra-ink">التكلفة لكل قضية / مستند</h3>
                <p className="text-[12px] text-sutra-ink-3 mt-0.5">التكلفة مجمّعة حسب الملف لعرض تكلفة كل ملف.</p>
              </div>
              {filterableTypes.length > 1 && (
                <FilterSelect
                  value={resType}
                  onChange={(v) => setResType(v)}
                  options={filterableTypes.map((t) => ({ value: t, label: typeLabel(t) }))}
                  allLabel="كل الأنواع"
                  className="min-w-[160px]"
                />
              )}
            </div>
            {loadingResources ? (
              <div className="p-8 grid place-items-center">
                <div className="w-7 h-7 border-2 border-sutra-line-2 border-t-navy rounded-full animate-spin" />
              </div>
            ) : resources.length === 0 ? (
              <div className="p-5">
                <EmptyState title="لا يوجد استخدام مرتبط بملف" description="تظهر هنا فقط طلبات الذكاء الاصطناعي المرتبطة بقضية أو قضية قضائية أو جلسة وساطة." />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px]">
                  <thead className="border-b border-sutra-line-2 bg-sutra-bg/50">
                    <tr>
                      <Th>الملف</Th>
                      <Th className="text-end">الطلبات</Th>
                      <Th className="text-end">رموز الإدخال</Th>
                      <Th className="text-end">رموز الإخراج</Th>
                      <Th className="text-end">التكلفة</Th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-sutra-line-2">
                    {resources.slice(0, 100).map((r) => (
                      <tr key={`${r.resource_type}-${r.resource_id}`} className="hover:bg-sutra-bg/40 transition-colors">
                        <Td>
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="text-[12px] font-semibold text-navy bg-tint border border-tint-2 px-2 py-0.5 rounded-md whitespace-nowrap">
                              {typeLabel(r.resource_type)}
                            </span>
                            <span className="text-[13.5px] font-semibold text-sutra-ink tabular-nums"><Ltr className="inline-block">#{r.resource_id}</Ltr></span>
                          </div>
                        </Td>
                        <Td className="text-end tabular-nums text-sutra-ink-2 whitespace-nowrap">{n(r.calls)}</Td>
                        <Td className="text-end tabular-nums text-sutra-ink-3 whitespace-nowrap">{fmtTokens(r.prompt_tokens)}</Td>
                        <Td className="text-end tabular-nums text-sutra-ink-3 whitespace-nowrap">{fmtTokens(r.completion_tokens)}</Td>
                        <Td className="text-end tabular-nums font-semibold whitespace-nowrap">{fmtMoney(r.cost_usd)}</Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Owner config */}
          {isOwner && (
            <div className="bg-white border border-sutra-line rounded-xl p-5 mt-6">
              <div className="flex items-center justify-between gap-3 flex-wrap mb-1">
                <div>
                  <h3 className="text-[15px] font-bold text-sutra-ink">ميزانية الذكاء الاصطناعي والتسعير</h3>
                  <p className="text-[12px] text-sutra-ink-3 mt-0.5">
                    الميزانية الافتراضية بالدولار لكل مستخدم شهريًا، وجدول أسعار الرموز لكل نموذج
                    المستخدم في حساب التكلفة. المرحلة ١: التتبّع فقط — لا تُفرض الميزانيات حتى يتوفر
                    نظام الفوترة.
                  </p>
                </div>
                {!cfgEditing && (
                  <button
                    onClick={openConfigEditor}
                    className="h-9 px-4 rounded-lg border border-navy bg-white text-navy text-[13px] font-bold hover:bg-navy hover:text-white transition-colors"
                  >
                    تعديل
                  </button>
                )}
              </div>

              {cfgEditing ? (
                <div className="mt-4 grid lg:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-[13px] font-semibold text-sutra-ink-2 mb-1.5">
                      الميزانية الشهرية الافتراضية لكل مستخدم (دولار)
                    </label>
                    <input
                      type="number"
                      min={0}
                      step="any"
                      value={defaultBudgetDraft}
                      onChange={(e) => setDefaultBudgetDraft(e.target.value)}
                      placeholder="اتركه فارغًا لغير محدود"
                      className="w-full h-11 rounded-lg border border-sutra-line bg-white px-3.5 text-[14px] text-sutra-ink outline-none focus:border-navy"
                    />
                    <p className="mt-1.5 text-[12px] text-sutra-ink-3">
                      تركه فارغًا يعني عدم وجود قيمة افتراضية، فيصبح كل مستخدم غير محدود حتى تحدد
                      حدودًا لكل مستخدم أو تتضمن الباقات ميزانية.
                    </p>
                  </div>
                  <div>
                    <label className="block text-[13px] font-semibold text-sutra-ink-2 mb-2">
                      تسعير النماذج — دولار لكل مليون رمز
                    </label>
                    <div
                      className="grid gap-x-2 gap-y-2"
                      style={{ gridTemplateColumns: "minmax(0,1fr) 104px 104px 32px" }}
                    >
                      <span className="text-[10.5px] font-semibold uppercase text-sutra-ink-3">النموذج</span>
                      <span className="text-[10.5px] font-semibold uppercase text-sutra-ink-3">الإدخال (الطلب)</span>
                      <span className="text-[10.5px] font-semibold uppercase text-sutra-ink-3">الإخراج (الإجابة)</span>
                      <span />
                      {priceRows.map((row) => (
                        <Fragment key={row.key}>
                          <input
                            key={`${row.key}-model`}
                            value={row.model}
                            onChange={(e) => patchPriceRow(row.key, { model: e.target.value })}
                            placeholder="مثال: muse-pro-2.0"
                            className="min-w-0 h-10 rounded-lg border border-sutra-line bg-white px-3 text-[13px] text-sutra-ink outline-none focus:border-navy"
                          />
                          <input
                            key={`${row.key}-in`}
                            type="number"
                            min={0}
                            step="any"
                            value={row.input}
                            onChange={(e) => patchPriceRow(row.key, { input: e.target.value })}
                            placeholder="0.00"
                            className="w-full h-10 rounded-lg border border-sutra-line bg-white px-3 text-[13px] text-sutra-ink outline-none focus:border-navy"
                          />
                          <input
                            key={`${row.key}-out`}
                            type="number"
                            min={0}
                            step="any"
                            value={row.output}
                            onChange={(e) => patchPriceRow(row.key, { output: e.target.value })}
                            placeholder="0.00"
                            className="w-full h-10 rounded-lg border border-sutra-line bg-white px-3 text-[13px] text-sutra-ink outline-none focus:border-navy"
                          />
                          <button
                            key={`${row.key}-del`}
                            onClick={() => removePriceRow(row.key)}
                            title="إزالة النموذج"
                            aria-label="إزالة النموذج"
                            className="w-8 h-8 rounded-lg text-sutra-ink-3 hover:bg-red-50 hover:text-red-700 transition-colors grid place-items-center"
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-4 h-4">
                              <path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                              <path d="M10 11v6M14 11v6" />
                            </svg>
                          </button>
                        </Fragment>
                      ))}
                    </div>
                    <button
                      onClick={addPriceRow}
                      className="mt-2 inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-dashed border-sutra-line-2 text-[12.5px] font-semibold text-navy hover:bg-tint transition-colors"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-4 h-4">
                        <path d="M12 5v14M5 12h14" />
                      </svg>
                      إضافة نموذج
                    </button>
                    <p className="mt-2 text-[12px] text-sutra-ink-3">
                      الإدخال = رموز الطلب، والإخراج = الرموز المولّدة (تقسيم على نمط <Ltr>OpenAI</Ltr>).
                      النموذج بلا صف تكلفته ٠ دولار — ويجب أن يطابق الاسمُ النموذجَ الذي يستخدمه الخادم.
                    </p>
                  </div>
                  <div className="lg:col-span-2 flex items-center gap-3">
                    <button
                      onClick={saveConfig}
                      disabled={savingCfg}
                      className="h-10 px-5 rounded-lg bg-navy text-white text-[14px] font-semibold hover:bg-navy-dark transition-colors disabled:opacity-50"
                    >
                      {savingCfg ? "جارٍ الحفظ…" : "حفظ الإعدادات"}
                    </button>
                    <button
                      onClick={() => { setCfgEditing(false); loadConfig(); }}
                      className="h-10 px-5 rounded-lg border border-sutra-line bg-white text-[14px] font-semibold text-sutra-ink-2 hover:bg-tint transition-colors"
                    >
                      إلغاء
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mt-4 grid sm:grid-cols-2 gap-4">
                  <div className="bg-sutra-bg border border-sutra-line rounded-xl px-4 py-3">
                    <p className="text-[11.5px] font-semibold text-sutra-ink-3 uppercase">الميزانية الافتراضية</p>
                    <p className="mt-1 text-[18px] font-bold text-sutra-ink">
                      {config?.default_budget_usd == null ? "غير محدود" : fmtMoney(config.default_budget_usd)}
                      <span className="text-[12px] font-medium text-sutra-ink-3 ms-2">لكل مستخدم / شهريًا</span>
                    </p>
                  </div>
                  <div className="bg-sutra-bg border border-sutra-line rounded-xl px-4 py-3">
                    <p className="text-[11.5px] font-semibold text-sutra-ink-3 uppercase">تسعير النماذج</p>
                    {config?.model_prices && Object.keys(config.model_prices).length > 0 ? (
                      <>
                        {Object.entries(config.model_prices).slice(0, 6).map(([m, pr]) => {
                          const legs = priceLegNums(pr);
                          return (
                            <div key={m} className="mt-1.5 flex items-center justify-between gap-3 text-[12.5px]">
                              <span className="text-sutra-ink font-mono truncate"><Ltr>{m}</Ltr></span>
                              <span className="text-sutra-ink-2 font-semibold tabular-nums flex-none">
                                إدخال {fmtMoney(legs.input)} · إخراج {fmtMoney(legs.output)}
                              </span>
                            </div>
                          );
                        })}
                        {Object.keys(config.model_prices).length > 6 && (
                          <p className="mt-1.5 text-[11.5px] text-sutra-ink-3">
                            +{n(Object.keys(config.model_prices).length - 6)} نماذج أخرى
                          </p>
                        )}
                      </>
                    ) : (
                      <p className="mt-1 text-[13px] text-sutra-ink-3">
                        لا يوجد — تكلفة كل نموذج ٠ دولار حتى تضيف سعرًا.
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ---- helpers that need the range ---- */
function rangeTitle(range: AiUsageRange): string {
  return RANGE_OPTIONS.find((r) => r.value === range)?.label ?? "كل الفترات";
}

function rangeHint(range: AiUsageRange): string {
  return range === "month" ? "هذا الشهر" : rangeTitle(range);
}

function bucketLabel(iso: string, range: AiUsageRange): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  if (range === "day") return time(iso);
  if (range === "week") return weekday(iso);
  if (range === "month") return n(d.getDate());
  return monthShort(iso);
}
