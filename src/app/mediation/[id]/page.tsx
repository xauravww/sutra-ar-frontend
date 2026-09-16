"use client";

import { useState, useEffect, useRef } from "react";
import TopBar from "@/components/TopBar";
import { useParams } from "next/navigation";
import Link from "next/link";
import { mediation, type MediationSession } from "@/lib/api";
// Mirror of the backend's upload caps (tvsbackend/src/config/uploadLimits.config.ts).
const MAX_DOCS_PER_CASE = 20;
const MAX_FILE_SIZE_MB = 25;
import { getSessionStage, hasCompletedAnalysis, type MaybeSession } from "@/lib/mediationStatus";
import Ltr from "@/components/Ltr";
import { bytes, count, date, dateTime, n, percent, type PluralForms } from "@/lib/num";
import Markdown from "react-markdown";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import { Bold, Italic, Underline as UnderlineIcon, Heading2, List, ListOrdered, Quote, RemoveFormatting, Undo2, Redo2, MousePointer2 } from "lucide-react";

/* ─── Premium Lucide icons ─── */
type IProps = { className?: string } | string;
const gc = (p?: IProps, d = "w-[18px] h-[18px]"): string => typeof p === "string" ? p : p?.className ?? d;
const I = {
  Home: (p?: IProps) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={gc(p)}><path d="M15 21v-6a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v6" /><path d="M3 12l9-9 9 9" /><path d="M5 10v11h14V10" /></svg>,
  BarChart: (p?: IProps) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={gc(p)}><path d="M3 3v18h18" /><path d="M18 17V9" /><path d="M13 17V5" /><path d="M8 17v-3" /></svg>,
  Scale: (p?: IProps) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={gc(p)}><path d="M16 3l5 5-5 5" /><path d="M21 8H9" /><path d="M8 21l-5-5 5-5" /><path d="M3 16h12" /></svg>,
  Clock: (p?: IProps) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={gc(p)}><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>,
  FileText: (p?: IProps) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={gc(p)}><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><line x1="10" y1="9" x2="8" y2="9" /></svg>,
  Calendar: (p?: IProps) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={gc(p)}><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>,
  Chat: (p?: IProps) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={gc(p)}><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22z" /></svg>,
  Sparkles: (p?: IProps) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={gc(p)}><path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" /><path d="M20 3v4M22 5h-4" /></svg>,
  ChevronL: (p?: IProps) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={gc(p, "w-4 h-4")}><path d="M15 18l-6-6 6-6" /></svg>,
  X: (p?: IProps) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={gc(p, "w-4 h-4")}><path d="M18 6 6 18" /><path d="M6 6l12 12" /></svg>,
  Send: (p?: IProps) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={gc(p)}><path d="M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z" /><path d="m21.854 2.147-10.94 10.939" /></svg>,
  Star: (p?: IProps) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={gc(p)}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>,
  Layers: (p?: IProps) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={gc(p)}><path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83z" /><path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65" /><path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65" /></svg>,
  Check: (p?: IProps) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={gc(p)}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>,
  Plus: (p?: IProps) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={gc(p)}><path d="M5 12h14" /><path d="M12 5v14" /></svg>,
  Upload: (p?: IProps) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={gc(p)}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>,
  Trash: (p?: IProps) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={gc(p)}><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /><line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="11" x2="14" y2="17" /></svg>,
  File: (p?: IProps) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={gc(p)}><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" /><polyline points="14 2 14 8 20 8" /></svg>,
};

/* ─── Sidebar nav items ─── */
type Tab = "overview" | "analysis" | "settlement" | "documents" | "timeline";

const NAV: { key: Tab; label: string; Icon: typeof I.Home; desc: string }[] = [
  { key: "overview", label: "نظرة عامة", Icon: I.Home, desc: "ملخّص النزاع ومواقف الطرفين" },
  { key: "analysis", label: "التحليل", Icon: I.BarChart, desc: "درجات قوة كل طرف" },
  { key: "documents", label: "المستندات", Icon: I.Upload, desc: "رفع الملفات وإدارتها" },
  { key: "settlement", label: "التسوية", Icon: I.Scale, desc: "نقاط الاتفاق ونطاقات التسوية" },
  { key: "timeline", label: "الخط الزمني", Icon: I.Clock, desc: "محطات الجلسة" },
];

/** Document counts, for the chip under the session title. */
const DOCS: PluralForms = {
  one: "مستند واحد",
  two: "مستندان",
  few: "مستندات",
  many: "مستندًا",
  other: "مستند",
};

/** Files staged for upload but not yet sent. */
const FILES: PluralForms = {
  one: "ملف واحد",
  two: "ملفان",
  few: "ملفات",
  many: "ملفًا",
  other: "ملف",
};

/** Questions asked in the mediator chat. */
const QUESTIONS: PluralForms = {
  one: "سؤال واحد",
  two: "سؤالان",
  few: "أسئلة",
  many: "سؤالًا",
  other: "سؤال",
};

/** Strength/severity ratings the analysis attaches to a point. */
const RATING_LABEL: Record<string, string> = {
  high: "مرتفع",
  medium: "متوسط",
  low: "منخفض",
};

/**
 * Values the analysis stores for party and evidentiary fields.
 *
 * Both maps fall back to the raw value, so a code this file has not been taught
 * is shown as itself rather than dropped — an empty cell reads as "nothing was
 * recorded", which is a different and misleading claim.
 */
const PARTY_LABEL: Record<string, string> = {
  PARTY_A: "الطرف الأول",
  PARTY_B: "الطرف الثاني",
  BALANCED: "متوازن",
};

const EVIDENTIARY_LABEL: Record<string, string> = {
  proven: "ثابت",
  established: "ثابت",
  disputed: "محل نزاع",
  unproven: "غير ثابت",
  pending: "قيد التقييم",
  under_evaluation: "قيد التقييم",
  insufficient: "غير كافٍ",
};

/** A coded API value in Arabic, or the code itself when there is no label. */
function labelOf(map: Record<string, string>, value?: string | null): string {
  if (!value) return "";
  return map[value] ?? map[value.toLowerCase()] ?? value;
}

export default function MediationSessionPage() {
  const params = useParams();
  const sessionId = Number(params.id);
  const [session, setSession] = useState<MediationSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("overview");
  const [analyzing, setAnalyzing] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<{ role: string; content: string }[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const chatEnd = useRef<HTMLDivElement>(null);
  type FileStatus = "pending" | "uploading" | "done" | "error";
  const [files, setFiles] = useState<{ id: string; file: File; party: "A" | "B" | "both"; preview: string | null; status: FileStatus }[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingCount = files.filter(f => f.status === "pending").length;
  const uploadingCount = files.filter(f => f.status === "uploading").length;
  const [previewFile, setPreviewFile] = useState<{ name: string; url: string; type: string } | null>(null);
  // The inline PDF viewer lives inside the Documents tab; when a document is
  // opened from another tab (e.g. a corpus reference PDF on the Analysis tab)
  // we hop to Documents to show it and hop back on close.
  const [returnTab, setReturnTab] = useState<Tab | null>(null);
  const openPreview = (file: { name: string; url: string; type: string }, from?: Tab) => {
    setPreviewFile(file);
    if (from && tab !== "documents") {
      setReturnTab(from);
      setTab("documents");
    }
  };
  const closePreview = () => {
    setPreviewFile(null);
    if (returnTab) {
      setTab(returnTab);
      setReturnTab(null);
    }
  };
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [uploadNotice, setUploadNotice] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "error" | "success" } | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editPartyA, setEditPartyA] = useState("");
  const [editPartyB, setEditPartyB] = useState("");
  const [editSummary, setEditSummary] = useState("");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);
  const toggleFullscreen = () => {
    if (!previewRef.current) return;
    if (!document.fullscreenElement) {
      previewRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };
  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  useEffect(() => { if (sessionId) mediation.get(sessionId).then(r => setSession(r.data)).catch(() => {}).finally(() => setLoading(false)); }, [sessionId]);
  useEffect(() => { chatEnd.current?.scrollIntoView({ behavior: "smooth" }); }, [chatMessages, chatLoading]);

  // Any toast auto-dismisses after a few seconds (bug #1562) — covers the
  // "Analysis complete" toast which is set directly, not via showToast().
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(t);
  }, [toast]);

  // Sync edit fields when session changes
  useEffect(() => {
    if (session) {
      setEditTitle(session.title);
      setEditPartyA(session.party_a_name);
      setEditPartyB(session.party_b_name);
      setEditSummary(session.dispute_summary || "");
    }
  }, [session]);

  const [analysisStarted, setAnalysisStarted] = useState(false);

  const doAnalyze = async () => {
    if (docs.length === 0) {
      showToast("يرجى رفع المستندات أولًا.", "error");
      return;
    }
    setAnalyzing(true);
    setAnalysisStarted(true);
    try {
      // Fire-and-forget: start analysis but don't wait
      mediation.analyze(sessionId).catch(() => {});
      // Immediately show toast
      setToast({ message: "بدأ التحليل — قد يستغرق بضع دقائق. يمكنك مغادرة هذه الصفحة، وسنُشعرك عند اكتماله.", type: "success" });
      // Start polling every 15s to check if analysis completed
      const poll = setInterval(async () => {
        try {
          const r = await mediation.get(sessionId);
          const a = (r.data as any).analysis;
          if (a && a.analyzed_at) {
            // Analysis completed — refresh and stop polling
            setSession(r.data);
            setAnalyzing(false);
            setAnalysisStarted(false);
            setToast({ message: "اكتمل التحليل! الدرجات والقضايا المشابهة جاهزة.", type: "success" });
            clearInterval(poll);
          }
        } catch {}
      }, 15000);
      // Safety: stop polling after 10 minutes
      setTimeout(() => { clearInterval(poll); setAnalyzing(false); setAnalysisStarted(false); }, 600000);
    } catch {
      setAnalyzing(false);
      setAnalysisStarted(false);
      setToast({ message: "تعذّر بدء التحليل. حاول مرة أخرى.", type: "error" });
    }
  };
  const doChat = async () => { const q = chatInput.trim(); if (!q || chatLoading || !analyzed) return; setChatInput(""); setChatMessages(p => [...p, { role: "user", content: q }]); setChatLoading(true); try { const r = await mediation.chat(sessionId, q); setChatMessages(p => [...p, { role: "assistant", content: normalizeChatAnswer((r as any)?.data?.answer) }]); } catch { setChatMessages(p => [...p, { role: "assistant", content: "تعذّر الحصول على رد." }]); } setChatLoading(false); };

  const downloadSummary = async (party: "a" | "b" | "both") => {
    if (!a || !session) return;
    if (!analyzed) {
      showToast(noDocsYet ? "يرجى رفع المستندات أولًا." : "يرجى تشغيل التحليل لتنزيل المستندات.", "error");
      return;
    }
    const { downloadSummaryPdf } = await import("@/lib/mediationSummaryPdf");
    const mode = party === "both" ? "combined" : party === "a" ? "party_a" : "party_b";
    downloadSummaryPdf(session, mode);
  };

  const addFiles = (incoming: FileList | File[], party: "A" | "B" | "both" = "both") => {
    const arr = Array.from(incoming);
    // Client-side mirror of the server's upload caps
    // (tvsbackend/src/config/uploadLimits.config.ts) — the server is authoritative.
    const valid = arr.filter(f => f.type === "application/pdf" || f.type.startsWith("image/"));
    const oversized = valid.filter(f => f.size > MAX_FILE_SIZE_MB * 1024 * 1024);
    if (oversized.length > 0) {
      showToast(`تم تجاهل ${n(oversized.length)} من الملفات — الحد الأقصى لحجم الملف ${n(MAX_FILE_SIZE_MB)} ميجابايت.`, "error");
    }
    const acceptable = valid.filter(f => f.size <= MAX_FILE_SIZE_MB * 1024 * 1024);
    if (acceptable.length === 0) return;
    // Keep the queued count within the session quota (already-stored docs + queue).
    const storedCount = session?.documents?.length ?? 0;
    const roomFor = Math.max(0, MAX_DOCS_PER_CASE - storedCount - files.length);
    if (acceptable.length > roomFor) {
      showToast(
        roomFor === 0
          ? `وصلت الجلسة إلى الحد الأقصى (${n(MAX_DOCS_PER_CASE)} مستندًا).`
          : `يمكن إضافة ${n(roomFor)} مستندًا فقط — الحد الأقصى ${n(MAX_DOCS_PER_CASE)} مستندًا للجلسة.`,
        "error"
      );
    }
    const mapped = acceptable.slice(0, roomFor).map(f => ({
      id: Math.random().toString(36).slice(2, 9),
      file: f,
      party,
      preview: f.type.startsWith("image/") ? URL.createObjectURL(f) : null,
      status: "pending" as FileStatus,
    }));
    if (mapped.length === 0) return;
    setFiles(prev => [...prev, ...mapped]);
  };
  const removeFile = (id: string) => setFiles(prev => prev.filter(f => f.id !== id));
  const updateParty = (id: string, party: "A" | "B" | "both") => setFiles(prev => prev.map(f => f.id === id ? { ...f, party } : f));

  const uploadAll = async () => {
    const pending = files.filter(f => f.status === "pending");
    if (!pending.length) return;
    setUploadNotice(false);
    setFiles(prev => prev.map(f => f.status === "pending" ? { ...f, status: "uploading" as FileStatus } : f));
    // Upload each file individually for reliable per-file error handling
    let okCount = 0;
    let errCount = 0;
    for (const f of pending) {
      try {
        const partyTag = f.party === "both" ? "PARTY_A" : f.party === "A" ? "PARTY_A" : "PARTY_B";
        await mediation.uploadDocument(sessionId, f.file, partyTag);
        setFiles(prev => prev.map(p => p.id === f.id ? { ...p, status: "done" as FileStatus } : p));
        okCount += 1;
      } catch (err) {
        console.error("فشل رفع الملف", f.file.name, err);
        setFiles(prev => prev.map(p => p.id === f.id ? { ...p, status: "error" as FileStatus } : p));
        errCount += 1;
      }
    }
    // Refresh session to get uploaded docs from database
    try { const r = await mediation.get(sessionId); setSession(r.data); } catch {}
    // Skippable "uploaded — generate analysis" notice (DOC-02) on a clean run.
    if (okCount > 0 && errCount === 0) {
      setUploadNotice(true);
    } else if (errCount > 0) {
      showToast(errCount === pending.length ? "تعذّر الرفع. حاول مرة أخرى." : `تم رفع ${n(okCount)}، وفشل ${n(errCount)}.`, "error");
    }
  };

  if (loading) return <div className="min-h-dvh"><TopBar /><main id="main-content" tabIndex={-1} className="max-w-[1100px] mx-auto px-4 sm:px-6 py-6 sm:py-8"><div className="space-y-4"><div className="h-5 w-32 bg-sutra-line-2 rounded animate-pulse" /><div className="h-8 w-64 bg-sutra-line-2 rounded animate-pulse" /><div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-5"><div className="h-[300px] bg-white border border-sutra-line rounded-2xl animate-pulse" /><div className="h-[300px] bg-white border border-sutra-line rounded-2xl animate-pulse" /></div></div></main></div>;

  if (!session) return <div className="min-h-dvh"><TopBar /><main id="main-content" tabIndex={-1} className="max-w-[1100px] mx-auto px-4 sm:px-6 py-6 sm:py-8 text-center"><p className="text-sutra-ink-3 mb-4">الجلسة غير موجودة.</p><Link href="/mediation" className="text-navy font-semibold hover:underline">→ الرجوع</Link></main></div>;

  const a = session.analysis as any;
  const docs = session.documents ?? [];
  const analyzed = hasCompletedAnalysis(a);
  // DETAIL-05: controls reflect prerequisites. Run Analysis needs ≥1 uploaded doc
  // (session.documents — the queue is picked up only after upload), downloads need
  // a completed analysis.
  const canRunAnalysis = docs.length > 0 && !analyzing;
  const canDownload = analyzed;
  const noDocsYet = docs.length === 0;

  const refreshSession = async () => {
    setRefreshing(true);
    try {
      const r = await mediation.get(sessionId);
      setSession(r.data);
      showToast("تم تحديث الجلسة", "success");
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "تعذّر التحديث", "error");
    } finally {
      setRefreshing(false);
    }
  };

  const showToast = (message: string, type: "error" | "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await mediation.update(sessionId, {
        title: editTitle.trim(),
        party_a_name: editPartyA.trim(),
        party_b_name: editPartyB.trim(),
        dispute_summary: editSummary.trim(),
      });
      const r = await mediation.get(sessionId);
      setSession(r.data);
      setEditing(false);
      showToast("تم تحديث الجلسة بنجاح", "success");
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "تعذّر التحديث", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleSyncFromDocs = async () => {
    if (docs.length === 0) {
      showToast("لم تُرفع مستندات بعد. ارفع المستندات أولًا.", "error");
      return;
    }
    try {
      showToast("جارٍ تحليل المستندات…", "success");
      const r = await mediation.syncFromDocs(sessionId) as any;
      const d = r.data;
      setSession(d);
      setEditTitle(d.title);
      setEditPartyA(d.party_a_name);
      setEditPartyB(d.party_b_name);
      setEditSummary(d.dispute_summary || "");
      showToast("تم تحديث الجلسة من المستندات", "success");
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "تعذّر المزامنة", "error");
    }
  };

  return (
    <div className="min-h-dvh flex flex-col">
      <TopBar />
      <main id="main-content" tabIndex={-1} className="flex-1 max-w-[1100px] mx-auto px-4 sm:px-6 py-5 sm:py-8 pb-24 w-full">
        {/* Back / refresh row */}
        <div className="flex items-center justify-between gap-3 mb-4 sm:mb-5">
          <Link href="/mediation" className="inline-flex items-center gap-1.5 text-navy font-semibold text-[13px] sm:text-[14px] no-underline hover:text-navy-dark transition-colors group">
            <I.ChevronL className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5 rtl-flip" />العودة إلى الجلسات
          </Link>
          <button
            type="button"
            onClick={refreshSession}
            disabled={refreshing}
            title="تحديث بيانات الجلسة"
            className="inline-flex items-center gap-1.5 text-[12px] sm:text-[13px] font-semibold text-sutra-ink-2 bg-white border border-sutra-line rounded-lg px-2.5 py-1.5 hover:bg-tint hover:text-navy hover:border-navy/30 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <svg className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56" /><path d="M21 3v5h-5" /></svg>
            <span>{refreshing ? "جارٍ التحديث…" : "تحديث"}</span>
          </button>
        </div>

        {/* Hero */}
        <section className="bg-white border border-sutra-line border-t-[3px] border-t-navy rounded-2xl p-4 sm:p-6 mb-5">
          <div className="flex items-center justify-between gap-2 sm:gap-3 flex-wrap mb-3">
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
              <span className="inline-flex items-center text-[12px] sm:text-[13px] font-bold text-navy bg-tint border border-tint-2 py-1 px-2.5 sm:px-3 rounded-lg">MED-{String(session.id).padStart(4, "0")}</span>
              <StatusBadge session={session} />
            </div>
            <div className="flex items-center gap-2">
              <button onClick={handleSyncFromDocs} className="inline-flex items-center gap-1.5 text-[12px] sm:text-[13px] font-semibold text-navy bg-white border border-sutra-line rounded-lg px-2.5 py-1.5 hover:bg-tint hover:border-navy/30 transition-colors" title="أعد تحليل المستندات لتحديث أسماء الأطراف">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5"><path d="M21 12a9 9 0 1 1-6.219-8.56" /><path d="M21 3v5h-5" /></svg>
                <span>مزامنة<span className="hidden sm:inline"> من المستندات</span></span>
              </button>
              {!editing ? (
                <button onClick={() => setEditing(true)} className="inline-flex items-center gap-1.5 text-[12px] sm:text-[13px] font-semibold text-sutra-ink-2 bg-white border border-sutra-line rounded-lg px-2.5 py-1.5 hover:bg-tint hover:border-navy/30 transition-colors">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                  تعديل
                </button>
              ) : (
                <div className="flex items-center gap-1.5">
                  <button onClick={handleSave} disabled={saving} className="inline-flex items-center gap-1.5 text-[12px] sm:text-[13px] font-semibold text-white bg-navy border-0 rounded-lg px-2.5 py-1.5 hover:bg-navy-dark transition-colors disabled:opacity-50">
                    {saving ? "جارٍ الحفظ…" : "حفظ"}
                  </button>
                  <button onClick={() => { setEditing(false); setEditTitle(session.title); setEditPartyA(session.party_a_name); setEditPartyB(session.party_b_name); setEditSummary(session.dispute_summary || ""); }} className="text-[12px] sm:text-[13px] font-semibold text-sutra-ink-3 hover:text-sutra-ink px-2 py-1.5 transition-colors">إلغاء</button>
                </div>
              )}
            </div>
          </div>

          {editing ? (
            <div className="space-y-3 mb-4">
              <input value={editTitle} onChange={e => setEditTitle(e.target.value)} className="w-full text-[22px] sm:text-[28px] font-bold leading-[1.25] border border-sutra-line rounded-xl px-4 py-2.5 outline-none focus:border-navy focus:ring-2 focus:ring-navy/10" placeholder="عنوان الجلسة" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] sm:text-[12px] font-bold uppercase text-sutra-ink-3 mb-1 block">الطرف الأول</label>
                  <input value={editPartyA} onChange={e => setEditPartyA(e.target.value)} className="w-full text-[15px] sm:text-[16px] font-semibold border border-sutra-line rounded-lg px-3 py-2 outline-none focus:border-navy focus:ring-2 focus:ring-navy/10" placeholder="اسم الطرف الأول" />
                </div>
                <div>
                  <label className="text-[11px] sm:text-[12px] font-bold uppercase text-sutra-ink-3 mb-1 block">الطرف الثاني</label>
                  <input value={editPartyB} onChange={e => setEditPartyB(e.target.value)} className="w-full text-[15px] sm:text-[16px] font-semibold border border-sutra-line rounded-lg px-3 py-2 outline-none focus:border-navy focus:ring-2 focus:ring-navy/10" placeholder="اسم الطرف الثاني" />
                </div>
              </div>
              <div>
                <label className="text-[11px] sm:text-[12px] font-bold uppercase text-sutra-ink-3 mb-1 block">ملخّص النزاع</label>
                <textarea value={editSummary} onChange={e => setEditSummary(e.target.value)} rows={2} className="w-full text-[14px] sm:text-[15px] border border-sutra-line rounded-lg px-3 py-2 outline-none focus:border-navy focus:ring-2 focus:ring-navy/10 resize-none" placeholder="وصف موجز للنزاع" />
              </div>
            </div>
          ) : (
            <>
              <h1 className="text-[22px] sm:text-[28px] font-bold leading-[1.25] mb-4 sm:mb-5">{session.title}</h1>
              <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_80px_minmax(0,1fr)] sm:items-center bg-[#FAFBFD] border border-sutra-line-2 rounded-xl p-3 sm:p-4">
                <div className="min-w-0 flex items-center"><PartyCard label="الطرف الأول" name={session.party_a_name} initial="أ" /></div>
                <div className="hidden sm:flex w-20 h-full min-h-[56px] items-center justify-center justify-self-center" aria-label="ضد"><span className="font-sans font-extrabold text-[24px] sm:text-[30px] text-navy select-none leading-none">V/S</span></div>
                <div className="min-w-0 flex items-center justify-end border-t border-sutra-line-2 sm:border-t-0 pt-3 sm:pt-0"><PartyCard label="الطرف الثاني" name={session.party_b_name} initial="ب" align="right" /></div>
              </div>
            </>
          )}

          <div className="flex gap-2 flex-wrap mt-3">
            <MetaChip icon={<I.Calendar className="w-3.5 h-3.5" />} label={`مُسجَّلة في ${date(session.created_at)}`} />
            <MetaChip icon={<I.FileText className="w-3.5 h-3.5" />} label={count(docs.length + files.length, DOCS)} />
          </div>
        </section>

        {/* ═══ Sidebar + Content ═══ */}
        <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-4 items-start">
          {/* ── Sidebar nav ── */}
          <nav className="flex lg:flex-col gap-1.5 overflow-x-auto lg:overflow-visible pb-1 lg:pb-0">
            {NAV.map(({ key, label, Icon, desc }) => (
              <button key={key} onClick={() => setTab(key)}
                className={`flex items-center gap-3 flex-none lg:w-full px-3.5 py-3 rounded-xl text-start transition-all border ${
                  tab === key
                    ? "bg-navy text-white border-navy shadow-md shadow-navy/15"
                    : "bg-white text-sutra-ink border-sutra-line hover:border-navy/30 hover:bg-tint/60"
                }`}>
                <span className={`flex-none w-9 h-9 rounded-lg grid place-items-center ${tab === key ? "bg-white/15" : "bg-tint"}`}>
                  <Icon className={tab === key ? "text-white" : "text-navy"} />
                </span>
                <span className="hidden lg:block min-w-0">
                  <span className={`block text-[13px] sm:text-[14px] font-semibold leading-tight ${tab === key ? "text-white" : "text-sutra-ink"}`}>{label}</span>
                  <span className={`block text-[11px] sm:text-[12px] leading-tight mt-0.5 ${tab === key ? "text-white/70" : "text-sutra-ink-3"}`}>{desc}</span>
                </span>
                <span className="lg:hidden text-[13px] sm:text-[14px] font-semibold whitespace-nowrap">{label}</span>
              </button>
            ))}
          </nav>

          {/* ── Content ── */}
          <div className="bg-white border border-sutra-line rounded-2xl p-4 sm:p-6 min-h-[300px]">
            {/* Overview */}
            {tab === "overview" && (
              analyzed ? (
                <div className="space-y-6">
                  <div><h3 className="flex items-center gap-2 text-[12px] sm:text-[13px] font-bold uppercase text-sutra-ink-3 mb-2.5"><I.FileText className="w-4 h-4 text-navy" />ملخّص النزاع</h3>
                  <p className="text-[15px] sm:text-[16px] text-sutra-ink leading-relaxed ps-6">{session.dispute_summary || "لم يُقدَّم ملخّص للنزاع."}</p></div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <PosCard label="موقف الطرف الأول" val={a.party_a_favorable_points?.[0]?.point || (a.dominating_party === "PARTY_A" ? "يملك الموقف الأقوى" : a.dominating_party === "BALANCED" ? "موقف متوازن" : "موقف أضعف")} c="navy" />
                    <PosCard label="موقف الطرف الثاني" val={a.party_b_favorable_points?.[0]?.point || (a.dominating_party === "PARTY_B" ? "يملك الموقف الأقوى" : a.dominating_party === "BALANCED" ? "موقف متوازن" : "موقف أضعف")} c="amber" />
                  </div>
                </div>
              ) : (
                // DETAIL-03: empty overview shows a next-step prompt only, no placeholder cards.
                <div className="py-6 sm:py-8 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-tint text-navy grid place-items-center mx-auto mb-4 border border-tint-2">
                    <I.FileText className="w-6 h-6" />
                  </div>
                  <p className="text-[16px] sm:text-[17px] font-semibold text-sutra-ink mb-1.5">
                    {noDocsYet ? "لم تُرفع مستندات بعد" : "لا يوجد تحليل بعد"}
                  </p>
                  <p className="text-[13px] sm:text-[14px] text-sutra-ink-3 max-w-[340px] mx-auto mb-5 leading-relaxed">
                    {noDocsYet
                      ? "ارفع ملفات القضية والأدلة من تبويب المستندات للبدء. تظهر مواقف الأطراف وقوّتها هنا بعد تشغيل التحليل المقارن."
                      : "المستندات جاهزة. ابدأ التحليل المقارن من تبويب التحليل — ستظهر هنا مواقف الطرفين ودرجات قوّتهما."}
                  </p>
                  <button
                    type="button"
                    onClick={() => setTab(noDocsYet ? "documents" : "analysis")}
                    className="inline-flex items-center gap-2 bg-navy text-white border-0 rounded-lg text-[13px] sm:text-[14px] font-semibold px-4 py-2 min-h-[36px] transition-all hover:bg-navy-dark shadow-sm"
                  >
                    {noDocsYet ? (<><I.Upload className="w-4 h-4" />رفع مستندات</>) : (<><I.Sparkles className="w-4 h-4" />الانتقال إلى التحليل</>)}
                  </button>
                </div>
              )
            )}

            {/* Analysis */}
            {tab === "analysis" && (
              <div className="space-y-6">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <h3 className="flex items-center gap-2 text-[15px] sm:text-[17px] font-bold"><I.BarChart className="w-5 h-5 text-navy" />قوة الأطراف</h3>
                  <div className="flex items-center gap-2 flex-wrap">
                    <button onClick={() => downloadSummary("a")} disabled={!canDownload} aria-disabled={!canDownload}
                      title={canDownload ? "تنزيل ملخّص الطرف الأول" : noDocsYet ? "يرجى رفع المستندات أولًا" : "يرجى تشغيل التحليل لتنزيل المستندات"}
                      className={`inline-flex items-center gap-1.5 text-[11px] sm:text-[12px] font-semibold rounded-lg px-2.5 py-1.5 transition-colors disabled:cursor-not-allowed disabled:opacity-45 ${canDownload ? "text-navy bg-tint border border-tint-2 hover:bg-tint-2" : "text-sutra-ink-3 bg-sutra-line-2 border border-transparent"}`}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="w-3 h-3"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                      الطرف الأول
                    </button>
                    <button onClick={() => downloadSummary("b")} disabled={!canDownload} aria-disabled={!canDownload}
                      title={canDownload ? "تنزيل ملخّص الطرف الثاني" : noDocsYet ? "يرجى رفع المستندات أولًا" : "يرجى تشغيل التحليل لتنزيل المستندات"}
                      className={`inline-flex items-center gap-1.5 text-[11px] sm:text-[12px] font-semibold rounded-lg px-2.5 py-1.5 transition-colors disabled:cursor-not-allowed disabled:opacity-45 ${canDownload ? "text-amber-700 bg-amber-bg border border-amber-200 hover:bg-amber-100" : "text-sutra-ink-3 bg-sutra-line-2 border border-transparent"}`}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="w-3 h-3"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                      الطرف الثاني
                    </button>
                    <button onClick={() => downloadSummary("both")} disabled={!canDownload} aria-disabled={!canDownload}
                      title={canDownload ? "تنزيل الملخّصين معًا" : noDocsYet ? "يرجى رفع المستندات أولًا" : "يرجى تشغيل التحليل لتنزيل المستندات"}
                      className={`inline-flex items-center gap-1.5 text-[11px] sm:text-[12px] font-semibold rounded-lg px-2.5 py-1.5 transition-colors disabled:cursor-not-allowed disabled:opacity-45 ${canDownload ? "text-white bg-navy hover:bg-navy-dark" : "text-sutra-ink-3 bg-sutra-line-2"}`}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="w-3 h-3"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                      كلاهما
                    </button>
                    <button onClick={doAnalyze} disabled={!canRunAnalysis} aria-disabled={!canRunAnalysis}
                      title={analyzing ? "التحليل قيد التنفيذ" : noDocsYet ? "يرجى رفع المستندات أولًا" : "تشغيل التحليل المقارن"}
                      className="inline-flex items-center gap-2 bg-navy text-white border-0 rounded-lg text-[13px] sm:text-[14px] font-semibold px-3.5 sm:px-4 py-2 min-h-[36px] transition-all hover:bg-navy-dark disabled:opacity-60 disabled:cursor-not-allowed flex-none shadow-sm">
                      {analyzing ? (<><svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="32" strokeLinecap="round" className="opacity-25" /><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="32" strokeDashoffset="24" strokeLinecap="round" /></svg>جارٍ المعالجة…</>) : (<><I.Sparkles className="w-4 h-4" />تشغيل التحليل</>)}
                    </button>
                  </div>
                </div>
                {/* DETAIL-05/-06: prerequisite hint when downloads/analysis are blocked */}
                {(noDocsYet || (!analyzed && !analyzing)) && (
                  <div className="flex items-start gap-2 rounded-lg bg-[#FAFBFD] border border-sutra-line-2 px-3.5 py-2.5 text-[12.5px] sm:text-[13px] leading-snug text-sutra-ink-2" role="status">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-navy mt-[1px] flex-none"><circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" /></svg>
                    <span>
                      {noDocsYet
                        ? "يرجى رفع المستندات أولًا — أضف ملفات القضية من تبويب المستندات، ثم شغّل التحليل."
                        : "يرجى تشغيل التحليل لإنتاج الدرجات وتنزيل ملخّصات الأطراف."}
                    </span>
                  </div>
                )}
                {analyzed ? (
                  <div className="space-y-6">
                    {/* Scores */}
                    <div className="grid grid-cols-2 gap-3 sm:gap-4"><ScoreCard label="الطرف الأول" score={a.party_a_strength_score ?? 50} c="navy" /><ScoreCard label="الطرف الثاني" score={a.party_b_strength_score ?? 50} c="amber" /></div>
                    <div className="bg-[#FAFBFD] border border-sutra-line-2 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-1.5"><I.Star className="w-4 h-4 text-navy" /><span className="text-[12px] sm:text-[13px] font-bold uppercase text-sutra-ink-3">الطرف الأقوى موقفًا</span></div>
                      <p className="text-[15px] sm:text-[16px] font-semibold text-sutra-ink ps-6">{a.dominating_party === "BALANCED" ? "متوازن — لا أفضلية واضحة" : labelOf(PARTY_LABEL, a.dominating_party) || "—"}</p>
                    </div>

                    {/* Party summaries: compare both sides side by side on larger screens. */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
                      <div className="space-y-4">
                        <PartySummary title="الطرف الأول — نقاط لصالحه" items={a.party_a_favorable_points} color="navy" type="favorable" />
                        <PartySummary title="الطرف الأول — نقاط ضعفه" items={a.party_a_opposing_allegations} color="navy" type="opposing" />
                      </div>
                      <div className="space-y-4">
                        <PartySummary title="الطرف الثاني — نقاط لصالحه" items={a.party_b_favorable_points} color="amber" type="favorable" />
                        <PartySummary title="الطرف الثاني — نقاط ضعفه" items={a.party_b_opposing_allegations} color="amber" type="opposing" />
                      </div>
                    </div>

                    {/* Allegation Matrix */}
                    {a.allegation_matrix && Array.isArray(a.allegation_matrix) && a.allegation_matrix.length > 0 && (
                      <div>
                        <SectionHeading icon={<I.Layers className="w-4 h-4 text-navy" />} title="مصفوفة الادعاءات والردود" />
                        <div className="space-y-3 ps-6">
                          {a.allegation_matrix.map((item: any, i: number) => (
                            <div key={i} className="bg-white border border-sutra-line-2 rounded-xl p-4 space-y-2">
                              <div className="flex items-start justify-between gap-2">
                                <p className="text-[14px] sm:text-[15px] font-semibold text-sutra-ink flex-1">{item.allegation || `ادعاء ${n(i + 1)}`}</p>
                                <span className={`text-[11px] sm:text-[12px] font-bold px-2 py-0.5 rounded-full flex-none ${item.raised_by === "PARTY_A" ? "bg-tint text-navy border border-tint-2" : "bg-amber-bg text-amber-ink border border-amber-200"}`}>{item.raised_by === "PARTY_A" ? "الطرف الأول" : "الطرف الثاني"}</span>
                              </div>
                              {item.counter_argument && (
                                <div className="bg-[#F8F9FB] rounded-lg px-3 py-2">
                                  <span className="text-[11px] sm:text-[12px] font-bold text-sutra-ink-3 uppercase">الرد</span>
                                  <p className="text-[13px] sm:text-[14px] text-sutra-ink mt-0.5">{item.counter_argument}</p>
                                </div>
                              )}
                              {item.evidentiary_status && <span className="text-[11px] sm:text-[12px] text-sutra-ink-3">الإثبات: {labelOf(EVIDENTIARY_LABEL, item.evidentiary_status)}</span>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Recommended Questions */}
                    {a.recommended_questions && Array.isArray(a.recommended_questions) && a.recommended_questions.length > 0 && (
                      <div>
                        <SectionHeading icon={<I.Sparkles className="w-4 h-4 text-navy" />} title="أسئلة مقترحة للوسيط" />
                        <div className="space-y-2 ps-6">
                          {a.recommended_questions.map((q: any, i: number) => (
                            <div key={i} className="flex items-start gap-3 py-2.5 border-b border-sutra-line-2 last:border-0">
                              <span className="flex-none w-6 h-6 rounded-full bg-tint text-navy grid place-items-center text-[11px] font-bold border border-tint-2">{i + 1}</span>
                              <div className="flex-1">
                                <p className="text-[14px] sm:text-[15px] text-sutra-ink">{q.question}</p>
                                {q.objective && <p className="text-[12px] sm:text-[13px] text-sutra-ink-3 mt-0.5">الهدف: {q.objective}</p>}
                              </div>
                              <span className="text-[11px] sm:text-[12px] font-bold text-sutra-ink-3 flex-none">→ {q.target_party === "PARTY_A" ? "الطرف الأول" : "الطرف الثاني"}</span>
                            </div>
                          )                          )}
                        </div>
                      </div>
                    )}

                    {/* Optional corpus references from researcher/curator-reviewed material. */}
                    <div>
                      <SectionHeading icon={<I.Scale className="w-4 h-4 text-navy" />} title="قضايا مرجعية" />
                      {(() => {
                        const references = Array.isArray(a.corpus_references) && a.corpus_references.length > 0
                          ? a.corpus_references
                          : Array.isArray(a.similar_cases) ? a.similar_cases : [];
                        return references.length > 0 ? (
                          <div className="space-y-3 ps-6">
                            {references.map((sc: any, i: number) => (
                              <div key={i} className="bg-white border border-sutra-line-2 rounded-xl p-4 space-y-2 hover:border-navy/30 transition-colors">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex-1 min-w-0">
                                    <p className="text-[14px] sm:text-[15px] font-semibold text-sutra-ink">{sc.title || "قضية بلا عنوان"}</p>
                                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                                      {sc.citation && <span className="text-[11px] sm:text-[12px] font-mono text-navy bg-tint px-2 py-0.5 rounded-md border border-tint-2"><Ltr>{sc.citation}</Ltr></span>}
                                      {sc.court && <span className="text-[11px] sm:text-[12px] text-sutra-ink-3">{sc.court}</span>}
                                      {sc.year && <span className="text-[11px] sm:text-[12px] text-sutra-ink-3">({n(sc.year)})</span>}
                                      <span className="text-[11px] text-sutra-ink-3 bg-slate-50 px-2 py-0.5 rounded-md">مرجع من المجموعة</span>
                                    </div>
                                  </div>
                                  {typeof sc.similarity === "number" && <span className="text-[11px] sm:text-[12px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 flex-none">توافق {percent(sc.similarity * 100)}</span>}
                                </div>
                                {sc.outcome && <p className="text-[13px] text-sutra-ink-2"><span className="font-semibold text-sutra-ink">المنطوق:</span> {sc.outcome}</p>}
                                {sc.excerpt && <p className="text-[12px] sm:text-[13px] text-sutra-ink-3 leading-relaxed line-clamp-3">{sc.excerpt}</p>}
                                {sc.pdf_url && <button type="button" onClick={() => openPreview({ name: `${sc.title || "قضية مرجعية"}.pdf`, url: sc.pdf_url, type: "application/pdf" }, "analysis")} className="inline-flex text-[12px] font-semibold text-navy hover:underline">عرض ملف PDF المرجعي</button>}
                              </div>
                            ))}
                          </div>
                        ) : <p className="ps-6 text-[13px] sm:text-[14px] text-sutra-ink-3">لم يُعثر على قضايا مرجعية مطابقة في المجموعة لهذا التحليل.</p>;
                      })()}
                    </div>
                  </div>
                ) : analyzing ? (
                  <div className="flex flex-col items-center justify-center py-16 gap-4">
                    <div className="w-12 h-12 rounded-full bg-navy/10 grid place-items-center">
                      <svg className="w-6 h-6 animate-spin text-navy" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="32" strokeLinecap="round" className="opacity-25" /><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="32" strokeDashoffset="24" strokeLinecap="round" /></svg>
                    </div>
                    <div className="text-center">
                      <p className="text-[16px] font-semibold text-sutra-ink">التحليل قيد التنفيذ</p>
                      <p className="text-[14px] text-sutra-ink-3 mt-1">يستغرق هذا عادةً من دقيقتين إلى ثلاث. يمكنك التنقل بين التبويبات — وسننبهك عند الجهوزية.</p>
                    </div>
                  </div>
                ) : <Empty icon={<I.BarChart className="w-7 h-7" />} t={noDocsYet ? "لا توجد مستندات بعد" : "لا يوجد تحليل بعد"} d={noDocsYet ? "يرجى رفع المستندات أولًا — أضف ملفات القضية من تبويب المستندات." : "اضغط «تشغيل التحليل» لإنتاج الدرجات وفتح التنزيلات."} />}
              </div>
            )}

            {/* Settlement */}
            {tab === "settlement" && (analyzed ? (
              <SettlementTab analysis={a} sessionId={sessionId} onRefresh={async () => { try { const r = await mediation.get(sessionId); setSession(r.data); } catch {} }} />
            ) : (
              // SETTLE-01: settlement creation is locked until comparative analysis has run.
              <div className="py-10 sm:py-12 text-center">
                <div className="w-14 h-14 rounded-2xl bg-amber-bg text-amber-700 grid place-items-center mx-auto mb-4 border border-amber-200">
                  <I.Scale className="w-6 h-6" />
                </div>
                <p className="text-[16px] sm:text-[17px] font-semibold text-sutra-ink mb-1.5">شغّل التحليل قبل التسوية</p>
                <p className="text-[13px] sm:text-[14px] text-sutra-ink-3 max-w-[360px] mx-auto mb-5 leading-relaxed">
                  {noDocsYet
                    ? "ارفع ملفات القضية من تبويب المستندات أولًا — يجب تشغيل التحليل المقارن قبل تسجيل ملاحظات التسوية."
                    : "لم يُشغَّل التحليل المقارن بعد. أنشئه أولًا حتى تُبنى ملاحظات التسوية على المراكز المحلَّلة للطرفين."}
                </p>
                <button
                  type="button"
                  onClick={() => setTab(noDocsYet ? "documents" : "analysis")}
                  className="inline-flex items-center gap-2 bg-navy text-white border-0 rounded-lg text-[13px] sm:text-[14px] font-semibold px-4 py-2 min-h-[36px] transition-all hover:bg-navy-dark shadow-sm"
                >
                  {noDocsYet ? (<><I.Upload className="w-4 h-4" />الانتقال إلى المستندات</>) : (<><I.BarChart className="w-4 h-4" />الانتقال إلى التحليل</>)}
                </button>
              </div>
            ))}

            {/* Documents */}
            {tab === "documents" && (
              <div className="space-y-5">
                {/* ── Inline Preview Mode ── */}
                {previewFile ? (
                  <>
                    {/* Custom Preview */}
                    <div ref={previewRef} className={`bg-white border border-sutra-line rounded-2xl overflow-hidden flex flex-col ${isFullscreen ? "fixed inset-0 z-[70] rounded-none border-0" : ""}`} style={isFullscreen ? {} : { minHeight: "400px" }}>
                      {/* Preview toolbar */}
                      <div className="flex items-center justify-between gap-3 px-4 sm:px-5 py-3 border-b border-sutra-line bg-[#FAFBFD] flex-none">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <button onClick={closePreview} className="inline-flex items-center gap-1 text-navy font-semibold text-[13px] sm:text-[14px] hover:text-navy-dark transition-colors group flex-none">
                            <span className="rtl-flip inline-flex"><I.ChevronL className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5" /></span>رجوع
                          </button>
                          <span className="w-px h-4 bg-sutra-line" />
                          <div className="flex items-center gap-2 min-w-0">
                            <I.File className="w-4 h-4 text-navy flex-none" />
                            <span className="text-[13px] sm:text-[14px] font-semibold text-sutra-ink truncate">{previewFile.name}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 flex-none">
                          <button onClick={toggleFullscreen}
                            className="inline-flex items-center gap-1.5 text-[12px] sm:text-[13px] font-semibold px-2.5 py-1.5 rounded-lg border border-sutra-line bg-white text-sutra-ink-2 hover:bg-tint hover:text-navy hover:border-navy/30 transition-all"
                            title={isFullscreen ? "إنهاء ملء الشاشة" : "ملء الشاشة"}>
                            {isFullscreen ? (
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5"><path d="M8 3v3a2 2 0 0 1-2 2H3" /><path d="M21 8h-3a2 2 0 0 1-2-2V3" /><path d="M3 16h3a2 2 0 0 1 2 2v3" /><path d="M16 21v-3a2 2 0 0 1 2-2h3" /></svg>
                            ) : (
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5"><path d="M8 3H5a2 2 0 0 0-2 2v3" /><path d="M21 8V5a2 2 0 0 0-2-2h-3" /><path d="M3 16v3a2 2 0 0 0 2 2h3" /><path d="M16 21h3a2 2 0 0 0 2-2v-3" /></svg>
                            )}
                            <span className="hidden sm:inline">{isFullscreen ? "إنهاء" : "ملء الشاشة"}</span>
                          </button>
                        </div>
                      </div>
                      {/* Preview content */}
                      <div className={`flex-1 overflow-hidden bg-[#F0F2F5] ${isFullscreen ? "" : " rounded-b-2xl"}`}>
                        {previewFile.type.startsWith("image/") ? (
                          <div className="flex items-center justify-center p-4 sm:p-6 h-full">
                            <img src={previewFile.url} alt={previewFile.name} className="max-w-full max-h-full rounded-lg shadow-sm object-contain" />
                          </div>
                        ) : previewFile.type === "application/pdf" ? (
                          <iframe src={previewFile.url} title={previewFile.name} className="w-full h-full border-0 bg-white" style={{ height: isFullscreen ? "calc(100vh - 52px)" : "calc(100vh - 320px)", minHeight: "400px" }} />
                        ) : (
                          <div className="flex flex-col items-center justify-center py-16 text-center">
                            <I.File className="w-10 h-10 text-sutra-line-2 mb-3" />
                            <p className="text-[14px] text-sutra-ink-3">المعاينة غير متاحة لهذا النوع من الملفات</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    {/* ── Document List Mode ── */}
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <h3 className="flex items-center gap-2 text-[15px] sm:text-[17px] font-bold"><I.FileText className="w-5 h-5 text-navy" />المستندات</h3>
                        {files.length > 0 && <span className="text-[12px] sm:text-[13px] text-sutra-ink-3">{count(files.length, FILES)}{pendingCount > 0 ? ` · ${n(pendingCount)} قيد الانتظار` : uploadingCount > 0 ? " · جارٍ الرفع…" : " · تم رفع الكل"}</span>}
                      </div>
                      <div className="flex items-center gap-2 flex-none">
                        {pendingCount > 0 && <button onClick={uploadAll} className="inline-flex items-center gap-2 bg-navy text-white border-0 rounded-lg text-[13px] sm:text-[14px] font-semibold px-3.5 sm:px-4 py-2 min-h-[36px] transition-all hover:bg-navy-dark shadow-sm"><I.Upload className="w-4 h-4" />رفع الكل ({n(pendingCount)})</button>}
                      </div>
                    </div>

                    {/* DOC-02: skippable prompt shown right after a clean upload */}
                    {uploadNotice && (
                      <div className="flex items-start justify-between gap-3 rounded-xl border border-green-200 bg-green-50 px-4 py-3" role="status">
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] sm:text-[14px] font-semibold text-green-800">تم رفع مستند جديد بنجاح.</p>
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1.5 text-[12.5px] sm:text-[13px]">
                            <button type="button"
                              onClick={() => { setUploadNotice(false); setTab("analysis"); doAnalyze(); }}
                              className="inline-flex items-center gap-1.5 rounded-lg bg-navy text-white font-semibold px-2.5 py-1.5 transition-colors hover:bg-navy-dark">
                              <I.Sparkles className="w-3.5 h-3.5" />إنشاء التحليل
                            </button>
                            <span className="text-green-800/70">أو</span>
                            <button type="button"
                              onClick={() => { setUploadNotice(false); fileInputRef.current?.click(); }}
                              className="font-semibold text-green-800 underline decoration-green-300 underline-offset-2 hover:decoration-green-600">
                              إضافة المزيد من المستندات
                            </button>
                          </div>
                        </div>
                        <button type="button" onClick={() => setUploadNotice(false)} aria-label="إغلاق" className="flex-none w-7 h-7 rounded-lg grid place-items-center text-green-800/60 hover:text-green-900 hover:bg-green-100 transition-colors"><I.X className="w-4 h-4" /></button>
                      </div>
                    )}
                    <input ref={fileInputRef} type="file" multiple accept=".pdf,image/*" className="hidden" onChange={e => { if (e.target.files?.length) addFiles(e.target.files); e.target.value = ""; }} />

                    {/* Drop zone */}
                    <div onDragOver={e => { e.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)} onDrop={e => { e.preventDefault(); setDragOver(false); if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files); }}
                      className={`border-2 border-dashed rounded-2xl p-8 sm:p-10 text-center cursor-pointer transition-all ${dragOver ? "border-navy bg-tint/60 scale-[1.01]" : "border-sutra-line hover:border-navy/40 hover:bg-tint/30"}`}
                      onClick={() => fileInputRef.current?.click()}>
                      <p className="text-[14px] sm:text-[15px] font-semibold text-sutra-ink mb-1">أفلت الملفات هنا أو اضغط للاختيار</p>
                      <p className="text-[12px] sm:text-[13px] text-sutra-ink-3">ملفات PDF وصور — تُنسب إلى الطرف الأول أو الثاني أو كليهما</p>
                    </div>

                    {/* File list */}
                    {files.length > 0 && (
                      <div className="space-y-2">
                        {files.map(f => (
                          <div key={f.id} className="flex items-center gap-3 bg-white border border-sutra-line rounded-xl px-3.5 sm:px-4 py-3 group">
                            <div className="flex-none w-10 h-10 rounded-lg bg-tint grid place-items-center overflow-hidden">
                              {f.preview ? <img src={f.preview} alt="" className="w-full h-full object-cover" /> : <I.File className="w-5 h-5 text-navy" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[13px] sm:text-[14px] font-semibold text-sutra-ink truncate" dir="ltr">{f.file.name}</p>
                              <p className="text-[11px] sm:text-[12px] text-sutra-ink-3">{bytes(f.file.size)}</p>
                            </div>
                            <div className="flex items-center gap-1.5 flex-none">
                              {(["A", "B", "both"] as const).map(p => (
                                <button key={p} onClick={() => updateParty(f.id, p)}
                                  className={`text-[11px] sm:text-[12px] font-bold px-2 py-1 rounded-md transition-all ${f.party === p ? (p === "A" ? "bg-tint text-navy border border-tint-2" : p === "B" ? "bg-amber-bg text-amber-ink border border-amber-200" : "bg-navy text-white") : "bg-sutra-line-2 text-sutra-ink-3 border border-transparent hover:bg-sutra-line"}`}>{p === "both" ? "كلاهما" : p === "A" ? "الطرف الأول" : "الطرف الثاني"}</button>
                              ))}
                            </div>
                            {/* Preview */}
                            <button onClick={() => {
                              const url = f.preview || URL.createObjectURL(f.file);
                              setPreviewFile({ name: f.file.name, url, type: f.file.type });
                            }} className="flex-none w-8 h-8 rounded-lg grid place-items-center text-sutra-ink-3 hover:text-navy hover:bg-tint transition-colors" title="معاينة">
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z" /><circle cx="12" cy="12" r="3" /></svg>
                            </button>
                            {/* Status indicator */}
                            <div className="flex-none w-7 h-7 rounded-full grid place-items-center">
                              {f.status === "pending" && <span className="w-2 h-2 rounded-full bg-sutra-line-2" />}
                              {f.status === "uploading" && <svg className="w-4 h-4 animate-spin text-navy" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="32" strokeLinecap="round" className="opacity-25" /><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="32" strokeDashoffset="24" strokeLinecap="round" /></svg>}
                              {f.status === "done" && <svg className="w-5 h-5 text-green-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>}
                              {f.status === "error" && <svg className="w-5 h-5 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg>}
                            </div>
                            <button onClick={() => removeFile(f.id)} className="flex-none w-8 h-8 rounded-lg grid place-items-center text-sutra-ink-3 hover:text-red-600 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"><I.Trash className="w-4 h-4" /></button>
                          </div>
                        ))}
                      </div>
                    )}                    {/* Existing docs from session */}
                    {docs.length > 0 && (
                      <div>
                        <h4 className="text-[12px] sm:text-[13px] font-bold uppercase text-sutra-ink-3 mb-2.5">المرفوعة</h4>
                        <div className="space-y-2">{docs.map((d: any, i: number) => (
                          <div key={d.id ?? i} className="flex items-center gap-3 bg-white border border-sutra-line rounded-xl px-3.5 sm:px-4 py-3 group">
                            <div className="flex-none w-10 h-10 rounded-lg bg-tint grid place-items-center overflow-hidden">
                              {d.file_url?.match(/\.(png|jpg|jpeg|gif|webp)/i) ? (
                                <img src={d.file_url} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <I.File className="w-5 h-5 text-navy" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[13px] sm:text-[14px] font-semibold text-sutra-ink truncate">{d.original_filename || `مستند ${n(i + 1)}`}</p>
                              <div className="flex items-center gap-2">
                                <span className="text-[11px] sm:text-[12px] text-sutra-ink-3">{d.document_type || "مستند"}</span>
                                {d.party_type && <span className={`text-[10px] sm:text-[11px] font-bold px-1.5 py-0.5 rounded ${d.party_type === "PARTY_A" ? "bg-tint text-navy border border-tint-2" : "bg-amber-bg text-amber-ink border border-amber-200"}`}>{labelOf(PARTY_LABEL, d.party_type)}</span>}
                                {d.file_size_bytes && <span className="text-[11px] sm:text-[12px] text-sutra-ink-3">{bytes(d.file_size_bytes)}</span>}
                              </div>
                            </div>
                            {/* Preview — presigned URLs carry query params, so match on
                                the pathname portion rather than endsWith(".pdf") */}
                            {d.file_url && (
                              <button onClick={() => {
                                const isPdf = !!d.file_url && (d.file_url.split("?")[0].endsWith(".pdf") || /\.pdf(\?|$)/i.test(d.file_url));
                                openPreview({ name: d.original_filename || "مستند", url: d.file_url, type: isPdf ? "application/pdf" : "image/" }, "documents");
                              }} className="flex-none w-8 h-8 rounded-lg grid place-items-center text-sutra-ink-3 hover:text-navy hover:bg-tint transition-colors opacity-0 group-hover:opacity-100" title="معاينة">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z" /><circle cx="12" cy="12" r="3" /></svg>
                              </button>
                            )}
                            {/* Delete */}
                            <button onClick={async () => {
                              if (!confirm(`حذف «${d.original_filename}»؟`)) return;
                              try {
                                await mediation.deleteDocument(sessionId, d.id);
                                const r = await mediation.get(sessionId);
                                setSession(r.data);
                                showToast("تم حذف المستند", "success");
                              } catch (err: unknown) {
                                showToast(err instanceof Error ? err.message : "تعذّر الحذف", "error");
                              }
                            }} className="flex-none w-8 h-8 rounded-lg grid place-items-center text-sutra-ink-3 hover:text-red-600 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100" title="حذف">
                              <I.Trash className="w-4 h-4" />
                            </button>
                          </div>
                    ))}</div>
                      </div>
                    )}

                {files.length === 0 && docs.length === 0 && <Empty icon={<I.File className="w-7 h-7" />} t="لا توجد مستندات بعد" d="ارفع ملفات القضية أو الأدلة أو الإفادات لأي من الطرفين." />}
                  </>
                )}
              </div>
            )}

            {/* Timeline */}
            {tab === "timeline" && (
              <TimelineTab session={session} analysis={a} docs={docs} />
            )}
          </div>
        </div>
      </main>

      {/* ═══ Chat FAB — hidden while the panel is open, which carries its own
          close button; showing a second X here made two. ═══ */}
      {!chatOpen && (
        <button onClick={() => setChatOpen(true)}
          className="fixed bottom-5 end-5 sm:bottom-6 sm:end-6 z-50 w-14 h-14 sm:w-[60px] sm:h-[60px] rounded-full shadow-lg flex items-center justify-center transition-all duration-300 bg-navy text-white hover:bg-navy-dark hover:scale-105 shadow-navy/25">
          <I.Chat className="w-6 h-6 sm:w-[26px] sm:h-[26px]" />
        </button>
      )}

      {!chatOpen && chatMessages.length > 0 && chatMessages[chatMessages.length - 1].role === "assistant" && (
        <span className="fixed bottom-[68px] sm:bottom-[76px] end-5 sm:end-6 z-50 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow">1</span>
      )}

      {/* ═══ Chat Panel ═══ */}
      {chatOpen && (
        <div className="fixed bottom-24 sm:bottom-[76px] end-4 sm:end-6 z-50 w-[calc(100vw-32px)] sm:w-[400px] h-[min(calc(100vh-140px),560px)] bg-white border border-sutra-line rounded-2xl shadow-2xl shadow-black/10 flex flex-col overflow-hidden animate-in">
          <div className="flex items-center gap-3 px-4 sm:px-5 py-3.5 border-b border-sutra-line bg-white flex-none">
            <span className="w-9 h-9 rounded-full bg-navy text-white grid place-items-center flex-none"><I.Chat className="w-[18px] h-[18px]" /></span>
            <div className="flex-1 min-w-0"><h4 className="text-[14px] sm:text-[15px] font-bold text-sutra-ink leading-tight">محادثة الوسيط</h4><p className="text-[11px] sm:text-[12px] text-sutra-ink-3">{analyzed ? "اسأل عن هذا النزاع" : "تُفتح بعد التحليل"}</p></div>
            <button onClick={() => setChatOpen(false)} className="w-8 h-8 rounded-lg grid place-items-center hover:bg-tint transition-colors text-sutra-ink-3"><I.X className="w-4 h-4" /></button>
          </div>
          <div className="flex-1 overflow-y-auto px-4 sm:px-5 py-3 space-y-2.5">
            {!analyzed && (
              <div className="flex items-start gap-2 rounded-xl bg-amber-bg border border-amber-200 px-3 py-2.5 text-[12px] sm:text-[12.5px] leading-snug text-amber-800">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-amber-600 mt-[1px] flex-none"><circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" /></svg>
                <span>المحادثة مغلقة حتى يكتمل التحليل المقارن. {noDocsYet ? "ارفع المستندات أولًا، ثم شغّل التحليل." : "شغّل التحليل من تبويب التحليل لفتح المحادثة."}</span>
              </div>
            )}
            {chatMessages.length === 0 && (<div className="flex flex-col items-center justify-center h-full text-center py-8"><div className="w-12 h-12 rounded-2xl bg-tint text-navy grid place-items-center mb-3 border border-tint-2"><I.Chat className="w-5 h-5" /></div><p className="text-[13px] sm:text-[14px] font-semibold text-sutra-ink mb-0.5">{analyzed ? "ابدأ محادثة" : "محادثة الوسيط"}</p><p className="text-[12px] text-sutra-ink-3">{analyzed ? "اسأل عن الطرفين أو النزاع أو التسوية." : "يمكنك طرح الأسئلة بعد تحليل النزاع."}</p></div>)}
            {chatMessages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                {m.role === "user" ? <div className="max-w-[85%] px-3.5 py-2.5 rounded-2xl text-[13px] sm:text-[14px] leading-relaxed bg-navy text-white rounded-ee-md">{m.content}</div>
                : <div className="max-w-[85%] px-3.5 py-2.5 rounded-2xl text-[13px] sm:text-[14px] leading-relaxed bg-[#F4F6F8] text-sutra-ink border border-sutra-line-2 rounded-es-md chat-markdown"><Markdown>{m.content}</Markdown></div>}
              </div>
            ))}
            {chatLoading && <div className="flex justify-start"><div className="bg-[#F4F6F8] border border-sutra-line-2 rounded-2xl rounded-es-md px-4 py-3"><div className="flex gap-1"><span className="w-2 h-2 rounded-full bg-sutra-line-2 animate-bounce [animation-delay:0ms]" /><span className="w-2 h-2 rounded-full bg-sutra-line-2 animate-bounce [animation-delay:150ms]" /><span className="w-2 h-2 rounded-full bg-sutra-line-2 animate-bounce [animation-delay:300ms]" /></div></div></div>}
            <div ref={chatEnd} />
          </div>
          <div className="px-4 sm:px-5 py-3 border-t border-sutra-line bg-white flex-none">
            <div className="flex gap-2">
              <input type="text" value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter") doChat(); }} disabled={!analyzed} placeholder={analyzed ? "اسأل عن هذا النزاع…" : "تُفتح المحادثة بعد التحليل"} aria-label="اسأل عن هذا النزاع" className="flex-1 min-h-[42px] border border-sutra-line rounded-xl px-4 font-[inherit] text-[13px] sm:text-[14px] text-sutra-ink outline-none transition-all focus:border-navy focus:ring-2 focus:ring-navy/10 placeholder:text-sutra-ink-3 disabled:bg-sutra-line-2/50 disabled:cursor-not-allowed" />
              <button onClick={doChat} disabled={!analyzed || !chatInput.trim() || chatLoading} aria-disabled={!analyzed || !chatInput.trim() || chatLoading} title={analyzed ? "إرسال الرسالة" : "تُفتح المحادثة بعد التحليل"} className="w-10 h-10 rounded-xl bg-navy text-white grid place-items-center flex-none transition-all hover:bg-navy-dark disabled:opacity-40 disabled:cursor-not-allowed"><I.Send className="w-[18px] h-[18px]" /></button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[70] animate-in">
          <div className={`flex items-center gap-2.5 px-4 sm:px-5 py-3 rounded-xl shadow-lg border ${toast.type === "error" ? "bg-red-50 border-red-200 text-red-700" : "bg-green-50 border-green-200 text-green-700"}`}>
            {toast.type === "error" ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-4 h-4 flex-none"><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-4 h-4 flex-none"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
            )}
            <span className="text-[13px] sm:text-[14px] font-semibold">{toast.message}</span>
            <button
              type="button"
              onClick={() => setToast(null)}
              className="ms-1 h-6 w-6 rounded-full grid place-items-center flex-none hover:bg-black/5 transition-colors"
              aria-label="إغلاق الإشعار"
            >
              <I.X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Shared ─── */
function PartyCard({ label, name, initial, align = "left" }: { label: string; name: string; initial: string; align?: "left" | "right" }) {
  const right = align === "right";
  return <div className={`flex items-center gap-2.5 sm:gap-3 min-w-0 ${right ? "flex-row-reverse text-end" : ""}`}><span className="flex-none w-9 h-9 sm:w-[40px] sm:h-[40px] rounded-full bg-tint-2 text-navy grid place-items-center font-bold text-[14px] sm:text-[16px] border border-[#CFE0F0]">{initial}</span><div className="min-w-0"><div className="text-[10px] sm:text-[11px] font-bold uppercase text-sutra-ink-3">{label}</div><div className="text-[15px] sm:text-[16px] font-semibold text-sutra-ink leading-tight truncate">{name}</div></div></div>;
}
function PosCard({ label, val, c }: { label: string; val?: string; c: "navy" | "amber" }) {
  return <div className="bg-[#FAFBFD] border border-sutra-line-2 rounded-xl p-3.5"><div className="flex items-center gap-1.5 mb-1.5"><span className={`w-2 h-2 rounded-full ${c === "navy" ? "bg-navy" : "bg-amber-400"}`} /><span className="text-[11px] sm:text-[12px] font-bold uppercase text-sutra-ink-3">{label}</span></div><p className="text-[14px] sm:text-[15px] text-sutra-ink leading-relaxed">{val || "بانتظار التحليل."}</p></div>;
}
function ScoreCard({ label, score, c }: { label: string; score: number; c: "navy" | "amber" }) {
  return <div className="bg-[#FAFBFD] border border-sutra-line-2 rounded-xl p-3.5 sm:p-4"><div className="flex items-center gap-1.5 mb-2"><span className={`w-2 h-2 rounded-full ${c === "navy" ? "bg-navy" : "bg-amber-400"}`} /><span className="text-[11px] sm:text-[12px] font-bold uppercase text-sutra-ink-3">{label}</span></div><div className="flex items-end gap-1.5"><span className="text-[28px] sm:text-[32px] font-bold leading-none">{score}</span><span className="text-[13px] sm:text-[14px] text-sutra-ink-3 mb-0.5">/ 100</span></div><div className="mt-2.5 h-2 bg-sutra-line-2 rounded-full overflow-hidden"><div className={`h-full rounded-full transition-all duration-500 ${c === "navy" ? "bg-navy" : "bg-amber-400"}`} style={{ width: `${score}%` }} /></div></div>;
}
function MetaChip({ icon, label }: { icon: React.ReactNode; label: string }) {
  return <span className="inline-flex items-center gap-1.5 text-[12px] sm:text-[13px] font-medium text-sutra-ink-2 bg-[#FAFBFD] border border-sutra-line-2 rounded-full py-1.5 px-3">{icon}{label}</span>;
}
function StatusBadge({ session }: { session: MaybeSession }) {
  const st = getSessionStage(session);
  const tone =
    st.tone === "green"
      ? "bg-green-bg text-green-ink"
      : st.tone === "slate"
        ? "bg-sutra-line-2 text-sutra-ink-2"
        : st.tone === "navy"
          ? "bg-tint text-navy"
          : "bg-amber-bg text-amber-ink";
  const dot =
    st.tone === "green"
      ? "bg-green-dot"
      : st.tone === "slate"
        ? "bg-sutra-ink-3"
        : st.tone === "navy"
          ? "bg-navy"
          : "bg-amber-dot";
  return <span className={`inline-flex items-center gap-1.5 text-[11px] sm:text-[12px] font-semibold px-2.5 py-1 rounded-full ${tone}`}><span className={`w-1.5 h-1.5 rounded-full flex-none ${dot}`} />{st.label}</span>;
}
function Empty({ icon, t, d }: { icon: React.ReactNode; t: string; d: string }) {
  return <div className="text-center py-10 sm:py-12"><div className="w-14 h-14 rounded-2xl bg-tint text-navy grid place-items-center mx-auto mb-3 border border-tint-2">{icon}</div><p className="text-[15px] sm:text-[16px] font-semibold text-sutra-ink mb-1">{t}</p><p className="text-[13px] sm:text-[14px] text-sutra-ink-3 max-w-[300px] mx-auto">{d}</p></div>;
}

function SectionHeading({ icon, title }: { icon: React.ReactNode; title: string }) {
  return <h4 className="flex items-center gap-2 text-[12px] sm:text-[13px] font-bold uppercase text-sutra-ink-3 mb-3">{icon}{title}</h4>;
}

function TimelineTab({ session, analysis, docs }: { session: any; analysis: any; docs: any[] }) {
  const events: { date: string; label: string; desc: string; color: string }[] = [];

  if (session.created_at) {
    events.push({
      date: dateTime(session.created_at),
      label: "إنشاء الجلسة",
      desc: `أُنشئت جلسة وساطة بعنوان «${session.title}» بين ${session.party_a_name} و${session.party_b_name}.`,
      color: "navy",
    });
  }

  const docDates = new Map<string, number>();
  docs.forEach((d: any) => {
    if (d.uploaded_at) {
      const key = date(d.uploaded_at);
      docDates.set(key, (docDates.get(key) || 0) + 1);
    }
  });
  docDates.forEach((docCount, dateStr) => {
    events.push({
      date: dateStr,
      label: "رفع المستندات",
      desc: `${count(docCount, DOCS)} رُفعت إلى الجلسة.`,
      color: "amber",
    });
  });

  if (analysis?.analyzed_at) {
    events.push({
      date: dateTime(analysis.analyzed_at),
      label: "اكتمال التحليل المقارن",
      desc: `درجة الطرف الأول ${n(analysis.party_a_strength_score) || "—"} من ١٠٠، ودرجة الطرف الثاني ${n(analysis.party_b_strength_score) || "—"} من ١٠٠. الطرف الأقوى: ${labelOf(PARTY_LABEL, analysis.dominating_party) || "—"}.`,
      color: "green",
    });
  }

  if (session.chat_messages?.length > 0) {
    const firstChat = session.chat_messages[0];
    events.push({
      date: date(firstChat.created_at),
      label: "بدء محادثة الوسيط",
      desc: `${count(session.chat_messages.length, QUESTIONS)} في محادثة الوسيط.`,
      color: "purple",
    });
  }

  events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const colorMap: Record<string, string> = {
    navy: "bg-navy",
    amber: "bg-amber-400",
    green: "bg-green-500",
    purple: "bg-purple-500",
  };

  return (
    <div className="space-y-4">
      <h3 className="flex items-center gap-2 text-[15px] sm:text-[17px] font-bold"><I.Clock className="w-5 h-5 text-navy" />الخط الزمني للجلسة</h3>
      {events.length > 0 ? (
        // DOC-03: viewport-derived height so the timeline scrolls independently of page layout.
        <div className="h-[min(calc(100dvh-400px),560px)] min-h-[240px] overflow-y-auto pe-2 -me-2" style={{ overscrollBehavior: "contain" }}>
          <div className="relative">
            {/* Continuous vertical line behind all dots */}
            <div className="absolute left-[9px] top-[10px] bottom-[10px] w-0.5 bg-sutra-line" />
            {events.map((e, i) => (
              <div key={i} className="relative flex gap-4 pb-5 last:pb-0">
                {/* Dot — positioned on the line */}
                <div className="flex-none relative z-10 mt-1.5">
                  <div className={`w-[18px] h-[18px] rounded-full border-[3px] border-white shadow-sm ${colorMap[e.color] || "bg-navy"}`} />
                </div>
                {/* Content */}
                <div className="flex-1 min-w-0 pt-0.5">
                  <span className="text-[11px] sm:text-[12px] font-bold text-sutra-ink-3 uppercase">{e.date}</span>
                  <p className="text-[14px] sm:text-[15px] font-semibold text-sutra-ink mt-0.5">{e.label}</p>
                  <p className="text-[13px] sm:text-[14px] text-sutra-ink-2 mt-0.5 leading-relaxed">{e.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : <Empty icon={<I.Clock className="w-7 h-7" />} t="لا يوجد خط زمني بعد" d="تظهر أحداث الخط الزمني أثناء استخدام الجلسة." />}
    </div>
  );
}

function PartySummary({ title, items, color, type }: { title: string; items: any[]; color: "navy" | "amber"; type: "favorable" | "opposing" }) {
  if (!items || !items.length) return null;
  return (
    <div className="bg-white border border-sutra-line-2 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className={`w-2 h-2 rounded-full ${color === "navy" ? "bg-navy" : "bg-amber-400"}`} />
        <span className="text-[12px] sm:text-[13px] font-bold uppercase text-sutra-ink-3">{title}</span>
      </div>
      <div className="space-y-2">
        {items.map((item: any, i: number) => (
          <div key={i} className="flex items-start gap-2.5">
            <span className={`flex-none w-5 h-5 rounded-full grid place-items-center text-[10px] font-bold mt-0.5 ${type === "favorable" ? "bg-green-bg text-green-ink border border-green-200" : "bg-red-50 text-red-600 border border-red-200"}`}>{type === "favorable" ? "✓" : "✗"}</span>
            <div className="flex-1">
              <p className="text-[13px] sm:text-[14px] text-sutra-ink leading-relaxed">{item.point || item}</p>
              {(item.strength || item.severity) && <span className={`text-[11px] sm:text-[12px] font-bold px-1.5 py-0.5 rounded mt-0.5 inline-block ${item.strength === "high" || item.severity === "high" ? "bg-red-50 text-red-600" : item.strength === "medium" || item.severity === "medium" ? "bg-amber-bg text-amber-ink" : "bg-sutra-line-2 text-sutra-ink-3"}`}>{labelOf(RATING_LABEL, item.strength || item.severity)}</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SettlementTab({ analysis, sessionId, onRefresh }: { analysis: any; sessionId: number; onRefresh: () => Promise<void> }) {
  const [notes, setNotes] = useState(analysis?.settlement_notes || "");
  const [mode, setMode] = useState<"write" | "preview">((analysis?.settlement_notes || "").trim() ? "preview" : "write");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await mediation.saveSettlement(sessionId, notes);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      await onRefresh();
    } catch {}
    setSaving(false);
  };

  const seg = (active: boolean) =>
    `px-3 py-1.5 text-[12px] sm:text-[13px] font-semibold rounded-lg transition-colors border ${
      active ? "bg-navy text-white border-navy" : "text-sutra-ink-2 bg-white border-sutra-line hover:border-navy/30 hover:bg-tint"
    }`;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h3 className="flex items-center gap-2 text-[15px] sm:text-[17px] font-bold"><I.Scale className="w-5 h-5 text-navy" />ملاحظات التسوية</h3>
          <p className="text-[13px] sm:text-[14px] text-sutra-ink-3 mt-0.5">وثّق مقترحات التسوية ونقاط الاتفاق ومسوّدات الاتفاقية. تدعم المحرّر صيغة Markdown.</p>
        </div>
        <div className="flex items-center gap-1.5" role="group" aria-label="وضع المحرر">
          <button type="button" onClick={() => setMode("write")} className={seg(mode === "write")}>كتابة</button>
          <button type="button" onClick={() => setMode("preview")} className={seg(mode === "preview")}>معاينة</button>
        </div>
      </div>

      {mode === "write" ? (
        <RichSettlementEditor value={notes} onChange={setNotes} />
      ) : (
        <div className="min-h-[240px] max-h-[540px] overflow-y-auto border border-sutra-line rounded-xl bg-[#FAFBFD] px-4 py-3.5">
          {notes.trim() ? (
            notes.trimStart().startsWith("<") ? (
              <div className="text-[14px] sm:text-[15px] text-sutra-ink leading-relaxed" dangerouslySetInnerHTML={{ __html: sanitizeRichText(notes) }} />
            ) : (
              <div className="chat-markdown text-[14px] sm:text-[15px] text-sutra-ink leading-relaxed"><Markdown>{notes}</Markdown></div>
            )
          ) : (
            <p className="text-[13px] sm:text-[14px] text-sutra-ink-3">لم يُكتب شيء بعد — انتقل إلى «كتابة» للبدء.</p>
          )}
        </div>
      )}

      <div className="flex items-center gap-3">
        <button onClick={handleSave} disabled={saving} className="inline-flex items-center gap-2 bg-navy text-white border-0 rounded-lg text-[13px] sm:text-[14px] font-semibold px-4 py-2 min-h-[36px] transition-all hover:bg-navy-dark disabled:opacity-50 flex-none shadow-sm">
          {saving ? "جارٍ الحفظ…" : saved ? "✓ تم الحفظ" : "حفظ الملاحظات"}
        </button>
        {saved && <span className="text-[13px] text-green-600 font-medium">تم حفظ ملاحظات التسوية بنجاح</span>}
      </div>
    </div>
  );
}

function RichSettlementEditor({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const [, forceRender] = useState(0);
  const editor = useEditor({
    extensions: [StarterKit, Underline],
    content: value,
    immediatelyRender: false,
    onUpdate: ({ editor: instance }) => onChange(instance.getHTML()),
  });

  useEffect(() => {
    if (editor && value !== editor.getHTML()) editor.commands.setContent(value, { emitUpdate: false });
  }, [editor, value]);

  useEffect(() => {
    if (!editor) return;
    const refreshToolbar = () => forceRender((version) => version + 1);
    editor.on("transaction", refreshToolbar);
    editor.on("selectionUpdate", refreshToolbar);
    return () => {
      editor.off("transaction", refreshToolbar);
      editor.off("selectionUpdate", refreshToolbar);
    };
  }, [editor]);

  if (!editor) return null;

  const button = (title: string, Icon: typeof Bold, action: () => void, active = false) => (
    <button type="button" title={title} aria-label={title} onMouseDown={(event) => event.preventDefault()} onClick={action} className={`grid h-8 w-8 place-items-center rounded-md transition-colors cursor-pointer ${active ? "bg-navy text-white" : "text-sutra-ink-2 hover:bg-tint hover:text-navy"}`}>
      <Icon className="h-4 w-4" strokeWidth={2} />
    </button>
  );

  return (
    <div className="overflow-hidden rounded-xl border border-sutra-line focus-within:border-navy focus-within:ring-2 focus-within:ring-navy/10">
      <div className="flex flex-wrap items-center gap-0.5 border-b border-sutra-line-2 bg-[#FAFBFD] p-1.5" role="toolbar" aria-label="تنسيق التسوية">
        {button("عريض", Bold, () => editor.chain().focus().toggleBold().run(), editor.isActive("bold"))}
        {button("مائل", Italic, () => editor.chain().focus().toggleItalic().run(), editor.isActive("italic"))}
        {button("تسطير", UnderlineIcon, () => editor.chain().focus().toggleUnderline().run(), editor.isActive("underline"))}
        <span className="mx-1 h-5 w-px bg-sutra-line-2" aria-hidden="true" />
        {button("عنوان ٢", Heading2, () => editor.chain().focus().toggleHeading({ level: 2 }).run(), editor.isActive("heading", { level: 2 }))}
        {button("قائمة نقطية", List, () => editor.chain().focus().toggleBulletList().run(), editor.isActive("bulletList"))}
        {button("قائمة مرقّمة", ListOrdered, () => editor.chain().focus().toggleOrderedList().run(), editor.isActive("orderedList"))}
        {button("اقتباس", Quote, () => editor.chain().focus().toggleBlockquote().run(), editor.isActive("blockquote"))}
        <span className="mx-1 h-5 w-px bg-sutra-line-2" aria-hidden="true" />
        {button("إزالة التنسيق", RemoveFormatting, () => editor.chain().focus().clearNodes().unsetAllMarks().run())}
        {button("إلغاء تحديد النص", MousePointer2, () => editor.commands.setTextSelection(editor.state.selection.to))}
        {button("تراجع", Undo2, () => editor.chain().focus().undo().run())}
        {button("إعادة", Redo2, () => editor.chain().focus().redo().run())}
      </div>
      {/*
        The empty-state prompt is a real element, not a CSS `::before` rule.
        Browser translation walks the DOM's text nodes and never sees
        stylesheet-generated content, so a prompt drawn in CSS is untranslatable
        and invisible to a screen reader. The editor is wrapped in a relative
        box so the prompt can sit over the ProseMirror surface, and it is
        pointer-events-none so the first click still lands in the editor.
      */}
      <div className="relative">
        <EditorContent editor={editor} className="rich-settlement-editor min-h-[240px] max-h-[540px] overflow-y-auto px-4 py-3 text-[14px] sm:text-[15px] text-sutra-ink leading-relaxed outline-none" />
        {editor.isEmpty && (
          <p className="pointer-events-none absolute top-3 start-4 text-[14px] sm:text-[15px] leading-relaxed text-sutra-ink-3">
            اكتب ملاحظات التسوية هنا…
          </p>
        )}
      </div>
    </div>
  );
}

/**
 * Allow-list sanitiser for the settlement preview.
 *
 * This was a chain of regexes that stripped `<script>`, `<style>` and
 * `on*="..."` handlers. Regexes cannot sanitise HTML — the handler rule only
 * matched *quoted* values, so `<img src=x onerror=alert(1)>` (unquoted, and a
 * perfectly valid attribute) passed straight through into
 * `dangerouslySetInnerHTML` and executed. Reproduced in Chrome against the
 * settlement preview: the `<img>` was created, carried its `onerror`, and the
 * alert fired.
 *
 * Parsing with the browser's own HTML parser and rebuilding from an allow-list
 * removes the whole class: unquoted attributes, mixed case, `<svg>`/`<math>`
 * namespace tricks and malformed markup all normalise to nodes we then judge
 * by tag and attribute name.
 */
const ALLOWED_TAGS = new Set([
  "P", "BR", "HR", "DIV", "SPAN",
  "STRONG", "B", "EM", "I", "U", "S", "SUB", "SUP", "MARK",
  "H1", "H2", "H3", "H4", "H5", "H6",
  "UL", "OL", "LI",
  "BLOCKQUOTE", "PRE", "CODE",
  "TABLE", "THEAD", "TBODY", "TFOOT", "TR", "TH", "TD",
  "A",
]);

/** Attributes kept per tag. Anything unlisted is dropped, `on*` included. */
const ALLOWED_ATTRS: Record<string, Set<string>> = {
  A: new Set(["href", "title"]),
  OL: new Set(["start"]),
  TD: new Set(["colspan", "rowspan"]),
  TH: new Set(["colspan", "rowspan", "scope"]),
};

/** Attributes kept on every allowed tag. */
const GLOBAL_ATTRS = new Set(["class"]);

/** Only these schemes survive on an `href`. */
function isSafeHref(value: string): boolean {
  const url = value.trim().toLowerCase();
  return (
    url.startsWith("http://") ||
    url.startsWith("https://") ||
    url.startsWith("mailto:") ||
    url.startsWith("/") ||
    url.startsWith("#")
  );
}

function sanitizeRichText(html: string): string {
  // During SSR there is no DOM to parse with. The settlement preview only ever
  // renders after a client-side fetch has populated the notes, so there is
  // nothing to sanitise here — emitting nothing is both safe and accurate.
  if (typeof document === "undefined") return "";

  const template = document.createElement("template");
  template.innerHTML = html;

  const clean = (node: Node): Node | null => {
    if (node.nodeType === Node.TEXT_NODE) return document.createTextNode(node.nodeValue ?? "");

    // Drop comments and anything that is not an element.
    if (node.nodeType !== Node.ELEMENT_NODE) return null;

    const el = node as Element;
    if (!ALLOWED_TAGS.has(el.tagName)) return null;

    const out = document.createElement(el.tagName.toLowerCase());
    const allowed = ALLOWED_ATTRS[el.tagName] ?? new Set<string>();

    for (const attr of Array.from(el.attributes)) {
      const name = attr.name.toLowerCase();
      if (name.startsWith("on") || name === "style" || name === "srcdoc") continue;
      if (!GLOBAL_ATTRS.has(name) && !allowed.has(name)) continue;
      if (name === "href" && !isSafeHref(attr.value)) continue;
      out.setAttribute(name, attr.value);
    }

    // `target="_blank"` links should not hand the opener to the destination.
    if (el.tagName === "A" && out.getAttribute("href")?.startsWith("http")) {
      out.setAttribute("rel", "noopener noreferrer");
    }

    for (const child of Array.from(el.childNodes)) {
      const kept = clean(child);
      if (kept) out.appendChild(kept);
    }
    return out;
  };

  const container = document.createElement("div");
  for (const child of Array.from(template.content.childNodes)) {
    const kept = clean(child);
    if (kept) container.appendChild(kept);
  }
  return container.innerHTML;
}

function normalizeChatAnswer(payload: unknown): string {
  let value = payload;
  for (let attempt = 0; attempt < 2 && typeof value === "string"; attempt += 1) {
    try {
      const parsed: unknown = JSON.parse(value);
      value = parsed;
    } catch {
      break;
    }
  }
  if (Array.isArray(value)) value = value[0];
  if (value && typeof value === "object" && "answer" in value) {
    const result = value as { answer?: unknown; follow_up?: unknown };
    const answer = typeof result.answer === "string" ? result.answer : "";
    const followUp = typeof result.follow_up === "string" ? result.follow_up : "";
    if (answer || followUp) return [answer, followUp].filter(Boolean).join("\n\n");
  }
  return typeof value === "string" && value.trim() ? value : "لا يوجد رد.";
}
