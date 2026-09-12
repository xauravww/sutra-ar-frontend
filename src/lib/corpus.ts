/**
 * Case-law corpus (Curation Panel) API client.
 * Mirrors the backend routes at /api/v1/corpus.
 * Reuses the shared `request()` helper from ./api.ts.
 */

import { request, ApiError, BASE } from "./api";

export type CorpusStatus =
  | "draft"
  | "processing"
  | "needs_review"
  | "published"
  | "archived"
  | "failed";

/** Court hierarchy. Must match the backend's CORPUS_COURT_TYPES. */
export const CORPUS_COURT_TYPES = [
  "supreme_court",
  "high_court",
  "district_court",
  "tribunal",
] as const;

export type CorpusCourtType = (typeof CORPUS_COURT_TYPES)[number];

export const CORPUS_COURT_TYPE_LABELS: Record<CorpusCourtType, string> = {
  supreme_court: "المحكمة العليا",
  high_court: "محكمة الاستئناف",
  district_court: "المحكمة الابتدائية",
  tribunal: "المحكمة المتخصصة",
};

/**
 * Bench composition — how many judges sat, which is what decides whether a
 * judgment binds a smaller bench. Distinct from `bench`, a registry location.
 */
export const CORPUS_BENCH_TYPES = [
  "single_judge",
  "division_bench",
  "full_bench",
  "constitution_bench",
] as const;

export type CorpusBenchType = (typeof CORPUS_BENCH_TYPES)[number];

export const CORPUS_BENCH_TYPE_LABELS: Record<CorpusBenchType, string> = {
  single_judge: "قاضٍ منفرد",
  division_bench: "دائرة استئناف (٢)",
  full_bench: "هيئة كاملة (٣–٤)",
  constitution_bench: "هيئة دستورية (٥+)",
};

/**
 * Month names for the month filter, index 0 = January.
 *
 * An ordered array rather than `Intl.DateTimeFormat`, because the filter reads
 * it by index (`MONTH_LABELS[month - 1]`) and needs a name for a month with no
 * date behind it. These are the Gregorian month names in common Arabic usage —
 * the same ones `num.ts` produces, so the filter and the dates it filters agree.
 */
export const MONTH_LABELS = [
  "يناير",
  "فبراير",
  "مارس",
  "أبريل",
  "مايو",
  "يونيو",
  "يوليو",
  "أغسطس",
  "سبتمبر",
  "أكتوبر",
  "نوفمبر",
  "ديسمبر",
];

export interface CorpusDocument {
  id: number;
  citation: string;
  title: string;
  parties: string | null;
  court: string | null;
  court_type: string | null;
  bench: string | null;
  bench_type: string | null;
  state: string | null;
  year: number | null;
  /** `YYYY-MM-DD`, when the source reported a full date. */
  decision_date: string | null;
  case_type: string | null;
  judges: string | null;
  outcome: string | null;
  language: string | null;
  source_url: string | null;
  pdf_url: string | null;
  file_hash: string | null;
  status: CorpusStatus;
  uploaded_by: number | null;
  published_by: number | null;
  created_at: string;
  updated_at: string;
  uploader?: { id: number; email: string } | null;
  publisher?: { id: number; email: string } | null;
  _count?: { chunks: number };
}

export interface CorpusChunk {
  id: number;
  chunk_index: number;
  content: string;
  embedding_model: string | null;
  dims: number | null;
  chunking_version: string | null;
  created_at: string;
}

export interface CorpusAuditEntry {
  id: number;
  document_id: number;
  actor: string | null;
  action: string;
  detail: string | null;
  created_at: string;
  document?: { id: number; citation: string; title: string };
}

export interface CorpusStats {
  total_documents: number;
  total_chunks: number;
  by_status: Partial<Record<CorpusStatus, number>>;
  by_state: Array<{ state: string | null; count: number }>;
  by_year: Array<{ year: number | null; count: number }>;
  by_case_type: Array<{ case_type: string | null; count: number }>;
  by_court: Array<{ court: string | null; count: number }>;
}

/** Columns the queue can sort by. Must match the server's allow-list. */
export type CorpusSortField =
  | "created_at"
  | "updated_at"
  | "citation"
  | "title"
  | "year"
  | "court"
  | "state"
  | "status";

export interface CorpusListParams {
  status?: CorpusStatus;
  state?: string;
  court?: string;
  court_type?: string;
  bench?: string;
  bench_type?: string;
  case_type?: string;
  year?: number;
  /** 1-12. Only meaningful alongside a year. */
  month?: number;
  /** Substring match against judges (e.g., "Justice Singh"). */
  judge?: string;
  /** Substring match against parties (e.g., "State of Punjab"). */
  party?: string;
  search?: string;
  sort_by?: CorpusSortField;
  sort_dir?: "asc" | "desc";
  limit?: number;
  offset?: number;
}

/** Sort options offered in the queue, in menu order. */
export const CORPUS_SORT_OPTIONS: Array<{
  value: CorpusSortField;
  label: string;
  /** The direction shown first — newest dates, but A–Z for text. */
  defaultDir: "asc" | "desc";
}> = [
  { value: "created_at", label: "تاريخ الرفع", defaultDir: "desc" },
  { value: "updated_at", label: "آخر تحديث", defaultDir: "desc" },
  { value: "year", label: "سنة الحكم", defaultDir: "desc" },
  { value: "citation", label: "المرجع", defaultDir: "asc" },
  { value: "title", label: "عنوان القضية", defaultDir: "asc" },
  { value: "court", label: "المحكمة", defaultDir: "asc" },
  { value: "state", label: "الدولة", defaultDir: "asc" },
  { value: "status", label: "الحالة", defaultDir: "asc" },
];

export interface CorpusListResponse {
  items: CorpusDocument[];
  total: number;
  limit: number;
  offset: number;
}

/** Outcome of a bulk publish. */
export interface CorpusBulkPublishResult {
  /** Publishable documents the filters selected. */
  matched: number;
  published: number;
  /** Left unpublished — an empty index means search can never return them. */
  skipped_no_chunks: number;
  /** Matching documents not included in the requested quantity. */
  remaining: number;
}

export interface CorpusMetadata {
  citation: string;
  title: string;
  parties?: string;
  court?: string;
  court_type?: string;
  bench?: string;
  bench_type?: string;
  state?: string;
  year?: number | string;
  decision_date?: string;
  case_type?: string;
  judges?: string;
  outcome?: string;
  language?: string;
  source_url?: string;
}

/** A follow-up the backend wants answered before (or to sharpen) a response. */
export interface ClarifyingQuestion {
  /** Stable key — use it for form state and as the answers-map key. */
  field: string;
  question: string;
  /** Suggested answers; real corpus values when the field is a facet. */
  options?: string[];
  required: boolean;
}

/** The metadata vocabulary that actually exists in the published corpus. */
export interface CorpusFacets {
  states: string[];
  courts: string[];
  court_types: string[];
  benches: string[];
  bench_types: string[];
  case_types: string[];
  /** Busiest judge names — the long tail is reachable by typing instead. */
  judges: string[];
  year_min: number | null;
  year_max: number | null;
  published_documents: number;
}

export interface CorpusIntakeResult {
  intent: "question" | "draft";
  filters: {
    state?: string;
    court?: string;
    case_type?: string;
    year?: number;
    year_from?: number;
    year_to?: number;
  };
  search_query: string;
  keywords: string[];
  questions: ClarifyingQuestion[];
  ready: boolean;
  facets: CorpusFacets;
}

/** Returned instead of an answer when a draft is missing required facts. */
export interface CorpusClarificationResponse {
  needs_clarification: true;
  questions: ClarifyingQuestion[];
  filters: Record<string, string | number | undefined>;
  message: string;
}

export interface CorpusAnswerResponse {
  needs_clarification?: false;
  answer: string;
  sources: CorpusSearchHit[];
  retrieved: number;
  /** Optional follow-ups the user may answer to sharpen the result. */
  questions?: ClarifyingQuestion[];
  draft_id?: number;
}

export type CorpusChatResponse =
  | CorpusAnswerResponse
  | CorpusClarificationResponse;

/** A persisted draft-mode generation, with the sources it was built on. */
export interface CorpusDraft {
  id: number;
  prompt: string;
  facts: string | null;
  content: string;
  sources: CorpusSearchHit[];
  created_at: string;
}

/** Narrows a chat response to the clarification branch. */
export function needsClarification(
  response: CorpusChatResponse
): response is CorpusClarificationResponse {
  return (response as CorpusClarificationResponse).needs_clarification === true;
}

export interface CorpusSearchHit {
  chunk_id: number;
  document_id: number;
  chunk_index: number;
  content: string;
  similarity: number;
  citation: string;
  title: string;
  court: string | null;
  court_type: string | null;
  bench: string | null;
  bench_type: string | null;
  state: string | null;
  year: number | null;
  decision_date: string | null;
  case_type: string | null;
  judges: string | null;
  parties: string | null;
  outcome: string | null;
  pdf_url: string | null;
  source_url: string | null;
  /** 1-based page in the source PDF, or null when the chunk was not attributed. */
  page_start: number | null;
  page_end: number | null;
}

/** Minimal published-document source for the in-app reference viewer. */
export interface PublishedSource {
  id: number;
  title: string;
  citation: string;
  source_url: string | null;
  /** Presigned PDF URL, or null if the document has no stored PDF. */
  pdf_url: string | null;
}

/** One cell of the coverage grid: how many published judgments we hold. */
export interface CoverageCell {
  state: string;
  year: number;
  case_type: string;
  count: number;
}

export interface CorpusCoverage {
  cells: CoverageCell[];
  states: string[];
  years: number[];
  case_types: string[];
  total: number;
}

export interface CorpusQueueHealth {
  counts: Record<string, number>;
  failed: Array<{
    job_id: string;
    document_id: number | null;
    attempts: number;
    failed_reason: string | null;
    failed_at: string | null;
  }>;
  stalled: Array<{
    id: number;
    citation: string;
    status: CorpusStatus;
    updated_at: string;
  }>;
  /** False when Redis is unreachable — counts are empty, not zero. */
  queue_reachable: boolean;
}

export interface CorpusSearchAnalytics {
  window_days: number;
  searches: number;
  zero_result_searches: number;
  zero_result_rate: number;
  source_clicks: number;
  distinct_users: number;
  top_queries: Array<{
    query: string;
    searches: number;
    avg_results: number;
    last_seen: string;
  }>;
  zero_result_queries: Array<{
    query: string;
    searches: number;
    last_seen: string;
  }>;
  most_clicked: Array<{
    document_id: number;
    citation: string;
    title: string;
    clicks: number;
  }>;
}

export interface CorpusFeedbackSummary {
  window_days: number;
  votes: number;
  relevant: number;
  irrelevant: number;
  /** Null when nobody has voted in the window — not zero. */
  relevance_rate: number | null;
  worst_documents: Array<{
    document_id: number;
    citation: string;
    title: string;
    votes: number;
    irrelevant: number;
  }>;
  recent: Array<{
    id: number;
    query: string;
    relevant: boolean;
    note: string | null;
    created_at: string;
    document: { id: number; citation: string; title: string };
  }>;
}

/** Status values a curator can act on, with display copy. */
export const CORPUS_STATUS_META: Record<
  CorpusStatus,
  { label: string; description: string; tone: "neutral" | "info" | "warn" | "good" | "bad" }
> = {
  draft: {
    label: "مسودة",
    description: "تم الرفع، في انتظار بدء المعالجة",
    tone: "neutral",
  },
  processing: {
    label: "قيد المعالجة",
    description: "جارٍ استخراج النص وبناء فهرس البحث",
    tone: "info",
  },
  needs_review: {
    label: "بحاجة إلى مراجعة",
    description: "تمت الفهرسة وجاهز لتحقق المراجع",
    tone: "warn",
  },
  published: {
    label: "منشور",
    description: "متاح للبحث من قبل المستخدمين",
    tone: "good",
  },
  archived: {
    label: "مؤرشف",
    description: "أُخرج من البحث مع الاحتفاظ بالسجل",
    tone: "neutral",
  },
  failed: {
    label: "فاشل",
    description: "تعذّر إكمال المعالجة — راجع سجل التغييرات",
    tone: "bad",
  },
};

/**
 * Case categories offered in the upload form.
 *
 * Only the `label` is Arabic; `value` is the string the API stores and filters
 * on, so it must not be reworded. The taxonomy is the one the backend already
 * accepts — a few entries (Letters Patent Appeal, Special Leave Petition, writ
 * petition) name Commonwealth-derived procedures and have no exact equivalent
 * in every Arab jurisdiction, but they are kept so the select stays in step
 * with the ingested corpus rather than silently dropping values.
 */
export const CASE_TYPE_OPTIONS = [
  // Constitutional & writs
  { value: "writ_petition", label: "الطعن بالإلغاء" },
  { value: "pil", label: "دعوى المصلحة العامة" },
  { value: "habeas_corpus", label: "أمر الإحضار" },
  { value: "letters_patent_appeal", label: "استئناف براءة التأسيس" },
  // Appeals
  { value: "criminal_appeal", label: "استئناف جنائي" },
  { value: "civil_appeal", label: "استئناف مدني" },
  { value: "special_leave_petition", label: "التماس الطعن" },
  { value: "first_appeal", label: "استئناف أول" },
  { value: "second_appeal", label: "استئناف ثانٍ" },
  // Petitions
  { value: "review_petition", label: "التماس إعادة النظر" },
  { value: "revision_petition", label: "الطعن بالمراجعة" },
  { value: "transfer_petition", label: "طلب نقل الدعوى" },
  { value: "contempt_petition", label: "دعوى إهانة المحكمة" },
  { value: "quashing_petition", label: "طلب إبطال الإجراءات" },
  { value: "miscellaneous_petition", label: "طلب متنوع" },
  // Bail
  { value: "bail_application", label: "طلب إخلاء سبيل" },
  { value: "anticipatory_bail", label: "إخلاء سبيل احتياطي" },
  { value: "cancellation_of_bail", label: "إلغاء إخلاء السبيل" },
  // Civil suits
  { value: "suit_for_recovery", label: "دعوى مطالبة بدين" },
  { value: "suit_for_declaration", label: "دعوى إثبات حق" },
  { value: "suit_for_injunction", label: "دعوى أمر قضائي" },
  { value: "suit_for_specific_performance", label: "دعوى التنفيذ العيني" },
  { value: "suit_for_partition", label: "دعوى قسمة" },
  { value: "eviction_suit", label: "دعوى إخلاء" },
  { value: "divorce_petition", label: "دعوى طلاق" },
  // Commercial & arbitration
  { value: "arbitration", label: "تحكيم" },
  { value: "commercial_suit", label: "دعوى تجارية" },
  { value: "company_petition", label: "دعوى شركات" },
  { value: "insolvency_proceedings", label: "إجراءات إعسار" },
  { value: "execution_petition", label: "دعوى تنفيذ" },
  // Service & employment
  { value: "service_matter", label: "نزاع وظيفي" },
  { value: "departmental_inquiry", label: "تحقيق إداري" },
  { value: "disciplinary_proceeding", label: "إجراء تأديبي" },
  // Taxation
  { value: "tax_matter", label: "منازعة ضريبية" },
  // Criminal
  { value: "corruption_case", label: "قضية فساد" },
  { value: "trial", label: "محاكمة" },
  // Consumer & election
  { value: "consumer_complaint", label: "شكوى استهلاكية" },
  { value: "election_petition", label: "طعن انتخابي" },
  // Miscellaneous
  { value: "matrimonial_matter", label: "نزاع زوجي" },
  { value: "land_acquisition", label: "نزع ملكية" },
  { value: "motor_accident_claim", label: "مطالبة حادث مروري" },
  // Kept last: the backend stores case_type as free text, so documents ingested
  // before the taxonomy grew may still carry this value.
  { value: "other", label: "أخرى" },
];

export const corpusService = {
  /** Search published judgments for related reference cases. */
  search(input: {
    query: string;
    limit?: number;
    offset?: number;
    rerank?: boolean;
  }): Promise<{ hits: CorpusSearchHit[]; total: number }> {
    const qs = new URLSearchParams({ query: input.query });
    if (input.limit !== undefined) qs.set("limit", String(input.limit));
    if (input.offset !== undefined) qs.set("offset", String(input.offset));
    if (input.rerank !== undefined) qs.set("rerank", String(input.rerank));
    return request<{
      success: boolean;
      hits: CorpusSearchHit[];
      total: number;
    }>(`/api/v1/corpus/search?${qs.toString()}`).then((body) => ({
      hits: body.hits,
      total: body.total,
    }));
  },

  /**
   * Grounded research answer or draft.
   *
   * In draft mode this can come back as `needs_clarification` instead of an
   * answer — use `needsClarification()` to narrow before reading `answer`.
   * Set `skip_clarification` once the user chooses to proceed regardless.
   */
  chat(input: {
    query: string;
    facts?: string;
    mode: "answer" | "draft";
    answers?: Record<string, string>;
    skip_clarification?: boolean;
    state?: string;
    court?: string;
    court_type?: string;
    bench?: string;
    bench_type?: string;
    case_type?: string;
    judge?: string;
    party?: string;
    year?: number;
    year_from?: number;
    year_to?: number;
    /** Needs a year alongside it to be meaningful; matches on decision_date. */
    month?: number;
    date_from?: string;
    date_to?: string;
  }): Promise<CorpusChatResponse> {
    return request<{ success: boolean; data: CorpusChatResponse }>("/api/v1/corpus/chat", {
      method: "POST",
      json: input,
    }).then((r) => r.data);
  },

  /** Published-corpus filter vocabulary. Safe to cache for a page session. */
  getFacets(): Promise<CorpusFacets> {
    return request<{ success: boolean; data: CorpusFacets }>("/api/v1/corpus/facets").then(
      (r) => r.data
    );
  },

  /** Query triage only — no retrieval, no generation, no draft persisted. */
  intake(input: {
    query: string;
    mode: "answer" | "draft";
    facts?: string;
    answers?: Record<string, string>;
  }): Promise<CorpusIntakeResult> {
    return request<{ success: boolean; data: CorpusIntakeResult }>("/api/v1/corpus/intake", {
      method: "POST",
      json: input,
    }).then((r) => r.data);
  },

  /** Saved drafts, newest first. Draft mode persists one per generation. */
  listDrafts(): Promise<CorpusDraft[]> {
    return request<{ success: boolean; data: CorpusDraft[] }>("/api/v1/corpus/drafts").then(
      (r) => r.data
    );
  },

  /**
   * Premium-only. Turns a saved draft into a real case, after which the
   * existing case workflow (including CVO assignment) takes over.
   */
  convertDraftToCase(draftId: number, title?: string): Promise<{ id: number }> {
    return request<{ success: boolean; data: { id: number } }>(
      `/api/v1/corpus/drafts/${draftId}/convert-to-case`,
      { method: "POST", json: { title } }
    ).then((r) => r.data);
  },

  /** Fire-and-forget analytics for a user opening a cited judgment. */
  recordSourceClick(input: { query: string; document_id: number; result_count: number }): Promise<void> {
    return request("/api/v1/corpus/search-events/click", { method: "POST", json: input }).then(
      () => undefined
    ).catch((): void => undefined); // Analytics must never interrupt navigation to the source.
  },

  /**
   * Uploads a judgment PDF with metadata. Ingestion is queued server-side.
   * NOTE: plain `fetch` has no upload-progress events, so `onProgress` is
   * accepted for signature parity but not fired — the UI shows a spinner.
   */
  createDocument(
    file: File,
    metadata: CorpusMetadata,
    _onProgress?: (percentage: number) => void
  ): Promise<CorpusDocument> {
    void _onProgress; // signature parity — plain fetch has no upload-progress events; UI shows a spinner instead.
    const formData = new FormData();
    formData.append("file", file);

    Object.entries(metadata).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        formData.append(key, String(value));
      }
    });

    const headers: Record<string, string> = {};
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("accessToken");
      if (token) headers["Authorization"] = `Bearer ${token}`;
    }

    return fetch(`${BASE}/api/v1/corpus/documents`, {
      method: "POST",
      headers,
      body: formData,
      credentials: "include",
    }).then(async (res) => {
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new ApiError(res.status, body?.message ?? "تعذّر الرفع", body);
      return body.data as CorpusDocument;
    });
  },

  listDocuments(params: CorpusListParams = {}): Promise<CorpusListResponse> {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        qs.set(key, String(value));
      }
    });
    const s = qs.toString();
    return request<{
      success: boolean;
      items: CorpusDocument[];
      total: number;
      limit: number;
      offset: number;
    }>(`/api/v1/corpus/documents${s ? `?${s}` : ""}`).then((body) => ({
      items: body.items,
      total: body.total,
      limit: body.limit,
      offset: body.offset,
    }));
  },

  getDocument(id: number): Promise<CorpusDocument> {
    return request<{ success: boolean; data: CorpusDocument }>(`/api/v1/corpus/documents/${id}`).then(
      (r) => r.data
    );
  },

  /**
   * Published-only source for the page-accurate reference viewer. Unlike
   * getDocument (uploaders-only, full record), any authenticated role can call
   * this; it 404s for anything not published. `pdf_url` is presigned.
   */
  getPublishedSource(id: number): Promise<PublishedSource> {
    return request<{ success: boolean; data: PublishedSource }>(
      `/api/v1/corpus/documents/${id}/source`
    ).then((r) => r.data);
  },

  getChunks(
    id: number,
    limit = 20,
    offset = 0
  ): Promise<{ chunks: CorpusChunk[]; total: number }> {
    return request<{ success: boolean; chunks: CorpusChunk[]; total: number }>(
      `/api/v1/corpus/documents/${id}/chunks?limit=${limit}&offset=${offset}`
    ).then((body) => ({ chunks: body.chunks, total: body.total }));
  },

  /**
   * Updates metadata. `requiresReingestion` is true when an edited field is
   * baked into the search index and a reprocess is needed to apply it.
   */
  updateDocument(
    id: number,
    updates: Partial<CorpusMetadata>
  ): Promise<{
    document: CorpusDocument;
    requiresReingestion: boolean;
    message: string;
  }> {
    return request<{
      success: boolean;
      data: CorpusDocument;
      requires_reingestion?: boolean;
      message?: string;
    }>(`/api/v1/corpus/documents/${id}`, { method: "PATCH", json: updates }).then((body) => ({
      document: body.data,
      requiresReingestion: Boolean(body.requires_reingestion),
      message: body.message ?? "تم تحديث البيانات الوصفية",
    }));
  },

  reprocess(id: number): Promise<void> {
    return request(`/api/v1/corpus/documents/${id}/reprocess`, { method: "POST" });
  },

  publish(id: number): Promise<CorpusDocument> {
    return request<{ success: boolean; data: CorpusDocument }>(
      `/api/v1/corpus/documents/${id}/publish`,
      { method: "POST" }
    ).then((r) => r.data);
  },

  /**
   * Publishes every `needs_review` document matching `filters` (or the
   * `needs_review` subset of an id list) in one call. Curators only, and
   * unreviewed by design — the caller is trusting the source data and the
   * ingestion pipeline. Drafts, failed and processing documents are never
   * touched, and documents with no indexed chunks are skipped.
   */
  bulkPublish(input: {
    ids?: number[];
    /** Omit to publish every matching review document. */
    limit?: number;
    filters?: Omit<
      CorpusListParams,
      "limit" | "offset" | "sort_by" | "sort_dir" | "status"
    >;
  }): Promise<CorpusBulkPublishResult> {
    return request<{ success: boolean; data: CorpusBulkPublishResult }>("/api/v1/corpus/bulk-publish", {
      method: "POST",
      json: input,
    }).then((r) => r.data);
  },

  unpublish(id: number): Promise<CorpusDocument> {
    return request<{ success: boolean; data: CorpusDocument }>(
      `/api/v1/corpus/documents/${id}/unpublish`,
      { method: "POST" }
    ).then((r) => r.data);
  },

  archive(id: number): Promise<CorpusDocument> {
    return request<{ success: boolean; data: CorpusDocument }>(
      `/api/v1/corpus/documents/${id}/archive`,
      { method: "POST" }
    ).then((r) => r.data);
  },

  deleteDocument(id: number): Promise<void> {
    return request(`/api/v1/corpus/documents/${id}`, { method: "DELETE" });
  },

  getDocumentAudit(id: number, limit = 100): Promise<CorpusAuditEntry[]> {
    return request<{ success: boolean; data: CorpusAuditEntry[] }>(
      `/api/v1/corpus/documents/${id}/audit?limit=${limit}`
    ).then((r) => r.data);
  },

  getRecentAudit(limit = 50, offset = 0): Promise<CorpusAuditEntry[]> {
    return request<{ success: boolean; data: CorpusAuditEntry[] }>(
      `/api/v1/corpus/audit?limit=${limit}&offset=${offset}`
    ).then((r) => r.data);
  },

  getStats(): Promise<CorpusStats> {
    return request<{ success: boolean; data: CorpusStats }>("/api/v1/corpus/stats").then((r) => r.data);
  },

  /** Coverage heatmap. No filters = the whole published corpus. */
  getCoverage(params: {
    court_type?: string;
    case_type?: string;
    year_from?: number;
    year_to?: number;
  } = {}): Promise<CorpusCoverage> {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") qs.set(key, String(value));
    });
    const s = qs.toString();
    return request<{ success: boolean; data: CorpusCoverage }>(
      `/api/v1/corpus/coverage${s ? `?${s}` : ""}`
    ).then((r) => r.data);
  },

  getQueueHealth(): Promise<CorpusQueueHealth> {
    return request<{ success: boolean; data: CorpusQueueHealth }>("/api/v1/corpus/queue").then(
      (r) => r.data
    );
  },

  getSearchAnalytics(days = 30): Promise<CorpusSearchAnalytics> {
    return request<{ success: boolean; data: CorpusSearchAnalytics }>(
      `/api/v1/corpus/analytics/search?days=${days}`
    ).then((r) => r.data);
  },

  getFeedbackSummary(days = 90): Promise<CorpusFeedbackSummary> {
    return request<{ success: boolean; data: CorpusFeedbackSummary }>(
      `/api/v1/corpus/feedback?days=${days}`
    ).then((r) => r.data);
  },

  /**
   * Records whether a retrieved judgment actually answered the question.
   * Voting again on the same result overwrites the earlier vote.
   */
  submitFeedback(input: {
    document_id: number;
    chunk_id?: number;
    query: string;
    relevant: boolean;
    note?: string;
  }): Promise<void> {
    return request("/api/v1/corpus/feedback", { method: "POST", json: input });
  },
};

/** Pulls the human-readable message out of an ApiError. */
export function corpusErrorMessage(error: unknown, fallback: string): string {
  const apiError = error as { body?: { message?: string; errors?: Array<{ message: string }> } };
  const body = apiError?.body;
  if (body?.errors?.length) {
    return body.errors.map((e) => e.message).join("; ");
  }
  return body?.message ?? fallback;
}

export default corpusService;
