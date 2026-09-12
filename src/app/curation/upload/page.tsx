"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  corpusService,
  corpusErrorMessage,
  type CorpusMetadata,
  CASE_TYPE_OPTIONS,
  CORPUS_COURT_TYPES,
  CORPUS_COURT_TYPE_LABELS,
  CORPUS_BENCH_TYPES,
  CORPUS_BENCH_TYPE_LABELS,
} from "@/lib/corpus";
import { COUNTRY_GROUPS, COUNTRY_NAMES } from "@/lib/countries";
import { bytes, n, percent } from "@/lib/num";
import { useNotify } from "@/components/ui/Notify";
import { Icon } from "@/components/curation/icons";

const MAX_BYTES = 50 * 1024 * 1024;
const CURRENT_YEAR = new Date().getFullYear();

type FormState = CorpusMetadata & { year: string };

const EMPTY_FORM: FormState = {
  citation: "",
  title: "",
  parties: "",
  court: "",
  court_type: "",
  bench: "",
  bench_type: "",
  state: "",
  year: "",
  decision_date: "",
  case_type: "",
  judges: "",
  outcome: "",
  // The corpus is an Arabic-language product, so a new judgment is assumed to
  // be in Arabic until the uploader says otherwise.
  language: "ar",
  source_url: "",
};

/**
 * Languages a judgment in this corpus is likely to be written in.
 *
 * The value is the ISO 639-1 code the API stores; the label is the Arabic name
 * of the language, written in Arabic. The previous list held Indian languages
 * (Hindi, Marathi, Tamil…) which no document in this deployment will carry.
 */
const LANGUAGE_OPTIONS = [
  { value: "ar", label: "العربية" },
  { value: "en", label: "الإنجليزية" },
  { value: "fr", label: "الفرنسية" },
];

export default function CurationUploadPage() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useNotify();

  const [file, setFile] = useState<File | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [dragging, setDragging] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [progress, setProgress] = useState(0);

  const setField = (key: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const acceptFile = useCallback((candidate: File) => {
    if (candidate.type !== "application/pdf") {
      toast("يُقبل ملفات PDF فقط", "error");
      return;
    }
    if (candidate.size > MAX_BYTES) {
      toast("حجم ملف PDF يتجاوز الحد المسموح ٥٠ ميجابايت", "error");
      return;
    }
    setFile(candidate);
    setErrors((prev) => {
      const next = { ...prev };
      delete next.file;
      return next;
    });
  }, [toast]);

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setDragging(false);
    const dropped = event.dataTransfer.files?.[0];
    if (dropped) acceptFile(dropped);
  };

  /**
   * Mirrors the server's zod schema. The server is authoritative — this only
   * saves a round trip on obvious mistakes.
   */
  const validate = (): boolean => {
    const next: Record<string, string> = {};

    if (!file) next.file = "أرفق ملف الحكم بصيغة PDF";
    if (form.citation.trim().length < 3)
      next.citation = "المرجع مطلوب";
    if (form.title.trim().length < 3) next.title = "العنوان مطلوب";

    if (form.year) {
      const year = Number(form.year);
      if (!Number.isInteger(year) || year < 1800 || year > CURRENT_YEAR + 1) {
        next.year = `أدخل سنة بين ١٨٠٠ و${n(CURRENT_YEAR + 1)}`;
      }
    }

    if (form.source_url) {
      try {
        new URL(form.source_url);
      } catch {
        next.source_url = "أدخل رابطًا صحيحًا";
      }
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (submitting) return;
    if (!validate()) {
      toast("صحّح الحقول المحدّدة قبل الرفع", "error");
      return;
    }

    setSubmitting(true);
    setProgress(0);

    try {
      const document = await corpusService.createDocument(
        file!,
        { ...form, year: form.year || undefined },
        setProgress
      );
      toast("تم الرفع. بدأ استخراج النص والفهرسة في الخلفية.", "success");
      router.push(`/curation/${document.id}`);
    } catch (error) {
      toast(corpusErrorMessage(error, "تعذّر الرفع"), "error");
      setSubmitting(false);
      setProgress(0);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <Link
          href="/curation"
          className="inline-flex items-center gap-1.5 text-sm text-sutra-ink-3 hover:text-sutra-ink transition-colors no-underline"
        >
          <Icon name="arrow-left" className="w-4 h-4 rtl-flip" />
          رجوع إلى قائمة الانتظار
        </Link>
        <h1 className="text-2xl font-bold text-sutra-ink mt-3">
          رفع حكم قضائي
        </h1>
        <p className="text-sm text-sutra-ink-3 mt-1">
          أرفق ملف PDF وصفه. يجري استخراج النص وتقسيمه وفهرسته تلقائيًا بمجرد
          الحفظ.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* PDF */}
        <section className="bg-white rounded-xl border border-sutra-line p-5">
          <h2 className="text-sm font-bold text-sutra-ink mb-3">
            ملف الحكم
          </h2>

          {file ? (
            <div className="flex items-center gap-3 p-4 bg-tint border border-sutra-line rounded-lg">
              <Icon name="file-text" className="w-5 h-5 text-sutra-ink-3 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-sutra-ink truncate" dir="ltr">
                  {file.name}
                </p>
                <p className="text-xs text-sutra-ink-3">
                  {bytes(file.size)}
                </p>
              </div>
              {!submitting && (
                <button
                  type="button"
                  onClick={() => setFile(null)}
                  className="p-1.5 text-sutra-ink-3 hover:text-sutra-ink hover:bg-tint-2 rounded transition-colors flex-shrink-0"
                >
                  <Icon name="x" className="w-4 h-4" />
                </button>
              )}
            </div>
          ) : (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              onClick={() => inputRef.current?.click()}
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                dragging
                  ? "border-navy bg-tint"
                  : errors.file
                  ? "border-red-300 bg-red-50/40"
                  : "border-sutra-line hover:border-sutra-ink-3 hover:bg-tint/40"
              }`}
            >
              <Icon name="upload-cloud" className="mx-auto w-7 h-7 text-sutra-ink-3 mb-2" />
              <p className="text-sm font-semibold text-sutra-ink">
                أفلت ملف PDF هنا، أو اضغط للاختيار
              </p>
              <p className="text-xs text-sutra-ink-3 mt-1">
                PDF فقط، بحد أقصى ٥٠ ميجابايت
              </p>
              <input
                ref={inputRef}
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={(e) => {
                  const selected = e.target.files?.[0];
                  if (selected) acceptFile(selected);
                  e.target.value = "";
                }}
              />
            </div>
          )}
          {errors.file && <FieldError message={errors.file} />}
        </section>

        {/* Required metadata */}
        <section className="bg-white rounded-xl border border-sutra-line p-5 space-y-4">
          <div>
            <h2 className="text-sm font-bold text-sutra-ink">
              التعريف
            </h2>
            <p className="text-xs text-sutra-ink-3 mt-0.5">
              يجب أن يكون المرجع فريدًا في المجموعة كلها.
            </p>
          </div>

          <Field
            label="المرجع"
            required
            error={errors.citation}
            hint="مثال: الطعن رقم ١٢٣ / ٢٠١٩ — تمييز دبي"
          >
            <input
              type="text"
              value={form.citation}
              onChange={(e) => setField("citation", e.target.value)}
              className={inputClass(errors.citation)}
              placeholder="الطعن رقم ١٢٣ / ٢٠١٩ — تمييز دبي"
            />
          </Field>

          <Field label="عنوان القضية" required error={errors.title}>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setField("title", e.target.value)}
              className={inputClass(errors.title)}
              placeholder="عبد الله أحمد ضد شركة الخليج للمقاولات"
            />
          </Field>

          <Field label="الخصوم" hint="أسماء الخصوم كاملة كما وردت في صحيفة الدعوى">
            <input
              type="text"
              value={form.parties}
              onChange={(e) => setField("parties", e.target.value)}
              className={inputClass()}
              placeholder="عبد الله أحمد، بصفته مدعيًا، ضد شركة الخليج للمقاولات ذ.م.م"
            />
          </Field>
        </section>

        {/* Classification — these fields drive search filters */}
        <section className="bg-white rounded-xl border border-sutra-line p-5 space-y-4">
          <div>
            <h2 className="text-sm font-bold text-sutra-ink">
              التصنيف
            </h2>
            <p className="text-xs text-sutra-ink-3 mt-0.5">
              تتحوّل هذه الحقول إلى مرشّحات بحث وتُضمَّن في الفهرس، لذا الدقة
              مهمة.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="المحكمة">
              <input
                type="text"
                value={form.court}
                onChange={(e) => setField("court", e.target.value)}
                className={inputClass()}
                placeholder="محكمة استئناف دبي"
              />
            </Field>

            <Field label="نوع المحكمة">
              <select
                value={form.court_type}
                onChange={(e) => setField("court_type", e.target.value)}
                className={inputClass()}
              >
                <option value="">اختر نوع المحكمة</option>
                {CORPUS_COURT_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {CORPUS_COURT_TYPE_LABELS[type]}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="الدولة">
              <select
                value={form.state}
                onChange={(e) => setField("state", e.target.value)}
                className={inputClass()}
              >
                <option value="">اختر الدولة</option>
                {COUNTRY_GROUPS.map((group) => (
                  <optgroup key={group.label} label={group.label}>
                    {group.codes.map((code) => (
                      <option key={code} value={code}>
                        {COUNTRY_NAMES[code]}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </Field>

            <Field label="مقر الدائرة" hint="مكان انعقاد الدائرة، مثال: الرياض">
              <input
                type="text"
                value={form.bench}
                onChange={(e) => setField("bench", e.target.value)}
                className={inputClass()}
                placeholder="الرياض"
              />
            </Field>

            <Field label="تشكيل الدائرة">
              <select
                value={form.bench_type}
                onChange={(e) => setField("bench_type", e.target.value)}
                className={inputClass()}
              >
                <option value="">اختر تشكيل الدائرة</option>
                {CORPUS_BENCH_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {CORPUS_BENCH_TYPE_LABELS[type]}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="السنة" error={errors.year}>
              {/*
                Deliberately a bare `<input type="number">` with a Latin-digit
                placeholder. A number input renders its own spinbutton chrome and
                the browser draws the value in the page's default numbering
                system — Arabic-Indic digits cannot be forced into it, and
                feeding it ٱرقام عربية would make `Number(e.target.value)` NaN.
                The year is read back through `n()` everywhere it is displayed.
              */}
              <input
                type="number"
                value={form.year}
                onChange={(e) => setField("year", e.target.value)}
                className={inputClass(errors.year)}
                placeholder={String(CURRENT_YEAR)}
                min={1800}
                max={CURRENT_YEAR + 1}
              />
            </Field>

            <Field
              label="تاريخ الحكم"
              hint="التاريخ الكامل إن كان معروفًا"
            >
              <input
                type="date"
                value={form.decision_date}
                onChange={(e) => setField("decision_date", e.target.value)}
                className={inputClass()}
                max={new Date().toISOString().split("T")[0]}
              />
            </Field>

            <Field label="نوع القضية">
              <select
                value={form.case_type}
                onChange={(e) => setField("case_type", e.target.value)}
                className={inputClass()}
              >
                <option value="">اختر النوع</option>
                {CASE_TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        </section>

        {/* Optional context */}
        <section className="bg-white rounded-xl border border-sutra-line p-5 space-y-4">
          <h2 className="text-sm font-bold text-sutra-ink">
            تفاصيل إضافية
          </h2>

          <Field label="القضاة">
            <input
              type="text"
              value={form.judges}
              onChange={(e) => setField("judges", e.target.value)}
              className={inputClass()}
              placeholder="عبد الرحمن السيد، منى الخالدي"
            />
          </Field>

          <Field
            label="المنطوق"
            hint="ملخّص في سطر أو سطرين لما قضت به المحكمة"
          >
            <textarea
              value={form.outcome}
              onChange={(e) => setField("outcome", e.target.value)}
              rows={3}
              className={inputClass()}
              placeholder="قُبل الاستئناف؛ أُلغي الحكم المستأنف؛ الإدانة بموجب المادة ٣٠٤ من قانون العقوبات."
            />
          </Field>

          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="رابط المصدر" error={errors.source_url}>
              <input
                type="url"
                value={form.source_url}
                onChange={(e) => setField("source_url", e.target.value)}
                className={inputClass(errors.source_url)}
                placeholder="https://example.gov/judgment"
                dir="ltr"
              />
            </Field>

            <Field label="اللغة">
              <select
                value={form.language}
                onChange={(e) => setField("language", e.target.value)}
                className={inputClass()}
              >
                {LANGUAGE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        </section>

        {/* Submit */}
        <div className="flex items-center justify-between gap-4 pb-4">
          <Link
            href="/curation"
            className="px-4 py-2.5 text-sm font-semibold text-sutra-ink-2 hover:text-sutra-ink transition-colors no-underline"
          >
            إلغاء
          </Link>

          <div className="flex items-center gap-3">
            {submitting && progress > 0 && progress < 100 && (
              <span className="text-sm text-sutra-ink-3 tabular-nums">
                {percent(progress)}
              </span>
            )}
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-navy text-white text-sm font-semibold rounded-xl hover:bg-navy-dark disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
            >
              {submitting ? (
                <>
                  <Icon name="spinner" className="animate-spin" />
                  {progress >= 100 ? "جارٍ المعالجة…" : "جارٍ الرفع…"}
                </>
              ) : (
                <>
                  <Icon name="upload-cloud" />
                  رفع وفهرسة
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

function inputClass(error?: string) {
  return `w-full px-3 py-2 border rounded-lg text-sm bg-white outline-none transition-colors ${
    error
      ? "border-red-300 focus:border-red-400"
      : "border-sutra-line focus:border-navy"
  }`;
}

function Field({
  label,
  required = false,
  hint,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-semibold text-sutra-ink-2 mb-1.5">
        {label}
        {required && <span className="text-red-600 ms-0.5">*</span>}
      </label>
      {children}
      {hint && !error && (
        <p className="text-xs text-sutra-ink-3 mt-1">{hint}</p>
      )}
      {error && <FieldError message={error} />}
    </div>
  );
}

function FieldError({ message }: { message: string }) {
  return (
    <p className="flex items-center gap-1 text-xs text-red-700 mt-1.5">
      <Icon name="alert-circle" className="w-3 h-3" />
      {message}
    </p>
  );
}
