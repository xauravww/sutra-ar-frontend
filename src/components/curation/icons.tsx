"use client";

import type { ReactNode } from "react";

/**
 * Minimal inline-SVG icon set for the curation panel. Sutra has no lucide-react
 * dependency, so icons are hand-drawn paths on a 24×24 grid, stroke-based,
 * inheriting `currentColor`.
 */

export type IconName =
  | "search"
  | "x"
  | "refresh"
  | "chevron-left"
  | "chevron-right"
  | "chevrons-left"
  | "chevrons-right"
  | "chevron-down"
  | "arrow-up"
  | "arrow-down"
  | "sliders"
  | "upload"
  | "upload-cloud"
  | "shield-alert"
  | "file-text"
  | "history"
  | "external-link"
  | "save"
  | "check"
  | "eye-off"
  | "archive"
  | "trash"
  | "spinner"
  | "alert-triangle"
  | "pencil"
  | "arrow-left"
  | "grid"
  | "info"
  | "activity"
  | "alert-circle"
  | "wifi-off"
  | "clock"
  | "search-x"
  | "thumbs-down"
  | "pointer"
  | "logo"
  | "logout";

export const ICON_PATHS: Record<IconName, ReactNode> = {
  search: (
    <>
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.35-4.35" />
    </>
  ),
  x: <path d="M18 6 6 18M6 6l12 12" />,
  refresh: (
    <>
      <path d="M21 12a9 9 0 1 1-2.64-6.36" />
      <path d="M21 3v6h-6" />
    </>
  ),
  "chevron-left": <path d="m15 18-6-6 6-6" />,
  "chevron-right": <path d="m9 18 6-6-6-6" />,
  "chevrons-left": <path d="m11 17-5-5 5-5M18 17l-5-5 5-5" />,
  "chevrons-right": <path d="m13 17 5-5-5-5M6 17l5-5-5-5" />,
  "chevron-down": <path d="m6 9 6 6 6-6" />,
  "arrow-up": <path d="M12 19V5M5 12l7-7 7 7" />,
  "arrow-down": <path d="M12 5v14M19 12l-7 7-7-7" />,
  sliders: (
    <>
      <path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3" />
      <path d="M1 14h6M9 8h6M17 16h6" />
    </>
  ),
  upload: <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" />,
  "upload-cloud": (
    <>
      <path d="M4 14.9A7 7 0 1 1 15.7 8h1.8a4.5 4.5 0 0 1 2.5 8.2" />
      <path d="M12 12v9M8 16l4-4 4 4" />
    </>
  ),
  "shield-alert": (
    <>
      <path d="M12 22s8-3.5 8-10V5l-8-3-8 3v7c0 6.5 8 10 8 10z" />
      <path d="M12 8v4M12 16h.01" />
    </>
  ),
  "file-text": (
    <>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
    </>
  ),
  history: (
    <>
      <path d="M3 3v5h5M3.05 13A9 9 0 1 0 6 5.3L3 8" />
      <path d="M12 7v5l4 2" />
    </>
  ),
  "external-link": (
    <>
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <path d="M15 3h6v6M10 14 21 3" />
    </>
  ),
  save: (
    <>
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
      <path d="M17 21v-8H7v8M7 3v5h8" />
    </>
  ),
  check: <path d="M20 6 9 17l-5-5" />,
  "eye-off": (
    <>
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
      <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24M1 1l22 22" />
    </>
  ),
  archive: (
    <>
      <path d="M21 8v13H3V8M1 3h22v5H1z" />
      <path d="M10 12h4" />
    </>
  ),
  trash: (
    <>
      <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M10 11v6M14 11v6" />
    </>
  ),
  spinner: <path d="M21 12a9 9 0 1 1-6.219-8.56" />,
  "alert-triangle": (
    <>
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.7 3.86a2 2 0 0 0-3.4 0z" />
      <path d="M12 9v4M12 17h.01" />
    </>
  ),
  pencil: <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5z" />,
  "arrow-left": <path d="M19 12H5M11 18l-6-6 6-6" />,
  grid: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M3 9h18M3 15h18M9 3v18M15 3v18" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4M12 8h.01" />
    </>
  ),
  activity: <path d="M22 12h-4l-3 9L9 3l-3 9H2" />,
  "alert-circle": (
    <>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 8v4M12 16h.01" />
    </>
  ),
  "wifi-off": (
    <>
      <path d="M2 8.82a15 15 0 0 1 4.17-2.65M10.66 5.13A15 15 0 0 1 22 8.82" />
      <path d="M5 12.85a10 10 0 0 1 5.17-2.69M13.1 10.13a10 10 0 0 1 5.9 2.72" />
      <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
      <path d="M12 20h.01M2 2l20 20" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v6l4 2" />
    </>
  ),
  "search-x": (
    <>
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.35-4.35M8.5 8.5l5 5M13.5 8.5l-5 5" />
    </>
  ),
  "thumbs-down": (
    <path d="M17 14V2M9 18.12 10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L12 22a3.13 3.13 0 0 1-3-3.88z" />
  ),
  pointer: (
    <>
      <path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51z" />
      <path d="M13 13l6 6" />
    </>
  ),
  logo: (
    <>
      <path d="M12 3 4 7v6c0 4.42 3.58 8 8 8s8-3.58 8-8V7z" />
      <path d="M8 10l3 3 5-5" />
    </>
  ),
  logout: <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />,
};

/**
 * Icons whose artwork points in a reading direction and must mirror for RTL.
 *
 * `rtl-flip` is applied inside `Icon` rather than at each call site so every
 * consumer of e.g. `<Icon name="chevron-left" />` points the correct way
 * without having to opt in. Vertical and symmetric icons (chevron-down,
 * arrow-up/down, plus, check) are deliberately absent.
 */
const RTL_FLIP_ICONS: ReadonlySet<IconName> = new Set<IconName>([
  "chevron-left",
  "chevron-right",
  "chevrons-left",
  "chevrons-right",
  "arrow-left",
  "external-link",
  "logout",
]);

export function Icon({
  name,
  className = "w-4 h-4",
}: {
  name: IconName;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`${className}${RTL_FLIP_ICONS.has(name) ? " rtl-flip" : ""}`}
      aria-hidden="true"
    >
      {ICON_PATHS[name]}
    </svg>
  );
}
