"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AdminShell from "@/components/admin/AdminShell";
import { useAuth } from "@/lib/auth-context";
import { corpusService, corpusErrorMessage, type CorpusDocument } from "@/lib/corpus";
import { useNotify } from "@/components/ui/Notify";
import { Spinner } from "@/components/ui/Button";
import Ltr from "@/components/Ltr";

/** Document-status codes the API stores, named for the queue badge. */
const STATUS_LABELS: Record<string, string> = {
  draft: "مسودة",
  processing: "قيد المعالجة",
  needs_review: "بحاجة إلى مراجعة",
  published: "منشور",
  archived: "مؤرشف",
  failed: "فاشل",
};

export default function KnowledgeBaseQueuePage() {
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useNotify();
  const [documents, setDocuments] = useState<CorpusDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await corpusService.listDocuments({ limit: 100, sort_by: "updated_at", sort_dir: "desc" });
      setDocuments(result.items);
    } catch (error) {
      toast(corpusErrorMessage(error, "تعذّر تحميل المصادر المعرفية"), "error");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (user && user.role !== "owner") router.replace("/curation");
    if (user?.role === "owner") void load();
  }, [load, router, user]);

  if (!user || user.role !== "owner") return null;

  const publish = async (document: CorpusDocument) => {
    setPublishing(document.id);
    try {
      await corpusService.publish(document.id);
      toast("تم نشر المصدر وأصبح متاحًا للاسترجاع الآلي.", "success");
      await load();
    } catch (error) {
      toast(corpusErrorMessage(error, "تعذّر نشر المصدر"), "error");
    } finally {
      setPublishing(null);
    }
  };

  return (
    <AdminShell>
      <div className="max-w-[1000px] mx-auto">
        <div className="flex items-start justify-between gap-4 mb-6">
          <div><Link href="/knowledge-base" className="text-[13px] font-semibold text-sutra-ink-3 hover:text-navy">→ المدونة المعرفية</Link><h1 className="text-[28px] font-bold text-sutra-ink mt-3">قائمة المصادر المعرفية</h1><p className="text-[14px] text-sutra-ink-3 mt-1">مراجعة المالك للكتب والتشريعات والنصوص الدستورية والمصادر الرسمية.</p></div>
          <Link href="/knowledge-base/upload" className="rounded-xl bg-navy text-white px-4 py-2.5 text-[13px] font-semibold hover:bg-navy-dark">+ إضافة مصدر</Link>
        </div>

        <section className="bg-white border border-sutra-line rounded-2xl p-4 sm:p-5">
          {loading ? <div className="py-12 grid place-items-center"><Spinner className="w-6 h-6 text-navy" /></div> : documents.length === 0 ? <div className="py-12 text-center text-[14px] text-sutra-ink-3">لم يُرفع أي مصدر معرفي بعد.</div> : <div className="space-y-2.5">{documents.map((document) => <article key={document.id} className="rounded-xl border border-sutra-line-2 px-4 py-3.5"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><h2 className="text-[14px] font-semibold text-sutra-ink truncate">{document.title}</h2><p className="text-[12px] text-sutra-ink-3 mt-1">{document.case_type || document.year || document.language ? <Ltr>{[document.case_type, document.year, document.language].filter(Boolean).join(" · ")}</Ltr> : "مصدر معرفي"}</p></div><span className={`text-[11px] font-semibold rounded-full px-2 py-0.5 flex-none ${document.status === "published" ? "text-emerald-700 bg-emerald-50 border border-emerald-200" : document.status === "failed" ? "text-red-700 bg-red-50 border border-red-200" : "text-amber-700 bg-amber-50 border border-amber-200"}`}>{STATUS_LABELS[document.status] ?? document.status}</span></div><div className="flex items-center justify-end gap-3 mt-3">{document.status !== "published" && document.status !== "processing" && <button type="button" onClick={() => void publish(document)} disabled={publishing === document.id} className="text-[12px] font-semibold text-navy hover:underline cursor-pointer disabled:opacity-50">{publishing === document.id ? "جارٍ النشر…" : "نشر المصدر"}</button>}<Link href="/knowledge-base" className="text-[12px] font-semibold text-sutra-ink-3 hover:text-navy">الرجوع إلى النظرة العامة</Link></div></article>)}</div>}
        </section>
      </div>
    </AdminShell>
  );
}
