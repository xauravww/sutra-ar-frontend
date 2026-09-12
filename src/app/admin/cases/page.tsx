"use client";

import { useEffect, useState, useCallback } from "react";
import { admin, type AdminCase, type AdminUser, type AdminJudicialCase } from "@/lib/api";
import Ltr from "@/components/Ltr";
import { count, date, type PluralForms } from "@/lib/num";
import { useNotify } from "@/components/ui/Notify";
import {
  PageHeader,
  SearchInput,
  FilterSelect,
  EmptyState,
  ErrorState,
  StatusBadge,
  Pagination,
  SearchSelect,
  ROLE_LABELS,
  type SearchSelectOption,
} from "@/components/admin/ui";

const PAGE_SIZE = 20;

/** Case counts, for the page subtitle. */
const CASES: PluralForms = {
  one: "قضية واحدة",
  two: "قضيتان",
  few: "قضايا",
  many: "قضية",
  other: "قضية",
};

/**
 * Priority codes the backend stores on a mediation case. The code itself is
 * what the API reads and writes, so only the label is translated and an
 * untaught code falls through to the raw value rather than vanishing.
 */
const PRIORITY_LABEL: Record<string, string> = {
  low: "منخفضة",
  medium: "متوسطة",
  high: "عالية",
};

// Filter options for mediation cases. The CVO review stages
// (`awaiting_cvo_review`, `cvo_reviewed`) still exist in the backend CaseStatus
// enum and in legacy rows, but the CVO workflow is no longer run — offering it
// here only made admins think there was a step they had to perform. Rows that
// carry those statuses still render correctly via StatusBadge, and can still be
// reached by search rather than by status filter.
const CASE_STATUSES = [
  { value: "intake", label: "الاستلام الأولي" },
  { value: "awaiting_document_upload", label: "بانتظار المستندات" },
  { value: "document_uploaded", label: "تم رفع المستندات" },
  { value: "advance_analysis", label: "التحليل الأولي" },
  { value: "ai_analysis", label: "تحليل الذكاء الاصطناعي" },
  { value: "awaiting_officer_review", label: "بانتظار مراجعة الموظف المختص" },
  { value: "awaiting_legal_review", label: "بانتظار المراجعة القانونية" },
  { value: "legal_reviewed", label: "تمت المراجعة القانونية" },
  { value: "finalized", label: "مكتملة نهائيًا" },
  { value: "archived", label: "مؤرشفة" },
];

const JUDICIAL_STATUSES = [
  { value: "uploaded", label: "مرفوعة" },
  { value: "processing", label: "قيد المعالجة" },
  { value: "structured", label: "مُهيكلة" },
  { value: "failed", label: "فاشلة" },
];

type CaseKind = "mediation" | "court";

export default function AdminCasesPage() {
  const { toast, confirm } = useNotify();

  // Mediator (mediation/officer) cases
  const [cases, setCases] = useState<AdminCase[]>([]);
  const [total, setTotal] = useState(0);
  // Court (judicial) cases
  const [courtCases, setCourtCases] = useState<AdminJudicialCase[]>([]);
  const [courtTotal, setCourtTotal] = useState(0);

  const [kind, setKind] = useState<CaseKind>("mediation");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [showDeleted, setShowDeleted] = useState(false);

  // Create modal
  const [showCreate, setShowCreate] = useState(false);
  const [officers, setOfficers] = useState<AdminUser[]>([]);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newOfficer, setNewOfficer] = useState("");
  const [creating, setCreating] = useState(false);

  // Create court case modal
  const [showCourtCreate, setShowCourtCreate] = useState(false);
  const [judges, setJudges] = useState<AdminUser[]>([]);
  const [courtTitle, setCourtTitle] = useState("");
  const [courtNumber, setCourtNumber] = useState("");
  const [courtJudge, setCourtJudge] = useState("");
  const [courtCreating, setCourtCreating] = useState(false);

  // Edit mediation case modal
  const [editFor, setEditFor] = useState<AdminCase | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editPriority, setEditPriority] = useState("medium");
  const [editOfficer, setEditOfficer] = useState("");
  const [editing, setEditing] = useState(false);

  // Edit court case modal
  const [courtEditFor, setCourtEditFor] = useState<AdminJudicialCase | null>(null);
  const [courtEditTitle, setCourtEditTitle] = useState("");
  const [courtEditNumber, setCourtEditNumber] = useState("");
  const [courtEditJudge, setCourtEditJudge] = useState("");
  const [courtEditing, setCourtEditing] = useState(false);

  const fetchCases = useCallback(() => {
    setLoading(true);
    setLoadError("");
    if (kind === "court") {
      admin
        .listJudicialCases({ limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE, status: status || undefined, search: search || undefined, deleted: showDeleted || undefined })
        .then((r) => {
          setCourtCases(r.data.data);
          setCourtTotal(r.data.total);
        })
        .catch((e) => {
          setCourtCases([]);
          setLoadError(e instanceof Error ? e.message : "تعذّر تحميل قضايا المحاكم");
        })
        .finally(() => setLoading(false));
      return;
    }
    admin
      .listCases({ limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE, status: status || undefined, search: search || undefined, deleted: showDeleted || undefined })
      .then((r) => {
        setCases(r.data.data);
        setTotal(r.data.total);
      })
      .catch((e) => {
        setCases([]);
        setLoadError(e instanceof Error ? e.message : "تعذّر تحميل القضايا");
      })
      .finally(() => setLoading(false));
  }, [kind, page, search, status, showDeleted]);

  useEffect(() => {
    fetchCases();
  }, [fetchCases]);

  const switchKind = (next: CaseKind) => {
    setKind(next);
    setPage(1);
    setStatus("");
    setSearch("");
    setShowDeleted(false);
  };

  const toggleDeleted = () => {
    setShowDeleted((v) => !v);
    setPage(1);
    setStatus("");
    setSearch("");
  };

  const openCreate = async () => {
    setShowCreate(true);
    if (officers.length === 0) {
      admin
        .listUsers({ role: "legal_practitioner", limit: 100 })
        .then((r) => setOfficers(r.data.data))
        .catch(() => setOfficers([]));
    }
  };

  const handleCreate = async () => {
    if (!newTitle.trim() || !newDesc.trim() || !newOfficer) return;
    setCreating(true);
    try {
      await admin.createCase({ title: newTitle.trim(), description: newDesc.trim(), officer_id: Number(newOfficer) });
      toast("تم إنشاء القضية", "success");
      setShowCreate(false);
      setNewTitle("");
      setNewDesc("");
      setNewOfficer("");
      fetchCases();
    } catch (e) {
      toast(e instanceof Error ? e.message : "تعذّر إنشاء القضية", "error");
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (c: AdminCase) => {
    const ok = await confirm({
      title: "حذف القضية",
      message: `حذف "${c.case_title}"؟ لا يمكن التراجع عن هذا الإجراء.`,
      confirmLabel: "حذف",
      tone: "danger",
    });
    if (!ok) return;
    try {
      await admin.deleteCase(c.id);
      toast("تم حذف القضية", "success");
      fetchCases();
    } catch (e) {
      toast(e instanceof Error ? e.message : "تعذّر الحذف", "error");
    }
  };

  const handleDeleteCourt = async (c: AdminJudicialCase) => {
    const ok = await confirm({
      title: "حذف قضية المحكمة",
      message: `حذف "${c.title}"؟ لا يمكن التراجع عن هذا الإجراء.`,
      confirmLabel: "حذف",
      tone: "danger",
    });
    if (!ok) return;
    try {
      await admin.deleteJudicialCase(c.id);
      toast("تم حذف قضية المحكمة", "success");
      fetchCases();
    } catch (e) {
      toast(e instanceof Error ? e.message : "تعذّر الحذف", "error");
    }
  };

  const handleRestore = async (c: AdminCase) => {
    const ok = await confirm({
      title: "استعادة القضية",
      message: `استعادة "${c.case_title}"؟ ستظهر مرة أخرى في القائمة النشطة.`,
      confirmLabel: "استعادة",
      tone: "default",
    });
    if (!ok) return;
    try {
      await admin.restoreCase(c.id);
      toast("تمت استعادة القضية", "success");
      fetchCases();
    } catch (e) {
      toast(e instanceof Error ? e.message : "تعذّرت الاستعادة", "error");
    }
  };

  const handleRestoreCourt = async (c: AdminJudicialCase) => {
    const ok = await confirm({
      title: "استعادة قضية المحكمة",
      message: `استعادة "${c.title}"؟ ستظهر مرة أخرى في القائمة النشطة.`,
      confirmLabel: "استعادة",
      tone: "default",
    });
    if (!ok) return;
    try {
      await admin.restoreJudicialCase(c.id);
      toast("تمت استعادة قضية المحكمة", "success");
      fetchCases();
    } catch (e) {
      toast(e instanceof Error ? e.message : "تعذّرت الاستعادة", "error");
    }
  };

  const userOpts = (users: AdminUser[]): SearchSelectOption[] =>
    users.map((u) => ({
      id: u.id,
      label: u.email,
      sub: [u.first_name, u.last_name].filter(Boolean).join(" ") || ROLE_LABELS[u.role] || u.role,
    }));

  const openCourtCreate = async () => {
    setShowCourtCreate(true);
    if (judges.length === 0) {
      admin
        .listUsers({ role: "judiciary", limit: 100 })
        .then((r) => setJudges(r.data.data))
        .catch(() => setJudges([]));
    }
  };

  const handleCourtCreate = async () => {
    if (!courtTitle.trim() || !courtJudge) return;
    setCourtCreating(true);
    try {
      await admin.createJudicialCase({
        title: courtTitle.trim(),
        case_number: courtNumber.trim() || undefined,
        user_id: Number(courtJudge),
      });
      toast("تم إنشاء قضية المحكمة", "success");
      setShowCourtCreate(false);
      setCourtTitle("");
      setCourtNumber("");
      setCourtJudge("");
      fetchCases();
    } catch (e) {
      toast(e instanceof Error ? e.message : "تعذّر إنشاء قضية المحكمة", "error");
    } finally {
      setCourtCreating(false);
    }
  };

  const openEdit = async (c: AdminCase) => {
    setEditFor(c);
    setEditTitle(c.case_title);
    setEditDesc(c.statement_of_charges ?? "");
    setEditPriority(c.priority ?? "medium");
    setEditOfficer(c.officer_user_id ? String(c.officer_user_id) : "");
    if (officers.length === 0) {
      admin
        .listUsers({ role: "legal_practitioner", limit: 100 })
        .then((r) => setOfficers(r.data.data))
        .catch(() => setOfficers([]));
    }
  };

  const handleEdit = async () => {
    if (!editFor) return;
    setEditing(true);
    try {
      await admin.updateCase(editFor.id, {
        case_title: editTitle.trim(),
        description: editDesc.trim(),
        priority: editPriority || undefined,
        officer_id: editOfficer ? Number(editOfficer) : undefined,
      });
      toast("تم تحديث القضية", "success");
      setEditFor(null);
      fetchCases();
    } catch (e) {
      toast(e instanceof Error ? e.message : "تعذّر التحديث", "error");
    } finally {
      setEditing(false);
    }
  };

  const openCourtEdit = (c: AdminJudicialCase) => {
    setCourtEditFor(c);
    setCourtEditTitle(c.title);
    setCourtEditNumber(c.case_number ?? "");
    setCourtEditJudge(String(c.user?.id ?? ""));
    if (judges.length === 0) {
      admin
        .listUsers({ role: "judiciary", limit: 100 })
        .then((r) => setJudges(r.data.data))
        .catch(() => setJudges([]));
    }
  };

  const handleCourtEdit = async () => {
    if (!courtEditFor) return;
    setCourtEditing(true);
    try {
      await admin.updateJudicialCase(courtEditFor.id, {
        title: courtEditTitle.trim(),
        case_number: courtEditNumber.trim() || null,
        user_id: courtEditJudge ? Number(courtEditJudge) : undefined,
      });
      toast("تم تحديث قضية المحكمة", "success");
      setCourtEditFor(null);
      fetchCases();
    } catch (e) {
      toast(e instanceof Error ? e.message : "تعذّر التحديث", "error");
    } finally {
      setCourtEditing(false);
    }
  };

  const totalShown = kind === "court" ? courtTotal : total;

  return (
    <div>
      <PageHeader
        title="القضايا"
        subtitle={`${count(totalShown, CASES)} إجمالًا`}
        actions={
          !showDeleted && kind === "mediation" ? (
            <button
              onClick={openCreate}
              className="inline-flex items-center gap-1.5 bg-navy text-white rounded-xl text-[14px] font-semibold px-4 py-2.5 hover:bg-navy-dark transition-colors"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-4 h-4">
                <path d="M12 5v14M5 12h14" />
              </svg>
              قضية جديدة
            </button>
          ) : !showDeleted ? (
            <button
              onClick={openCourtCreate}
              className="inline-flex items-center gap-1.5 bg-navy text-white rounded-xl text-[14px] font-semibold px-4 py-2.5 hover:bg-navy-dark transition-colors"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-4 h-4">
                <path d="M12 5v14M5 12h14" />
              </svg>
              قضية محكمة جديدة
            </button>
          ) : undefined
        }
      />

      {/* Type toggle: mediator vs court */}
      <div className="flex rounded-xl border border-sutra-line bg-white overflow-hidden mb-6 w-fit">
        <button
          onClick={() => switchKind("mediation")}
          className={`px-5 py-2.5 text-[13.5px] font-semibold transition-colors ${
            kind === "mediation" ? "bg-navy text-white" : "text-sutra-ink-2 hover:bg-tint"
          }`}
        >
          قضايا الوساطة
        </button>
        <button
          onClick={() => switchKind("court")}
          className={`px-5 py-2.5 text-[13.5px] font-semibold transition-colors ${
            kind === "court" ? "bg-navy text-white" : "text-sutra-ink-2 hover:bg-tint"
          }`}
        >
          قضايا المحاكم
        </button>
      </div>

      {/* Deleted / trash view (soft delete, bug #1572) */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <button
          onClick={toggleDeleted}
          className={`inline-flex items-center gap-2 rounded-xl border px-3.5 h-9 text-[12.5px] font-semibold transition-colors ${
            showDeleted
              ? "bg-amber-50 border-amber-300 text-amber-800"
              : "border-sutra-line bg-white text-sutra-ink-2 hover:bg-tint"
          }`}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="w-4 h-4">
            <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
          </svg>
          {showDeleted ? "إخفاء المحذوفة" : "إظهار المحذوفة"}
        </button>
        {showDeleted && (
          <span className="text-[12.5px] text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5">
            تعرض {kind === "court" ? "قضايا المحاكم" : "القضايا"} المحذوفة مؤقتًا فقط. الاستعادة تُرجع السجل إلى القائمة النشطة.
          </span>
        )}
      </div>

      {showCreate && (
        <div className="fixed inset-0 z-50 grid place-items-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowCreate(false)} />
          <div className="relative w-full max-w-lg bg-white rounded-xl p-5">
            <h3 className="text-[15px] font-bold text-sutra-ink mb-1">إنشاء قضية</h3>
            <p className="text-[13px] text-sutra-ink-3 mb-4">
              عيِّن الموظف المختص الذي سيتولى القضية. القضية مملوكة له: وهو الحساب
              الوحيد من الممارسين القانونيين الذي يراها في قائمته.
            </p>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-[13px] font-semibold text-sutra-ink-2 mb-1.5">
                  عنوان القضية <span className="text-red-700">*</span>
                </label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="مثال: النيابة العامة ضد المتهم"
                  className="w-full h-11 rounded-lg border border-sutra-line bg-white px-3.5 text-[14px] text-sutra-ink outline-none focus:border-navy"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-[13px] font-semibold text-sutra-ink-2 mb-1.5">
                  الوصف <span className="text-red-700">*</span>
                </label>
                <input
                  type="text"
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="وصف موجز / التهم"
                  className="w-full h-11 rounded-lg border border-sutra-line bg-white px-3.5 text-[14px] text-sutra-ink outline-none focus:border-navy"
                />
              </div>
              <div className="sm:col-span-2">
                <SearchSelect
                  label="الموظف المختص بالوساطة"
                  required
                  value={newOfficer}
                  onChange={setNewOfficer}
                  options={userOpts(officers)}
                  placeholder="ابحث عن موظف…"
                  emptyHint="لا توجد حسابات ممارسين بعد — أنشئ حسابًا من صفحة المستخدمين"
                />
                <p className="text-[12px] text-sutra-ink-3 mt-1.5">
                  مطلوب. هذا هو الممارس القانوني المعيَّن على القضية — ولا تظهر
                  القضية في قائمة أي مستخدم حتى يتم تعيينه.
                </p>
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button
                onClick={handleCreate}
                disabled={creating}
                className="inline-flex items-center bg-navy text-white rounded-xl text-[14px] font-semibold px-5 h-11 hover:bg-navy-dark transition-colors disabled:opacity-50"
              >
                {creating ? "جارٍ الإنشاء…" : "إنشاء قضية"}
              </button>
              <button
                onClick={() => setShowCreate(false)}
                className="inline-flex items-center rounded-xl border border-sutra-line bg-white px-5 h-11 text-[14px] font-semibold text-sutra-ink-2 hover:bg-tint transition-colors"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3 mb-6">
        <SearchInput
          value={search}
          onChange={(v) => { setSearch(v); setPage(1); }}
          placeholder={kind === "court" ? "ابحث بالعنوان أو رقم القضية أو مقدّم الطلب…" : "ابحث بالعنوان أو التهم أو الموظف…"}
          className="flex-1 min-w-[200px]"
        />
        <FilterSelect
          value={status}
          onChange={(v) => { setStatus(v); setPage(1); }}
          options={kind === "court" ? JUDICIAL_STATUSES : CASE_STATUSES}
          allLabel={kind === "court" ? "كل الحالات" : "كل الحالات"}
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
        <ErrorState
          title={`تعذّر تحميل ${kind === "court" ? "قضايا المحاكم" : "القضايا"}`}
          message={loadError}
          onRetry={fetchCases}
        />
      ) : kind === "court" ? (
        courtCases.length === 0 ? (
          <EmptyState title="لا توجد قضايا محاكم" description="جرّب تعديل عوامل التصفية" />
        ) : (
          <div className="bg-white border border-sutra-line rounded-xl overflow-x-auto">
            <table className="w-full min-w-[760px]">
              <thead className="border-b border-sutra-line-2 bg-sutra-bg/50">
                <tr>
                  <th className="px-4 py-3 text-start text-[11px] font-bold uppercase text-sutra-ink-3">القضية</th>
                  <th className="px-4 py-3 text-start text-[11px] font-bold uppercase text-sutra-ink-3">مُقدَّمة من</th>
                  <th className="px-4 py-3 text-start text-[11px] font-bold uppercase text-sutra-ink-3">الحالة</th>
                  <th className="px-4 py-3 text-start text-[11px] font-bold uppercase text-sutra-ink-3">ملف PDF</th>
                  <th className="px-4 py-3 text-start text-[11px] font-bold uppercase text-sutra-ink-3">تاريخ الإنشاء</th>
                  <th className="px-4 py-3 text-end text-[11px] font-bold uppercase text-sutra-ink-3">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sutra-line-2">
                {courtCases.map((c) => (
                  <tr key={c.id} className="hover:bg-sutra-bg/40 transition-colors">
                    <td className="px-4 py-3.5 max-w-[300px]">
                      <p className="text-[13.5px] font-semibold text-sutra-ink truncate"><Ltr>#{c.id}</Ltr> {c.title}</p>
                      <p className="text-[11.5px] text-sutra-ink-3 truncate">{c.case_number ?? "لا يوجد رقم قضية"}</p>
                    </td>
                    <td className="px-4 py-3.5 text-[12.5px] text-sutra-ink-2 truncate max-w-[180px]">
                      {c.user ? c.user.email : "—"}
                    </td>
                    <td className="px-4 py-3.5"><StatusBadge status={c.status ?? ""} /></td>
                    <td className="px-4 py-3.5 text-[12.5px] text-sutra-ink-2 truncate max-w-[160px]">
                      {c.pdf_filename ? (
                        <span className="inline-flex items-center gap-1.5">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5 text-red-700 flex-shrink-0">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                            <path d="M14 2v6h6" />
                          </svg>
                          <span className="truncate">{c.pdf_filename}</span>
                        </span>
                      ) : (
                        <span className="text-sutra-ink-3">لا يوجد</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-[12.5px] text-sutra-ink-2 whitespace-nowrap">
                      {c.created_at ? date(c.created_at) : "—"}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center justify-end gap-2">
                        {showDeleted ? (
                          <button
                            onClick={() => handleRestoreCourt(c)}
                            className="h-8 px-3 rounded-lg border border-sutra-line bg-white text-[12px] font-semibold text-sutra-ink-2 hover:bg-green-50 hover:text-green-700 hover:border-green-300 transition-colors"
                          >
                            استعادة
                          </button>
                        ) : (
                          <>
                            <button
                              onClick={() => openCourtEdit(c)}
                              className="h-8 px-3 rounded-lg border border-sutra-line bg-white text-[12px] font-semibold text-sutra-ink-2 hover:bg-tint transition-colors"
                            >
                              تعديل
                            </button>
                            <button
                              onClick={() => handleDeleteCourt(c)}
                              className="h-8 px-3 rounded-lg border border-sutra-line bg-white text-[12px] font-semibold text-sutra-ink-2 hover:bg-red-50 hover:text-red-700 hover:border-red-300 transition-colors"
                            >
                              حذف
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : cases.length === 0 ? (
        <EmptyState title="لا توجد قضايا" description="جرّب تعديل عوامل التصفية" />
      ) : (
        <div className="bg-white border border-sutra-line rounded-xl overflow-x-auto">
          <table className="w-full min-w-[760px]">
            <thead className="border-b border-sutra-line-2 bg-sutra-bg/50">
              <tr>
                <th className="px-4 py-3 text-start text-[11px] font-bold uppercase text-sutra-ink-3">القضية</th>
                <th className="px-4 py-3 text-start text-[11px] font-bold uppercase text-sutra-ink-3">الموظف المختص</th>
                <th className="px-4 py-3 text-start text-[11px] font-bold uppercase text-sutra-ink-3">الأولوية</th>
                <th className="px-4 py-3 text-start text-[11px] font-bold uppercase text-sutra-ink-3">الحالة</th>
                <th className="px-4 py-3 text-end text-[11px] font-bold uppercase text-sutra-ink-3">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sutra-line-2">
              {cases.map((c) => {
                const officer = c.officer;
                return (
                  <tr key={c.id} className="hover:bg-sutra-bg/40 transition-colors">
                    <td className="px-4 py-3.5 max-w-[300px]">
                      <p className="text-[13.5px] font-semibold text-sutra-ink truncate"><Ltr>#{c.id}</Ltr> {c.case_title}</p>
                      <p className="text-[11.5px] text-sutra-ink-3 truncate">{c.statement_of_charges ?? ""}</p>
                    </td>
                    <td className="px-4 py-3.5 text-[12.5px] text-sutra-ink-2 truncate max-w-[180px]">
                      {officer ? officer.email : "—"}
                    </td>
                    <td className="px-4 py-3.5 text-[12.5px] text-sutra-ink-2">{c.priority ? (PRIORITY_LABEL[c.priority] ?? c.priority) : "—"}</td>
                    <td className="px-4 py-3.5"><StatusBadge status={c.status ?? ""} /></td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center justify-end gap-2">
                        {showDeleted ? (
                          <button
                            onClick={() => handleRestore(c)}
                            className="h-8 px-3 rounded-lg border border-sutra-line bg-white text-[12px] font-semibold text-sutra-ink-2 hover:bg-green-50 hover:text-green-700 hover:border-green-300 transition-colors"
                          >
                            استعادة
                          </button>
                        ) : (
                          <>
                            <button
                              onClick={() => openEdit(c)}
                              className="h-8 px-3 rounded-lg border border-sutra-line bg-white text-[12px] font-semibold text-sutra-ink-2 hover:bg-tint transition-colors"
                            >
                              تعديل
                            </button>
                            <button
                              onClick={() => handleDelete(c)}
                              className="h-8 px-3 rounded-lg border border-sutra-line bg-white text-[12px] font-semibold text-sutra-ink-2 hover:bg-red-50 hover:text-red-700 hover:border-red-300 transition-colors"
                            >
                              حذف
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Pagination page={page} pageSize={PAGE_SIZE} total={totalShown} onPage={setPage} />

      {showCourtCreate && (
        <div className="fixed inset-0 z-50 grid place-items-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowCourtCreate(false)} />
          <div className="relative w-full max-w-lg bg-white rounded-xl p-5">
            <h3 className="text-[15px] font-bold text-sutra-ink mb-1">إنشاء قضية محكمة</h3>
            <p className="text-[13px] text-sutra-ink-3 mb-4">
              قيّد القضية بالنيابة عن قاضٍ — اختر القاضي أدناه.
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-[13px] font-semibold text-sutra-ink-2 mb-1.5">
                  عنوان القضية <span className="text-red-700">*</span>
                </label>
                <input
                  type="text"
                  value={courtTitle}
                  onChange={(e) => setCourtTitle(e.target.value)}
                  placeholder="مثال: النيابة العامة ضد خالد المنصور"
                  className="w-full h-11 rounded-lg border border-sutra-line bg-white px-3.5 text-[14px] text-sutra-ink outline-none focus:border-navy"
                />
              </div>
              <div>
                <label className="block text-[13px] font-semibold text-sutra-ink-2 mb-1.5">
                  رقم القضية
                </label>
                <input
                  type="text"
                  value={courtNumber}
                  onChange={(e) => setCourtNumber(e.target.value)}
                  dir="ltr"
                  placeholder="مثال: CRL/118/2026"
                  className="w-full h-11 rounded-lg border border-sutra-line bg-white px-3.5 text-[14px] text-sutra-ink outline-none focus:border-navy"
                />
              </div>
              <SearchSelect
                label="القاضي"
                required
                value={courtJudge}
                onChange={setCourtJudge}
                options={userOpts(judges)}
                placeholder="ابحث عن قاضٍ…"
                emptyHint="لا توجد حسابات قضاة بعد — أنشئ حسابًا من صفحة المستخدمين"
              />
            </div>
            <div className="flex gap-3 mt-5">
              <button
                onClick={handleCourtCreate}
                disabled={courtCreating}
                className="inline-flex items-center bg-navy text-white rounded-xl text-[14px] font-semibold px-5 h-11 hover:bg-navy-dark transition-colors disabled:opacity-50"
              >
                {courtCreating ? "جارٍ الإنشاء…" : "إنشاء قضية محكمة"}
              </button>
              <button
                onClick={() => setShowCourtCreate(false)}
                className="inline-flex items-center rounded-xl border border-sutra-line bg-white px-5 h-11 text-[14px] font-semibold text-sutra-ink-2 hover:bg-tint transition-colors"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {editFor && (
        <div className="fixed inset-0 z-50 grid place-items-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setEditFor(null)} />
          <div className="relative w-full max-w-lg bg-white rounded-xl p-5">
            <h3 className="text-[15px] font-bold text-sutra-ink mb-1">تعديل القضية</h3>
            <p className="text-[13px] text-sutra-ink-3 mb-4">#{editFor.id} · {editFor.case_title}</p>
            <p className="mb-4 text-[12px] font-medium text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              تريد تعديلها بالتفصيل؟ انتحل حساب المسؤول من صفحة المستخدمين.
            </p>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-[13px] font-semibold text-sutra-ink-2 mb-1.5">عنوان القضية</label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full h-11 rounded-lg border border-sutra-line bg-white px-3.5 text-[14px] text-sutra-ink outline-none focus:border-navy"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-[13px] font-semibold text-sutra-ink-2 mb-1.5">الوصف</label>
                <input
                  type="text"
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  className="w-full h-11 rounded-lg border border-sutra-line bg-white px-3.5 text-[14px] text-sutra-ink outline-none focus:border-navy"
                />
              </div>
              <div>
                <label className="block text-[13px] font-semibold text-sutra-ink-2 mb-1.5">الأولوية</label>
                <select
                  value={editPriority}
                  onChange={(e) => setEditPriority(e.target.value)}
                  className="w-full h-11 rounded-lg border border-sutra-line bg-white px-3.5 text-[14px] text-sutra-ink outline-none focus:border-navy cursor-pointer"
                >
                  <option value="low">منخفضة</option>
                  <option value="medium">متوسطة</option>
                  <option value="high">عالية</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <SearchSelect
                  label="الموظف المختص بالوساطة"
                  value={editOfficer}
                  onChange={setEditOfficer}
                  options={userOpts(officers)}
                  placeholder="ابحث عن موظف…"
                  emptyHint="لا توجد حسابات ممارسين بعد — أنشئ حسابًا من صفحة المستخدمين"
                />
                <p className="text-[12px] text-sutra-ink-3 mt-1.5">
                  إعادة التعيين تنقل القضية إلى قائمة الموظف الجديد — ويفقد
                  الموظف السابق صلاحية الوصول إليها.
                </p>
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button
                onClick={handleEdit}
                disabled={editing}
                className="inline-flex items-center bg-navy text-white rounded-xl text-[14px] font-semibold px-5 h-11 hover:bg-navy-dark transition-colors disabled:opacity-50"
              >
                {editing ? "جارٍ الحفظ…" : "حفظ التعديلات"}
              </button>
              <button
                onClick={() => setEditFor(null)}
                className="inline-flex items-center rounded-xl border border-sutra-line bg-white px-5 h-11 text-[14px] font-semibold text-sutra-ink-2 hover:bg-tint transition-colors"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {courtEditFor && (
        <div className="fixed inset-0 z-50 grid place-items-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setCourtEditFor(null)} />
          <div className="relative w-full max-w-lg bg-white rounded-xl p-5">
            <h3 className="text-[15px] font-bold text-sutra-ink mb-1">تعديل قضية المحكمة</h3>
            <p className="text-[13px] text-sutra-ink-3 mb-4">#{courtEditFor.id} · {courtEditFor.title}</p>
            <p className="mb-4 text-[12px] font-medium text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              تريد تعديلها بالتفصيل؟ انتحل حساب المسؤول من صفحة المستخدمين.
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-[13px] font-semibold text-sutra-ink-2 mb-1.5">عنوان القضية</label>
                <input
                  type="text"
                  value={courtEditTitle}
                  onChange={(e) => setCourtEditTitle(e.target.value)}
                  className="w-full h-11 rounded-lg border border-sutra-line bg-white px-3.5 text-[14px] text-sutra-ink outline-none focus:border-navy"
                />
              </div>
              <div>
                <label className="block text-[13px] font-semibold text-sutra-ink-2 mb-1.5">رقم القضية</label>
                <input
                  type="text"
                  value={courtEditNumber}
                  onChange={(e) => setCourtEditNumber(e.target.value)}
                  dir="ltr"
                  className="w-full h-11 rounded-lg border border-sutra-line bg-white px-3.5 text-[14px] text-sutra-ink outline-none focus:border-navy"
                />
              </div>
              <SearchSelect
                label="القاضي"
                value={courtEditJudge}
                onChange={setCourtEditJudge}
                options={userOpts(judges)}
                placeholder="ابحث عن قاضٍ…"
                emptyHint="لا توجد حسابات قضاة بعد — أنشئ حسابًا من صفحة المستخدمين"
              />
            </div>
            <div className="flex gap-3 mt-5">
              <button
                onClick={handleCourtEdit}
                disabled={courtEditing}
                className="inline-flex items-center bg-navy text-white rounded-xl text-[14px] font-semibold px-5 h-11 hover:bg-navy-dark transition-colors disabled:opacity-50"
              >
                {courtEditing ? "جارٍ الحفظ…" : "حفظ التعديلات"}
              </button>
              <button
                onClick={() => setCourtEditFor(null)}
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
