"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import TopBar from "@/components/TopBar";
import { workspace as workspaceApi } from "@/lib/api";
import Ltr from "@/components/Ltr";
import { bytes, count, n, type PluralForms } from "@/lib/num";

/* ─── Types ─── */
type MsgKind = "text" | "analysis" | "pages" | "verdict";

interface PageNote {
  page: number;
  text: string;
}

interface DocEntry {
  id: string;
  name: string;
  size: number;
  /** original File kept so the PDF can be uploaded to the backend on demand */
  file: File;
  /** pdf.js PDFDocumentProxy */
  pdf: any;
  numPages: number;
  /** page the reader is on, kept per document */
  page: number;
  /** backend workspace document id (after upload), null until uploaded */
  backendId: number | null;
  /** true once upload succeeded, so we never re-upload the same file */
  uploaded: boolean;
}

interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  kind: MsgKind;
  content: string;
  /** analysis card body selector */
  action?: string;
  /** page-by-page stream */
  pages?: PageNote[];
  pageTotal?: number;
  streaming?: boolean;
  timestamp: Date;
}

type ActionType = "summary" | "important" | "witness" | "police" | null;

const ACTION_TITLES: Record<string, string> = {
  summary: "ملخّص القضية",
  important: "الصفحات المهمة",
  witness: "الشهود والأشخاص الرئيسيون",
  police: "مركز الشرطة / المحقق",
};

/** Page counts — reading the walk, the document chip, the stored list. */
const PAGES: PluralForms = {
  one: "صفحة واحدة",
  two: "صفحتان",
  few: "صفحات",
  many: "صفحة",
  other: "صفحة",
};

/** Summarised-page counts, for the stored-document list. */
const SUMMARISED: PluralForms = {
  one: "صفحة واحدة ملخّصة",
  two: "صفحتان ملخّصتان",
  few: "صفحات ملخّصة",
  many: "صفحة ملخّصة",
  other: "صفحة ملخّصة",
};

/**
 * Upload a workspace PDF to the backend once (dedupe by content hash keeps
 * re-uploads idempotent), then return the per-page summary for `pageNo`.
 * The backend persists each page's summary, so repeat runs are served from
 * the DB instead of re-running the AI.
 */
async function summarisePage(
  doc: DocEntry,
  pageNo: number,
  getBackendId: () => number | null,
  setBackendId: (id: number | null) => void
): Promise<PageNote> {
  const fallback: PageNote = {
    page: pageNo,
    text: `Summary for page ${pageNo} is unavailable right now.`,
  };

  let backendId = getBackendId();
  if (!backendId && !doc.uploaded) {
    try {
      const res = await workspaceApi.uploadDocument(doc.file);
      backendId = res.data.id;
      setBackendId(backendId);
    } catch {
      return fallback;
    }
  }
  if (!backendId) return fallback;

  try {
    const res = await workspaceApi.getPageSummary(backendId, pageNo);
    return { page: pageNo, text: res.data.summary };
  } catch {
    return fallback;
  }
}


/* ─── Page ─── */
export default function WorkspacePage() {
  /* Document state — any number of PDFs, one active at a time */
  const [docs, setDocs] = useState<DocEntry[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [pastDocs, setPastDocs] = useState<Awaited<
    ReturnType<typeof workspaceApi.list>
  >["data"]>([]);
  const [opening, setOpening] = useState(0);
  const [zoom, setZoom] = useState(100);
  const [fullscreen, setFullscreen] = useState(false);
  const [panning, setPanning] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const renderTaskRef = useRef<any>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const panRef = useRef<{ x: number; y: number; left: number; top: number } | null>(
    null
  );

  const activeDoc = docs.find((d) => d.id === activeId) ?? null;

  /* Chat state */
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "system",
      kind: "text",
      content:
        "مرحبًا بك في مساحة عمل القضية. ارفع ملف PDF للبدء، أو استخدم أزرار التحليل السريع أعلاه لاستخراج المعلومات الأساسية من ملف قضيتك.\n\nيمكنك أيضًا كتابة سؤال في الأسفل، أو استخدام الإدخال الصوتي للتحدّث بسؤالك.",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesBoxRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const cancelRef = useRef(false);

  /* Results state */
  const [activeAction, setActiveAction] = useState<ActionType>(null);
  const [panelOpen, setPanelOpen] = useState(true);


  /* Voice */
  const [recording, setRecording] = useState(false);
  const recognitionRef = useRef<any>(null);

  /* Follow the newest output while the reader is at the bottom, or after they
     themselves triggered it (send / quick action). Scrolling up parks the
     view, so paging back through a 100-page run is never yanked away. */
  const followRef = useRef(true);
  useEffect(() => {
    const box = messagesBoxRef.current;
    if (!box) return;
    const nearBottom =
      box.scrollHeight - box.scrollTop - box.clientHeight < 160;
    if (followRef.current || nearBottom) box.scrollTop = box.scrollHeight;
  }, [messages]);

  /* Jump to the newest message no matter where the reader is, and resume
     following the stream from there. */
  const scrollToLatest = useCallback(() => {
    followRef.current = true;
    const box = messagesBoxRef.current;
    if (box) box.scrollTop = box.scrollHeight;
  }, []);

  const onMessagesScroll = useCallback(() => {
    const box = messagesBoxRef.current;
    if (!box) return;
    followRef.current =
      box.scrollHeight - box.scrollTop - box.clientHeight < 160;
  }, []);

  const pushMessage = useCallback((m: Omit<Message, "timestamp">) => {
    setMessages((prev) => [...prev, { ...m, timestamp: new Date() }]);
  }, []);

  const patchMessage = useCallback((id: string, patch: Partial<Message>) => {
    setMessages((prev) =>
      prev.map((m) => (m.id === id ? { ...m, ...patch } : m))
    );
  }, []);

  const appendPage = useCallback((id: string, note: PageNote) => {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === id ? { ...m, pages: [...(m.pages ?? []), note] } : m
      )
    );
  }, []);

  /* ─── PDF.js lazy load ─── */
  const loadPdfJs = useCallback(() => {
    return new Promise<void>((resolve) => {
      if ((window as any).pdfjsLib) return resolve();
      const s = document.createElement("script");
      s.src =
        "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
      s.onload = () => {
        const lib = (window as any)["pdfjs-dist/build/pdf"];
        lib.GlobalWorkerOptions.workerSrc =
          "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
        (window as any).pdfjsLib = lib;
        resolve();
      };
      document.head.appendChild(s);
    });
  }, []);

  /* ─── File handling — accepts any number of PDFs, at any time ─── */
  const addFiles = useCallback(
    async (incoming: FileList | File[]) => {
      const files = Array.from(incoming).filter(
        (f) => f.type === "application/pdf"
      );
      if (!files.length) return;

      setOpening((n) => n + files.length);
      await loadPdfJs();
      const lib = (window as any).pdfjsLib;

      for (const file of files) {
        try {
          const data = new Uint8Array(await file.arrayBuffer());
          const pdf = await lib.getDocument({ data }).promise;
          const entry: DocEntry = {
            id: crypto.randomUUID(),
            name: file.name,
            size: file.size,
            file,
            pdf,
            numPages: pdf.numPages,
            page: 1,
            backendId: null,
            uploaded: false,
          };
          setDocs((prev) => [...prev, entry]);
          setActiveId(entry.id);
        } catch {
          /* unreadable / encrypted file — skip it, keep the rest */
        } finally {
          setOpening((n) => n - 1);
        }
      }
    },
    [loadPdfJs]
  );

  const removeDoc = useCallback(
    (id: string) => {
      const idx = docs.findIndex((d) => d.id === id);
      if (idx === -1) return;
      const next = docs.filter((d) => d.id !== id);
      setDocs(next);
      if (activeId === id) {
        setActiveId(next[Math.min(idx, next.length - 1)]?.id ?? null);
      }
      /* release the parsed document so N files do not pile up in memory */
      docs[idx].pdf?.destroy?.();
    },
    [docs, activeId]
  );

  const setActivePage = useCallback(
    (next: (p: number) => number) => {
      setDocs((prev) =>
        prev.map((d) =>
          d.id === activeId
            ? {
                ...d,
                page: Math.min(Math.max(1, next(d.page)), d.numPages),
              }
            : d
        )
      );
    },
    [activeId]
  );

  /* Load the user's previously analysed documents so they can re-open any of
     them and view the stored per-page summaries at any time. */
  useEffect(() => {
    let stale = false;
    workspaceApi
      .list()
      .then((res) => {
        if (!stale) setPastDocs(res.data);
      })
      .catch(() => {
        /* offline / unauthenticated — silently skip */
      });
    return () => {
      stale = true;
    };
  }, []);

  /* Re-open a past document: fetch the stored PDF bytes from the backend,
     parse them with pdf.js, and register the doc with its backend id so the
     "Case Summary" walk is served straight from the stored DB summaries. */
  const openPastDocument = useCallback(
    async (backendDoc: Awaited<ReturnType<typeof workspaceApi.list>>["data"][number]) => {
      setOpening((n) => n + 1);
      await loadPdfJs();
      const lib = (window as any).pdfjsLib;
      try {
        const data = new Uint8Array(
          await workspaceApi.getFile(backendDoc.id)
        );
        const pdf = await lib.getDocument({ data }).promise;
        const entry: DocEntry = {
          id: crypto.randomUUID(),
          name: backendDoc.original_filename,
          size: data.byteLength,
          file: new File([data], backendDoc.original_filename, {
            type: "application/pdf",
          }),
          pdf,
          numPages: pdf.numPages,
          page: 1,
          backendId: backendDoc.id,
          uploaded: true,
        };
        setDocs((prev) => [...prev, entry]);
        setActiveId(entry.id);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: "assistant",
            kind: "text",
            content: `تعذّر فتح "${backendDoc.original_filename}" من الملفات المخزّنة: ${message}`,
            timestamp: new Date(),
          },
        ]);
      } finally {
        setOpening((n) => n - 1);
      }
    },
    [loadPdfJs]
  );

  /* ─── Pan (drag to scroll the zoomed page) ─── */
  const fitWidth = useCallback(() => {
    const box = viewportRef.current;
    const canvas = canvasRef.current;
    if (!box || !canvas || !canvas.width) return;
    const avail = box.clientWidth - 32; /* matches the p-4 gutter */
    setZoom((z) =>
      Math.min(400, Math.max(50, Math.round((z * avail) / canvas.width)))
    );
  }, []);

  const startPan = useCallback((e: React.PointerEvent) => {
    /* left button only, and never on the empty-state dropzone */
    if (e.button !== 0) return;
    const box = viewportRef.current;
    if (!box) return;
    panRef.current = {
      x: e.clientX,
      y: e.clientY,
      left: box.scrollLeft,
      top: box.scrollTop,
    };
    box.setPointerCapture(e.pointerId);
    setPanning(true);
  }, []);

  const movePan = useCallback((e: React.PointerEvent) => {
    const start = panRef.current;
    const box = viewportRef.current;
    if (!start || !box) return;
    box.scrollLeft = start.left - (e.clientX - start.x);
    box.scrollTop = start.top - (e.clientY - start.y);
  }, []);

  const endPan = useCallback((e: React.PointerEvent) => {
    if (!panRef.current) return;
    panRef.current = null;
    viewportRef.current?.releasePointerCapture(e.pointerId);
    setPanning(false);
  }, []);

  /* Esc leaves fullscreen; F toggles it when not typing */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      const typing =
        el?.tagName === "INPUT" ||
        el?.tagName === "TEXTAREA" ||
        el?.isContentEditable;
      if (e.key === "Escape") setFullscreen(false);
      if (!typing && (e.key === "f" || e.key === "F")) {
        setFullscreen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  /* Render whenever the active document, its page, or the zoom changes —
     the previous render task is cancelled so the canvas is never shared. */
  useEffect(() => {
    const doc = docs.find((d) => d.id === activeId);
    const canvas = canvasRef.current;
    if (!doc || !canvas) return;

    let stale = false;
    (async () => {
      renderTaskRef.current?.cancel?.();
      const page = await doc.pdf.getPage(doc.page);
      if (stale) return;
      const vp = page.getViewport({ scale: (zoom / 100) * 1.5 });
      canvas.width = vp.width;
      canvas.height = vp.height;
      const task = page.render({
        canvasContext: canvas.getContext("2d"),
        viewport: vp,
      });
      renderTaskRef.current = task;
      try {
        await task.promise;
      } catch {
        /* superseded by a newer render */
      }
    })();

    return () => {
      stale = true;
    };
  }, [docs, activeId, zoom, fullscreen]);

  /* ─── Chat ─── */
  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || sending) return;

    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: "user",
      kind: "text",
      content: text,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    scrollToLatest();
    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "";
    setSending(true);

    // Simulate AI response (will be wired to backend)
    await new Promise((r) => setTimeout(r, 800));

    const aiMsg: Message = {
      id: crypto.randomUUID(),
      role: "assistant",
      kind: "text",
      content: `جارٍ تحليل سؤالك: "${text}"\n\nاستنادًا إلى ملف القضية المرفوع، هذا ما توصّلنا إليه. (هذا نص مؤقت — وسيملؤه محرّك الذكاء الاصطناعي بتحليل فعلي عند ربط الواجهة البرمجية.)`,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, aiMsg]);
    scrollToLatest();
    setSending(false);
  }, [input, sending, scrollToLatest]);

  /* ─── Quick actions — results stream into the chat ─── */
  const runAction = useCallback(
    async (action: string) => {
      if (sending) return;
      setActiveAction(action as ActionType);
      /* Fold the tile strip away so results own the full column height */
      setPanelOpen(false);
      cancelRef.current = false;
      setSending(true);
      /* The reader pressed the button, so take them to the new output
         even if they had scrolled up */
      scrollToLatest();

      pushMessage({
        id: crypto.randomUUID(),
        role: "user",
        kind: "text",
        content: activeDoc
          ? `${ACTION_TITLES[action] ?? "تحليل"} — ${activeDoc.name}`
          : ACTION_TITLES[action] ?? "تحليل",
      });

      /* Overview card — same content as before, now a chat message */
      pushMessage({
        id: crypto.randomUUID(),
        role: "assistant",
        kind: "analysis",
        action,
        content: ACTION_TITLES[action] ?? "تحليل",
      });

      /* Case Summary also walks the active document page by page,
         however long it is */
      if (action === "summary" && activeDoc) {
        const total = activeDoc.numPages;
        const streamId = crypto.randomUUID();
        pushMessage({
          id: streamId,
          role: "assistant",
          kind: "pages",
          content: `Page-by-page summary — ${activeDoc.name}`,
          pages: [],
          pageTotal: total,
          streaming: true,
        });

        /* Track the backend workspace doc id for this document across the
           stream; stored so re-running (or re-opening) hits the DB cache. */
        let backendId = activeDoc.backendId;
        const setBackendId = (id: number | null) => {
          backendId = id;
          setDocs((prev) =>
            prev.map((d) =>
              d.id === activeDoc.id
                ? { ...d, backendId: id, uploaded: id !== null }
                : d
            )
          );
        };

        for (let p = 1; p <= total; p++) {
          if (cancelRef.current) break;
          const note = await summarisePage(
            activeDoc,
            p,
            () => backendId,
            setBackendId
          );
          appendPage(streamId, note);
        }
        patchMessage(streamId, { streaming: false });
      }

      if (action === "summary" && !cancelRef.current) {
        pushMessage({
          id: crypto.randomUUID(),
          role: "assistant",
          kind: "verdict",
          content:
            "يبدو هذا النزاع مناسبًا للوساطة — فهو مطالبة مالية ناشئة عن علاقة تعاقدية. وقد يستفيد الطرفان من تفاوض منظّم.",
        });
      }

      setSending(false);
    },
    [sending, activeDoc, pushMessage, patchMessage, appendPage, scrollToLatest, setDocs]
  );

  const stopStream = useCallback(() => {
    cancelRef.current = true;
  }, []);

  /* ─── Voice input ─── */
  const toggleVoice = useCallback(() => {
    if (recording) {
      recognitionRef.current?.stop();
      setRecording(false);
      return;
    }
    const SR =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    if (!SR) {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          kind: "text",
          content:
            "الإدخال الصوتي غير مدعوم في هذا المتصفح. جرّب Chrome أو Edge.",
          timestamp: new Date(),
        },
      ]);
      return;
    }
    const recog = new SR();
    recog.continuous = false;
    recog.interimResults = false;
    recog.lang = "ar-SA";
    recog.onresult = (e: any) => {
      setInput(e.results[0][0].transcript);
      setRecording(false);
    };
    recog.onend = () => setRecording(false);
    recognitionRef.current = recog;
    recog.start();
    setRecording(true);
  }, [recording]);

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <TopBar />

      <div className="grid grid-cols-2 flex-1 overflow-hidden max-lg:grid-cols-1 max-lg:grid-rows-[45vh_1fr]">
        {/* ─── LEFT: PDF Viewer ─── */}
        <section
          className={
            fullscreen
              ? "fixed inset-0 z-50 flex flex-col bg-[#F7F8FB]"
              : "flex flex-col border-e border-sutra-line bg-[#F7F8FB] max-lg:border-e-0 max-lg:border-b"
          }
        >
          {/* Document bar — one chip per open PDF, add/remove/switch */}
          <div className="flex items-center gap-2.5 px-3 py-2 border-b border-sutra-line bg-white flex-none min-h-[54px]">
            <div className="flex items-center gap-1.5 min-w-0 flex-1 overflow-x-auto">
              {docs.length === 0 && opening === 0 && (
                <span className="flex items-center gap-2 px-1.5 text-[15px] font-semibold text-sutra-ink-3">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    className="w-5 h-5 flex-none"
                  >
                    <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
                    <path d="M14 3v5h5" />
                  </svg>
                  لم يتم تحميل أي مستند
                </span>
              )}

              {docs.map((d) => (
                <span
                  key={d.id}
                  className={`group flex items-center gap-2 flex-none max-w-[240px] ps-2.5 pe-1.5 h-[36px] rounded-[10px] border-[1.5px] transition-colors ${
                    d.id === activeId
                      ? "border-navy bg-tint"
                      : "border-sutra-line bg-white hover:border-[#C6CDD7]"
                  }`}
                >
                  <button
                    onClick={() => setActiveId(d.id)}
                    title={`${d.name} · ${count(d.numPages, PAGES)} · ${bytes(d.size)}`}
                    className="flex items-center gap-2 min-w-0 bg-transparent border-0 cursor-pointer"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      className={`w-[17px] h-[17px] flex-none ${
                        d.id === activeId ? "text-navy" : "text-sutra-ink-3"
                      }`}
                    >
                      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
                      <path d="M14 3v5h5" />
                    </svg>
                    <span
                      className={`text-[13.5px] font-semibold truncate ${
                        d.id === activeId ? "text-navy" : "text-sutra-ink-2"
                      }`}
                    >
                      {d.name}
                    </span>
                    <span className="text-[11.5px] font-bold text-sutra-ink-3 flex-none">
                      {n(d.numPages)} ص.
                    </span>
                  </button>
                  <button
                    onClick={() => removeDoc(d.id)}
                    aria-label={`إزالة ${d.name}`}
                    title="إزالة المستند"
                    className="w-[22px] h-[22px] flex-none border-0 bg-transparent text-sutra-ink-3 rounded-md grid place-items-center hover:bg-white hover:text-red-600 transition-colors"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      className="w-[13px] h-[13px]"
                    >
                      <path d="M18 6 6 18M6 6l12 12" />
                    </svg>
                  </button>
                </span>
              ))}

              {opening > 0 && (
                <span className="flex-none flex items-center gap-2 h-[36px] px-3 rounded-[10px] border-[1.5px] border-dashed border-sutra-line text-[13px] font-semibold text-sutra-ink-3">
                  جارٍ الفتح…
                </span>
              )}
            </div>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex-none flex items-center gap-1.5 h-[36px] px-3 rounded-[10px] border-[1.5px] border-sutra-line bg-white text-[13.5px] font-bold text-navy hover:border-navy hover:bg-tint transition-colors"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                className="w-[15px] h-[15px]"
              >
                <path d="M12 5v14M5 12h14" />
              </svg>
              إضافة
            </button>

            {activeDoc && (
              <>
                <span className="flex-none w-px h-6 bg-sutra-line" />
                <div className="flex items-center gap-1.5 flex-none">
                  <button
                    onClick={() => setActivePage((p) => p - 1)}
                    disabled={activeDoc.page <= 1}
                    aria-label="الصفحة السابقة"
                    className="w-[34px] h-[34px] border border-sutra-line rounded-lg bg-white text-sutra-ink-2 grid place-items-center hover:bg-[#F2F5F9] hover:border-[#C6CDD7] transition-colors disabled:opacity-35 disabled:pointer-events-none"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      className="w-[18px] h-[18px]"
                    >
                      <path d="M15 18l-6-6 6-6" />
                    </svg>
                  </button>
                  <span className="text-[14px] font-semibold text-sutra-ink-2 min-w-[64px] text-center">
                    {activeDoc.page} / {activeDoc.numPages}
                  </span>
                  <button
                    onClick={() => setActivePage((p) => p + 1)}
                    disabled={activeDoc.page >= activeDoc.numPages}
                    aria-label="الصفحة التالية"
                    className="w-[34px] h-[34px] border border-sutra-line rounded-lg bg-white text-sutra-ink-2 grid place-items-center hover:bg-[#F2F5F9] hover:border-[#C6CDD7] transition-colors disabled:opacity-35 disabled:pointer-events-none"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      className="w-[18px] h-[18px]"
                    >
                      <path d="M9 18l6-6-6-6" />
                    </svg>
                  </button>
                </div>

                <div className="flex items-center gap-1 flex-none max-[640px]:hidden">
                  <button
                    onClick={() => setZoom((z) => Math.max(50, z - 25))}
                    aria-label="تصغير"
                    className="w-[34px] h-[34px] border border-sutra-line rounded-lg bg-white text-sutra-ink-2 grid place-items-center hover:bg-[#F2F5F9] hover:border-[#C6CDD7] transition-colors"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      className="w-[18px] h-[18px]"
                    >
                      <path d="M5 12h14" />
                    </svg>
                  </button>
                  <span className="text-[13px] font-semibold text-sutra-ink-3 min-w-[42px] text-center">
                    {zoom}%
                  </span>
                  <button
                    onClick={() => setZoom((z) => Math.min(400, z + 25))}
                    aria-label="تكبير"
                    className="w-[34px] h-[34px] border border-sutra-line rounded-lg bg-white text-sutra-ink-2 grid place-items-center hover:bg-[#F2F5F9] hover:border-[#C6CDD7] transition-colors"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      className="w-[18px] h-[18px]"
                    >
                      <path d="M12 5v14M5 12h14" />
                    </svg>
                  </button>
                  <button
                    onClick={fitWidth}
                    title="ملء العرض"
                    className="h-[34px] px-2.5 border border-sutra-line rounded-lg bg-white text-[12.5px] font-bold text-sutra-ink-2 hover:bg-[#F2F5F9] hover:border-[#C6CDD7] transition-colors"
                  >
                    ملء
                  </button>
                </div>

                <button
                  onClick={() => setFullscreen((v) => !v)}
                  title={
                    fullscreen ? "إنهاء ملء الشاشة (Esc)" : "ملء الشاشة (F)"
                  }
                  aria-label="تبديل ملء الشاشة"
                  className="flex-none w-[34px] h-[34px] border border-sutra-line rounded-lg bg-white text-sutra-ink-2 grid place-items-center hover:bg-[#F2F5F9] hover:border-[#C6CDD7] transition-colors"
                >
                  {fullscreen ? (
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="w-[17px] h-[17px]"
                    >
                      <path d="M9 3v6H3M15 3v6h6M9 21v-6H3M15 21v-6h6" />
                    </svg>
                  ) : (
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="w-[17px] h-[17px]"
                    >
                      <path d="M3 9V3h6M21 9V3h-6M3 15v6h6M21 15v6h-6" />
                    </svg>
                  )}
                </button>
              </>
            )}
          </div>

          {/* Canvas / Upload zone — m-auto centres without making overflow
              unreachable, which `items-center` does once zoomed in.
              Dragging the page pans it; dropping files appends them. */}
          <div
            ref={viewportRef}
            onPointerDown={docs.length ? startPan : undefined}
            onPointerMove={movePan}
            onPointerUp={endPan}
            onPointerCancel={endPan}
            className={`flex-1 overflow-auto relative flex p-4 max-lg:p-2 touch-pan-x touch-pan-y ${
              docs.length
                ? panning
                  ? "cursor-grabbing select-none"
                  : "cursor-grab"
                : ""
            }`}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              addFiles(e.dataTransfer.files);
            }}
          >
            {docs.length === 0 ? (
              <div className="m-auto w-full max-w-[560px] flex flex-col gap-4">
                <div
                  className="flex flex-col items-center justify-center text-center p-12 border-2 border-dashed border-sutra-line rounded-2xl bg-white cursor-pointer transition-colors hover:border-navy hover:bg-tint"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <div className="w-16 h-16 rounded-2xl bg-tint text-navy grid place-items-center mb-4 border border-tint-2">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="w-7 h-7"
                    >
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="17 8 12 3 7 8" />
                      <line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-sutra-ink">
                    ارفع مستندات القضية
                  </h3>
                  <p className="text-[16px] text-sutra-ink-2 mt-1.5">
                    اسحب ملفات PDF وأفلتها هنا، أو انقر للتصفح
                  </p>
                  <span className="text-[13.5px] text-sutra-ink-3 mt-1">
                    يمكن رفع عدة ملفات معًا — أضف أو أزل في أي وقت
                  </span>
                  <button className="mt-5 inline-flex items-center justify-center gap-2.5 bg-navy text-white border-0 rounded-xl text-[17px] font-semibold px-6 py-3.5 min-h-[52px] transition-colors hover:bg-navy-dark">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      className="w-[22px] h-[22px]"
                    >
                      <path d="M12 5v14M5 12h14" />
                    </svg>
                    تصفح الملفات
                  </button>
                </div>

                {pastDocs.length > 0 && (
                  <div className="rounded-2xl border border-sutra-line bg-white overflow-hidden">
                    <div className="px-4 py-3 border-b border-sutra-line-2 flex items-center gap-2">
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.7"
                        className="w-[15px] h-[15px] text-sutra-ink-3"
                      >
                        <path d="M12 8v4l3 3" />
                        <circle cx="12" cy="12" r="9" />
                      </svg>
                      <span className="text-[12px] font-bold uppercase text-sutra-ink-3">
                        Previously analysed
                      </span>
                      <span className="text-[11.5px] font-semibold text-sutra-ink-3 bg-sutra-line-2 rounded-full px-2 py-0.5">
                        {pastDocs.length}
                      </span>
                    </div>
                    <div className="divide-y divide-sutra-line-2 max-h-[280px] overflow-y-auto">
                      {pastDocs.map((d) => (
                        <button
                          key={d.id}
                          onClick={() => openPastDocument(d)}
                          disabled={opening > 0}
                          className="w-full flex items-center gap-3 px-4 py-3 bg-transparent border-0 text-start cursor-pointer hover:bg-tint transition-colors disabled:opacity-50 disabled:cursor-default"
                        >
                          <span className="flex-none w-9 h-9 rounded-[10px] bg-tint text-navy border border-tint-2 grid place-items-center">
                            <svg
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.7"
                              className="w-[17px] h-[17px]"
                            >
                              <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
                              <path d="M14 3v5h5" />
                            </svg>
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-[14px] font-bold text-sutra-ink truncate">
                              {d.original_filename}
                            </span>
                            <span className="block text-[12.5px] text-sutra-ink-3">
                              {count(d.num_pages, PAGES)}
                              {d.page_summaries?.length
                                ? ` · ${count(d.page_summaries.filter((p) => p.summary).length, SUMMARISED)}`
                                : ""}
                            </span>
                          </span>
                          <span className="flex-none text-[13px] font-bold text-navy">
                            {opening > 0 ? "جارٍ الفتح…" : "فتح"}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <canvas
                ref={canvasRef}
                draggable={false}
                className="m-auto block h-auto max-w-none select-none"
              />
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              multiple
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.length) addFiles(e.target.files);
                /* clear so picking the same file again still fires onChange */
                e.target.value = "";
              }}
            />
          </div>
        </section>

        {/* ─── RIGHT: Chat + Actions ─── */}
        <section className="flex flex-col h-full overflow-hidden bg-white">
          {/* Quick actions */}
          <div
            className={`px-5 flex-none border-b border-sutra-line-2 ${
              panelOpen ? "pt-3 pb-3" : "py-2"
            }`}
          >
            <button
              onClick={() => setPanelOpen((o) => !o)}
              aria-expanded={panelOpen}
              className="w-full flex items-center gap-2.5 bg-transparent border-0 text-start cursor-pointer group"
            >
              <span className="text-[12px] font-bold uppercase text-sutra-ink-3">
                تحليل سريع
              </span>
              {!panelOpen && activeAction && (
                <span className="text-[12px] font-bold px-2 py-0.5 rounded-full bg-tint text-navy border border-tint-2">
                  {ACTION_TITLES[activeAction] ?? "تحليل"}
                </span>
              )}
              <span className="flex-1" />
              <span className="text-[12.5px] font-semibold text-sutra-ink-3 group-hover:text-navy transition-colors">
                {panelOpen ? "إخفاء" : "إظهار"}
              </span>
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={`w-[17px] h-[17px] text-sutra-ink-3 transition-transform group-hover:text-navy ${
                  panelOpen ? "" : "-rotate-90"
                }`}
              >
                <path d="m6 9 6 6 6-6" />
              </svg>
            </button>

            {panelOpen && (
            <div className="grid grid-cols-5 gap-2 mt-2.5 max-[1024px]:grid-cols-3 max-[640px]:grid-cols-2">
              {(
                [
                  {
                    action: "summary",
                    label: "ملخّص القضية",
                    sub: "نظرة شاملة",
                    bg: "bg-tint text-navy",
                    icon: (
                      <path d="M4 5h16M4 10h16M4 15h10M4 20h7" />
                    ),
                  },
                  {
                    action: "important",
                    label: "الصفحات المهمة",
                    sub: "الأدلة الرئيسية",
                    bg: "bg-amber-bg text-amber-ink",
                    icon: (
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                    ),
                  },
                  {
                    action: "witness",
                    label: "الشهود",
                    sub: "الأسماء والأدوار",
                    bg: "bg-tint text-navy",
                    icon: (
                      <>
                        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                        <circle cx="9" cy="7" r="4" />
                        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                      </>
                    ),
                  },
                  {
                    action: "police",
                    label: "الشرطة / المحقق",
                    sub: "القسم والضابط",
                    bg: "bg-tint text-navy",
                    icon: (
                      <>
                        <path d="M3 21h18" />
                        <path d="M5 21V7l7-4 7 4v14" />
                        <path d="M9 21v-4h6v4" />
                      </>
                    ),
                  },
                  {
                    action: "custom",
                    label: "اسأل عن أي شيء",
                    sub: "استعلام مخصص",
                    bg: "bg-green-bg text-green-ink",
                    icon: (
                      <>
                        <path d="M12 20h9" />
                        <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
                      </>
                    ),
                  },
                ] as const
              ).map((a) => (
                <button
                  key={a.action}
                  disabled={sending && a.action !== "custom"}
                  onClick={() => {
                    if (a.action === "custom") {
                      document.getElementById("chatInput")?.focus();
                      return;
                    }
                    runAction(a.action);
                  }}
                  className={`flex flex-col items-center text-center p-3 rounded-xl border-[1.5px] transition-all cursor-pointer gap-1.5 disabled:opacity-45 disabled:pointer-events-none ${
                    activeAction === a.action
                      ? "border-navy bg-tint"
                      : "border-sutra-line bg-white hover:border-navy hover:bg-tint"
                  }`}
                >
                  <span
                    className={`w-9 h-9 rounded-[10px] grid place-items-center flex-none ${a.bg}`}
                  >
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="w-[19px] h-[19px]"
                    >
                      {a.icon}
                    </svg>
                  </span>
                  <span className="text-[13px] font-bold text-sutra-ink leading-tight">
                    {a.label}
                  </span>
                  <span className="text-[11px] text-sutra-ink-3 font-medium max-[640px]:hidden">
                    {a.sub}
                  </span>
                </button>
              ))}
            </div>
            )}
          </div>

          {/* Messages — quick-analysis results stream in here, unbounded */}
          <div
            ref={messagesBoxRef}
            onScroll={onMessagesScroll}
            className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-5 pt-5 pb-2.5 flex flex-col gap-4"
          >
            {messages.map((m) =>
              m.kind === "analysis" ? (
                <AnalysisCard key={m.id} title={m.content} action={m.action!} />
              ) : m.kind === "pages" ? (
                <PageStreamCard
                  key={m.id}
                  title={m.content}
                  pages={m.pages ?? []}
                  total={m.pageTotal ?? 0}
                  streaming={!!m.streaming}
                  onStop={stopStream}
                />
              ) : m.kind === "verdict" ? (
                <VerdictCard key={m.id} text={m.content} />
              ) : (
                <div
                  key={m.id}
                  className={`flex gap-3 max-w-[92%] ${
                    m.role === "user" ? "self-end flex-row-reverse" : ""
                  }`}
                >
                  {m.role === "system" || m.role === "assistant" ? (
                    <SutraAvatar />
                  ) : (
                    <div className="w-9 h-9 flex-none rounded-full bg-navy text-white grid place-items-center font-bold text-[14px]">
                      D
                    </div>
                  )}
                  <div
                    className={`rounded-[14px] px-[18px] py-3.5 text-[16px] leading-relaxed ${
                      m.role === "user"
                        ? "bg-navy text-white rounded-[14px_14px_4px_14px]"
                        : "bg-tint text-sutra-ink border border-sutra-line-2 rounded-[14px_14px_14px_4px]"
                    }`}
                  >
                    {m.content.split("\n").map((p, i) =>
                      p ? (
                        <p key={i} className={i > 0 ? "mt-2" : ""}>
                          {p}
                        </p>
                      ) : (
                        <br key={i} />
                      )
                    )}
                  </div>
                </div>
              )
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Chat input */}
          <div className="flex-none px-[18px] pt-2.5 pb-2.5 border-t border-sutra-line bg-white">
            <div className="flex items-end gap-2 bg-[#F7F8FB] border-[1.5px] border-sutra-line rounded-[14px] px-2.5 py-1.5 transition-colors focus-within:border-focus">
              <button
                onClick={toggleVoice}
                className={`w-[38px] h-[38px] flex-none border-0 rounded-[10px] grid place-items-center transition-colors ${
                  recording
                    ? "bg-red-50 text-red-600 animate-pulse"
                    : "bg-transparent text-sutra-ink-3 hover:bg-sutra-line-2 hover:text-sutra-ink"
                }`}
                aria-label="إدخال صوتي"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="w-[21px] h-[21px]"
                >
                  <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                  <path d="M12 19v3" />
                </svg>
              </button>
              <textarea
                id="chatInput"
                ref={textareaRef}
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  /* grow with the text, up to 40% of the viewport, then scroll */
                  e.target.style.height = "auto";
                  e.target.style.height =
                    Math.min(e.target.scrollHeight, window.innerHeight * 0.4) +
                    "px";
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                rows={1}
                placeholder="اسأل عن هذه القضية…"
                className="flex-1 block border-0 bg-transparent outline-none font-[inherit] text-[16px] leading-relaxed text-sutra-ink resize-none min-h-[40px] max-h-[40vh] py-2 placeholder:text-sutra-ink-3"
              />
              <button
                onClick={sendMessage}
                disabled={!input.trim() || sending}
                className="w-10 h-10 flex-none border-0 rounded-[10px] bg-navy text-white grid place-items-center transition-colors hover:bg-navy-dark disabled:bg-sutra-line disabled:text-sutra-ink-3 disabled:pointer-events-none"
                aria-label="إرسال الرسالة"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="w-5 h-5"
                >
                  <path d="m22 2-7 20-4-9-9-4Z" />
                  <path d="m22 2-11 11" />
                </svg>
              </button>
            </div>
            <p className="mt-1 text-[12px] text-sutra-ink-3 max-[640px]:hidden">
              {recording
                ? "جارٍ الاستماع…"
                : "Enter للإرسال · Shift + Enter لسطر جديد"}
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}

/* ─── Chat card components ─── */

function SutraAvatar() {
  return (
    <div className="w-9 h-9 flex-none rounded-full bg-tint text-navy grid place-items-center border border-tint-2">
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        className="w-5 h-5"
      >
        <path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z" />
        <path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z" />
        <path d="M7 21h10" />
        <path d="M12 3v18" />
        <path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2" />
      </svg>
    </div>
  );
}

function AnalysisCard({ title, action }: { title: string; action: string }) {
  return (
    <div className="w-full border border-sutra-line rounded-[14px] bg-[#FAFBFD]">
      <div className="flex items-center gap-2.5 px-4 py-3 border-b border-sutra-line-2 bg-white rounded-t-[14px] sticky top-0 z-10">
        <SutraAvatar />
        <h3 className="text-[16px] font-bold text-sutra-ink">{title}</h3>
      </div>
      <div className="px-4 py-4">
        <ResultsContent action={action} />
      </div>
    </div>
  );
}

function PageStreamCard({
  title,
  pages,
  total,
  streaming,
  onStop,
}: {
  title: string;
  pages: PageNote[];
  total: number;
  streaming: boolean;
  onStop: () => void;
}) {
  return (
    <div className="w-full border border-sutra-line rounded-[14px] bg-white">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-sutra-line-2 sticky top-0 bg-white rounded-t-[14px] z-10">
        <h3 className="text-[16px] font-bold text-sutra-ink">{title}</h3>
        <span className="text-[13px] font-semibold text-sutra-ink-3">
          {streaming
            ? `جارٍ قراءة الصفحة ${n(Math.min(pages.length + 1, total))} من ${n(total)}…`
            : `${n(pages.length)} من ${count(total, PAGES)}`}
        </span>
        <span className="flex-1" />
        {streaming && (
          <button
            onClick={onStop}
            className="flex-none text-[13px] font-bold px-3 py-1.5 rounded-lg border border-sutra-line bg-white text-sutra-ink-2 hover:border-navy hover:text-navy transition-colors"
          >
            إيقاف
          </button>
        )}
      </div>

      {streaming && total > 0 && (
        <div className="h-[3px] bg-sutra-line-2">
          <div
            className="h-full bg-navy transition-[width] duration-200"
            style={{ width: `${(pages.length / total) * 100}%` }}
          />
        </div>
      )}

      <div className="divide-y divide-sutra-line-2">
        {pages.map((p) => (
          <div key={p.page} className="flex items-start gap-3 px-4 py-3">
            <span className="flex-none min-w-[52px] h-7 bg-tint text-navy border border-tint-2 rounded-[7px] grid place-items-center text-[12px] font-bold px-2">
              ص. {n(p.page)}
            </span>
            <p className="text-[15px] text-sutra-ink-2 leading-relaxed">
              {p.text}
            </p>
          </div>
        ))}
        {pages.length === 0 && (
          <p className="px-4 py-4 text-[15px] text-sutra-ink-3">
            جارٍ بدء تحليل الصفحات…
          </p>
        )}
      </div>

      {!streaming && pages.length < total && (
        <p className="px-4 py-2.5 text-[13px] text-sutra-ink-3 border-t border-sutra-line-2">
          توقّف عند الصفحة {n(pages.length)} من {n(total)}.
        </p>
      )}
    </div>
  );
}

function VerdictCard({ text }: { text: string }) {
  return (
    <div className="w-full flex items-center gap-3.5 px-4 py-3.5 rounded-[14px] border border-tint-2 bg-tint">
      <div className="w-[38px] h-[38px] flex-none rounded-[10px] bg-navy text-white grid place-items-center">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          className="w-5 h-5"
        >
          <path d="m14.5 12.5-8 8a2.12 2.12 0 1 1-3-3l8-8" />
          <path d="m16 16 6-6" />
          <path d="m8 8 6-6" />
          <path d="m9 7 8 8" />
          <path d="m21 11-8-8" />
        </svg>
      </div>
      <div className="flex-1 min-w-0">
        <b className="text-[14px] font-bold text-navy block mb-0.5">
          مدى ملاءمة الوساطة
        </b>
        <span className="text-[14px] text-sutra-ink-2 leading-snug">{text}</span>
      </div>
      <span className="flex-none text-[13px] font-bold px-3 py-1.5 rounded-full bg-green-bg text-green-ink whitespace-nowrap">
        مرجّح قبولها
      </span>
    </div>
  );
}

/* ─── Results content components ─── */

function ResultsContent({ action }: { action: string }) {
  switch (action) {
    case "summary":
      return (
        <div className="grid grid-cols-2 gap-6 max-[640px]:grid-cols-1">
          <div>
            <h4 className="text-[13px] font-bold uppercase text-sutra-ink-3 mb-3">
              الأطراف
            </h4>
            <div className="flex items-start gap-3 py-2.5 border-b border-sutra-line-2">
              <span className="flex-none w-8 h-8 rounded-full bg-tint-2 text-navy grid place-items-center font-bold text-[14px] border border-[#CFE0F0]">
                A
              </span>
              <div>
                <b>الطرف الأول</b>
                <br />
                <span className="text-[14px] text-sutra-ink-3">
                  مقدّم الطلب / المدّعي
                </span>
              </div>
            </div>
            <div className="flex items-start gap-3 py-2.5 border-b border-sutra-line-2">
              <span className="flex-none w-8 h-8 rounded-full bg-tint-2 text-navy grid place-items-center font-bold text-[14px] border border-[#CFE0F0]">
                B
              </span>
              <div>
                <b>الطرف الثاني</b>
                <br />
                <span className="text-[14px] text-sutra-ink-3">
                  المدّعى عليه / المتهم
                </span>
              </div>
            </div>
            <h4 className="text-[13px] font-bold uppercase text-sutra-ink-3 mb-3 mt-5">
              نوع القضية
            </h4>
            <p className="text-[15px] text-sutra-ink-2 leading-relaxed">
              نزاع مدني — إخلال بعقد مع مطالبة مالية. الطلب الأساسي: التعويض
              والتنفيذ العيني.
            </p>
          </div>
          <div>
            <h4 className="text-[13px] font-bold uppercase text-sutra-ink-3 mb-3">
              الوقائع الرئيسية
            </h4>
            <ol className="text-[15px] text-sutra-ink-2 leading-relaxed ps-5 space-y-1.5 list-decimal">
              <li>اتفاقية موقّعة في التاريخ المبيّن في المستند الأصلي.</li>
              <li>
                التزامات تنفيذية يُدّعى الإخلال بها.
              </li>
              <li>
                مطالبة مالية محدّدة المقدار في لائحة الدعوى / مذكرة الدفاع.
              </li>
              <li>
                إشعار أُبلغ قبل رفع الدعوى.
              </li>
            </ol>
            <h4 className="text-[13px] font-bold uppercase text-sutra-ink-3 mb-3 mt-5">
              الطلب المطلوب
            </h4>
            <p className="text-[15px] text-sutra-ink-2 leading-relaxed">
              تعويضات قدرها ٤٨٠٠٠٠٠ (أربعة ملايين وثمانمائة ألف) مع الفوائد
              والمصاريف. وطلب بديل بالتنفيذ العيني للاتفاقية.
            </p>
          </div>
        </div>
      );

    case "important":
      return (
        <div className="grid grid-cols-2 gap-6 max-[640px]:grid-cols-1">
          <div>
            <h4 className="text-[13px] font-bold uppercase text-sutra-ink-3 mb-3">
              الصفحات الحرجة
            </h4>
            {[
              {
                pg: "ص. ١–٣",
                title: "الاتفاقية / العقد",
                desc: "الشروط الموقّعة، الأطراف، المقابل، الالتزامات.",
              },
              {
                pg: "ص. ٧",
                title: "الفاتورة / جدول السداد",
                desc: "المبلغ المستحق، تواريخ الاستحقاق، شرط الغرامة.",
              },
              {
                pg: "ص. ١٢",
                title: "إشعار الإخلال",
                desc: "خطاب مطالبة رسمي، مهلة التصحيح، آخر موعد للرد.",
              },
            ].map((p) => (
              <div
                key={p.pg}
                className="flex items-start gap-3 py-2.5 border-b border-sutra-line-2"
              >
                <span className="flex-none min-w-[44px] h-7 bg-tint text-navy border border-tint-2 rounded-[7px] grid place-items-center text-[12px] font-bold px-2">
                  {p.pg}
                </span>
                <div>
                  <b>{p.title}</b>
                  <br />
                  <span className="text-[14px] text-sutra-ink-3">{p.desc}</span>
                </div>
              </div>
            ))}
          </div>
          <div>
            <h4 className="text-[13px] font-bold uppercase text-sutra-ink-3 mb-3">
              أبرز الأدلة
            </h4>
            {[
              {
                pg: "ص. ١٥",
                title: "المراسلات",
                desc: "سلسلة رسائل تُظهر محاولات التفاوض قبل الدعوى.",
              },
              {
                pg: "ص. ١٨",
                title: "تقرير الخبير",
                desc: "تقييم مستقل للأضرار / العيوب.",
              },
              {
                pg: "ص. ٢٢",
                title: "كشوف الحساب البنكية",
                desc: "سجل المدفوعات وإثبات الرصيد المستحق.",
              },
            ].map((p) => (
              <div
                key={p.pg}
                className="flex items-start gap-3 py-2.5 border-b border-sutra-line-2"
              >
                <span className="flex-none min-w-[44px] h-7 bg-tint text-navy border border-tint-2 rounded-[7px] grid place-items-center text-[12px] font-bold px-2">
                  {p.pg}
                </span>
                <div>
                  <b>{p.title}</b>
                  <br />
                  <span className="text-[14px] text-sutra-ink-3">{p.desc}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      );

    case "witness":
      return (
        <div className="grid grid-cols-2 gap-6 max-[640px]:grid-cols-1">
          <div>
            <h4 className="text-[13px] font-bold uppercase text-sutra-ink-3 mb-3">
              الأشخاص المسمّون
            </h4>
            {[
              {
                role: "المدّعي",
                name: "راشد الكعبي",
                desc: "مدير شركة الحلول التقنية.",
              },
              {
                role: "المدّعى عليه",
                name: "سارة المنصوري",
                desc: "المفوّضة بالتوقيع، شركة الخدمات اللوجستية.",
              },
              {
                role: "شاهد",
                name: "خالد العامري",
                desc: "مدير المشروع — حضر توقيع العقد.",
              },
            ].map((p) => (
              <div
                key={p.name}
                className="flex items-start gap-3 py-2.5 border-b border-sutra-line-2"
              >
                <div>
                  <span className="block text-[11.5px] font-bold uppercase text-sutra-ink-3 mb-0.5">
                    {p.role}
                  </span>
                  <b>{p.name}</b>
                  <br />
                  <span className="text-[14px] text-sutra-ink-3">{p.desc}</span>
                </div>
              </div>
            ))}
          </div>
          <div>
            <h4 className="text-[13px] font-bold uppercase text-sutra-ink-3 mb-3">
              جهات الاتصال المعيّنة
            </h4>
            {[
              {
                role: "محامي الطرف الأول",
                name: "عبدالله الشامسي",
                desc: "محامٍ أول لدى محكمة الاستئناف.",
              },
              {
                role: "محامي الطرف الثاني",
                name: "سعيد الحمادي",
                desc: "شريك في مكتب الحمادي للمحاماة.",
              },
            ].map((p) => (
              <div
                key={p.name}
                className="flex items-start gap-3 py-2.5 border-b border-sutra-line-2"
              >
                <div>
                  <span className="block text-[11.5px] font-bold uppercase text-sutra-ink-3 mb-0.5">
                    {p.role}
                  </span>
                  <b>{p.name}</b>
                  <br />
                  <span className="text-[14px] text-sutra-ink-3">{p.desc}</span>
                </div>
              </div>
            ))}
            <div className="mt-3">
              <span className="block text-[11.5px] font-bold uppercase text-sutra-ink-3 mb-0.5">
                الوسيط
              </span>
              <span className="text-[14px] text-sutra-ink-3">
                يُعيَّن من المحكمة أو باتفاق الطرفين.
              </span>
            </div>
          </div>
        </div>
      );

    case "police":
      return (
        <div className="grid grid-cols-2 gap-6 max-[640px]:grid-cols-1">
          <div>
            <h4 className="text-[13px] font-bold uppercase text-sutra-ink-3 mb-3">
              مركز الشرطة
            </h4>
            <div className="mb-3">
              <b>مركز شرطة القصباء</b>
              <br />
              <span className="text-[14px] text-sutra-ink-3">
                منطقة القصباء — القيادة العامة للشرطة
              </span>
            </div>
            <h4 className="text-[13px] font-bold uppercase text-sutra-ink-3 mb-3">
              بيانات المحضر
            </h4>
            <div className="flex items-baseline gap-2.5 py-1.5 border-b border-sutra-line-2">
              <span className="text-sutra-ink-3 min-w-[90px] flex-none text-[14px]">
                رقم المحضر
              </span>
              <b><Ltr>0042/2026</Ltr></b>
            </div>
            <div className="flex items-baseline gap-2.5 py-1.5 border-b border-sutra-line-2">
              <span className="text-sutra-ink-3 min-w-[90px] flex-none text-[14px]">
                التاريخ
              </span>
              <b>١٥ مارس ٢٠٢٦</b>
            </div>
            <div className="flex items-baseline gap-2.5 py-1.5 border-b border-sutra-line-2">
              <span className="text-sutra-ink-3 min-w-[90px] flex-none text-[14px]">
                المواد القانونية
              </span>
              <b>المواد ٤٢٠ و٤٠٦ و٣٤</b>
            </div>
          </div>
          <div>
            <h4 className="text-[13px] font-bold uppercase text-sutra-ink-3 mb-3">
              المحقق المسؤول
            </h4>
            <div className="mb-3">
              <span className="block text-[11.5px] font-bold uppercase text-sutra-ink-3 mb-0.5">
                المحقق
              </span>
              <b>الرقيب فيصل النعيمي</b>
              <br />
              <span className="text-[14px] text-sutra-ink-3">
                الرقم الوظيفي <Ltr>KPT-2847</Ltr>
              </span>
            </div>
            <div className="flex items-baseline gap-2.5 py-1.5 border-b border-sutra-line-2">
              <span className="text-sutra-ink-3 min-w-[90px] flex-none text-[14px]">
                الهاتف
              </span>
              <b><Ltr>+971 4 229 0042</Ltr></b>
            </div>
            <div className="flex items-baseline gap-2.5 py-1.5 border-b border-sutra-line-2">
              <span className="text-sutra-ink-3 min-w-[90px] flex-none text-[14px]">
                الحالة
              </span>
              <b className="text-green-ink">تم تقديم المحضر</b>
            </div>
            <h4 className="text-[13px] font-bold uppercase text-sutra-ink-3 mb-3 mt-4">
              المحكمة
            </h4>
            <div className="flex items-baseline gap-2.5 py-1.5">
              <span className="text-sutra-ink-3 min-w-[90px] flex-none text-[14px]">
                محالة إلى
              </span>
              <b>محكمة الجنح الابتدائية</b>
            </div>
          </div>
        </div>
      );

    default:
      return null;
  }
}
