/**
 * Corpus panel role permissions.
 * Mirrors the backend's role guards for /api/v1/corpus/*.
 */

/** Roles that may upload judgment PDFs to the corpus. */
export const CAN_UPLOAD = ["corpus_researcher", "corpus_curator", "admin", "owner"] as const;

/** Roles that may curate (publish / unpublish / edit metadata). */
export const CAN_CURATE = ["corpus_curator", "admin", "owner"] as const;

/** Roles that may permanently delete corpus documents. */
export const CAN_DELETE = ["admin", "owner"] as const;

export type CorpusRole = (typeof CAN_UPLOAD)[number];

export function isCorpusRole(role?: string | null): boolean {
  return !!role && (CAN_UPLOAD as readonly string[]).includes(role);
}

export function canUpload(role?: string | null): boolean {
  return !!role && (CAN_UPLOAD as readonly string[]).includes(role);
}

export function canCurate(role?: string | null): boolean {
  return !!role && (CAN_CURATE as readonly string[]).includes(role);
}

export function canDelete(role?: string | null): boolean {
  return !!role && (CAN_DELETE as readonly string[]).includes(role);
}
