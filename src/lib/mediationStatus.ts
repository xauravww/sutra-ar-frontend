/**
 * Derived workflow state for a mediation session.
 *
 * The stored DB `status` is a lifecycle flag (`active`, `settled`, `closed`,
 * `archived`, ...) set at creation and later on closure — it does NOT tell the
 * UI where the session is in the analyse workflow. Labelling a brand-new
 * session "Complete" just because its status is `active` was the original bug
 * (DETAIL-02). So the stage is derived from what is actually present:
 * documents uploaded + comparative analysis results.
 */

export type SessionStageKind =
  | "awaiting_documents"
  | "ready_for_analysis"
  | "complete"
  | "settled"
  | "closed"
  | "archived"
  | "unknown";

export interface SessionStage {
  kind: SessionStageKind;
  label: string;
  /** Tailwind tone group used by the badge. */
  tone: "green" | "amber" | "slate" | "navy";
}

export type MaybeSession = {
  status?: string | null;
  documents?: unknown[] | null;
  analysis?: unknown;
};

export type MaybeAnalysis = Record<string, unknown>;

/**
 * An analysis counts as "done" only when it carries real results. Settlement
 * upserts can create a bare analysis row (no scores / no points), which must
 * NOT be treated as a completed analysis.
 */
export function hasCompletedAnalysis(analysis?: MaybeAnalysis | null): boolean {
  if (!analysis || typeof analysis !== "object") return false;
  const a = analysis as MaybeAnalysis;
  const hasScore =
    a.party_a_strength_score != null || a.party_b_strength_score != null;
  const hasPoints =
    (Array.isArray(a.party_a_favorable_points) && (a.party_a_favorable_points as unknown[]).length > 0) ||
    (Array.isArray(a.party_b_favorable_points) && (a.party_b_favorable_points as unknown[]).length > 0);
  return hasScore || hasPoints;
}

export function sessionDocCount(session?: MaybeSession): number {
  return Array.isArray(session?.documents) ? (session.documents as unknown[]).length : 0;
}

/** Resolve the UI stage + badge for a session row / detail page. */
export function getSessionStage(session?: MaybeSession): SessionStage {
  if (!session) return { kind: "unknown", label: "جارٍ التحميل…", tone: "slate" };

  const lifecycle = (session.status ?? "").toLowerCase();
  if (lifecycle === "settled") return { kind: "settled", label: "تمت التسوية", tone: "navy" };
  if (lifecycle === "closed") return { kind: "closed", label: "مغلقة", tone: "slate" };
  if (lifecycle === "archived") return { kind: "archived", label: "مؤرشفة", tone: "slate" };

  const docs = sessionDocCount(session) > 0;
  const analyzed = hasCompletedAnalysis(session.analysis as MaybeAnalysis | undefined);

  if (analyzed) return { kind: "complete", label: "مكتملة", tone: "green" };
  if (docs) return { kind: "ready_for_analysis", label: "جاهزة للتحليل", tone: "amber" };
  return { kind: "awaiting_documents", label: "بانتظار المستندات", tone: "amber" };
}
