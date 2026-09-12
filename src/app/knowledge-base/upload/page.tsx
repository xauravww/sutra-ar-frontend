"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AdminShell from "@/components/admin/AdminShell";
import { useAuth } from "@/lib/auth-context";
import { corpusService, corpusErrorMessage } from "@/lib/corpus";
import { useNotify } from "@/components/ui/Notify";
import { Spinner } from "@/components/ui/Button";
import Ltr from "@/components/Ltr";

/** Source-type options. `value` is the stored case_type and stays Latin. */
const SOURCE_TYPES = [
  { value: "Constitution", label: "دستور" },
  { value: "Act / statute", label: "قانون / تشريع" },
  { value: "Rules / regulations", label: "لوائح / أنظمة" },
  { value: "Legal book", label: "كتاب قانوني" },
  { value: "Commentary", label: "شرح وتعليق" },
  { value: "Government circular", label: "تعميم حكومي" },
  { value: "Other", label: "أخرى" },
];

export default function KnowledgeBaseUploadPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useNotify();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [sourceType, setSourceType] = useState("Legal book");
  const [year, setYear] = useState("");
  const [language, setLanguage] = useState("en");
  const [sourceUrl, setSourceUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!user || user.role !== "owner") return null;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!file || title.trim().length < 3) {
      toast("اختر ملف PDF وأدخل عنوان المصدر", "error");
      return;
    }
    setSubmitting(true);
    try {
      const document = await corpusService.createDocument(file, {
        citation: `KB-${Date.now()}`,
        title: title.trim(),
        case_type: sourceType,
        year: year || undefined,
        language,
        source_url: sourceUrl.trim() || undefined,
      });
      toast("تم رفع المصدر. بدأت عملية الاستخراج والفهرسة.", "success");
      router.push("/knowledge-base");
    } catch (error) {
      toast(corpusErrorMessage(error, "تعذّر رفع المصدر"), "error");
      setSubmitting(false);
    }
  };

  return (
    <AdminShell>
      <div className="max-w-3xl mx-auto">
        <Link href="/knowledge-base" className="text-[13px] font-semibold text-sutra-ink-3 hover:text-navy">→ الرجوع إلى المدونة المعرفية</Link>
        <div className="mt-4 mb-6"><p className="text-[12px] font-bold uppercase text-navy mb-2">مساحة المالك</p><h1 className="text-[28px] font-bold text-sutra-ink">إضافة مصدر معرفي</h1><p className="text-[14px] text-sutra-ink-3 mt-1">ارفع دستورًا أو تشريعًا أو كتابًا قانونيًا أو لائحة أو تعميمًا حكوميًا للمراجعة والفهرسة.</p></div>
        <form onSubmit={submit} className="space-y-5">
          <section className="bg-white border border-sutra-line rounded-2xl p-5"><h2 className="text-[15px] font-bold text-sutra-ink mb-3">ملف PDF للمصدر</h2><input ref={inputRef} type="file" accept="application/pdf,.pdf" className="hidden" onChange={(event) => setFile(event.target.files?.[0] ?? null)} /><button type="button" onClick={() => inputRef.current?.click()} className="w-full border-2 border-dashed border-sutra-line-2 rounded-xl px-4 py-8 text-center hover:border-navy hover:bg-tint/30 cursor-pointer"><span className="block text-[15px] font-semibold text-sutra-ink">{file ? <Ltr>{file.name}</Ltr> : "اختر ملف PDF"}</span><span className="block text-[13px] text-sutra-ink-3 mt-1">سيُستخرج المستند ويُقسَّم إلى مقاطع ثم يُرسل للمراجعة.</span></button></section>
          <section className="bg-white border border-sutra-line rounded-2xl p-5 space-y-4"><h2 className="text-[15px] font-bold text-sutra-ink">بيانات المصدر</h2><label className="block text-[13px] font-semibold text-sutra-ink-2">العنوان<input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="مثال: القانون المدني (طبعة ٢٠٢٤)" className="mt-1.5 w-full rounded-lg border border-sutra-line px-3 py-2.5 text-[14px] outline-none focus:border-navy" /></label><div className="grid sm:grid-cols-2 gap-4"><label className="block text-[13px] font-semibold text-sutra-ink-2">نوع المصدر<select value={sourceType} onChange={(e) => setSourceType(e.target.value)} className="mt-1.5 w-full rounded-lg border border-sutra-line px-3 py-2.5 text-[14px] bg-white outline-none focus:border-navy">{SOURCE_TYPES.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}</select></label><label className="block text-[13px] font-semibold text-sutra-ink-2">الطبعة / السنة<input value={year} onChange={(e) => setYear(e.target.value)} inputMode="numeric" placeholder="مثال: ٢٠٢٤" className="mt-1.5 w-full rounded-lg border border-sutra-line px-3 py-2.5 text-[14px] outline-none focus:border-navy" /></label></div><div className="grid sm:grid-cols-2 gap-4"><label className="block text-[13px] font-semibold text-sutra-ink-2">اللغة<select value={language} onChange={(e) => setLanguage(e.target.value)} className="mt-1.5 w-full rounded-lg border border-sutra-line px-3 py-2.5 text-[14px] bg-white outline-none focus:border-navy"><option value="en">الإنجليزية</option><option value="hi">الهندية</option><option value="bilingual">ثنائي اللغة</option></select></label><label className="block text-[13px] font-semibold text-sutra-ink-2">رابط المصدر الرسمي <span className="font-normal text-sutra-ink-3">(اختياري)<input value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} placeholder="https://…" className="mt-1.5 w-full rounded-lg border border-sutra-line px-3 py-2.5 text-[14px] outline-none focus:border-navy" /></span></label></div></section>
          <div className="flex items-center justify-end gap-3"><Link href="/knowledge-base" className="px-4 py-2.5 text-[14px] font-semibold text-sutra-ink-2">إلغاء</Link><button type="submit" disabled={submitting} className="inline-flex items-center gap-2 rounded-xl bg-navy text-white px-5 py-2.5 text-[14px] font-semibold hover:bg-navy-dark disabled:opacity-60 cursor-pointer disabled:cursor-default">{submitting && <Spinner className="w-4 h-4" />} {submitting ? "جارٍ الرفع…" : "رفع وفهرسة"}</button></div>
        </form>
      </div>
    </AdminShell>
  );
}
