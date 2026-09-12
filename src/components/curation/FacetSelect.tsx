"use client";

export interface FacetOption {
  value: string;
  label: string;
  count?: number;
}

/**
 * A filter dropdown built from the corpus vocabulary that actually exists.
 *
 * Options carry their document count so a curator can see a filter is empty
 * before spending a click on it. Selecting a value tints the control, which is
 * how the bar communicates "a filter is on" without a separate indicator.
 */
export default function FacetSelect({
  label,
  value,
  options,
  onChange,
  allLabel = "All",
  disabled = false,
}: {
  label: string;
  value: string;
  options: FacetOption[];
  onChange: (value: string) => void;
  allLabel?: string;
  disabled?: boolean;
}) {
  const active = value !== "";
  const isEmpty = options.length === 0;

  return (
    <label className="relative block">
      <span className="sr-only">{label}</span>
      <select
        value={value}
        disabled={disabled || isEmpty}
        onChange={(event) => onChange(event.target.value)}
        className={`w-full appearance-none [background-image:none] rounded-lg border py-2 ps-3 pe-8 text-[13px] transition-colors outline-none focus-visible:ring-2 focus-visible:ring-focus/30 disabled:cursor-not-allowed disabled:opacity-50 ${
          active
            ? "border-navy bg-navy font-medium text-white"
            : "border-sutra-line bg-white text-sutra-ink-2 hover:border-sutra-ink-3"
        }`}
      >
        <option value="">{isEmpty ? `${label} — none yet` : allLabel}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
            {option.count !== undefined ? ` (${option.count})` : ""}
          </option>
        ))}
      </select>
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={`pointer-events-none absolute end-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 ${
          active ? "text-white/70" : "text-sutra-ink-3"
        }`}
      >
        <path d="m6 9 6 6 6-6" />
      </svg>
    </label>
  );
}
