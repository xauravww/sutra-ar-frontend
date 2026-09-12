"use client";

import { CORPUS_STATUS_META, type CorpusStatus } from "@/lib/corpus";

const TONE_CLASSES: Record<string, string> = {
  neutral: "bg-sutra-line-2 text-sutra-ink-2",
  info: "bg-blue-50 text-blue-700",
  warn: "bg-amber-bg text-amber-ink",
  good: "bg-green-bg text-green-ink",
  bad: "bg-red-50 text-red-700",
};

export default function CorpusStatusBadge({
  status,
  showPulse = true,
}: {
  status: CorpusStatus;
  /** Animate the dot while processing, so a stuck job is visually obvious. */
  showPulse?: boolean;
}) {
  const meta = CORPUS_STATUS_META[status];
  return (
    <span
      title={meta.description}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${TONE_CLASSES[meta.tone]}`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full bg-current ${
          showPulse && status === "processing" ? "animate-pulse" : ""
        }`}
      />
      {meta.label}
    </span>
  );
}
