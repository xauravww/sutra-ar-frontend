"use client";

import { useEffect, useRef, useState } from "react";
import type { ReactNode, SelectHTMLAttributes } from "react";
import Ltr from "@/components/Ltr";
import { count, n, UNITS } from "@/lib/num";

/* ------------------------------------------------------------------ */
/*  PageHeader                                                          */
/* ------------------------------------------------------------------ */

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="flex items-end justify-between gap-4 flex-wrap mb-6">
      <div>
        <h1 className="text-[22px] sm:text-[26px] font-bold leading-[1.12] text-sutra-ink">
          {title}
        </h1>
        {subtitle && <p className="mt-1 text-[14px] sm:text-[15px] text-sutra-ink-3">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 flex-none flex-wrap">{actions}</div>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  StatCard                                                            */
/* ------------------------------------------------------------------ */

export function StatCard({
  label,
  value,
  hint,
  tone = "navy",
  icon,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  tone?: "navy" | "green" | "amber" | "red" | "blue";
  icon?: ReactNode;
}) {
  const toneMap: Record<string, string> = {
    navy: "bg-tint text-navy border-tint-2",
    green: "bg-green-bg text-green-ink border-green-bg",
    amber: "bg-amber-bg text-amber-ink border-amber-bg",
    red: "bg-red-50 text-red-700 border-red-100",
    blue: "bg-blue-50 text-blue-700 border-blue-100",
  };
  return (
    <div className="bg-white border border-sutra-line rounded-xl p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[12px] sm:text-[13px] font-semibold text-sutra-ink-3">
            {label}
          </p>
          <p className="mt-1.5 text-[22px] sm:text-[28px] font-bold text-sutra-ink leading-none">
            {value}
          </p>
          {hint && <p className="mt-1.5 text-[12px] text-sutra-ink-3 truncate">{hint}</p>}
        </div>
        {icon && (
          <div className={`w-10 h-10 rounded-xl border grid place-items-center flex-none ${toneMap[tone]}`}>
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  SearchInput                                                         */
/* ------------------------------------------------------------------ */

export function SearchInput({
  value,
  onChange,
  placeholder,
  className = "",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <label
      className={`flex items-center gap-2 bg-white border border-sutra-line rounded-xl px-3 min-h-[42px] transition-all focus-within:border-focus focus-within:shadow-[0_0_0_3px_rgba(58,124,192,.12)] ${className}`}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="w-[18px] h-[18px] text-sutra-ink-3 flex-none">
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" />
      </svg>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="border-0 bg-transparent outline-none w-full font-[inherit] text-[14px] sm:text-[15px] text-sutra-ink placeholder:text-sutra-ink-3"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          title="مسح البحث"
          aria-label="مسح البحث"
          data-tap-compact
          className="h-6 w-6 rounded-full text-sutra-ink-3 grid place-items-center flex-none hover:bg-sutra-bg hover:text-sutra-ink transition-colors"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-[15px] h-[15px]">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      )}
    </label>
  );
}

/* ------------------------------------------------------------------ */
/*  FilterSelect                                                        */
/* ------------------------------------------------------------------ */

export function FilterSelect({
  value,
  onChange,
  options,
  allLabel,
  className = "",
}: {
  value: string;
  onChange: (v: string) => void;
  options: Array<{ value: string; label: string }>;
  allLabel?: string;
  className?: string;
} & Omit<SelectHTMLAttributes<HTMLSelectElement>, "value" | "onChange" | "children">) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`h-[42px] rounded-xl border border-sutra-line bg-white px-3 text-[14px] text-sutra-ink outline-none focus:border-focus cursor-pointer ${className}`}
    >
      {allLabel !== undefined && <option value="">{allLabel}</option>}
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

/* ------------------------------------------------------------------ */
/*  EmptyState                                                          */
/* ------------------------------------------------------------------ */

export function EmptyState({
  title,
  description,
  icon,
}: {
  title: string;
  description?: string;
  icon?: ReactNode;
}) {
  return (
    <div className="bg-white border border-sutra-line rounded-xl p-10 sm:p-14 text-center">
      <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-tint text-navy grid place-items-center mx-auto mb-4 border border-tint-2">
        {icon ?? (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 sm:w-6 sm:h-6">
            <path d="M3 7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <path d="M16 17h2" />
            <path d="M16 13h2" />
            <path d="M3 7 9 3h5l7 4" />
          </svg>
        )}
      </div>
      <p className="text-[15px] sm:text-[16px] font-semibold text-sutra-ink mb-1">{title}</p>
      {description && <p className="text-[13px] sm:text-[14px] text-sutra-ink-3">{description}</p>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  ErrorState — friendly error card with optional retry               */
/* ------------------------------------------------------------------ */

export function ErrorState({
  title,
  message,
  onRetry,
}: {
  title?: string;
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="bg-red-50 border border-red-200 rounded-xl p-8 sm:p-12 text-center">
      <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-red-100 text-red-700 grid place-items-center mx-auto mb-4">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 sm:w-6 sm:h-6">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 8v4" />
          <path d="M12 16h.01" />
        </svg>
      </div>
      <p className="text-[15px] sm:text-[16px] font-semibold text-red-800 mb-1">{title ?? "حدث خطأ ما"}</p>
      {message && <p className="text-[13px] sm:text-[14px] text-red-700">{message}</p>}
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-5 inline-flex items-center gap-1.5 bg-red-700 text-white rounded-xl text-[14px] font-semibold px-4 h-10 hover:bg-red-800 transition-colors"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
            <path d="M21 12a9 9 0 1 1-2.64-6.36" />
            <path d="M21 3v6h-6" />
          </svg>
          إعادة المحاولة
        </button>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  StatusBadge / RoleBadge                                             */
/* ------------------------------------------------------------------ */

/**
 * Arabic labels for the status codes the backend returns. Codes not listed
 * here fall through to the raw enum value, which stays Latin (§5).
 */
const STATUS_LABELS: Record<string, ReactNode> = {
  active: "نشط",
  active_subscribed: "نشط ومشترك",
  subscribed: "مشترك",
  active_trial: "نشط (تجريبي)",
  trial: "تجريبي",
  open: "مفتوح",
  processing: "قيد المعالجة",
  in_progress: "قيد التنفيذ",
  pending: "قيد الانتظار",
  needs_review: "قيد المراجعة",
  intake: "الاستلام الأولي",
  awaiting_document_upload: "بانتظار رفع المستندات",
  document_uploaded: "تم رفع المستندات",
  advance_analysis: "التحليل الأولي",
  ai_analysis: "تحليل الذكاء الاصطناعي",
  awaiting_officer_review: "بانتظار مراجعة الموظف المختص",
  awaiting_cvo_review: (
    <>
      بانتظار مراجعة <Ltr>CVO</Ltr>
    </>
  ),
  cvo_reviewed: (
    <>
      تمت مراجعة <Ltr>CVO</Ltr>
    </>
  ),
  awaiting_legal_review: "بانتظار المراجعة القانونية",
  legal_reviewed: "تمت المراجعة القانونية",
  finalized: "مكتملة نهائيًا",
  archived: "مؤرشفة",
  uploaded: "مرفوع",
  structured: "مُهيكل",
  suspended: "موقوف",
  inactive: "غير نشط",
  expired: "منتهي",
  cancelled: "ملغى",
  closed: "مغلق",
  resolved: "محلول",
  failed: "فاشل",
  completed: "مكتمل",
};

export function StatusBadge({ status }: { status: string }) {
  const palette: Record<string, { bg: string; text: string; dot: string }> = {
    active: { bg: "bg-green-bg", text: "text-green-ink", dot: "bg-green-dot" },
    active_subscribed: { bg: "bg-green-bg", text: "text-green-ink", dot: "bg-green-dot" },
    subscribed: { bg: "bg-green-bg", text: "text-green-ink", dot: "bg-green-dot" },
    active_trial: { bg: "bg-blue-50", text: "text-blue-700", dot: "bg-blue-500" },
    trial: { bg: "bg-blue-50", text: "text-blue-700", dot: "bg-blue-500" },
    open: { bg: "bg-blue-50", text: "text-blue-700", dot: "bg-blue-500" },
    processing: { bg: "bg-blue-50", text: "text-blue-700", dot: "bg-blue-500" },
    in_progress: { bg: "bg-amber-bg", text: "text-amber-ink", dot: "bg-amber-dot" },
    pending: { bg: "bg-amber-bg", text: "text-amber-ink", dot: "bg-amber-dot" },
    needs_review: { bg: "bg-amber-bg", text: "text-amber-ink", dot: "bg-amber-dot" },
    awaiting_document_upload: { bg: "bg-amber-bg", text: "text-amber-ink", dot: "bg-amber-dot" },
    document_uploaded: { bg: "bg-blue-50", text: "text-blue-700", dot: "bg-blue-500" },
    advance_analysis: { bg: "bg-blue-50", text: "text-blue-700", dot: "bg-blue-500" },
    ai_analysis: { bg: "bg-blue-50", text: "text-blue-700", dot: "bg-blue-500" },
    awaiting_officer_review: { bg: "bg-amber-bg", text: "text-amber-ink", dot: "bg-amber-dot" },
    awaiting_cvo_review: { bg: "bg-amber-bg", text: "text-amber-ink", dot: "bg-amber-dot" },
    cvo_reviewed: { bg: "bg-green-bg", text: "text-green-ink", dot: "bg-green-dot" },
    awaiting_legal_review: { bg: "bg-amber-bg", text: "text-amber-ink", dot: "bg-amber-dot" },
    legal_reviewed: { bg: "bg-green-bg", text: "text-green-ink", dot: "bg-green-dot" },
    uploaded: { bg: "bg-amber-bg", text: "text-amber-ink", dot: "bg-amber-dot" },
    structured: { bg: "bg-green-bg", text: "text-green-ink", dot: "bg-green-dot" },
    suspended: { bg: "bg-red-50", text: "text-red-700", dot: "bg-red-500" },
    inactive: { bg: "bg-red-50", text: "text-red-700", dot: "bg-red-500" },
    expired: { bg: "bg-red-50", text: "text-red-700", dot: "bg-red-500" },
    cancelled: { bg: "bg-red-50", text: "text-red-700", dot: "bg-red-500" },
    closed: { bg: "bg-sutra-line-2", text: "text-sutra-ink-2", dot: "bg-sutra-ink-3" },
    resolved: { bg: "bg-green-bg", text: "text-green-ink", dot: "bg-green-dot" },
    failed: { bg: "bg-red-50", text: "text-red-700", dot: "bg-red-500" },
    completed: { bg: "bg-green-bg", text: "text-green-ink", dot: "bg-green-dot" },
  };
  const p = palette[status] ?? { bg: "bg-tint", text: "text-navy", dot: "bg-navy" };
  const label = STATUS_LABELS[status];
  return (
    <span className={`inline-flex items-center gap-1.5 text-[12px] font-semibold px-2.5 py-1 rounded-full ${p.bg} ${p.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full flex-none ${p.dot}`} />
      {label ?? <Ltr>{status.replace(/_/g, " ")}</Ltr>}
    </span>
  );
}

export const ROLE_LABELS: Record<string, string> = {
  admin: "مسؤول",
  owner: "المالك",
  corpus_researcher: "باحث في المدونة",
  corpus_curator: "مراجع المدونة",
  cvo: "CVO",
  officer: "موظف",
  legal_board: "المجلس القانوني",
  mediator: "وسيط",
  legal_practitioner: "ممارس قانوني",
  judiciary: "السلطة القضائية",
};

/** Falls through to the raw role code, isolated, for anything the map omits. */
export const roleLabel = (role?: string | null): ReactNode =>
  role ? (ROLE_LABELS[role] ?? <Ltr>{role.replace(/_/g, " ")}</Ltr>) : "—";

export function RoleBadge({ role }: { role: string }) {
  return (
    <span className="inline-flex items-center text-[11.5px] font-semibold px-2 py-0.5 rounded-md bg-tint text-navy border border-tint-2 whitespace-nowrap">
      {roleLabel(role)}
    </span>
  );
}

/**
 * Audit action codes the backend records. The activity-log page's filter
 * dropdown and the reports snapshot both read this one map, so a code cannot
 * read one way in the filter and another in the row.
 */
export const ACTION_LABELS: Record<string, string> = {
  USER_LOGIN: "تسجيل دخول",
  USER_LOGOUT: "تسجيل خروج",
  USER_REGISTER: "إنشاء حساب",
  SESSION_TIMEOUT: "انتهاء الجلسة",
  IMPERSONATE_START: "بدء انتحال حساب",
  IMPERSONATE_END: "انتهاء انتحال حساب",
  SYSTEM_BOOT: "تشغيل النظام",
  SYSTEM_SHUTDOWN: "إيقاف النظام",
  CASE_CREATED: "إنشاء قضية",
  CASE_UPDATED: "تحديث قضية",
  DOCUMENT_UPLOADED: "رفع مستند",
  SUBSCRIPTION_CREATED: "إنشاء اشتراك",
  ADMIN_ACTION: "إجراء إداري",
};

/** Order the activity-log filter lists the codes in. */
export const ACTION_ORDER = Object.keys(ACTION_LABELS);

/** Falls through to the raw code, isolated, for anything the map omits. */
export function actionLabel(code?: string | null): ReactNode {
  return code ? (ACTION_LABELS[code] ?? <Ltr>{code}</Ltr>) : "—";
}

/* ------------------------------------------------------------------ */
/*  Pagination                                                          */
/* ------------------------------------------------------------------ */

export function Pagination({
  page,
  pageSize,
  total,
  onPage,
  onPageSize,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPage: (p: number) => void;
  onPageSize?: (s: number) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  return (
    <div className="flex items-center justify-between gap-3 flex-wrap mt-5">
      <div className="flex items-center gap-2 text-[13px] text-sutra-ink-3">
        {onPageSize && (
          <select
            value={pageSize}
            onChange={(e) => onPageSize(Number(e.target.value))}
            className="h-9 rounded-lg border border-sutra-line bg-white px-2 text-[13px] text-sutra-ink outline-none focus:border-focus cursor-pointer"
          >
            {[10, 20, 50, 100].map((s) => (
              <option key={s} value={s}>
                {n(s)} في الصفحة
              </option>
            ))}
          </select>
        )}
        <span>{count(total, UNITS.result)}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => onPage(page - 1)}
          disabled={page <= 1}
          className="h-9 px-3 rounded-lg border border-sutra-line bg-white text-[13px] font-semibold text-sutra-ink-2 hover:bg-tint transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          السابق
        </button>
        <span className="h-9 px-3 rounded-lg border border-sutra-line bg-white grid place-items-center text-[13px] font-semibold text-sutra-ink">
          {n(page)} من {n(totalPages)}
        </span>
        <button
          onClick={() => onPage(page + 1)}
          disabled={page >= totalPages}
          className="h-9 px-3 rounded-lg border border-sutra-line bg-white text-[13px] font-semibold text-sutra-ink-2 hover:bg-tint transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          التالي
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Th (table header helper)                                            */
/* ------------------------------------------------------------------ */

export function Th({ children, className = "" }: { children?: ReactNode; className?: string }) {
  return (
    <th className={`px-4 py-3 text-start text-[11px] font-bold text-sutra-ink-3 whitespace-nowrap ${className}`}>
      {children}
    </th>
  );
}

export function Td({ children, className = "" }: { children?: ReactNode; className?: string }) {
  return <td className={`px-4 py-3.5 text-[13.5px] text-sutra-ink align-middle ${className}`}>{children}</td>;
}

/* ------------------------------------------------------------------ */
/*  SearchSelect                                                        */
/* ------------------------------------------------------------------ */

export interface SearchSelectOption {
  id: number;
  label: string;
  sub?: string;
}

/**
 * Searchable combobox — type to filter, click or Enter to pick.
 * Falls back to a clear hint when the option list is empty so the
 * missing-account case (e.g. no officers registered) is visible,
 * not a dead dropdown.
 */
export function SearchSelect({
  label,
  value,
  onChange,
  options,
  placeholder = "اكتب للبحث…",
  emptyHint = "لا توجد خيارات — أنشئ حسابًا أولًا",
  required = false,
}: {
  label: string;
  value: string;
  onChange: (id: string) => void;
  options: SearchSelectOption[];
  placeholder?: string;
  emptyHint?: string;
  required?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const selected = options.find((o) => String(o.id) === value);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const filtered = query
    ? options.filter((o) => `${o.label} ${o.sub ?? ""}`.toLowerCase().includes(query.toLowerCase()))
    : options;

  return (
    <div ref={ref} className="relative">
      <label className="block text-[13px] font-semibold text-sutra-ink-2 mb-1.5">
        {label} {required && <span className="text-red-700">*</span>}
      </label>
      <input
        type="text"
        value={open ? query : selected ? selected.label : ""}
        placeholder={placeholder}
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        className="w-full h-11 rounded-lg border border-sutra-line bg-white px-3.5 text-[14px] text-sutra-ink outline-none focus:border-navy"
      />
      {open && (
        <div className="absolute z-30 mt-1 w-full max-h-56 overflow-y-auto rounded-lg border border-sutra-line bg-white shadow-lg">
          {options.length === 0 ? (
            <p className="px-3.5 py-3 text-[13px] text-sutra-ink-3">{emptyHint}</p>
          ) : filtered.length === 0 ? (
            <p className="px-3.5 py-3 text-[13px] text-sutra-ink-3">لا توجد نتائج مطابقة</p>
          ) : (
            filtered.map((o) => (
              <button
                key={o.id}
                type="button"
                onClick={() => {
                  onChange(String(o.id));
                  setQuery("");
                  setOpen(false);
                }}
                className="w-full text-start px-3.5 py-2.5 hover:bg-tint transition-colors"
              >
                <span className="block text-[13.5px] text-sutra-ink truncate">{o.label}</span>
                {o.sub && <span className="block text-[11.5px] text-sutra-ink-3 truncate">{o.sub}</span>}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
